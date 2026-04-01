const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

export async function apiRequest(
  path: string,
  options: { method?: string; body?: unknown; token?: string } = {}
) {
  const { method = 'GET', body, token } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`API ${method} ${path} failed: ${JSON.stringify(data)}`);
  return data;
}

export async function loginAsStaff(email: string, password: string): Promise<string> {
  // Use Supabase client to get token
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || ''
  );
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session.access_token;
}
