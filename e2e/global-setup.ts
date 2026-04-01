import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function globalSetup() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.log('[E2E Setup] Supabase credentials not configured. Skipping seed data creation.');
    console.log('[E2E Setup] Copy e2e/.env.test.example to e2e/.env.test and fill in credentials.');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const email = process.env.TEST_STAFF_EMAIL || 'e2e-staff@test.blink.pet';
  const password = process.env.TEST_STAFF_PASSWORD || 'TestPassword123!';

  console.log('[E2E Setup] Creating test auth user...');

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existing = existingUsers?.users?.find(u => u.email === email);

  let authUserId: string;
  if (existing) {
    console.log('[E2E Setup] Test user already exists, reusing.');
    authUserId = existing.id;
  } else {
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`Failed to create test user: ${error.message}`);
    authUserId = newUser.user.id;
    console.log('[E2E Setup] Test user created.');
  }

  // Check if test store exists
  const { data: existingStore } = await supabase
    .from('stores')
    .select('id')
    .eq('name', 'E2Eテスト店舗')
    .maybeSingle();

  let storeId: number;
  if (existingStore) {
    storeId = existingStore.id;
    console.log(`[E2E Setup] Test store already exists (id=${storeId}), reusing.`);
  } else {
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .insert({
        name: 'E2Eテスト店舗',
        address: '東京都渋谷区テスト1-2-3',
        business_types: ['daycare', 'grooming', 'hotel'],
        primary_business_type: 'daycare',
      })
      .select()
      .single();
    if (storeError) throw new Error(`Failed to create store: ${storeError.message}`);
    storeId = store.id;
    console.log(`[E2E Setup] Test store created (id=${storeId}).`);
  }

  // Check if staff record exists (staff table has no store_id; staff_stores links staff to stores)
  const { data: existingStaff } = await supabase
    .from('staff')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  let staffId: number;
  if (existingStaff) {
    staffId = existingStaff.id;
    console.log(`[E2E Setup] Staff already exists (id=${staffId}), reusing.`);
  } else {
    const { data: newStaff, error: staffError } = await supabase
      .from('staff')
      .insert({
        auth_user_id: authUserId,
        name: 'E2Eテスト管理者',
        email,
        password_hash: 'supabase_auth',
        is_owner: true,
      })
      .select()
      .single();
    if (staffError) throw new Error(`Failed to create staff: ${staffError.message}`);
    staffId = newStaff.id;
    console.log(`[E2E Setup] Staff record created (id=${staffId}).`);
  }

  // Link staff to store via staff_stores
  const { data: existingLink } = await supabase
    .from('staff_stores')
    .select('staff_id')
    .eq('staff_id', staffId)
    .eq('store_id', storeId)
    .maybeSingle();

  if (!existingLink) {
    const { error: linkError } = await supabase
      .from('staff_stores')
      .insert({ staff_id: staffId, store_id: storeId });
    if (linkError) throw new Error(`Failed to link staff to store: ${linkError.message}`);
    console.log('[E2E Setup] Staff-store link created.');
  }

  // Create test owner
  const phone = process.env.TEST_OWNER_PHONE || '09000000001';
  const lineUserId = process.env.TEST_LINE_USER_ID || 'test_line_user_001';

  const { data: existingOwner } = await supabase
    .from('owners')
    .select('id')
    .eq('store_id', storeId)
    .eq('phone', phone)
    .maybeSingle();

  let ownerId: number;
  if (existingOwner) {
    ownerId = existingOwner.id;
    console.log(`[E2E Setup] Test owner already exists (id=${ownerId}), reusing.`);
  } else {
    const { data: owner, error: ownerError } = await supabase
      .from('owners')
      .insert({
        store_id: storeId,
        name: 'テスト飼い主太郎',
        name_kana: 'テストカイヌシタロウ',
        phone,
        email: 'e2e-owner@test.blink.pet',
        line_id: lineUserId,
        business_types: ['daycare', 'grooming', 'hotel'],
      })
      .select()
      .single();
    if (ownerError) throw new Error(`Failed to create owner: ${ownerError.message}`);
    ownerId = owner.id;
    console.log(`[E2E Setup] Test owner created (id=${ownerId}).`);
  }

  // Create test dogs (gender uses Japanese: オス/メス, no store_id - linked via owner)
  const dogData = [
    { name: 'テスト犬ポチ', breed: 'トイプードル', gender: 'オス', birth_date: '2022-06-15', weight: 4.5 },
    { name: 'テスト犬モモ', breed: '柴犬', gender: 'メス', birth_date: '2023-01-20', weight: 8.0 },
  ];

  for (const dog of dogData) {
    const { data: existingDog } = await supabase
      .from('dogs')
      .select('id')
      .eq('owner_id', ownerId)
      .eq('name', dog.name)
      .maybeSingle();

    if (!existingDog) {
      const { error: dogError } = await supabase
        .from('dogs')
        .insert({ ...dog, owner_id: ownerId });
      if (dogError) throw new Error(`Failed to create dog ${dog.name}: ${dogError.message}`);
      console.log(`[E2E Setup] Dog "${dog.name}" created.`);
    }
  }

  // Store IDs for other setup files
  process.env.E2E_STORE_ID = String(storeId);
  process.env.E2E_OWNER_ID = String(ownerId);

  console.log('[E2E Setup] Global setup complete.');
}

export default globalSetup;
