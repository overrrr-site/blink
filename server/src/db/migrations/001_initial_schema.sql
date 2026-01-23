-- スタッフテーブル
CREATE TABLE IF NOT EXISTS staff (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 店舗テーブル
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- スタッフと店舗の関連テーブル
CREATE TABLE IF NOT EXISTS staff_stores (
  staff_id INTEGER REFERENCES staff(id) ON DELETE CASCADE,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, store_id)
);

-- 飼い主テーブル
CREATE TABLE IF NOT EXISTS owners (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_kana VARCHAR(100),
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT,
  emergency_contact VARCHAR(100),
  emergency_picker VARCHAR(100),
  line_id VARCHAR(100),
  memo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 犬テーブル（基本情報）
CREATE TABLE IF NOT EXISTS dogs (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  breed VARCHAR(100) NOT NULL,
  birth_date DATE NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('オス', 'メス')),
  weight DECIMAL(5,2),
  color VARCHAR(50),
  microchip_number VARCHAR(50),
  photo_url TEXT,
  neutered VARCHAR(10) CHECK (neutered IN ('済', '未')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 犬の健康情報テーブル
CREATE TABLE IF NOT EXISTS dog_health (
  id SERIAL PRIMARY KEY,
  dog_id INTEGER REFERENCES dogs(id) ON DELETE CASCADE UNIQUE,
  mixed_vaccine_date DATE,
  mixed_vaccine_cert_url TEXT,
  rabies_vaccine_date DATE,
  rabies_vaccine_cert_url TEXT,
  medical_history TEXT,
  allergies TEXT,
  medications TEXT,
  vet_name VARCHAR(255),
  vet_phone VARCHAR(20),
  food_info TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 犬の性格・特性テーブル
CREATE TABLE IF NOT EXISTS dog_personality (
  id SERIAL PRIMARY KEY,
  dog_id INTEGER REFERENCES dogs(id) ON DELETE CASCADE UNIQUE,
  personality_description TEXT,
  dog_compatibility VARCHAR(20) CHECK (dog_compatibility IN ('良好', '普通', '苦手', '要注意')),
  human_reaction VARCHAR(20) CHECK (human_reaction IN ('フレンドリー', '普通', '怖がり', '要注意')),
  dislikes TEXT,
  likes TEXT,
  biting_habit VARCHAR(20) CHECK (biting_habit IN ('なし', '軽度', 'あり')),
  biting_habit_detail TEXT,
  barking_habit VARCHAR(20) CHECK (barking_habit IN ('なし', '軽度', 'あり')),
  barking_habit_detail TEXT,
  toilet_status VARCHAR(20) CHECK (toilet_status IN ('完璧', 'ほぼOK', 'トレーニング中')),
  crate_training VARCHAR(20) CHECK (crate_training IN ('慣れている', '練習中', '苦手')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 契約テーブル
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  dog_id INTEGER REFERENCES dogs(id) ON DELETE CASCADE,
  contract_type VARCHAR(20) NOT NULL CHECK (contract_type IN ('月謝制', 'チケット制', '単発')),
  course_name VARCHAR(100),
  total_sessions INTEGER,
  remaining_sessions INTEGER,
  valid_until DATE,
  monthly_sessions INTEGER,
  price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 予約テーブル
CREATE TABLE IF NOT EXISTS reservations (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  dog_id INTEGER REFERENCES dogs(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  status VARCHAR(20) DEFAULT '予定' CHECK (status IN ('予定', 'チェックイン済', 'キャンセル')),
  checked_in_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  memo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 登園前入力テーブル
CREATE TABLE IF NOT EXISTS pre_visit_inputs (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE CASCADE UNIQUE,
  morning_urination BOOLEAN DEFAULT FALSE,
  morning_defecation BOOLEAN DEFAULT FALSE,
  afternoon_urination BOOLEAN DEFAULT FALSE,
  afternoon_defecation BOOLEAN DEFAULT FALSE,
  breakfast_status VARCHAR(20) CHECK (breakfast_status IN ('完食', '少し残した', '半分以下', '食べていない')),
  health_status TEXT,
  notes TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 日誌テーブル
CREATE TABLE IF NOT EXISTS journals (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE CASCADE,
  dog_id INTEGER REFERENCES dogs(id) ON DELETE CASCADE,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  journal_date DATE NOT NULL,
  visit_count INTEGER,
  morning_toilet_status VARCHAR(50),
  morning_toilet_location VARCHAR(50),
  afternoon_toilet_status VARCHAR(50),
  afternoon_toilet_location VARCHAR(50),
  training_data JSONB,
  comment TEXT,
  next_visit_date DATE,
  photos JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX idx_owners_store_id ON owners(store_id);
CREATE INDEX idx_dogs_owner_id ON dogs(owner_id);
CREATE INDEX idx_reservations_store_id ON reservations(store_id);
CREATE INDEX idx_reservations_dog_id ON reservations(dog_id);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_journals_dog_id ON journals(dog_id);
CREATE INDEX idx_journals_date ON journals(journal_date);
