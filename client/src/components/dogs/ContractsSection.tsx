import { Icon } from '../Icon'

type Contract = {
  id: number
  contract_type: string
  course_name?: string
  price?: number
  valid_until?: string
  calculated_remaining?: number
  remaining_sessions?: number
  monthly_sessions?: number
}

type ContractsSectionProps = {
  contracts: Contract[]
  loading: boolean
  onCreate: () => void
  onSelect: (id: number) => void
}

function getContractTypeClass(contractType: string): string {
  switch (contractType) {
    case '月謝制':
      return 'bg-chart-2/10 text-chart-2'
    case 'チケット制':
      return 'bg-chart-4/10 text-chart-4'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function getRemainingColor(remaining: number): string {
  if (remaining <= 0) return 'text-destructive'
  if (remaining <= 3) return 'text-chart-4'
  return 'text-chart-2'
}

function getContractBorderClass(isExpired: boolean, isExpiringSoon: boolean): string {
  if (isExpired) return 'border-destructive/30 bg-destructive/5'
  if (isExpiringSoon) return 'border-chart-4/30 bg-chart-4/5'
  return 'border-border'
}

function isContractExpired(validUntil?: string): boolean {
  if (!validUntil) return false
  return new Date(validUntil) < new Date()
}

function isContractExpiringSoon(validUntil?: string): boolean {
  if (!validUntil) return false
  const daysUntil = Math.floor(
    (new Date(validUntil).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  )
  return daysUntil >= 0 && daysUntil <= 14
}

export default function ContractsSection({
  contracts,
  loading,
  onCreate,
  onSelect,
}: ContractsSectionProps): JSX.Element {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Icon icon="solar:document-bold" className="text-chart-4 size-5" />
          契約情報
        </h3>
        <button onClick={onCreate} className="text-xs font-bold text-primary flex items-center gap-1 active:scale-[0.98] transition-all">
          <Icon icon="solar:add-circle-bold" className="size-3.5" />
          新規契約
        </button>
      </div>
      <div className="p-6">
        {loading ? (
          <div className="text-center py-4">
            <span className="text-xs text-muted-foreground">読み込み中...</span>
          </div>
        ) : contracts.length > 0 ? (
          <div className="space-y-3">
            {contracts.map((contract) => {
              const expired = isContractExpired(contract.valid_until)
              const expiringSoon = isContractExpiringSoon(contract.valid_until)
              const remaining = contract.calculated_remaining || contract.remaining_sessions || 0

              return (
                <div
                  key={contract.id}
                  onClick={() => onSelect(contract.id)}
                  className={`p-4 rounded-xl border cursor-pointer hover:bg-muted/30 transition-colors ${getContractBorderClass(expired, expiringSoon)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-bold">{contract.course_name || contract.contract_type}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getContractTypeClass(contract.contract_type)}`}>
                          {contract.contract_type}
                        </span>
                      </div>
                      {contract.price && (
                        <p className="text-xs text-muted-foreground">料金: ¥{Math.floor(contract.price).toLocaleString()}</p>
                      )}
                    </div>
                    {expired && (
                      <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">
                        期限切れ
                      </span>
                    )}
                    {expiringSoon && !expired && (
                      <span className="text-xs bg-chart-4/10 text-chart-4 px-2 py-0.5 rounded-full font-bold">
                        期限間近
                      </span>
                    )}
                  </div>
                  {contract.contract_type === 'チケット制' && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">残回数</span>
                        <span className={`font-bold ${getRemainingColor(remaining)}`}>
                          {remaining}回
                        </span>
                      </div>
                      {contract.valid_until && (
                        <div className="flex items-center justify-between text-xs mt-1">
                          <span className="text-muted-foreground">有効期限</span>
                          <span className={expired ? 'text-destructive font-bold' : ''}>
                            {new Date(contract.valid_until).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {contract.contract_type === '月謝制' && contract.monthly_sessions && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">月あたり回数</span>
                        <span className="font-bold text-chart-2">{contract.monthly_sessions}回</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Icon icon="solar:document-text-bold" className="size-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">契約情報がありません</p>
            <p className="text-xs text-muted-foreground mb-4">契約を登録して管理を開始しましょう</p>
            <button
              onClick={onCreate}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 mx-auto hover:bg-primary/90 active:scale-[0.98] transition-all"
              aria-label="新規契約を追加"
            >
              <Icon icon="solar:add-circle-bold" className="size-5" />
              <span>新規契約を追加</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
