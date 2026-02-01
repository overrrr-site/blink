import { Icon } from '../Icon'

type DogPersonality = {
  personality_description?: string
  dog_compatibility?: string
  human_reaction?: string
  likes?: string
  dislikes?: string
  toilet_status?: string
  crate_training?: string
}

type PersonalitySectionProps = {
  personality: DogPersonality
}

function getDogCompatibilityLabel(value: string): string {
  switch (value) {
    case '良好': return '仲良くできる'
    case '普通': return '様子を見ながら'
    case '苦手': return 'ひとり遊びが好き'
    default: return value
  }
}

function getHumanReactionLabel(value: string): string {
  switch (value) {
    case 'フレンドリー': return '人が大好き'
    case '普通': return '慣れると仲良し'
    case '怖がり': return '少し慎重派'
    default: return value
  }
}

function getToiletStatusLabel(value: string): string {
  switch (value) {
    case '完璧': return 'バッチリ'
    case 'ほぼOK': return 'だいたいOK'
    case 'トレーニング中': return '練習中'
    default: return value
  }
}

function getCrateTrainingLabel(value: string): string {
  switch (value) {
    case '慣れている': return 'お気に入りの場所'
    case '練習中': return '慣れてきた'
    case '苦手': return 'まだ練習中'
    default: return value
  }
}

type TraitLevel = 'positive' | 'neutral' | 'negative'

function getTraitBadgeClass(level: TraitLevel): string {
  switch (level) {
    case 'positive':
      return 'bg-chart-2/10 text-chart-2'
    case 'neutral':
      return 'bg-chart-4/10 text-chart-4'
    case 'negative':
      return 'bg-muted text-muted-foreground'
  }
}

interface TraitBadgeProps {
  label: string
  displayLabel: string
  level: TraitLevel
}

function TraitBadge({ label, displayLabel, level }: TraitBadgeProps): JSX.Element {
  return (
    <div className="bg-muted/30 rounded-xl p-3">
      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
      <span className={`text-sm font-medium px-2.5 py-1 rounded-full inline-block ${getTraitBadgeClass(level)}`}>
        {displayLabel}
      </span>
    </div>
  )
}

function getCompatibilityLevel(value: string): TraitLevel {
  switch (value) {
    case '良好': return 'positive'
    case '普通': return 'neutral'
    default: return 'negative'
  }
}

function getHumanReactionLevel(value: string): TraitLevel {
  switch (value) {
    case 'フレンドリー': return 'positive'
    case '普通': return 'neutral'
    default: return 'negative'
  }
}

function getToiletLevel(value: string): TraitLevel {
  switch (value) {
    case '完璧': return 'positive'
    case 'ほぼOK': return 'neutral'
    default: return 'negative'
  }
}

function getCrateLevel(value: string): TraitLevel {
  switch (value) {
    case '慣れている': return 'positive'
    case '練習中': return 'neutral'
    default: return 'negative'
  }
}

export default function PersonalitySection({ personality }: PersonalitySectionProps): JSX.Element | null {
  const hasAnyData = personality.personality_description ||
    personality.dog_compatibility ||
    personality.human_reaction ||
    personality.likes ||
    personality.dislikes ||
    personality.toilet_status ||
    personality.crate_training

  if (!hasAnyData) return null

  return (
    <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Icon icon="solar:heart-bold" className="size-5 text-chart-3" />
        性格・特徴
      </h3>
      <div className="space-y-4">
        {personality.personality_description && (
          <div className="bg-muted/30 rounded-xl p-4">
            <p className="text-sm">{personality.personality_description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {personality.dog_compatibility && (
            <TraitBadge
              label="お友達ワンちゃんとの相性"
              displayLabel={getDogCompatibilityLabel(personality.dog_compatibility)}
              level={getCompatibilityLevel(personality.dog_compatibility)}
            />
          )}
          {personality.human_reaction && (
            <TraitBadge
              label="人への反応"
              displayLabel={getHumanReactionLabel(personality.human_reaction)}
              level={getHumanReactionLevel(personality.human_reaction)}
            />
          )}
          {personality.toilet_status && (
            <TraitBadge
              label="トイレトレーニング"
              displayLabel={getToiletStatusLabel(personality.toilet_status)}
              level={getToiletLevel(personality.toilet_status)}
            />
          )}
          {personality.crate_training && (
            <TraitBadge
              label="クレート"
              displayLabel={getCrateTrainingLabel(personality.crate_training)}
              level={getCrateLevel(personality.crate_training)}
            />
          )}
        </div>

        {(personality.likes || personality.dislikes) && (
          <div className="space-y-2">
            {personality.likes && (
              <div className="flex items-start gap-2">
                <Icon icon="solar:star-bold" className="size-4 text-chart-4 mt-0.5 shrink-0" />
                <div>
                  <label className="text-xs text-muted-foreground">好きなこと</label>
                  <p className="text-sm">{personality.likes}</p>
                </div>
              </div>
            )}
            {personality.dislikes && (
              <div className="flex items-start gap-2">
                <Icon icon="solar:info-circle-bold" className="size-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <label className="text-xs text-muted-foreground">配慮してほしいこと</label>
                  <p className="text-sm">{personality.dislikes}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
