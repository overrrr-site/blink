import { memo } from 'react'
import type { ChangeEvent, RefObject } from 'react'
import { Icon } from '../Icon'
import type { DogFormData } from './types'

interface DogEditBasicInfoProps {
  data: DogFormData
  uploading: string | null
  photoInputRef: RefObject<HTMLInputElement>
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onPhotoSelect: (e: ChangeEvent<HTMLInputElement>) => void
  onOpenPhotoModal: () => void
  onRemovePhoto: () => void
  getFileUrl: (url: string) => string
}

const DogEditBasicInfo = memo(function DogEditBasicInfo({
  data,
  uploading,
  photoInputRef,
  onChange,
  onPhotoSelect,
  onOpenPhotoModal,
  onRemovePhoto,
  getFileUrl,
}: DogEditBasicInfoProps) {
  return (
    <>
      {/* プロフィール写真 */}
      <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
          <Icon icon="solar:camera-bold" width="16" height="16" className="text-primary" />
          プロフィール写真
        </h3>

        <div className="flex flex-col items-center gap-4">
          {/* 写真プレビュー */}
          <div className="relative">
            {data.photo_url ? (
              <div className="relative">
                <img
                  src={getFileUrl(data.photo_url)}
                  alt={data.name || 'プロフィール写真'}
                  className="size-32 rounded-full object-cover border-4 border-primary/20"
                />
                <button
                  type="button"
                  onClick={onRemovePhoto}
                  className="absolute -top-2 -right-2 size-8 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
                >
                  <Icon icon="solar:close-circle-bold" width="20" height="20" />
                </button>
              </div>
            ) : (
              <div className="size-32 rounded-full bg-muted flex items-center justify-center border-4 border-dashed border-border">
                <Icon icon="solar:paw-print-bold" width="48" height="48" className="text-muted-foreground" />
              </div>
            )}
          </div>

          {/* アップロードボタン */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={onPhotoSelect}
            className="hidden"
          />

          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading === 'photo'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-primary bg-primary/10 text-sm text-primary font-medium hover:bg-primary/20 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {uploading === 'photo' ? (
                <>
                  <Icon icon="solar:spinner-bold" width="20" height="20" className="animate-spin" />
                  アップロード中...
                </>
              ) : (
                <>
                  <Icon icon="solar:camera-add-bold" width="20" height="20" />
                  写真をアップロード
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onOpenPhotoModal}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm text-foreground font-medium hover:bg-muted active:scale-[0.98] transition-all"
            >
              <Icon icon="solar:gallery-bold" width="20" height="20" />
              日誌から選択
            </button>
          </div>
        </div>
      </section>

      {/* 基本情報 */}
      <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
          <Icon icon="solar:paw-print-bold" width="16" height="16" className="text-primary" />
          基本情報
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              名前 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={data.name}
              onChange={onChange}
              placeholder="もも"
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              犬種 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="breed"
              value={data.breed}
              onChange={onChange}
              placeholder="トイプードル"
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">性別</label>
              <select
                name="gender"
                value={data.gender}
                onChange={onChange}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="オス">オス</option>
                <option value="メス">メス</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">生年月日</label>
              <input
                type="date"
                name="birth_date"
                value={data.birth_date}
                onChange={onChange}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">体重 (kg)</label>
              <input
                type="number"
                name="weight"
                value={data.weight}
                onChange={onChange}
                step="0.1"
                placeholder="4.5"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">毛色</label>
              <input
                type="text"
                name="color"
                value={data.color}
                onChange={onChange}
                placeholder="アプリコット"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">去勢・避妊</label>
            <select
              name="neutered"
              value={data.neutered}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">未設定</option>
              <option value="済">済み</option>
              <option value="未">未</option>
            </select>
          </div>
        </div>
      </section>
    </>
  )
})

export default DogEditBasicInfo
