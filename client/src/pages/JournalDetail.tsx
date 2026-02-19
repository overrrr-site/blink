import { useEffect, useState, useRef } from 'react'
import { Icon } from '../components/Icon'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import type { Staff } from '../types/staff'
import { useToast } from '../components/Toast'
import { LazyImage } from '../components/LazyImage'
import { getDetailThumbnailUrl } from '../utils/image'

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

// トレーニング項目のフォールバックラベル（既知のtypoや古いキーに対応）
const TRAINING_LABEL_FALLBACKS: Record<string, string> = {
  human_interection: '人慣れ', // typo対応
  human_interaction: '人慣れ',
  dog_interaction: '他のワンちゃんとの交流',
  eye_contact: 'アイコンタクト',
  sit: 'オスワリ',
  down: 'フセ',
  stay: 'マテ',
  come: 'オイデ',
  heel: 'ツイテ',
  voice_cue: '声かけでプログラム',
  relax_position: 'リラックスポジション',
  house_training: 'ハウストレーニング',
  environment: '環境慣れ',
  handling: 'ハンドリング',
  teeth_brushing: '歯磨き練習',
  barking: '吠え対策',
  biting: '噛み対策',
  pulling: '引っ張り対策',
  jumping: '飛びつき対策',
}

interface TrainingCategory {
  label: string
  icon: string
  items: Array<{ id: string; label: string }>
}

const JournalDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [journal, setJournal] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [trainingCategories, setTrainingCategories] = useState<Record<string, TrainingCategory>>({})
  const [storeInfo, setStoreInfo] = useState<{ name: string } | null>(null)
  
  // 写真関連
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])
  const [existingPhotos, setExistingPhotos] = useState<string[]>([])
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([])
  
  const [formData, setFormData] = useState({
    morning_toilet_status: '',
    morning_toilet_location: '',
    afternoon_toilet_status: '',
    afternoon_toilet_location: '',
    comment: '',
    staff_id: '',
    next_visit_date: '',
    training_data: {} as Record<string, string>,
  })

  const { data: journalData, isLoading: journalLoading, mutate } = useSWR<any>(
    id ? `/journals/${id}` : null,
    fetcher,
    { revalidateOnFocus: true }
  )
  const { data: staffData, isLoading: staffLoading } = useSWR<Staff[]>(
    '/auth/staff',
    fetcher,
    { revalidateOnFocus: true }
  )
  const { data: trainingData } = useSWR<Record<string, Array<{ item_key: string; item_label: string }>>>(
    '/training-masters',
    fetcher,
    { revalidateOnFocus: true }
  )
  const { data: storeData } = useSWR<{ name: string } | null>(
    '/stores',
    fetcher,
    { revalidateOnFocus: true }
  )

  useEffect(() => {
    if (!journalData) return
    setJournal(journalData)
    if (!isEditing) {
      setFormData({
        morning_toilet_status: journalData.morning_toilet_status || '',
        morning_toilet_location: journalData.morning_toilet_location || '',
        afternoon_toilet_status: journalData.afternoon_toilet_status || '',
        afternoon_toilet_location: journalData.afternoon_toilet_location || '',
        comment: journalData.comment || '',
        staff_id: journalData.staff_id?.toString() || '',
        next_visit_date: journalData.next_visit_date || '',
        training_data: journalData.training_data || {},
      })
    }
    if (journalData.photos && Array.isArray(journalData.photos)) {
      setExistingPhotos(journalData.photos)
    }
  }, [journalData, isEditing])

  useEffect(() => {
    if (staffData) {
      setStaffList(staffData)
    }
  }, [staffData])

  useEffect(() => {
    if (storeData) {
      setStoreInfo(storeData)
    }
  }, [storeData])

  useEffect(() => {
    if (!trainingData || Object.keys(trainingData).length === 0) return
    const convertedCategories: Record<string, TrainingCategory> = {}
    for (const [category, items] of Object.entries(trainingData)) {
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
  }, [trainingData])

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

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const maxNewPhotos = Math.min(files.length, 5 - (existingPhotos.length - photosToDelete.length + photos.length))
    
    if (maxNewPhotos <= 0) {
      showToast('写真は最大5枚までです', 'warning')
      return
    }

    const newPhotos = [...photos, ...files.slice(0, maxNewPhotos)]
    setPhotos(newPhotos)

    const newUrls = files.slice(0, maxNewPhotos).map((file) => URL.createObjectURL(file))
    setPhotoPreviewUrls([...photoPreviewUrls, ...newUrls])
  }

  const removeNewPhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    const newUrls = photoPreviewUrls.filter((_, i) => i !== index)
    setPhotos(newPhotos)
    setPhotoPreviewUrls(newUrls)
  }

  const removeExistingPhoto = (photoUrl: string) => {
    setPhotosToDelete([...photosToDelete, photoUrl])
  }

  const restoreExistingPhoto = (photoUrl: string) => {
    setPhotosToDelete(photosToDelete.filter((url) => url !== photoUrl))
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // 新しい写真をBase64に変換
      const newPhotoBase64List: string[] = []
      for (const photo of photos) {
        const base64 = await fileToBase64(photo)
        newPhotoBase64List.push(base64)
      }

      // 残す既存写真 + 新しい写真
      const remainingExistingPhotos = existingPhotos.filter((url) => !photosToDelete.includes(url))
      const allPhotos = [...remainingExistingPhotos, ...newPhotoBase64List]

      await api.put(`/journals/${id}`, {
        ...formData,
        staff_id: formData.staff_id ? parseInt(formData.staff_id) : null,
        training_data: formData.training_data,
        photos: allPhotos.length > 0 ? allPhotos : null,
      })
      
      setIsEditing(false)
      setPhotos([])
      setPhotoPreviewUrls([])
      setPhotosToDelete([])
      await mutate()
    } catch {
      showToast('日誌の更新に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setPhotos([])
    setPhotoPreviewUrls([])
    setPhotosToDelete([])
    // フォームデータをリセット
    if (journal) {
      setFormData({
        morning_toilet_status: journal.morning_toilet_status || '',
        morning_toilet_location: journal.morning_toilet_location || '',
        afternoon_toilet_status: journal.afternoon_toilet_status || '',
        afternoon_toilet_location: journal.afternoon_toilet_location || '',
        comment: journal.comment || '',
        staff_id: journal.staff_id?.toString() || '',
        next_visit_date: journal.next_visit_date || '',
        training_data: journal.training_data || {},
      })
    }
  }

  // 表示用の写真リスト（削除予定を除く既存写真 + 新規写真）
  const displayPhotos = [
    ...existingPhotos.filter((url) => !photosToDelete.includes(url)),
    ...photoPreviewUrls,
  ]

  // トレーニング記録のラベル取得
  const getTrainingLabel = (itemId: string): string => {
    // トレーニングマスターから検索
    for (const category of Object.values(trainingCategories)) {
      const item = category.items.find((i) => i.id === itemId)
      if (item) return item.label
    }
    // フォールバックラベルを確認
    if (TRAINING_LABEL_FALLBACKS[itemId]) {
      return TRAINING_LABEL_FALLBACKS[itemId]
    }
    // どちらにもない場合はキーをそのまま返す
    return itemId
  }

  const getAchievementLabel = (value: string): { label: string; color: string } => {
    const option = ACHIEVEMENT_OPTIONS.find((o) => o.value === value)
    return option || { label: value, color: 'text-muted-foreground' }
  }

  if (journalLoading || staffLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (!journal) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">日誌が見つかりません</p>
      </div>
    )
  }

  return (
    <div className="pb-6">
      {/* 印刷用ヘッダー（画面では非表示、印刷時のみ表示） */}
      <div className="hidden print:block print:mb-4 print:border-b print:border-border print:pb-4">
        <h1 className="text-xl font-bold">{storeInfo?.name || '店舗名'}</h1>
        <p className="text-sm text-muted-foreground">
          日誌 - {new Date(journal.journal_date).toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'short',
          })}
        </p>
      </div>

      {/* 通常ヘッダー（印刷時は非表示） */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between print:hidden safe-area-pt">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/journals')}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-2 text-foreground rounded-full active:bg-muted transition-colors"
            aria-label="日誌一覧に戻る"
          >
            <Icon icon="solar:arrow-left-linear" width="24" height="24" />
          </button>
          <h1 className="text-lg font-bold font-heading">日誌詳細</h1>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px]"
              aria-label="印刷"
            >
              <Icon icon="solar:printer-bold" width="18" height="18" />
              印刷
            </button>
          )}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-bold min-h-[44px]"
            >
              <Icon icon="solar:pen-bold" width="18" height="18" />
              編集
            </button>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2.5 rounded-lg text-sm font-bold bg-muted text-muted-foreground min-h-[44px]"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-bold min-h-[44px] disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Icon icon="solar:spinner-bold" width="18" height="18" className="animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Icon icon="solar:check-circle-bold" width="18" height="18" />
                    保存
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </header>

      <main className="px-5 pt-4 space-y-6 print:px-0 print:pt-0">
        {/* 犬情報 */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm print:shadow-none print:border-border">
          <div className="flex items-center gap-4">
            {journal.dog_photo ? (
              <LazyImage
                src={getDetailThumbnailUrl(journal.dog_photo)}
                alt={journal.dog_name}
                className="size-16 rounded-full print:size-12"
              />
            ) : (
              <div className="size-16 rounded-full bg-muted flex items-center justify-center print:size-12">
                <Icon icon="solar:paw-print-bold"
                  width="32"
                  height="32"
                  className="text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold print:text-lg">{journal.dog_name}</h2>
              <p className="text-sm text-muted-foreground">{journal.owner_name} 様</p>
              <p className="text-xs text-muted-foreground mt-1 print:hidden">
                {new Date(journal.journal_date).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium print:bg-muted print:text-foreground">
                {journal.visit_count}回目
              </span>
              {journal.staff_name && (
                <p className="text-xs text-muted-foreground mt-2">担当: {journal.staff_name}</p>
              )}
            </div>
          </div>
        </div>

        {/* 写真セクション（写真→コメント→詳細の順） */}
        <section>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2 print:text-sm">
            <Icon icon="solar:gallery-bold" width="20" height="20" className="text-primary" />
            活動写真
          </h3>
          
          {isEditing ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
              
              <div className="grid grid-cols-3 gap-2">
                {/* 既存写真（削除予定でないもの） */}
                {existingPhotos.filter((url) => !photosToDelete.includes(url)).map((url, index) => (
                  <div key={`existing-${index}`} className="relative aspect-square">
                    <img
                      src={url}
                      alt={`既存写真 ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingPhoto(url)}
                      className="absolute -top-2 -right-2 size-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg"
                      aria-label="写真を削除"
                    >
                      <Icon icon="solar:close-circle-bold" width="20" height="20" />
                    </button>
                  </div>
                ))}
                
                {/* 削除予定の写真（薄く表示、復元可能） */}
                {photosToDelete.map((url, index) => (
                  <div key={`deleted-${index}`} className="relative aspect-square opacity-40">
                    <img
                      src={url}
                      alt={`削除予定 ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => restoreExistingPhoto(url)}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl"
                      aria-label="削除を取り消す"
                    >
                      <Icon icon="solar:refresh-bold" width="24" height="24" className="text-white" />
                    </button>
                  </div>
                ))}
                
                {/* 新規追加写真 */}
                {photoPreviewUrls.map((url, index) => (
                  <div key={`new-${index}`} className="relative aspect-square">
                    <img
                      src={url}
                      alt={`新規写真 ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl ring-2 ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => removeNewPhoto(index)}
                      className="absolute -top-2 -right-2 size-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg"
                      aria-label="写真を削除"
                    >
                      <Icon icon="solar:close-circle-bold" width="20" height="20" />
                    </button>
                    <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded">新規</span>
                  </div>
                ))}
                
                {/* 追加ボタン */}
                {displayPhotos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-square bg-muted rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Icon icon="solar:camera-add-bold" width="24" height="24" />
                    <span className="text-xs">追加</span>
                  </button>
                )}
              </div>
              
              <p className="text-xs text-center text-muted-foreground">
                {displayPhotos.length}/5枚
              </p>
            </div>
          ) : (
            <>
              {existingPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 print:grid-cols-4 print:gap-1">
                  {existingPhotos.map((url, index) => (
                    <img
                      key={index}
                      src={url}
                      alt={`活動写真 ${index + 1}`}
                      className="w-full aspect-square object-cover rounded-xl print:rounded print:max-w-[100px]"
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-card rounded-xl p-6 border border-border text-center text-muted-foreground text-sm">
                  写真がありません
                </div>
              )}
            </>
          )}
        </section>

        {/* コメント */}
        <section>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2 print:text-sm">
            <Icon icon="solar:pen-new-square-bold" width="20" height="20" className="text-primary" />
            今日の様子
          </h3>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm print:shadow-none print:border-border">
            {isEditing ? (
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="w-full h-32 bg-input border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="今日のワンちゃんの様子を記入してください..."
              />
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap print:text-xs">
                {journal.comment || '（コメントなし）'}
              </p>
            )}
          </div>
        </section>

        {/* トイレ記録 */}
        <section>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2 print:text-sm">
            <Icon icon="solar:box-bold" width="20" height="20" className="text-chart-1" />
            トイレ記録
          </h3>
          <div className="grid grid-cols-2 gap-3 print:gap-2">
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm print:shadow-none print:border-border print:p-2">
              <h4 className="text-xs font-bold text-muted-foreground mb-2">午前 (AM)</h4>
              {isEditing ? (
                <div className="space-y-2">
                  <select
                    value={formData.morning_toilet_status}
                    onChange={(e) => setFormData({ ...formData, morning_toilet_status: e.target.value })}
                    className="w-full text-sm bg-input border border-border rounded-lg px-3 py-2.5 min-h-[44px]"
                  >
                    <option value="">未選択</option>
                    <option value="成功">成功</option>
                    <option value="失敗">失敗</option>
                  </select>
                  <select
                    value={formData.morning_toilet_location}
                    onChange={(e) => setFormData({ ...formData, morning_toilet_location: e.target.value })}
                    className="w-full text-sm bg-input border border-border rounded-lg px-3 py-2.5 min-h-[44px]"
                  >
                    <option value="">場所を選択</option>
                    <option value="散歩中">散歩中</option>
                    <option value="自ら指定の場所">自ら指定の場所</option>
                    <option value="誘導して指定の場所">誘導して指定の場所</option>
                    <option value="できない">できない</option>
                  </select>
                </div>
              ) : (
                <>
                  <p className={`text-sm font-medium print:text-xs ${
                    journal.morning_toilet_status === '成功' ? 'text-chart-2' :
                    journal.morning_toilet_status === '失敗' ? 'text-destructive' :
                    'text-muted-foreground'
                  }`}>
                    {journal.morning_toilet_status || '未記録'}
                  </p>
                  {journal.morning_toilet_location && (
                    <p className="text-xs text-muted-foreground mt-1">{journal.morning_toilet_location}</p>
                  )}
                </>
              )}
            </div>
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm print:shadow-none print:border-border print:p-2">
              <h4 className="text-xs font-bold text-muted-foreground mb-2">午後 (PM)</h4>
              {isEditing ? (
                <div className="space-y-2">
                  <select
                    value={formData.afternoon_toilet_status}
                    onChange={(e) => setFormData({ ...formData, afternoon_toilet_status: e.target.value })}
                    className="w-full text-sm bg-input border border-border rounded-lg px-3 py-2.5 min-h-[44px]"
                  >
                    <option value="">未選択</option>
                    <option value="成功">成功</option>
                    <option value="失敗">失敗</option>
                  </select>
                  <select
                    value={formData.afternoon_toilet_location}
                    onChange={(e) => setFormData({ ...formData, afternoon_toilet_location: e.target.value })}
                    className="w-full text-sm bg-input border border-border rounded-lg px-3 py-2.5 min-h-[44px]"
                  >
                    <option value="">場所を選択</option>
                    <option value="散歩中">散歩中</option>
                    <option value="自ら指定の場所">自ら指定の場所</option>
                    <option value="誘導して指定の場所">誘導して指定の場所</option>
                    <option value="できない">できない</option>
                  </select>
                </div>
              ) : (
                <>
                  <p className={`text-sm font-medium print:text-xs ${
                    journal.afternoon_toilet_status === '成功' ? 'text-chart-2' :
                    journal.afternoon_toilet_status === '失敗' ? 'text-destructive' :
                    'text-muted-foreground'
                  }`}>
                    {journal.afternoon_toilet_status || '未記録'}
                  </p>
                  {journal.afternoon_toilet_location && (
                    <p className="text-xs text-muted-foreground mt-1">{journal.afternoon_toilet_location}</p>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* トレーニング記録 */}
        <section>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2 print:text-sm">
            <Icon icon="solar:star-bold" width="20" height="20" className="text-chart-4" />
            トレーニング記録
          </h3>
          
          {isEditing ? (
            <div className="space-y-4">
              {Object.entries(trainingCategories).map(([categoryKey, category]) => (
                <div key={categoryKey} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon icon={category.icon} width="18" height="18" className="text-primary" />
                    <span className="font-bold text-sm">{category.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {category.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                        <span className="text-xs">{item.label}</span>
                        <div className="flex gap-1">
                          {ACHIEVEMENT_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => handleTrainingChange(item.id, option.value)}
                              className={`size-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
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
            </div>
          ) : (
            <>
              {journal.training_data && Object.keys(journal.training_data).length > 0 ? (
                <div className="bg-card rounded-xl p-4 border border-border shadow-sm print:shadow-none print:border-border print:p-2">
                  <div className="flex flex-wrap gap-2 print:gap-1">
                    {Object.entries(journal.training_data).map(([itemId, value]) => {
                      const { label, color } = getAchievementLabel(value as string)
                      return (
                        <span
                          key={itemId}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${color} print:text-[10px] print:px-1`}
                        >
                          {getTrainingLabel(itemId)}: {label}
                        </span>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-card rounded-xl p-6 border border-border text-center text-muted-foreground text-sm">
                  トレーニング記録がありません
                </div>
              )}
            </>
          )}
        </section>

        {/* 担当スタッフ（編集時のみ表示） */}
        {isEditing && (
          <section>
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <Icon icon="solar:user-bold" width="20" height="20" className="text-chart-3" />
              担当スタッフ
            </h3>
            <div className="bg-card rounded-xl border border-border p-4">
              <select
                value={formData.staff_id}
                onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
              >
                <option value="">選択してください</option>
                {staffList.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
            </div>
          </section>
        )}

        {/* 次回訪問日 */}
        {(isEditing || journal.next_visit_date) && (
          <section>
            <h3 className="text-base font-bold mb-3 flex items-center gap-2 print:text-sm">
              <Icon icon="solar:calendar-bold" width="20" height="20" className="text-chart-5" />
              次回訪問予定日
            </h3>
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm print:shadow-none print:border-border">
              {isEditing ? (
                <input
                  type="date"
                  value={formData.next_visit_date}
                  onChange={(e) => setFormData({ ...formData, next_visit_date: e.target.value })}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
                />
              ) : (
                <p className="text-sm font-medium print:text-xs">
                  {journal.next_visit_date
                    ? new Date(journal.next_visit_date).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short',
                      })
                    : '-'}
                </p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default JournalDetail
