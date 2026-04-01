import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function query(sql: string, params: unknown[] = []) {
  // Use Supabase's rpc or direct query functionality
  const { data, error } = await supabaseAdmin.rpc('exec_sql', { query: sql, params });
  if (error) throw error;
  return data;
}

export async function createTestAuthUser(email: string, password: string) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  return data.user;
}

export async function deleteTestAuthUser(email: string) {
  // List users and find by email
  const { data } = await supabaseAdmin.auth.admin.listUsers();
  const user = data?.users?.find(u => u.email === email);
  if (user) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
  }
}
