import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

// カテゴリのアイコンマッピング
const CATEGORY_ICONS: Record<string, string> = {
  toiletTraining: 'solar:box-bold',
  basicTraining: 'solar:star-bold',
  socialization: 'solar:users-group-rounded-bold',
  problemBehavior: 'solar:shield-warning-bold',
  default: 'solar:list-check-bold',
}

// 達成度の選択肢
const ACHIEVEMENT_OPTIONS = [
  { value: 'done', label: '○', color: 'text-chart-2 bg-chart-2/20' },
  { value: 'almost', label: '△', color: 'text-chart-4 bg-chart-4/20' },
  { value: 'not_done', label: '−', color: 'text-muted-foreground bg-muted' },
]

interface Staff {
  id: number
  name: string
}

type Step = 'photo' | 'comment' | 'details'

const STEPS: Step[] = ['photo', 'details', 'comment']

const STEP_INFO: Record<Step, { title: string }> = {
  photo: { title: '写真' },
  comment: { title: 'コメント' },
  details: { title: '詳細' },
}

// トレーニングマスタから変換したカテゴリ形式
interface TrainingCategory {
  label: string
  icon: string
  items: Array<{ id: string; label: string }>
}

const JournalCreate = () => {
  const { reservationId } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [reservation, setReservation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [analyzingPhoto, setAnalyzingPhoto] = useState<number | null>(null)
  const [photoAnalysis, setPhotoAnalysis] = useState<Record<number, any>>({})
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])
  const [photos, setPhotos] = useState<File[]>([])
  const [trainingCategories, setTrainingCategories] = useState<Record<string, TrainingCategory>>({})

  // 段階式入力の現在のステップ
  const [currentStep, setCurrentStep] = useState<Step>('photo')
  const [showDetails, setShowDetails] = useState(true)

  const [formData, setFormData] = useState({
    staff_id: '',
    morning_toilet_status: '', // '成功' | '失敗' | ''
    morning_toilet_location: '',
    afternoon_toilet_status: '', // '成功' | '失敗' | ''
    afternoon_toilet_location: '',
    training_data: {} as Record<string, string>,
    memo: '', // スタッフのメモ書き（AIが清書する素材）
    comment: '',
    next_visit_date: '',
  })

  useEffect(() => {
    if (reservationId) {
      fetchData()
    }
  }, [reservationId])

  const fetchData = async () => {
    try {
      const [reservationRes, staffRes, trainingRes] = await Promise.all([
        api.get(`/reservations/${reservationId}`),
        api.get('/auth/staff'),
        api.get('/training-masters').catch(() => ({ data: {} })),
      ])
      setReservation(reservationRes.data)
      setStaffList(staffRes.data)

      // トレーニングマスタをカテゴリ形式に変換
      if (trainingRes.data && Object.keys(trainingRes.data).length > 0) {
        const convertedCategories: Record<string, TrainingCategory> = {}
        for (const [category, items] of Object.entries(trainingRes.data)) {
          const itemsArray = items as Array<{ item_key: string; item_label: string }>
          convertedCategories[category] = {
            label: getCategoryLabel(category),
            icon: CATEGORY_ICONS[category] || CATEGORY_ICONS.default,
            items: itemsArray.map((item) => ({
              id: item.item_key,
              label: item.item_label,
            })),
          }
        }
        setTrainingCategories(convertedCategories)
      }

      const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
      if (currentUser.id) {
        setFormData((prev) => ({
          ...prev,
          staff_id: currentUser.id.toString(),
          next_visit_date: reservationRes.data.next_visit_date || '',
        }))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // カテゴリ名を日本語ラベルに変換
  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      toiletTraining: 'トイレ',
      basicTraining: '基本',
      socialization: '社会化',
      problemBehavior: '問題行動対策',
    }
    return labels[category] || category
  }

  const handleTrainingChange = (itemId: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      training_data: {
        ...prev.training_data,
        [itemId]: value,
      },
    }))
  }

  const analyzePhoto = async (photo: File, index: number) => {
    setAnalyzingPhoto(index)
    try {
      const base64 = await fileToBase64(photo)
      const response = await api.post('/ai/analyze-photo', {
        photo_base64: base64,
        dog_name: reservation?.dog_name,
      })
      
      setPhotoAnalysis((prev) => ({
        ...prev,
        [index]: response.data,
      }))

      // 解析結果をトレーニングデータに自動反映
      if (response.data.training_suggestions && response.data.training_suggestions.length > 0) {
        setFormData((prev) => {
          const newTrainingData = { ...prev.training_data }
          response.data.training_suggestions.forEach((suggestion: string) => {
            if (!newTrainingData[suggestion]) {
              newTrainingData[suggestion] = 'done'
            }
          })
          return {
            ...prev,
            training_data: newTrainingData,
          }
        })
      }
      // 解析結果はphotoAnalysisに保存するだけにして、AI生成時にまとめて使用する
      // コメントへの直接追加は行わない（AI生成で清書してもらう）
    } catch (error) {
      console.error('Error analyzing photo:', error)
      // エラーは静かに処理（ユーザー体験を損なわないため）
    } finally {
      setAnalyzingPhoto(null)
    }
  }

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const startIndex = photos.length
    const newPhotos = [...photos, ...files].slice(0, 5)
    setPhotos(newPhotos)

    const newUrls = newPhotos.map((file) => URL.createObjectURL(file))
    setPhotoPreviewUrls(newUrls)

    // 新しく追加された写真を自動解析
    for (let i = 0; i < files.length && startIndex + i < 5; i++) {
      const index = startIndex + i
      await analyzePhoto(files[i], index)
    }
  }

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    const newUrls = photoPreviewUrls.filter((_, i) => i !== index)
    const newAnalysis = { ...photoAnalysis }
    delete newAnalysis[index]
    
    // インデックスを再マッピング
    const remappedAnalysis: Record<number, any> = {}
    Object.keys(newAnalysis).forEach((key) => {
      const oldIndex = parseInt(key, 10)
      if (oldIndex > index) {
        remappedAnalysis[oldIndex - 1] = newAnalysis[oldIndex]
      } else {
        remappedAnalysis[oldIndex] = newAnalysis[oldIndex]
      }
    })
    
    setPhotos(newPhotos)
    setPhotoPreviewUrls(newUrls)
    setPhotoAnalysis(remappedAnalysis)
  }

  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      const photoBase64List: string[] = []
      for (const photo of photos) {
        const base64 = await fileToBase64(photo)
        photoBase64List.push(base64)
      }

      await api.post('/journals', {
        reservation_id: reservationId,
        dog_id: reservation?.dog_id,
        staff_id: formData.staff_id ? parseInt(formData.staff_id) : null,
        journal_date: reservation?.reservation_date,
        visit_count: reservation?.visit_count,
        morning_toilet_status: formData.morning_toilet_status || null,
        morning_toilet_location: formData.morning_toilet_status ? formData.morning_toilet_location : null,
        afternoon_toilet_status: formData.afternoon_toilet_status || null,
        afternoon_toilet_location: formData.afternoon_toilet_status ? formData.afternoon_toilet_location : null,
        training_data: formData.training_data,
        comment: formData.comment,
        next_visit_date: formData.next_visit_date || null,
        photos: photoBase64List.length > 0 ? photoBase64List : null,
      })
      navigate('/journals')
    } catch (error) {
      console.error('Error creating journal:', error)
      alert('日誌の作成に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const handleGenerateComment = async () => {
    setGenerating(true)
    try {
      // トレーニングラベルをカテゴリから抽出
      const trainingLabels: Record<string, string> = {}
      Object.values(trainingCategories).forEach((category) => {
        category.items.forEach((item) => {
          trainingLabels[item.id] = item.label
        })
      })

      // 写真解析結果を収集
      const photoAnalysesArray = Object.values(photoAnalysis)
        .filter((analysis) => analysis?.analysis)
        .map((analysis) => analysis.analysis)

      const response = await api.post('/ai/generate-comment', {
        dog_name: reservation?.dog_name,
        training_data: formData.training_data,
        morning_toilet: {
          urination: formData.morning_urination,
          defecation: formData.morning_defecation,
          location: formData.morning_toilet_location,
        },
        afternoon_toilet: {
          urination: formData.afternoon_urination,
          defecation: formData.afternoon_defecation,
          location: formData.afternoon_toilet_location,
        },
        memo: formData.memo, // スタッフのメモを送信
        photo_analyses: photoAnalysesArray, // 写真解析結果を送信
        training_labels: trainingLabels, // カスタムトレーニングラベルを送信
      })
      setFormData((prev) => ({
        ...prev,
        comment: response.data.comment,
      }))
    } catch (error) {
      console.error('Error generating comment:', error)
      alert('コメントの生成に失敗しました')
    } finally {
      setGenerating(false)
    }
  }

  const goToNextStep = () => {
    const currentIndex = STEPS.indexOf(currentStep)
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1])
    }
  }

  const goToPrevStep = () => {
    const currentIndex = STEPS.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (!reservation) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">予約が見つかりません</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-foreground">
            <iconify-icon icon="solar:arrow-left-linear" className="size-6"></iconify-icon>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold font-heading">{reservation.dog_name}の日誌</h1>
            <p className="text-xs text-muted-foreground">{reservation.owner_name}様</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-primary">{reservation.visit_count}</span>
            <span className="text-xs text-muted-foreground">回目</span>
          </div>
        </div>

        {/* ステップインジケーター */}
        <div className="flex items-center gap-2 mt-3">
          {STEPS.map((step, index) => (
            <div key={step} className="flex items-center flex-1">
              <button
                onClick={() => setCurrentStep(step)}
                className={`flex-1 flex items-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-bold transition-colors min-h-[48px] ${
                  currentStep === step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground font-normal'
                }`}
              >
                <span className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  currentStep === step ? 'bg-primary-foreground/20' : 'bg-background'
                }`}>
                  {index + 1}
                </span>
                {STEP_INFO[step].title}
              </button>
              {index < STEPS.length - 1 && <div className="w-2 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>
      </header>

      {/* ステップ1: 写真 */}
      {currentStep === 'photo' && (
        <div className="px-5 py-6 space-y-6">
          <div className="text-center mb-6">
            <iconify-icon icon="solar:camera-bold" width="48" height="48" class="text-primary mb-2"></iconify-icon>
            <h2 className="text-lg font-bold">今日の写真を追加</h2>
            <p className="text-sm text-muted-foreground">活動の様子を撮影しましょう</p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {/* 写真グリッド */}
          <div className="grid grid-cols-2 gap-3">
            {photoPreviewUrls.map((url, index) => (
              <div key={index} className="relative aspect-square group">
                <img
                  src={url}
                  alt={`写真 ${index + 1}`}
                  className="w-full h-full object-cover rounded-2xl"
                />
                {analyzingPhoto === index && (
                  <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                    <div className="text-center">
                      <iconify-icon icon="solar:spinner-bold" className="size-8 text-white animate-spin mb-2"></iconify-icon>
                      <p className="text-xs text-white font-medium">AI解析中...</p>
                    </div>
                  </div>
                )}
                {photoAnalysis[index] && analyzingPhoto !== index && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent rounded-b-2xl p-2">
                    <p className="text-[10px] text-white line-clamp-2">
                      {photoAnalysis[index].analysis}
                    </p>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 left-2 size-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg opacity-90 hover:opacity-100 transition-opacity"
                  aria-label="写真を削除"
                >
                  <iconify-icon icon="solar:close-circle-bold" className="size-5"></iconify-icon>
                </button>
                {photoAnalysis[index] && analyzingPhoto !== index && (
                  <button
                    type="button"
                    onClick={() => {
                      // 解析結果をコメントに追加
                      const analysisText = photoAnalysis[index].suggested_comment || photoAnalysis[index].analysis
                      setFormData((prev) => ({
                        ...prev,
                        comment: prev.comment
                          ? `${prev.comment}\n\n[写真${index + 1}]\n${analysisText}`
                          : analysisText,
                      }))
                      // 詳細ステップに移動
                      setCurrentStep('details')
                    }}
                    className="absolute top-2 right-2 size-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg opacity-90 hover:opacity-100 transition-opacity"
                    title="解析結果をコメントに追加"
                    aria-label="解析結果をコメントに追加"
                  >
                    <iconify-icon icon="solar:add-circle-bold" className="size-5"></iconify-icon>
                  </button>
                )}
              </div>
            ))}

            {photos.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square bg-muted rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                <iconify-icon icon="solar:camera-add-bold" width="40" height="40"></iconify-icon>
                <span className="text-sm font-medium">写真を追加</span>
              </button>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {photos.length}/5枚 （後でも追加できます）
          </p>
        </div>
      )}

      {/* ステップ2: コメント */}
      {currentStep === 'comment' && (
        <div className="px-5 py-6 space-y-6">
          <div className="text-center mb-4">
            <iconify-icon icon="solar:pen-new-square-bold" className="size-12 text-primary mb-2"></iconify-icon>
            <h2 className="text-lg font-bold">今日の様子</h2>
            <p className="text-sm text-muted-foreground">飼い主さんへのメッセージを書きましょう</p>
          </div>

          {/* メモ入力エリア */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <iconify-icon icon="solar:notes-bold" className="size-5 text-chart-4"></iconify-icon>
              <span className="text-sm font-bold">メモ書き（AIが清書します）</span>
            </div>
            <textarea
              value={formData.memo}
              onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
              className="w-full h-24 bg-muted/50 border-0 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
              placeholder="走り書きでOK！例：今日はオスワリ完璧、他の犬とも仲良く遊べた、少し興奮気味だったけど落ち着いてトレーニングできた"
            />
          </div>

          {/* AI生成時に使われる情報の表示 */}
          <div className="bg-muted/30 rounded-xl p-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 mb-2">
              <iconify-icon icon="solar:info-circle-bold" className="size-4"></iconify-icon>
              <span className="font-medium">AIが参照する情報</span>
            </div>
            <div className="space-y-1">
              <p>
                ✓ メモ書き
                {formData.memo.trim() ? ` (${formData.memo.length}文字)` : ' (未入力)'}
              </p>
              <p>
                ✓ 写真解析
                {Object.keys(photoAnalysis).length > 0
                  ? ` (${Object.keys(photoAnalysis).length}枚分)`
                  : ' (なし)'}
              </p>
              <p>
                ✓ トレーニング記録
                {Object.keys(formData.training_data).length > 0
                  ? ` (${Object.keys(formData.training_data).length}項目)`
                  : ' (未入力)'}
              </p>
            </div>
          </div>

          {/* AI生成ボタン */}
          <button
            type="button"
            onClick={handleGenerateComment}
            disabled={generating}
            className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <iconify-icon icon="solar:spinner-bold" className="size-5 animate-spin"></iconify-icon>
                生成中...
              </>
            ) : (
              <>
                <iconify-icon icon="solar:magic-stick-3-bold" className="size-5"></iconify-icon>
                AIでコメントを生成
              </>
            )}
          </button>

          {/* 生成されたコメント */}
          <div className="relative">
            <label className="text-sm font-bold flex items-center gap-2 mb-2">
              <iconify-icon icon="solar:document-text-bold" className="size-4 text-primary"></iconify-icon>
              AIが生成したコメント（編集可能）
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="w-full h-56 bg-card border border-border rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
              placeholder="今日のワンちゃんの様子を記入してください..."
            />
            <p className="absolute bottom-3 right-3 text-xs text-muted-foreground">
              {formData.comment.length}文字
            </p>
          </div>
        </div>
      )}

      {/* ステップ3: 詳細（オプション） */}
      {currentStep === 'details' && (
        <div className="px-5 py-6 space-y-4">
          <div className="text-center mb-4">
            <iconify-icon icon="solar:clipboard-check-bold" className="size-12 text-primary mb-2"></iconify-icon>
            <h2 className="text-lg font-bold">詳細記録（任意）</h2>
            <p className="text-sm text-muted-foreground">時間があれば記録しましょう</p>
          </div>

          {/* トイレ記録（シンプル版） */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <iconify-icon icon="solar:box-bold" className="size-5 text-chart-1"></iconify-icon>
                <span className="font-bold text-sm">トイレ記録</span>
              </div>
              <iconify-icon
                icon={showDetails ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                className="size-5 text-muted-foreground"
              ></iconify-icon>
            </button>

            {showDetails && (
              <div className="border-t border-border p-4 space-y-4">
                {/* 午前 */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-2">午前</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formData.morning_toilet_status}
                      onChange={(e) => setFormData({ ...formData, morning_toilet_status: e.target.value })}
                      className="bg-muted border-0 rounded-lg px-3 py-2 text-sm min-h-[44px]"
                    >
                      <option value="">未選択</option>
                      <option value="成功">成功</option>
                      <option value="失敗">失敗</option>
                    </select>
                    <select
                      value={formData.morning_toilet_location}
                      onChange={(e) => setFormData({ ...formData, morning_toilet_location: e.target.value })}
                      className="bg-muted border-0 rounded-lg px-3 py-2 text-sm min-h-[44px]"
                      disabled={!formData.morning_toilet_status}
                    >
                      <option value="">場所を選択</option>
                      <option value="散歩中">散歩中</option>
                      <option value="自ら指定の場所">自ら指定の場所</option>
                      <option value="誘導して指定の場所">誘導して指定の場所</option>
                    </select>
                  </div>
                </div>

                {/* 午後 */}
                <div>
                  <p className="text-xs font-bold text-muted-foreground mb-2">午後</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formData.afternoon_toilet_status}
                      onChange={(e) => setFormData({ ...formData, afternoon_toilet_status: e.target.value })}
                      className="bg-muted border-0 rounded-lg px-3 py-2 text-sm min-h-[44px]"
                    >
                      <option value="">未選択</option>
                      <option value="成功">成功</option>
                      <option value="失敗">失敗</option>
                    </select>
                    <select
                      value={formData.afternoon_toilet_location}
                      onChange={(e) => setFormData({ ...formData, afternoon_toilet_location: e.target.value })}
                      className="bg-muted border-0 rounded-lg px-3 py-2 text-sm min-h-[44px]"
                      disabled={!formData.afternoon_toilet_status}
                    >
                      <option value="">場所を選択</option>
                      <option value="散歩中">散歩中</option>
                      <option value="自ら指定の場所">自ら指定の場所</option>
                      <option value="誘導して指定の場所">誘導して指定の場所</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* トレーニング記録（設定から取得） */}
          {Object.entries(trainingCategories).map(([categoryKey, category]) => (
            <div key={categoryKey} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <iconify-icon icon={category.icon} className="size-5 text-primary"></iconify-icon>
                <span className="font-bold text-sm">{category.label}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {category.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                    <span className="text-xs">{item.label}</span>
                    <div className="flex gap-1">
                      {ACHIEVEMENT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleTrainingChange(item.id, option.value)}
                          className={`size-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                            formData.training_data[item.id] === option.value
                              ? option.color + ' ring-2 ring-primary'
                              : 'text-muted-foreground/30 hover:bg-muted active:bg-muted'
                          }`}
                          aria-label={`${item.label}を${option.label}に設定`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* 担当スタッフ */}
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <iconify-icon icon="solar:user-bold" className="size-5 text-primary"></iconify-icon>
              <span className="font-bold text-sm">担当スタッフ</span>
            </div>
            <select
              value={formData.staff_id}
              onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
              className="w-full bg-muted border-0 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">選択してください</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 下部ボタン */}
      <div className="fixed bottom-16 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border p-4 z-40">
        <div className="flex gap-3">
          {currentStep !== 'photo' && (
            <button
              type="button"
              onClick={goToPrevStep}
              className="flex-1 py-3 px-4 bg-muted text-foreground rounded-xl font-bold text-sm"
            >
              戻る
            </button>
          )}

          {currentStep === 'comment' ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !formData.comment.trim()}
              className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <iconify-icon icon="solar:spinner-bold" className="size-5 animate-spin"></iconify-icon>
                  送信中...
                </>
              ) : (
                <>
                  <iconify-icon icon="solar:check-circle-bold" className="size-5"></iconify-icon>
                  送信する
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={goToNextStep}
              className="flex-1 py-3 px-4 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            >
              次へ
              <iconify-icon icon="solar:arrow-right-linear" className="size-5"></iconify-icon>
            </button>
          )}
        </div>

        {/* スキップオプション（詳細ステップでコメントをスキップ） */}
        {currentStep === 'details' && formData.comment.trim() && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full mt-2 py-3 text-sm text-primary font-bold min-h-[48px] active:bg-primary/10 rounded-xl transition-colors"
          >
            コメントをスキップして送信
          </button>
        )}
      </div>
    </div>
  )
}

export default JournalCreate
