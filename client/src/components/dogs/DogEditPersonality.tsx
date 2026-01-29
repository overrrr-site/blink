import { memo } from 'react'
import type { ChangeEvent } from 'react'
import { Icon } from '../Icon'
import type { DogPersonalityData } from './types'

interface DogEditPersonalityProps {
  data: DogPersonalityData
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
}

const DogEditPersonality = memo(function DogEditPersonality({
  data,
  onChange,
}: DogEditPersonalityProps) {
  return (
    <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
        <Icon icon="solar:heart-bold" width="16" height="16" className="text-chart-3" />
        性格・特徴
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">この子の紹介</label>
          <textarea
            name="personality_description"
            value={data.personality_description}
            onChange={onChange}
            placeholder="性格や特徴を自由にご記入ください"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">お友達ワンちゃんとの相性</label>
            <select
              name="dog_compatibility"
              value={data.dog_compatibility}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">未設定</option>
              <option value="良好">仲良くできる</option>
              <option value="普通">様子を見ながら</option>
              <option value="苦手">ひとり遊びが好き</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">人への反応</label>
            <select
              name="human_reaction"
              value={data.human_reaction}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">未設定</option>
              <option value="フレンドリー">人が大好き</option>
              <option value="普通">慣れると仲良し</option>
              <option value="怖がり">少し慎重派</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">トイレトレーニング</label>
            <select
              name="toilet_status"
              value={data.toilet_status}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">未設定</option>
              <option value="完璧">バッチリ</option>
              <option value="ほぼOK">だいたいOK</option>
              <option value="トレーニング中">練習中</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">クレート</label>
            <select
              name="crate_training"
              value={data.crate_training}
              onChange={onChange}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">未設定</option>
              <option value="慣れている">お気に入りの場所</option>
              <option value="練習中">慣れてきた</option>
              <option value="苦手">まだ練習中</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">好きなこと・得意なこと</label>
          <input
            type="text"
            name="likes"
            value={data.likes}
            onChange={onChange}
            placeholder="ボール遊び、散歩、おやつ など"
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">苦手なこと・配慮してほしいこと</label>
          <input
            type="text"
            name="dislikes"
            value={data.dislikes}
            onChange={onChange}
            placeholder="大きな音、長時間の留守番 など"
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>
    </section>
  )
})

export default DogEditPersonality
