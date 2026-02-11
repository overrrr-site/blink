import { useRef } from 'react'
import { Icon } from '@/components/Icon'
import type { PhotosData, ConcernPhoto, RecordType } from '@/types/record'
import AISuggestion from './AISuggestion'
import type { AISuggestionData } from '@/types/ai'
import { createLocalPhoto, createLocalConcernPhoto } from '@/utils/recordPhotos'

interface PhotosFormProps {
  data: PhotosData
  onChange: (data: PhotosData) => void
  recordType?: RecordType
  showConcerns?: boolean
  aiSuggestion?: AISuggestionData | null
  onAISuggestionAction?: (editedText?: string) => void
  onAISuggestionDismiss?: () => void
  onPhotoAdded?: (photoUrl: string, type: 'regular' | 'concern') => void
}

export default function PhotosForm({
  data,
  onChange,
  recordType,
  showConcerns,
  aiSuggestion,
  onAISuggestionAction,
  onAISuggestionDismiss,
  onPhotoAdded,
}: PhotosFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const concernFileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'regular' | 'concern') => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string
        if (type === 'regular') {
          const next = {
            ...data,
            regular: [...(data.regular || []), createLocalPhoto(base64)],
          }
          onChange(next)
        } else {
          const next = {
            ...data,
            concerns: [...(data.concerns || []), createLocalConcernPhoto(base64, '')],
          }
          onChange(next)
        }
        onPhotoAdded?.(base64, type)
      }
      reader.readAsDataURL(file)
    })

    e.target.value = ''
  }

  const removeRegularPhoto = (index: number) => {
    const updated = [...(data.regular || [])]
    updated.splice(index, 1)
    onChange({ ...data, regular: updated })
  }

  const removeConcernPhoto = (index: number) => {
    const updated = [...(data.concerns || [])]
    updated.splice(index, 1)
    onChange({ ...data, concerns: updated })
  }

  const handleAnnotate = (index: number, event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    const updated = [...(data.concerns || [])]
    const current = updated[index]
    if (!current) return
    updated[index] = { ...current, annotation: { x: Math.round(x), y: Math.round(y) } } as ConcernPhoto
    onChange({ ...data, concerns: updated })
  }

  return (
    <div className="space-y-4">
      {aiSuggestion && !aiSuggestion.dismissed && !aiSuggestion.applied && (
        <AISuggestion
          message={aiSuggestion.message}
          preview={aiSuggestion.preview}
          variant={aiSuggestion.variant}
          actionLabel={aiSuggestion.actionLabel}
          onApply={(editedText) => onAISuggestionAction?.(editedText)}
          onDismiss={() => onAISuggestionDismiss?.()}
        />
      )}
      {/* 写真 */}
      <div>
        <p className="text-sm font-medium text-foreground mb-2">{recordType === 'grooming' ? '仕上がり' : '写真'}</p>
        <div className="flex flex-wrap gap-2">
          {(data.regular || []).map((photo, index) => (
            <div key={index} className="relative">
              <img
                src={photo.url}
                alt={`写真 ${index + 1}`}
                className="size-20 rounded-xl object-cover"
              />
              <button
                onClick={() => removeRegularPhoto(index)}
                className="absolute -top-2 -right-2 size-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                aria-label="写真を削除"
              >
                <Icon icon="solar:close-circle-bold" width="16" height="16" />
              </button>
            </div>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="size-20 rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:bg-background active:scale-95 transition-all"
            aria-label="写真を追加"
          >
            <Icon icon="solar:add-circle-linear" width="24" height="24" className="text-muted-foreground" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'regular')}
          />
        </div>
      </div>

      {/* 気になる箇所（トリミングのみ） */}
      {showConcerns && (
        <div className="bg-destructive/10 rounded-xl p-3 mt-3">
          <p className="text-sm font-medium text-destructive mb-2">気になる箇所</p>
          <div className="flex flex-wrap gap-2">
            {(data.concerns || []).map((concern, index) => (
              <div key={index} className="relative">
                <button
                  type="button"
                  onClick={(event) => handleAnnotate(index, event)}
                  className="relative size-[90px] rounded-xl overflow-hidden"
                  aria-label="気になる箇所を注釈"
                >
                  <img
                    src={concern.url}
                    alt={concern.label || `気になる箇所 ${index + 1}`}
                    className="size-full object-cover"
                  />
                  {concern.annotation && (
                    <div
                      className="absolute size-8 rounded-full border-[3px] border-red-500"
                      style={{
                        left: `${concern.annotation.x}%`,
                        top: `${concern.annotation.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    />
                  )}
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-black/60 rounded-b-xl px-2 py-1">
                  <input
                    type="text"
                    value={concern.label || ''}
                    onChange={(e) => {
                      const updated = [...(data.concerns || [])]
                      updated[index] = { ...updated[index], label: e.target.value }
                      onChange({ ...data, concerns: updated })
                    }}
                    placeholder="ラベル"
                    className="w-full text-xs text-white bg-transparent border-none focus:outline-none placeholder:text-white/60"
                  />
                </div>
                <button
                  onClick={() => removeConcernPhoto(index)}
                  className="absolute -top-2 -right-2 size-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                  aria-label="写真を削除"
                >
                  <Icon icon="solar:close-circle-bold" width="16" height="16" />
                </button>
              </div>
            ))}
            <button
              onClick={() => concernFileInputRef.current?.click()}
              className="size-[90px] rounded-xl border-2 border-dashed border-destructive/20 flex items-center justify-center hover:bg-destructive/10 active:scale-95 transition-all"
              aria-label="気になる箇所の写真を追加"
            >
              <Icon icon="solar:add-circle-linear" width="24" height="24" className="text-destructive" />
            </button>
            <input
              ref={concernFileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e, 'concern')}
            />
          </div>
        </div>
      )}
    </div>
  )
}
