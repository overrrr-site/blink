type DogPersonality = {
  dog_compatibility?: string
  human_reaction?: string
  toilet_status?: string
}

type PersonalitySectionProps = {
  personality: DogPersonality
}

export default function PersonalitySection({ personality }: PersonalitySectionProps) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
      <h3 className="text-lg font-bold mb-4">性格・特性</h3>
      <div className="space-y-3">
        {personality.dog_compatibility && (
          <div className="flex items-center gap-2">
            <iconify-icon icon="solar:users-group-rounded-bold" className="size-5 text-chart-3 shrink-0"></iconify-icon>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">他の犬との相性</label>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-base font-medium">{personality.dog_compatibility}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    personality.dog_compatibility === '良好'
                      ? 'bg-chart-2/10 text-chart-2'
                      : personality.dog_compatibility === '普通'
                      ? 'bg-chart-4/10 text-chart-4'
                      : personality.dog_compatibility === '苦手'
                      ? 'bg-chart-4/20 text-chart-4'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {personality.dog_compatibility}
                </span>
              </div>
            </div>
          </div>
        )}
        {personality.human_reaction && (
          <div className="flex items-center gap-2">
            <iconify-icon icon="solar:user-bold" className="size-5 text-primary shrink-0"></iconify-icon>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">人への反応</label>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-base font-medium">{personality.human_reaction}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    personality.human_reaction === 'フレンドリー'
                      ? 'bg-chart-2/10 text-chart-2'
                      : personality.human_reaction === '普通'
                      ? 'bg-muted text-muted-foreground'
                      : personality.human_reaction === '怖がり'
                      ? 'bg-chart-4/10 text-chart-4'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {personality.human_reaction}
                </span>
              </div>
            </div>
          </div>
        )}
        {personality.toilet_status && (
          <div className="flex items-center gap-2">
            <iconify-icon icon="solar:box-bold" className="size-5 text-chart-1 shrink-0"></iconify-icon>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">トイレの状況</label>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-base font-medium">{personality.toilet_status}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    personality.toilet_status === '完璧'
                      ? 'bg-chart-2/10 text-chart-2'
                      : personality.toilet_status === 'ほぼOK'
                      ? 'bg-chart-4/10 text-chart-4'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {personality.toilet_status}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
