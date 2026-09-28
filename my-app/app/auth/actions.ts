"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function signIn(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "");
  const next = nextRaw.startsWith("/") ? nextRaw : "/painel";

  if (!email || !password) return { error: "Informe e-mail e senha." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    console.error("[signIn]", error.status, error.code, error.message);
    if (error.code === "email_not_confirmed" || /confirm/i.test(error.message)) {
      return { error: "E-mail ainda nao confirmado. Confirme o usuario no painel do Supabase." };
    }
    if (error.code === "invalid_credentials") {
      return { error: "E-mail ou senha invalidos." };
    }
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export type ResetState = { ok?: string; error?: string };

export async function requestPasswordReset(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Digite seu e-mail no campo acima primeiro." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) {
    console.error("[requestPasswordReset]", error.status, error.message);
    return { error: error.message };
  }
  return { ok: `Se houver conta com esse e-mail, o link de redefinicao foi enviado para ${email}.` };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
