import pool from './connection.js';
import bcrypt from 'bcryptjs';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

const TUESDAY = 2;
const FRIDAY = 5;

async function seed(): Promise<void> {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const staffResult = await pool.query(
    `INSERT INTO staff (email, password_hash, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    ['admin@example.com', hashedPassword, '中井 翔太']
  );

  const storeResult = await pool.query(
    `INSERT INTO stores (name, address, phone)
     VALUES ($1, $2, $3)
     RETURNING id`,
    ['Blink 渋谷店', '東京都渋谷区渋谷1-1-1', '03-1234-5678']
  );

  const storeId = storeResult.rows[0].id;

  if (staffResult.rows.length > 0) {
    await pool.query(
      `INSERT INTO staff_stores (staff_id, store_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [staffResult.rows[0].id, storeId]
    );
  }

  const ownerResult = await pool.query(
    `INSERT INTO owners (store_id, name, name_kana, phone, email, address, line_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [storeId, '田中 花子', 'タナカ ハナコ', '090-1234-5678', 'tanaka@example.com', '東京都渋谷区', 'tanaka_line_id']
  );

  const ownerId = ownerResult.rows[0].id;

  const dogResult = await pool.query(
    `INSERT INTO dogs (owner_id, name, breed, birth_date, gender, weight, color, photo_url, neutered)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [ownerId, 'もも', 'トイプードル', '2020-05-15', 'メス', 3.5, 'アプリコット',
     'https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/generation-assets/photos/veterinary-clinics/square/3.webp',
     '済']
  );

  const dogId = dogResult.rows[0].id;

  await pool.query(
    `INSERT INTO dog_health (dog_id, mixed_vaccine_date, rabies_vaccine_date)
     VALUES ($1, $2, $3)`,
    [dogId, '2023-11-01', '2023-11-01']
  );

  await pool.query(
    `INSERT INTO dog_personality (dog_id, dog_compatibility, human_reaction, biting_habit, barking_habit, toilet_status, crate_training)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [dogId, '普通', 'フレンドリー', 'なし', '軽度', '完璧', '慣れている']
  );

  await pool.query(
    `INSERT INTO contracts (dog_id, contract_type, course_name, total_sessions, remaining_sessions, monthly_sessions)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [dogId, '月謝制', '週2回コース', null, null, 8]
  );

  const today = new Date();
  const todayStr = formatDate(today);

  await pool.query(
    `INSERT INTO reservations (store_id, dog_id, reservation_date, reservation_time, status)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING`,
    [storeId, dogId, todayStr, '09:00:00', '予定']
  );
  console.log(`✅ 今日の予約を作成: ${todayStr}`);

  // 今月の火曜日と金曜日に予約を追加（週2回コース想定）
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  let reservationCount = 0;

  for (let i = 0; i < 30; i++) {
    const date = new Date(monthStart);
    date.setDate(date.getDate() + i);

    if (date.getDay() !== TUESDAY && date.getDay() !== FRIDAY) continue;

    await pool.query(
      `INSERT INTO reservations (store_id, dog_id, reservation_date, reservation_time, status)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [storeId, dogId, formatDate(date), '09:00:00', '予定']
    );
    reservationCount++;
  }

  console.log(`✅ ${reservationCount}件の予約データを作成しました`);
  console.log('✅ シードデータの作成が完了しました');
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ シードデータの作成に失敗しました:', error);
    process.exit(1);
  });
