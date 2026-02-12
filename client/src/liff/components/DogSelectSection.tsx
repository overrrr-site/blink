import { Icon } from '../../components/Icon'
import { getAvatarUrl } from '../../utils/image'
import type { LiffDog } from '../types/dog'
import type { RecordType } from '../../types/record'

type DogSelectSectionProps = {
  dogs: LiffDog[]
  selectedDogId: string
  businessType: RecordType
  onChange: (id: string) => void
}

function getDogSelectLabel(businessType: RecordType): string {
  if (businessType === 'grooming') return '来店するワンちゃん'
  if (businessType === 'hotel') return '宿泊するワンちゃん'
  return '登園するワンちゃん'
}

export default function DogSelectSection({ dogs, selectedDogId, businessType, onChange }: DogSelectSectionProps) {
  return (
    <div>
      <label className="block text-sm font-bold mb-2">
        {getDogSelectLabel(businessType)} <span className="text-destructive">*</span>
      </label>
      <div className="space-y-2">
        {dogs.length > 0 ? (
          dogs.map((dog) => (
            <label
              key={dog.id}
              className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all min-h-[64px]
                active:scale-[0.99] ${
                  selectedDogId === String(dog.id)
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-card hover:border-primary/30'
                }`}
            >
              <input
                type="radio"
                name="dog_id"
                value={dog.id}
                checked={selectedDogId === String(dog.id)}
                onChange={(e) => onChange(e.target.value)}
                className="hidden"
                aria-label={`${dog.name}を選択`}
              />
              {dog.photo_url ? (
                <img
                  src={getAvatarUrl(dog.photo_url)}
                  alt={dog.name}
                  loading="lazy"
                  className="size-12 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon icon="solar:paw-print-bold" width="24" height="24" className="text-primary" />
                </div>
              )}
              <span className="font-bold flex-1">{dog.name}</span>
              {selectedDogId === String(dog.id) && (
                <Icon icon="solar:check-circle-bold" width="24" height="24" className="text-primary" />
              )}
            </label>
          ))
        ) : (
          <div className="p-4 bg-muted/50 rounded-2xl text-center">
            <p className="text-muted-foreground">登録されているワンちゃんがいません</p>
          </div>
        )}
      </div>
    </div>
  )
}
