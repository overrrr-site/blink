import { memo } from 'react'
import type { ChangeEvent, RefObject } from 'react'
import { Icon } from '../Icon'
import type { DogHealthData } from './types'

interface DogEditHealthProps {
  data: DogHealthData
  uploading: string | null
  mixedVaccineInputRef: RefObject<HTMLInputElement>
  rabiesVaccineInputRef: RefObject<HTMLInputElement>
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onFileSelect: (e: ChangeEvent<HTMLInputElement>, type: 'mixed' | 'rabies') => void
  onRemoveFile: (type: 'mixed' | 'rabies') => void
  getFileUrl: (url: string) => string
}

const DogEditHealth = memo(function DogEditHealth({
  data,
  uploading,
  mixedVaccineInputRef,
  rabiesVaccineInputRef,
  onChange,
  onFileSelect,
  onRemoveFile,
  getFileUrl,
}: DogEditHealthProps) {
  return (
    <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
        <Icon icon="solar:health-bold" width="16" height="16" className="text-chart-2" />
        健康情報
      </h3>

      <div className="space-y-4">
        {/* 混合ワクチン */}
        <div className="bg-muted/30 rounded-xl p-4">
          <label className="block text-xs font-bold text-foreground mb-2">
            混合ワクチン
          </label>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">接種日</label>
              <input
                type="date"
                name="mixed_vaccine_date"
                value={data.mixed_vaccine_date}
                onChange={onChange}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">証明書</label>
              <input
                ref={mixedVaccineInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => onFileSelect(e, 'mixed')}
                className="hidden"
              />
              {data.mixed_vaccine_cert_url ? (
                <div className="flex items-center gap-2">
                  <a
                    href={getFileUrl(data.mixed_vaccine_cert_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border border-chart-2 bg-chart-2/10 text-sm text-chart-2 hover:bg-chart-2/20 transition-colors"
                  >
                    <Icon icon="solar:file-check-bold" width="20" height="20" />
                    <span className="truncate">証明書をプレビュー</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => onRemoveFile('mixed')}
                    className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Icon icon="solar:trash-bin-trash-bold" width="20" height="20" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => mixedVaccineInputRef.current?.click()}
                  disabled={uploading === 'mixed'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                >
                  {uploading === 'mixed' ? (
                    <>
                      <Icon icon="solar:spinner-bold" width="20" height="20" className="animate-spin" />
                      アップロード中...
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:upload-bold" width="20" height="20" />
                      証明書をアップロード
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 狂犬病ワクチン */}
        <div className="bg-muted/30 rounded-xl p-4">
          <label className="block text-xs font-bold text-foreground mb-2">
            狂犬病予防接種
          </label>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">接種日</label>
              <input
                type="date"
                name="rabies_vaccine_date"
                value={data.rabies_vaccine_date}
                onChange={onChange}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">証明書</label>
              <input
                ref={rabiesVaccineInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => onFileSelect(e, 'rabies')}
                className="hidden"
              />
              {data.rabies_vaccine_cert_url ? (
                <div className="flex items-center gap-2">
                  <a
                    href={getFileUrl(data.rabies_vaccine_cert_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border border-chart-2 bg-chart-2/10 text-sm text-chart-2 hover:bg-chart-2/20 transition-colors"
                  >
                    <Icon icon="solar:file-check-bold" width="20" height="20" />
                    <span className="truncate">証明書をプレビュー</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => onRemoveFile('rabies')}
                    className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Icon icon="solar:trash-bin-trash-bold" width="20" height="20" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => rabiesVaccineInputRef.current?.click()}
                  disabled={uploading === 'rabies'}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                >
                  {uploading === 'rabies' ? (
                    <>
                      <Icon icon="solar:spinner-bold" width="20" height="20" className="animate-spin" />
                      アップロード中...
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:upload-bold" width="20" height="20" />
                      証明書をアップロード
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">ノミ・ダニ予防日</label>
          <input
            type="date"
            name="flea_tick_date"
            value={data.flea_tick_date}
            onChange={onChange}
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">アレルギー</label>
          <input
            type="text"
            name="allergies"
            value={data.allergies}
            onChange={onChange}
            placeholder="特になし"
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">既往歴</label>
          <textarea
            name="medical_history"
            value={data.medical_history}
            onChange={onChange}
            placeholder="過去の病歴など"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
        </div>
      </div>
    </section>
  )
})

export default DogEditHealth
