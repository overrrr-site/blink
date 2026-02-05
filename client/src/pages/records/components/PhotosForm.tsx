import { useRef } from 'react'
import { Icon } from '@/components/Icon'
import type { PhotosData } from '@/types/record'

interface PhotosFormProps {
  data: PhotosData
  onChange: (data: PhotosData) => void
  showConcerns?: boolean
}

export default function PhotosForm({ data, onChange, showConcerns }: PhotosFormProps) {
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
          onChange({
            ...data,
            regular: [...(data.regular || []), base64],
          })
        } else {
          onChange({
            ...data,
            concerns: [...(data.concerns || []), { url: base64, label: '' }],
          })
        }
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

  return (
    <div className="space-y-4">
      {/* 仕上がり写真 */}
      <div>
        <p className="text-sm font-medium text-slate-700 mb-2">仕上がり写真</p>
        <div className="flex flex-wrap gap-2">
          {(data.regular || []).map((photo, index) => (
            <div key={index} className="relative">
              <img
                src={photo}
                alt={`写真 ${index + 1}`}
                className="size-20 rounded-xl object-cover"
              />
              <button
                onClick={() => removeRegularPhoto(index)}
                className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm"
                aria-label="写真を削除"
              >
                <Icon icon="solar:close-circle-bold" width="16" height="16" />
              </button>
            </div>
          ))}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="size-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
            aria-label="写真を追加"
          >
            <Icon icon="solar:add-circle-linear" width="24" height="24" className="text-slate-400" />
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
        <div className="bg-red-50 rounded-xl p-3 mt-3">
          <p className="text-sm font-medium text-red-600 mb-2">気になる箇所</p>
          <div className="flex flex-wrap gap-2">
            {(data.concerns || []).map((concern, index) => (
              <div key={index} className="relative">
                <img
                  src={concern.url}
                  alt={concern.label || `気になる箇所 ${index + 1}`}
                  className="size-[90px] rounded-xl object-cover"
                />
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
                  className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm"
                  aria-label="写真を削除"
                >
                  <Icon icon="solar:close-circle-bold" width="16" height="16" />
                </button>
              </div>
            ))}
            <button
              onClick={() => concernFileInputRef.current?.click()}
              className="size-[90px] rounded-xl border-2 border-dashed border-red-200 flex items-center justify-center hover:bg-red-100/50 transition-colors"
              aria-label="気になる箇所の写真を追加"
            >
              <Icon icon="solar:add-circle-linear" width="24" height="24" className="text-red-400" />
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
