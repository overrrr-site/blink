import { supabaseAdmin } from '../helpers/supabase-admin';

export async function cleanupTestData(prefix: string = 'e2e-') {
  // Clean up test records by name prefix
  // Order matters due to foreign key constraints
  const tables = [
    { table: 'records', column: 'id', subquery: `SELECT r.id FROM records r JOIN dogs d ON r.dog_id = d.id JOIN owners o ON d.owner_id = o.id WHERE o.name LIKE '${prefix}%'` },
    { table: 'reservations', column: 'id', subquery: `SELECT res.id FROM reservations res JOIN dogs d ON res.dog_id = d.id JOIN owners o ON d.owner_id = o.id WHERE o.name LIKE '${prefix}%'` },
    { table: 'dogs', column: 'id', subquery: `SELECT d.id FROM dogs d JOIN owners o ON d.owner_id = o.id WHERE o.name LIKE '${prefix}%'` },
    { table: 'owners', column: 'name', pattern: `${prefix}%` },
  ];

  for (const { table, column, pattern, subquery } of tables) {
    if (pattern) {
      await supabaseAdmin.from(table).delete().like(column, pattern);
    }
    // For subquery-based deletion, use direct Supabase queries
  }
}

export async function createTestOwner(storeId: number, data: Record<string, unknown>) {
  const { data: owner, error } = await supabaseAdmin
    .from('owners')
    .insert({ store_id: storeId, ...data })
    .select()
    .single();
  if (error) throw error;
  return owner;
}

export async function createTestDog(ownerId: number, storeId: number, data: Record<string, unknown>) {
  const { data: dog, error } = await supabaseAdmin
    .from('dogs')
    .insert({ owner_id: ownerId, store_id: storeId, ...data })
    .select()
    .single();
  if (error) throw error;
  return dog;
}
