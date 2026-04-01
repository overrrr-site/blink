import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: 'e2e/.env.test' });

async function globalTeardown() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.log('[E2E Teardown] Supabase credentials not configured. Skipping cleanup.');
    return;
  }

  // NOTE: We intentionally do NOT delete the base test data (store, staff, owner, dogs)
  // because recreating them each run is slow. They are reused across runs.
  // Only dynamically-created test data (with e2e- prefix) is cleaned up.

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('[E2E Teardown] Cleaning up dynamic test data...');

  // Delete records created during tests (with e2e- prefix in notes or linked to test owners)
  // Foreign key order: records -> reservations -> contracts -> dogs -> owners
  const { data: store } = await supabase
    .from('stores')
    .select('id')
    .eq('name', 'E2Eテスト店舗')
    .maybeSingle();

  if (store) {
    // Clean up dynamically created owners (those with e2e- prefix, not the base test owner)
    const { data: dynamicOwners } = await supabase
      .from('owners')
      .select('id')
      .eq('store_id', store.id)
      .like('name', 'e2e-%');

    if (dynamicOwners && dynamicOwners.length > 0) {
      const ownerIds = dynamicOwners.map(o => o.id);

      // Fetch dog IDs first (Supabase doesn't support subqueries)
      const { data: dogs } = await supabase
        .from('dogs')
        .select('id')
        .in('owner_id', ownerIds);
      const dogIds = dogs ? dogs.map(d => d.id) : [];

      // Delete related records in dependency order
      if (dogIds.length > 0) {
        await supabase.from('records').delete().in('dog_id', dogIds);
        await supabase.from('reservations').delete().in('dog_id', dogIds);
      }
      await supabase.from('dogs').delete().in('owner_id', ownerIds);
      await supabase.from('owners').delete().in('id', ownerIds);

      console.log(`[E2E Teardown] Cleaned up ${dynamicOwners.length} dynamic test owner(s).`);
    }
  }

  console.log('[E2E Teardown] Cleanup complete.');
}

export default globalTeardown;
