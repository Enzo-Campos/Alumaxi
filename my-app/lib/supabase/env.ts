export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** true quando as duas variaveis de ambiente estao preenchidas */
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// O modo demonstracao (mock) so existe em desenvolvimento. Em producao, sem as
// variaveis, falha no build/boot em vez de publicar o app com dados falsos.
if (!supabaseConfigured && process.env.NODE_ENV === "production") {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nao definidas. " +
      "Configure-as nas Environment Variables do projeto (Vercel) e faca um novo deploy.",
  );
}
