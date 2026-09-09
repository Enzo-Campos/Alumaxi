export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** true quando as duas variaveis de ambiente estao preenchidas */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
