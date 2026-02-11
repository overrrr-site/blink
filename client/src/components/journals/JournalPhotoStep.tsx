import { memo } from 'react'
import type { ChangeEvent, RefObject } from 'react'
import { Icon } from '../Icon'
import type { PhotoAnalysisResult } from './types'

interface JournalPhotoStepProps {
  fileInputRef: RefObject<HTMLInputElement>
  onPhotoSelect: (e: ChangeEvent<HTMLInputElement>) => void
  onRemovePhoto: (index: number) => void
  onApplyAnalysis: (index: number) => void
  photoPreviewUrls: string[]
  photosCount: number
  photoAnalysis: Record<number, PhotoAnalysisResult>
  analyzingPhoto: number | null
}

const JournalPhotoStep = memo(function JournalPhotoStep({
  fileInputRef,
  onPhotoSelect,
  onRemovePhoto,
  onApplyAnalysis,
  photoPreviewUrls,
  photosCount,
  photoAnalysis,
  analyzingPhoto,
}: JournalPhotoStepProps) {
  return (
    <div className="px-5 py-6 space-y-6">
      <div className="text-center mb-6">
        <Icon icon="solar:camera-bold" width="48" height="48" className="text-primary mb-2" />
        <h2 className="text-lg font-bold">今日の写真を追加</h2>
        <p className="text-sm text-muted-foreground">活動の様子を撮影しましょう</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onPhotoSelect}
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
                  <Icon icon="solar:spinner-bold" className="size-8 text-white animate-spin mb-2" />
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
              onClick={() => onRemovePhoto(index)}
              className="absolute top-2 left-2 size-8 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg opacity-90 hover:opacity-100 active:scale-90 transition-all"
              aria-label="写真を削除"
            >
              <Icon icon="solar:close-circle-bold" className="size-5" />
            </button>
            {photoAnalysis[index] && analyzingPhoto !== index && (
              <button
                type="button"
                onClick={() => onApplyAnalysis(index)}
                className="absolute top-2 right-2 size-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg opacity-90 hover:opacity-100 active:scale-90 transition-all"
                title="解析結果をコメントに追加"
                aria-label="解析結果をコメントに追加"
              >
                <Icon icon="solar:add-circle-bold" className="size-5" />
              </button>
            )}
          </div>
        ))}

        {photosCount < 5 && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square bg-muted rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary active:scale-[0.98] transition-all"
          >
            <Icon icon="solar:camera-add-bold" width="40" height="40" />
            <span className="text-sm font-medium">写真を追加</span>
          </button>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        {photosCount}/5枚 （後でも追加できます）
      </p>
    </div>
  )
})

export default JournalPhotoStep
