/**
 * デモ・動画撮影用シードデータ
 *
 * 使い方:
 *   cd server && npx tsx src/db/seed-demo.ts
 *
 * ロールバック:
 *   cd server && npx tsx src/db/seed-demo.ts --rollback
 *
 * 注意:
 *   既存の seed.ts で作成されたデータ（store_id=1, staff）が存在する前提。
 *   このスクリプトは追加データを投入する。
 */
import pool from './connection.js';

const STORE_ID = 1;

// Supabase Storage の公開画像（犬写真として使用）
const DOG_PHOTOS = [
  'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/generation-assets/photos/veterinary-clinics/square/1.webp',
  'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/generation-assets/photos/veterinary-clinics/square/2.webp',
  'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/generation-assets/photos/veterinary-clinics/square/3.webp',
  'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/generation-assets/photos/veterinary-clinics/square/4.webp',
  'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/generation-assets/photos/veterinary-clinics/square/5.webp',
  'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/generation-assets/photos/veterinary-clinics/square/6.webp',
  'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/generation-assets/photos/veterinary-clinics/square/7.webp',
  'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/generation-assets/photos/veterinary-clinics/square/8.webp',
  'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/generation-assets/photos/veterinary-clinics/square/9.webp',
  'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/generation-assets/photos/veterinary-clinics/square/10.webp',
];

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function monthStart(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

async function getStaffId(): Promise<number> {
  const r = await pool.query(`SELECT id FROM staff LIMIT 1`);
  if (r.rows.length === 0) throw new Error('staff が存在しません。先に seed.ts を実行してください');
  return r.rows[0].id;
}

async function seedDemo() {
  const staffId = await getStaffId();

  console.log('🌱 デモ用シードデータの投入を開始...');

  // ── 追加スタッフ ──
  const staff2 = await pool.query(
    `INSERT INTO staff (email, password_hash, name)
     VALUES ('yamada@example.com', '$2a$10$dummy', '山田 美咲')
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );
  const staff2Id = staff2.rows[0].id;
  await pool.query(
    `INSERT INTO staff_stores (staff_id, store_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [staff2Id, STORE_ID],
  );

  const staff3 = await pool.query(
    `INSERT INTO staff (email, password_hash, name)
     VALUES ('suzuki@example.com', '$2a$10$dummy', '鈴木 健太')
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );
  const staff3Id = staff3.rows[0].id;
  await pool.query(
    `INSERT INTO staff_stores (staff_id, store_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [staff3Id, STORE_ID],
  );
  console.log('  ✅ スタッフ 3名');

  // ── 飼い主 5名 ──
  const owners = [
    { name: '佐藤 優子',   kana: 'サトウ ユウコ',   phone: '090-2345-6789', email: 'sato@example.com',    address: '東京都世田谷区三軒茶屋2-3-4',  lineId: 'sato_line' },
    { name: '伊藤 大輔',   kana: 'イトウ ダイスケ', phone: '080-3456-7890', email: 'ito@example.com',     address: '東京都目黒区自由が丘1-5-6',    lineId: 'ito_line' },
    { name: '高橋 あゆみ', kana: 'タカハシ アユミ', phone: '070-4567-8901', email: 'takahashi@example.com', address: '東京都渋谷区神宮前3-7-8',     lineId: 'takahashi_line' },
    { name: '渡辺 真一',   kana: 'ワタナベ シンイチ', phone: '090-5678-9012', email: 'watanabe@example.com', address: '東京都港区麻布十番1-2-3',    lineId: 'watanabe_line' },
    { name: '小林 めぐみ', kana: 'コバヤシ メグミ', phone: '080-6789-0123', email: 'kobayashi@example.com', address: '東京都品川区中延4-5-6',       lineId: 'kobayashi_line' },
  ];

  const ownerIds: number[] = [];
  for (const o of owners) {
    const r = await pool.query(
      `INSERT INTO owners (store_id, name, name_kana, phone, email, address, line_id, memo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT DO NOTHING RETURNING id`,
      [STORE_ID, o.name, o.kana, o.phone, o.email, o.address, o.lineId, null],
    );
    if (r.rows.length > 0) ownerIds.push(r.rows[0].id);
  }
  // 既存データの田中さんも含める
  const existingOwner = await pool.query(`SELECT id FROM owners WHERE name = '田中 花子' AND store_id = $1 LIMIT 1`, [STORE_ID]);
  if (existingOwner.rows.length > 0) ownerIds.unshift(existingOwner.rows[0].id);
  console.log(`  ✅ 飼い主 ${ownerIds.length}名`);

  // ── 犬 10匹 ──
  interface DogDef {
    ownerId: number;
    name: string;
    breed: string;
    birthDate: string;
    gender: 'オス' | 'メス';
    weight: number;
    color: string;
    photo: string;
    neutered: '済' | '未';
  }

  const dogDefs: DogDef[] = [
    // 佐藤さん: 2匹
    { ownerId: ownerIds[1] ?? ownerIds[0], name: 'コロ',     breed: 'ゴールデン・レトリーバー', birthDate: '2021-03-20', gender: 'オス', weight: 28.5, color: 'ゴールデン',   photo: DOG_PHOTOS[0], neutered: '済' },
    { ownerId: ownerIds[1] ?? ownerIds[0], name: 'ハナ',     breed: '柴犬',                     birthDate: '2022-08-10', gender: 'メス', weight: 8.2,  color: '赤',           photo: DOG_PHOTOS[1], neutered: '済' },
    // 伊藤さん: 3匹
    { ownerId: ownerIds[2] ?? ownerIds[0], name: 'チョコ',   breed: 'ミニチュア・ダックスフンド', birthDate: '2020-01-15', gender: 'オス', weight: 4.8,  color: 'チョコレート', photo: DOG_PHOTOS[2], neutered: '済' },
    { ownerId: ownerIds[2] ?? ownerIds[0], name: 'モカ',     breed: 'ミニチュア・ダックスフンド', birthDate: '2020-01-15', gender: 'メス', weight: 4.3,  color: 'レッド',       photo: DOG_PHOTOS[3], neutered: '済' },
    { ownerId: ownerIds[2] ?? ownerIds[0], name: 'きなこ',   breed: 'チワワ',                     birthDate: '2023-05-20', gender: 'メス', weight: 2.1,  color: 'クリーム',     photo: DOG_PHOTOS[4], neutered: '未' },
    // 高橋さん: 1匹
    { ownerId: ownerIds[3] ?? ownerIds[0], name: 'レオ',     breed: 'フレンチ・ブルドッグ',       birthDate: '2021-11-03', gender: 'オス', weight: 12.5, color: 'ブリンドル',   photo: DOG_PHOTOS[5], neutered: '済' },
    // 渡辺さん: 2匹
    { ownerId: ownerIds[4] ?? ownerIds[0], name: 'ソラ',     breed: 'ポメラニアン',               birthDate: '2022-04-18', gender: 'オス', weight: 3.0,  color: 'ホワイト',     photo: DOG_PHOTOS[6], neutered: '済' },
    { ownerId: ownerIds[4] ?? ownerIds[0], name: 'ルナ',     breed: 'ポメラニアン',               birthDate: '2022-04-18', gender: 'メス', weight: 2.8,  color: 'オレンジ',     photo: DOG_PHOTOS[7], neutered: '済' },
    // 小林さん: 1匹
    { ownerId: ownerIds[5] ?? ownerIds[0], name: 'マロン',   breed: 'トイプードル',               birthDate: '2023-02-14', gender: 'オス', weight: 3.8,  color: 'レッド',       photo: DOG_PHOTOS[8], neutered: '未' },
  ];

  const dogIds: number[] = [];
  // 既存の「もも」のIDも取得
  const existingDog = await pool.query(`SELECT id FROM dogs WHERE name = 'もも' LIMIT 1`);
  if (existingDog.rows.length > 0) dogIds.push(existingDog.rows[0].id);

  for (const d of dogDefs) {
    const r = await pool.query(
      `INSERT INTO dogs (owner_id, name, breed, birth_date, gender, weight, color, photo_url, neutered)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT DO NOTHING RETURNING id`,
      [d.ownerId, d.name, d.breed, d.birthDate, d.gender, d.weight, d.color, d.photo, d.neutered],
    );
    if (r.rows.length > 0) dogIds.push(r.rows[0].id);
  }
  console.log(`  ✅ 犬 ${dogIds.length}匹`);

  // ── 健康情報 ──
  const healthData = [
    // mixed_vaccine_date, rabies_vaccine_date
    // 混合ワクチン期限切れ → アラート表示用
    { mixedDaysAgo: 400, rabiesDaysAgo: 30 },   // コロ: 混合期限切れ
    { mixedDaysAgo: 100, rabiesDaysAgo: 100 },   // ハナ: 有効
    { mixedDaysAgo: 200, rabiesDaysAgo: 200 },   // チョコ: 有効
    { mixedDaysAgo: 200, rabiesDaysAgo: 200 },   // モカ: 有効
    { mixedDaysAgo: 50,  rabiesDaysAgo: -10 },   // きなこ: 狂犬病14日以内→アラート
    { mixedDaysAgo: 150, rabiesDaysAgo: 150 },   // レオ: 有効
    { mixedDaysAgo: 380, rabiesDaysAgo: 180 },   // ソラ: 混合期限切れ
    { mixedDaysAgo: 180, rabiesDaysAgo: 180 },   // ルナ: 有効
    { mixedDaysAgo: 60,  rabiesDaysAgo: -5 },    // マロン: 狂犬病14日以内→アラート
  ];

  for (let i = 0; i < dogIds.length; i++) {
    const h = healthData[i] ?? healthData[0];
    // dogIds[0] は「もも」で既にhealth存在する可能性あり
    await pool.query(
      `INSERT INTO dog_health (dog_id, mixed_vaccine_date, rabies_vaccine_date, food_info, vet_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (dog_id) DO UPDATE SET
         mixed_vaccine_date = EXCLUDED.mixed_vaccine_date,
         rabies_vaccine_date = EXCLUDED.rabies_vaccine_date`,
      [
        dogIds[i],
        daysAgo(h.mixedDaysAgo),
        daysAgo(h.rabiesDaysAgo),
        ['ロイヤルカナン ミニインドア', 'ヒルズ サイエンスダイエット', 'ニュートロ ナチュラルチョイス'][i % 3],
        ['渋谷動物病院', '三軒茶屋ペットクリニック', '自由が丘獣医院'][i % 3],
      ],
    );
  }
  console.log('  ✅ 健康情報');

  // ── 性格情報 ──
  const personalities = [
    { compat: '良好', human: 'フレンドリー', bite: 'なし', bark: 'なし',  toilet: '完璧',         crate: '慣れている' },
    { compat: '普通', human: 'フレンドリー', bite: 'なし', bark: '軽度', toilet: '完璧',         crate: '慣れている' },
    { compat: '良好', human: 'フレンドリー', bite: 'なし', bark: 'なし',  toilet: 'ほぼOK',       crate: '慣れている' },
    { compat: '良好', human: '普通',         bite: 'なし', bark: 'なし',  toilet: '完璧',         crate: '練習中' },
    { compat: '苦手', human: 'フレンドリー', bite: 'なし', bark: '軽度', toilet: 'トレーニング中', crate: '練習中' },
    { compat: '普通', human: 'フレンドリー', bite: 'なし', bark: '軽度', toilet: 'ほぼOK',       crate: '慣れている' },
    { compat: '良好', human: 'フレンドリー', bite: 'なし', bark: 'なし',  toilet: '完璧',         crate: '慣れている' },
    { compat: '良好', human: 'フレンドリー', bite: 'なし', bark: 'なし',  toilet: '完璧',         crate: '慣れている' },
    { compat: '普通', human: 'フレンドリー', bite: 'なし', bark: 'あり', toilet: 'トレーニング中', crate: '苦手' },
  ];

  for (let i = 0; i < dogIds.length; i++) {
    const p = personalities[i] ?? personalities[0];
    await pool.query(
      `INSERT INTO dog_personality (dog_id, dog_compatibility, human_reaction, biting_habit, barking_habit, toilet_status, crate_training, personality_description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (dog_id) DO UPDATE SET
         dog_compatibility = EXCLUDED.dog_compatibility,
         human_reaction = EXCLUDED.human_reaction`,
      [dogIds[i], p.compat, p.human, p.bite, p.bark, p.toilet, p.crate,
       ['元気いっぱいで遊び好き。他の犬ともすぐ仲良くなれる。', 'おとなしくて甘えん坊。初めての場所でも落ち着いている。', '好奇心旺盛で活発。おもちゃが大好き。'][i % 3]],
    );
  }
  console.log('  ✅ 性格情報');

  // ── 契約 ──
  const contractDefs = [
    { dogIdx: 0, type: '月謝制',     course: '週2回コース', totalSessions: null, remaining: null, monthly: 8,  price: 44000 },
    { dogIdx: 1, type: '月謝制',     course: '週3回コース', totalSessions: null, remaining: null, monthly: 12, price: 60000 },
    { dogIdx: 2, type: 'チケット制', course: '10回チケット', totalSessions: 10,   remaining: 7,    monthly: null, price: 55000 },
    { dogIdx: 3, type: 'チケット制', course: '10回チケット', totalSessions: 10,   remaining: 4,    monthly: null, price: 55000 },
    { dogIdx: 4, type: '月謝制',     course: '週1回コース', totalSessions: null, remaining: null, monthly: 4,  price: 24000 },
    { dogIdx: 5, type: '月謝制',     course: '週2回コース', totalSessions: null, remaining: null, monthly: 8,  price: 44000 },
    { dogIdx: 6, type: 'チケット制', course: '5回チケット',  totalSessions: 5,    remaining: 3,    monthly: null, price: 30000 },
    { dogIdx: 7, type: 'チケット制', course: '5回チケット',  totalSessions: 5,    remaining: 2,    monthly: null, price: 30000 },
    { dogIdx: 8, type: '月謝制',     course: '週2回コース', totalSessions: null, remaining: null, monthly: 8,  price: 44000 },
  ];

  for (const c of contractDefs) {
    if (dogIds[c.dogIdx] === undefined) continue;
    await pool.query(
      `INSERT INTO contracts (dog_id, contract_type, course_name, total_sessions, remaining_sessions, monthly_sessions, price, valid_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT DO NOTHING`,
      [dogIds[c.dogIdx], c.type, c.course, c.totalSessions, c.remaining, c.monthly, c.price,
       c.type === 'チケット制' ? daysFromNow(90) : null],
    );
  }
  console.log('  ✅ 契約');

  // ── 予約（今日 + 今月分） ──
  const todayStr = today();
  const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '13:00', '14:00'];

  // 今日の予約: 6件（ダッシュボード用）
  const todayReservations = [
    { dogIdx: 1, time: '09:00', status: '登園済' },
    { dogIdx: 2, time: '09:30', status: '登園済' },
    { dogIdx: 5, time: '10:00', status: '登園済' },
    { dogIdx: 6, time: '10:00', status: '予定' },
    { dogIdx: 8, time: '11:00', status: '予定' },
    { dogIdx: 3, time: '13:00', status: '予定' },
  ];

  const reservationIds: number[] = [];

  for (const r of todayReservations) {
    if (dogIds[r.dogIdx] === undefined) continue;
    const result = await pool.query(
      `INSERT INTO reservations (store_id, dog_id, reservation_date, reservation_time, status, checked_in_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT DO NOTHING RETURNING id`,
      [STORE_ID, dogIds[r.dogIdx], todayStr, r.time,  r.status,
       r.status === '登園済' ? new Date().toISOString() : null],
    );
    if (result.rows.length > 0) reservationIds.push(result.rows[0].id);
  }

  // 過去7日分の予約（降園済、日誌あり/なし混在）
  for (let day = 1; day <= 7; day++) {
    const date = daysAgo(day);
    const dogsForDay = [dogIds[day % dogIds.length], dogIds[(day + 3) % dogIds.length], dogIds[(day + 5) % dogIds.length]];
    for (let j = 0; j < dogsForDay.length; j++) {
      const dogId = dogsForDay[j];
      if (dogId === undefined) continue;
      const result = await pool.query(
        `INSERT INTO reservations (store_id, dog_id, reservation_date, reservation_time, status, checked_in_at, checked_out_at)
         VALUES ($1,$2,$3,$4,'降園済',$5,$6)
         ON CONFLICT DO NOTHING RETURNING id`,
        [STORE_ID, dogId, date, times[j % times.length],
         new Date(`${date}T09:00:00`).toISOString(),
         new Date(`${date}T17:00:00`).toISOString()],
      );
      if (result.rows.length > 0) reservationIds.push(result.rows[0].id);
    }
  }

  // 今月の未来予約（カレンダー用）
  for (let day = 1; day <= 14; day++) {
    const date = daysFromNow(day);
    const dogsForDay = [dogIds[day % dogIds.length], dogIds[(day + 2) % dogIds.length]];
    for (const dogId of dogsForDay) {
      if (dogId === undefined) continue;
      await pool.query(
        `INSERT INTO reservations (store_id, dog_id, reservation_date, reservation_time, status)
         VALUES ($1,$2,$3,$4,'予定')
         ON CONFLICT DO NOTHING`,
        [STORE_ID, dogId, date, times[day % times.length]],
      );
    }
  }
  console.log(`  ✅ 予約 ${reservationIds.length}+ 件`);

  // ── 登園前入力（今日の予約のうち1件） ──
  if (reservationIds.length > 0) {
    await pool.query(
      `INSERT INTO pre_visit_inputs (reservation_id, morning_urination, morning_defecation, breakfast_status, health_status, notes)
       VALUES ($1, true, true, '完食', '元気', '特になし')
       ON CONFLICT (reservation_id) DO NOTHING`,
      [reservationIds[0]],
    );
    console.log('  ✅ 登園前入力');
  }

  // ── 日誌（過去分 + 一部は今日の登園済分） ──
  const comments = [
    '今日は他のお友達とたくさん遊びました！特にボール遊びが楽しかったようで、しっぽを振りながら走り回っていました。午後はぐっすりお昼寝をして、夕方にはまた元気に遊んでいました。',
    'トレーニングに集中して取り組めました。「おすわり」「まて」がしっかりできるようになってきています。散歩中の引っ張りも少なくなり、飼い主さんの横を上手に歩けています。',
    '初めて会うお友達がいましたが、自分から近づいて挨拶できました！社会化が進んでいますね。おやつの時間もきちんと「まて」ができ、とてもお利口でした。',
    '今日は少し興奮気味でしたが、クールダウンの時間を設けると落ち着くことができました。トイレのタイミングも安定してきています。お水もしっかり飲んでいました。',
    '朝の散歩では元気いっぱいに歩いていました。他の犬に吠えることもなく、穏やかに過ごせています。クレートでの休憩時間も静かに過ごせました。',
  ];

  let journalCount = 0;
  // 過去の降園済予約に日誌をつける（一部のみ → 未入力アラート用に残す）
  const pastReservations = await pool.query(
    `SELECT r.id, r.dog_id, r.reservation_date
     FROM reservations r
     WHERE r.store_id = $1 AND r.status IN ('降園済','登園済') AND r.reservation_date <= $2
     ORDER BY r.reservation_date DESC`,
    [STORE_ID, todayStr],
  );

  for (let i = 0; i < pastReservations.rows.length; i++) {
    const r = pastReservations.rows[i];
    // 最新2件は日誌未入力にする（ダッシュボードの未入力アラート用）
    if (i < 2) continue;

    const result = await pool.query(
      `INSERT INTO journals (reservation_id, dog_id, staff_id, journal_date, visit_count,
         morning_toilet_status, morning_toilet_location, afternoon_toilet_status, afternoon_toilet_location,
         training_data, comment, photos)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT DO NOTHING RETURNING id`,
      [
        r.id,
        r.dog_id,
        [staffId, staff2Id, staff3Id][i % 3],
        r.reservation_date,
        Math.floor(Math.random() * 20) + 1,
        '成功',
        ['散歩中', '室内トイレ', '庭'][i % 3],
        '成功',
        ['室内トイレ', '散歩中', '庭'][i % 3],
        JSON.stringify({
          basicTraining: [
            { item_key: 'sit', item_label: 'おすわり', achievement: '○' },
            { item_key: 'wait', item_label: 'まて', achievement: i % 2 === 0 ? '○' : '△' },
            { item_key: 'come', item_label: 'おいで', achievement: '○' },
          ],
          socialization: [
            { item_key: 'other_dogs', item_label: '他犬との交流', achievement: '○' },
            { item_key: 'human_interaction', item_label: '人との交流', achievement: '○' },
          ],
        }),
        comments[i % comments.length],
        JSON.stringify([DOG_PHOTOS[i % DOG_PHOTOS.length], DOG_PHOTOS[(i + 1) % DOG_PHOTOS.length]]),
      ],
    );
    if (result.rows.length > 0) journalCount++;
  }
  console.log(`  ✅ 日誌 ${journalCount}件`);

  // ── トレーニング項目マスタ ──
  const trainingItems = [
    { category: 'basicTraining',    key: 'sit',              label: 'おすわり',       order: 1 },
    { category: 'basicTraining',    key: 'wait',             label: 'まて',           order: 2 },
    { category: 'basicTraining',    key: 'come',             label: 'おいで',         order: 3 },
    { category: 'basicTraining',    key: 'down',             label: 'ふせ',           order: 4 },
    { category: 'socialization',    key: 'other_dogs',       label: '他犬との交流',   order: 1 },
    { category: 'socialization',    key: 'human_interaction', label: '人との交流',     order: 2 },
    { category: 'socialization',    key: 'noise_tolerance',  label: '音への慣れ',     order: 3 },
    { category: 'toiletTraining',   key: 'indoor_toilet',    label: '室内トイレ',     order: 1 },
    { category: 'toiletTraining',   key: 'outdoor_toilet',   label: '屋外トイレ',     order: 2 },
    { category: 'problemBehavior',  key: 'no_biting',        label: '噛みつき防止',   order: 1 },
    { category: 'problemBehavior',  key: 'no_barking',       label: '無駄吠え防止',   order: 2 },
  ];

  for (const t of trainingItems) {
    await pool.query(
      `INSERT INTO training_item_masters (store_id, category, item_key, item_label, display_order, enabled)
       VALUES ($1,$2,$3,$4,$5,true)
       ON CONFLICT (store_id, item_key) DO NOTHING`,
      [STORE_ID, t.category, t.key, t.label, t.order],
    );
  }
  console.log('  ✅ トレーニング項目マスタ');

  // ── お知らせ ──
  const announcements = [
    { title: '年末年始の営業について', content: '12月29日〜1月3日はお休みとなります。ご迷惑をおかけしますが、よろしくお願いいたします。', important: true,  publishedDaysAgo: 5 },
    { title: '夏季限定プール遊びスタート！', content: '7月1日より、屋上ドッグプールを開放いたします。ぜひワンちゃんと一緒にお楽しみください！', important: false, publishedDaysAgo: 3 },
    { title: 'トレーニングコース新設のお知らせ', content: 'ご要望の多かった「パピークラス」を新設しました。生後6ヶ月未満のワンちゃんが対象です。', important: false, publishedDaysAgo: 1 },
  ];

  for (const a of announcements) {
    await pool.query(
      `INSERT INTO store_announcements (store_id, title, content, is_important, published_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT DO NOTHING`,
      [STORE_ID, a.title, a.content, a.important,
       new Date(Date.now() - a.publishedDaysAgo * 86400000).toISOString(),
       staffId],
    );
  }
  console.log('  ✅ お知らせ 3件');

  // ── 点検記録（今日分） ──
  await pool.query(
    `INSERT INTO inspection_records (store_id, inspection_date, cleaning_done, disinfection_done, maintenance_done, inspector_name)
     VALUES ($1, $2, true, true, false, '中井 翔太')
     ON CONFLICT (store_id, inspection_date) DO NOTHING`,
    [STORE_ID, todayStr],
  );
  console.log('  ✅ 点検記録');

  // ── 店舗設定の補完 ──
  await pool.query(
    `UPDATE stores SET
       business_hours = $2,
       closed_days = $3
     WHERE id = $1`,
    [
      STORE_ID,
      JSON.stringify({
        monday:    { open: '09:00', close: '18:00' },
        tuesday:   { open: '09:00', close: '18:00' },
        wednesday: { open: '09:00', close: '18:00' },
        thursday:  { open: '09:00', close: '18:00' },
        friday:    { open: '09:00', close: '18:00' },
        saturday:  { open: '10:00', close: '17:00' },
        sunday:    null,
      }),
      JSON.stringify(['sunday']),
    ],
  );
  console.log('  ✅ 店舗設定更新');

  console.log('\n🎉 デモ用シードデータの投入が完了しました！');
  console.log('   npm run dev で起動して画面を確認してください。');
}

async function rollback() {
  console.log('🗑️  デモ用データのロールバックを開始...');

  // seed-demo で追加したデータを削除（既存の田中花子・ももは残す）
  await pool.query(`DELETE FROM journals WHERE staff_id IN (SELECT id FROM staff WHERE email IN ('yamada@example.com','suzuki@example.com'))`);
  await pool.query(`DELETE FROM store_announcements WHERE store_id = $1`, [STORE_ID]);
  await pool.query(`DELETE FROM training_item_masters WHERE store_id = $1`, [STORE_ID]);

  // デモで追加した飼い主（田中花子以外）に紐づくデータを削除
  const demoOwners = await pool.query(
    `SELECT id FROM owners WHERE store_id = $1 AND name != '田中 花子'`, [STORE_ID],
  );
  const demoOwnerIds = demoOwners.rows.map((r: { id: number }) => r.id);

  if (demoOwnerIds.length > 0) {
    const demoDogs = await pool.query(
      `SELECT id FROM dogs WHERE owner_id = ANY($1::int[])`, [demoOwnerIds],
    );
    const demoDogIds = demoDogs.rows.map((r: { id: number }) => r.id);

    if (demoDogIds.length > 0) {
      await pool.query(`DELETE FROM journals WHERE dog_id = ANY($1::int[])`, [demoDogIds]);
      await pool.query(`DELETE FROM pre_visit_inputs WHERE reservation_id IN (SELECT id FROM reservations WHERE dog_id = ANY($1::int[]))`, [demoDogIds]);
      await pool.query(`DELETE FROM reservations WHERE dog_id = ANY($1::int[])`, [demoDogIds]);
      await pool.query(`DELETE FROM contracts WHERE dog_id = ANY($1::int[])`, [demoDogIds]);
      await pool.query(`DELETE FROM dog_health WHERE dog_id = ANY($1::int[])`, [demoDogIds]);
      await pool.query(`DELETE FROM dog_personality WHERE dog_id = ANY($1::int[])`, [demoDogIds]);
      await pool.query(`DELETE FROM dogs WHERE id = ANY($1::int[])`, [demoDogIds]);
    }

    await pool.query(`DELETE FROM owners WHERE id = ANY($1::int[])`, [demoOwnerIds]);
  }

  // デモ追加スタッフ
  await pool.query(`DELETE FROM staff_stores WHERE staff_id IN (SELECT id FROM staff WHERE email IN ('yamada@example.com','suzuki@example.com'))`);
  await pool.query(`DELETE FROM staff WHERE email IN ('yamada@example.com','suzuki@example.com')`);

  console.log('✅ ロールバック完了');
}

const isRollback = process.argv.includes('--rollback');

(isRollback ? rollback() : seedDemo())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ エラー:', err);
    process.exit(1);
  });
