"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { MaterialUnidade } from "@/lib/materiais";

const UNIDADES_VALIDAS: MaterialUnidade[] = [
  "un",
  "m",
  "m2",
  "barra",
  "kg",
  "par",
  "conjunto",
];

export type MaterialInput = {
  nome: string;
  unidade: MaterialUnidade;
  imagem_url: string | null;
  ativo: boolean;
};

function validar(input: MaterialInput): string | null {
  if (!input.nome.trim()) return "Informe o nome do material.";
  if (!UNIDADES_VALIDAS.includes(input.unidade)) return "Unidade invalida.";
  return null;
}

export async function createMaterial(
  input: MaterialInput,
): Promise<{ error?: string; ok?: boolean }> {
  const erro = validar(input);
  if (erro) return { error: erro };
  if (!supabaseConfigured) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.from("materiais").insert({
    nome: input.nome.trim(),
    unidade: input.unidade,
    imagem_url: input.imagem_url?.trim() || null,
    ativo: input.ativo,
  });
  if (error) return { error: error.message };

  revalidatePath("/materiais");
  return { ok: true };
}

export async function updateMaterial(
  id: number,
  input: MaterialInput,
): Promise<{ error?: string; ok?: boolean }> {
  const erro = validar(input);
  if (erro) return { error: erro };
  if (!supabaseConfigured) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase
    .from("materiais")
    .update({
      nome: input.nome.trim(),
      unidade: input.unidade,
      imagem_url: input.imagem_url?.trim() || null,
      ativo: input.ativo,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/materiais");
  return { ok: true };
}

export async function toggleMaterialAtivo(
  id: number,
  ativo: boolean,
): Promise<{ error?: string; ok?: boolean }> {
  if (!supabaseConfigured) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.from("materiais").update({ ativo }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/materiais");
  return { ok: true };
}

export async function deleteMaterial(
  id: number,
): Promise<{ error?: string; ok?: boolean }> {
  if (!supabaseConfigured) return { ok: true };

  const supabase = await createClient();
  const { error } = await supabase.from("materiais").delete().eq("id", id);
  if (error) {
    // FK: material usado em solicitacoes de compra
    if (error.code === "23503") {
      return {
        error:
          "Este material esta em uso em solicitacoes de compra. Desative-o em vez de excluir.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/materiais");
  return { ok: true };
}
