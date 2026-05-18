-- 犬の性格・特徴の新旧選択肢互換
-- PR4で表示文言を変更したが、既存DBのCHECK制約が旧値のみ許可しているため
-- 新しい選択肢と旧データの両方を保存できるようにする。

ALTER TABLE dog_personality
  DROP CONSTRAINT IF EXISTS dog_personality_dog_compatibility_check,
  DROP CONSTRAINT IF EXISTS dog_personality_human_reaction_check;

ALTER TABLE dog_personality
  ADD CONSTRAINT dog_personality_dog_compatibility_check
    CHECK (
      dog_compatibility IS NULL
      OR dog_compatibility IN (
        '犬が好き',
        '初めは慎重だが慣れる',
        'あまり興味がない',
        '良好',
        '普通',
        '苦手',
        '要注意'
      )
    ),
  ADD CONSTRAINT dog_personality_human_reaction_check
    CHECK (
      human_reaction IS NULL
      OR human_reaction IN (
        '人が好き',
        '初めは慎重だが慣れる',
        'あまり興味がない',
        'フレンドリー',
        '普通',
        '怖がり',
        '要注意'
      )
    );
