import { useEffect, useState, useRef } from 'react'
import { Icon } from '../components/Icon'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import JournalPhotoStep from '../components/journals/JournalPhotoStep'
import JournalCommentStep from '../components/journals/JournalCommentStep'
import JournalDetailsStep from '../components/journals/JournalDetailsStep'
import type {
  AchievementOption,
  JournalFormData,
  MealEntry,
  PhotoAnalysisResult,
  ReservationSummary,
  Staff,
  TrainingCategory,
} from '../components/journals/types'

// カテゴリのアイコンマッピング
const CATEGORY_ICONS: Record<string, string> = {
  toiletTraining: 'solar:box-bold',
  basicTraining: 'solar:star-bold',
  socialization: 'solar:users-group-rounded-bold',
  problemBehavior: 'solar:shield-warning-bold',
  default: 'solar:list-check-bold',
}

// 達成度の選択肢
const ACHIEVEMENT_OPTIONS: AchievementOption[] = [
  { value: 'done', label: '○', color: 'text-chart-2 bg-chart-2/20' },
  { value: 'almost', label: '△', color: 'text-chart-4 bg-chart-4/20' },
  { value: 'not_done', label: '−', color: 'text-muted-foreground bg-muted' },
]

type Step = 'photo' | 'comment' | 'details'

const STEPS: Step[] = ['photo', 'details', 'comment']

const STEP_INFO: Record<Step, { title: string }> = {
  photo: { title: '写真' },
  comment: { title: 'コメント' },
  details: { title: '詳細' },
}

const JournalCreate = () => {
  const { reservationId } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [reservation, setReservation] = useState<ReservationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [analyzingPhoto, setAnalyzingPhoto] = useState<number | null>(null)
  const [photoAnalysis, setPhotoAnalysis] = useState<Record<number, PhotoAnalysisResult>>({})
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])
  const [photos, setPhotos] = useState<File[]>([])
  const [trainingCategories, setTrainingCategories] = useState<Record<string, TrainingCategory>>({})

  // 段階式入力の現在のステップ
  const [currentStep, setCurrentStep] = useState<Step>('photo')
  const [showDetails, setShowDetails] = useState(true)

  const [formData, setFormData] = useState<JournalFormData>({
    staff_id: '',
    morning_toilet_status: '', // '成功' | '失敗' | ''
    morning_toilet_location: '',
    afternoon_toilet_status: '', // '成功' | '失敗' | ''
    afternoon_toilet_location: '',
    training_data: {},
    memo: '', // スタッフのメモ書き（AIが清書する素材）
    comment: '',
    next_visit_date: '',
    meal_data: [],
  })
  const [loadingLastRecord, setLoadingLastRecord] = useState(false)

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
    } catch {
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

  const handleAddMeal = () => {
    setFormData((prev) => ({
      ...prev,
      meal_data: [...prev.meal_data, { time: '', food_name: '', amount: '' }],
    }))
  }

  const handleUpdateMeal = (index: number, field: keyof MealEntry, value: string) => {
    setFormData((prev) => ({
      ...prev,
      meal_data: prev.meal_data.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      ),
    }))
  }

  const handleRemoveMeal = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      meal_data: prev.meal_data.filter((_, i) => i !== index),
    }))
  }

  const handleFillFromLastRecord = async () => {
    if (!reservation?.dog_id) return
    setLoadingLastRecord(true)
    try {
      const response = await api.get(`/journals/latest/${reservation.dog_id}`)
      const last = response.data
      setFormData((prev) => ({
        ...prev,
        morning_toilet_status: last.morning_toilet_status || '',
        morning_toilet_location: last.morning_toilet_location || '',
        afternoon_toilet_status: last.afternoon_toilet_status || '',
        afternoon_toilet_location: last.afternoon_toilet_location || '',
        training_data: last.training_data || {},
        meal_data: last.meal_data || [],
      }))
    } catch {
      // 過去の日誌がない場合は何もしない
    } finally {
      setLoadingLastRecord(false)
    }
  }

  const analyzePhoto = async (photo: File, index: number) => {
    setAnalyzingPhoto(index)
    try {
      const base64 = await fileToBase64(photo)
      const response = await api.post('/ai/analyze-photo', {
        photo_base64: base64,
        dog_name: reservation?.dog_name,
      })
      const analysis = response.data as PhotoAnalysisResult
      setPhotoAnalysis((prev) => ({
        ...prev,
        [index]: analysis,
      }))

      // 解析結果をトレーニングデータに自動反映
      if (analysis.training_suggestions && analysis.training_suggestions.length > 0) {
        setFormData((prev) => {
          const newTrainingData = { ...prev.training_data }
          analysis.training_suggestions?.forEach((suggestion: string) => {
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
    } catch {
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
    const remappedAnalysis: Record<number, PhotoAnalysisResult> = {}
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

  const handleApplyAnalysis = (index: number) => {
    const analysis = photoAnalysis[index]
    const analysisText = analysis?.suggested_comment || analysis?.analysis
    if (!analysisText) return
    setFormData((prev) => ({
      ...prev,
      comment: prev.comment
        ? `${prev.comment}\n\n[写真${index + 1}]\n${analysisText}`
        : analysisText,
    }))
    setCurrentStep('details')
  }

  const updateFormData = (patch: Partial<JournalFormData>) => {
    setFormData((prev) => ({ ...prev, ...patch }))
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
        meal_data: formData.meal_data.length > 0 ? formData.meal_data : null,
      })
      navigate('/journals')
    } catch {
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
          status: formData.morning_toilet_status,
          location: formData.morning_toilet_location,
        },
        afternoon_toilet: {
          status: formData.afternoon_toilet_status,
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
    } catch {
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
            <Icon icon="solar:arrow-left-linear" className="size-6" />
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
        <JournalPhotoStep
          fileInputRef={fileInputRef}
          onPhotoSelect={handlePhotoSelect}
          onRemovePhoto={removePhoto}
          onApplyAnalysis={handleApplyAnalysis}
          photoPreviewUrls={photoPreviewUrls}
          photosCount={photos.length}
          photoAnalysis={photoAnalysis}
          analyzingPhoto={analyzingPhoto}
        />
      )}

      {/* ステップ2: コメント */}
      {currentStep === 'comment' && (
        <JournalCommentStep
          memo={formData.memo}
          comment={formData.comment}
          photoAnalysisCount={Object.keys(photoAnalysis).length}
          trainingCount={Object.keys(formData.training_data).length}
          generating={generating}
          onMemoChange={(e) => updateFormData({ memo: e.target.value })}
          onCommentChange={(e) => updateFormData({ comment: e.target.value })}
          onGenerateComment={handleGenerateComment}
        />
      )}

      {/* ステップ3: 詳細（オプション） */}
      {currentStep === 'details' && (
        <JournalDetailsStep
          formData={formData}
          showDetails={showDetails}
          onToggleDetails={() => setShowDetails(!showDetails)}
          onUpdateForm={updateFormData}
          onTrainingChange={handleTrainingChange}
          trainingCategories={trainingCategories}
          staffList={staffList}
          achievementOptions={ACHIEVEMENT_OPTIONS}
          onAddMeal={handleAddMeal}
          onUpdateMeal={handleUpdateMeal}
          onRemoveMeal={handleRemoveMeal}
          onFillFromLastRecord={handleFillFromLastRecord}
          loadingLastRecord={loadingLastRecord}
        />
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
                  <Icon icon="solar:spinner-bold" className="size-5 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Icon icon="solar:check-circle-bold" className="size-5" />
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
              <Icon icon="solar:arrow-right-linear" className="size-5" />
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
