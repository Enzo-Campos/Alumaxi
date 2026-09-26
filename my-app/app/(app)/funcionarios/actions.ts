"use server";

/**
 * Cadastro de funcionarios. Salario e vale-alimentacao alimentam a geracao
 * automatica da folha no Financeiro (contas ja geradas nao mudam).
 * CPF/RG/telefone sao gravados so com digitos; o banco valida o CPF.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { cpfValido, soDigitos } from "@/lib/mascaras";

export type FuncionarioInput = {
  nome: string;
  cargo: string | null;
  cpf: string | null;
  rg: string | null;
  telefone: string | null;
  salario: number | null;
  vale_alimentacao: number;
  vale_alimentacao_por_fora: boolean;
  data_admissao: string | null;
  ativo: boolean;
  data_demissao: string | null;
  obs: string | null;
};

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export async function salvarFuncionario(id: number | null, i: FuncionarioInput): Promise<{ error?: string; ok?: boolean }> {
  if (!i.nome.trim()) return { error: "Informe o nome." };
  const cpf = soDigitos(i.cpf) || null;
  if (cpf && !cpfValido(cpf)) return { error: "CPF invalido." };
  const rg = (i.rg ?? "").replace(/[^0-9A-Za-z]/g, "").toUpperCase() || null;
  if (rg && rg.length < 4) return { error: "RG invalido." };
  const telefone = soDigitos(i.telefone) || null;
  if (telefone && !/^\d{10,11}$/.test(telefone)) return { error: "Telefone deve ter DDD + numero." };
  if (i.salario != null && !(i.salario >= 0)) return { error: "Salario invalido." };
  if (!(i.vale_alimentacao >= 0)) return { error: "Vale-alimentacao invalido." };
  if (i.data_admissao && !DATA.test(i.data_admissao)) return { error: "Data de admissao invalida." };
  if (!i.ativo && i.data_demissao && !DATA.test(i.data_demissao)) return { error: "Data de desligamento invalida." };
  if (!supabaseConfigured) return { ok: true };

  const linha = {
    nome: i.nome.trim(),
    cargo: i.cargo?.trim() || null,
    cpf,
    rg,
    telefone,
    salario: i.salario,
    vale_alimentacao: i.vale_alimentacao,
    vale_alimentacao_por_fora: i.vale_alimentacao_por_fora,
    data_admissao: i.data_admissao || null,
    status: i.ativo ? ("ativo" as const) : ("desligado" as const),
    data_demissao: i.ativo ? null : i.data_demissao || null,
    obs: i.obs?.trim() || null,
  };

  const sb = await createClient();
  const { error } = id
    ? await sb.from("funcionarios").update(linha).eq("id", id)
    : await sb.from("funcionarios").insert(linha);
  if (error) {
    if (error.code === "23505") return { error: "Ja existe um funcionario com este CPF." };
    return { error: error.message };
  }
  revalidatePath("/funcionarios");
  revalidatePath("/financeiro");
  return { ok: true };
}
