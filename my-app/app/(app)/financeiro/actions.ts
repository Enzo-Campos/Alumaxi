"use server";

/**
 * Server actions do Financeiro. As regras de negocio pesadas vivem no banco
 * (triggers/checks em supabase/migrations/2026092612*): aqui so validamos a
 * entrada, normalizamos e traduzimos erros. Ver supabase/README.md.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";
import {
  competenciaDe,
  type AjusteNaoUtil,
  type ContaStatus,
  type ContaView,
  type FormaPagamento,
  type RegraVencimento,
} from "@/lib/financeiro";

type T = Database["public"]["Tables"];
type Resultado = { error?: string; ok?: boolean };

const DATA = /^\d{4}-\d{2}-\d{2}$/;
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

function revalidar() {
  revalidatePath("/financeiro");
}

/** Traduz erros do Postgres/PostgREST para algo que o usuario entenda. */
function traduz(e: { code?: string; message: string }): string {
  if (e.code === "23505") return "Ja existe um registro igual (duplicado).";
  if (e.code === "23503") return "Este registro esta em uso por outras contas. Desative em vez de excluir.";
  if (e.code === "23514") return `Valor invalido (${e.message.match(/"(chk_[a-z_]+)"/)?.[1] ?? "regra do banco"}).`;
  return e.message; // mensagens dos triggers ja estao em portugues
}

const soDigitos = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "") || null;
const texto = (v: string | null | undefined) => v?.trim() || null;

/* ================================================================== */
/* CONTAS                                                             */
/* ================================================================== */

export type ContaInput = {
  descricao: string;
  id_categoria: number;
  id_funcionario: number | null;
  id_local: number | null;
  id_veiculo: number | null;
  id_fornecedor: number | null;
  mes: string; // competencia "AAAA-MM"
  vencimento: string; // AAAA-MM-DD
  valor: number;
  status: ContaStatus;
  data_pagamento: string | null; // so quando pago; vazio = hoje (trigger)
  valor_pago: number | null; // so quando pago; vazio = valor (trigger)
  forma_pagamento: FormaPagamento | null;
  por_fora: boolean;
  obs: string | null;
  id_recorrencia?: number | null; // lancamento de conta variavel
};

function validaConta(i: ContaInput): string | null {
  if (!i.descricao.trim()) return "Informe a descricao.";
  if (!i.id_categoria) return "Escolha a categoria.";
  if (!MES.test(i.mes)) return "Mes de competencia invalido.";
  if (!DATA.test(i.vencimento)) return "Informe o vencimento.";
  if (!(i.valor > 0)) return "Informe um valor maior que zero.";
  if (i.status === "pago") {
    if (i.data_pagamento && !DATA.test(i.data_pagamento)) return "Data de pagamento invalida.";
    if (i.valor_pago != null && !(i.valor_pago >= 0)) return "Valor pago invalido.";
  }
  return null;
}

function linhaConta(i: ContaInput): T["contas_pagar"]["Update"] {
  const pago = i.status === "pago";
  return {
    descricao: i.descricao.trim(),
    id_categoria: i.id_categoria,
    id_funcionario: i.id_funcionario,
    id_local: i.id_local,
    id_veiculo: i.id_veiculo,
    id_fornecedor: i.id_fornecedor,
    competencia: competenciaDe(i.mes),
    vencimento: i.vencimento,
    valor: i.valor,
    status: i.status,
    data_pagamento: pago ? i.data_pagamento || null : null,
    valor_pago: pago ? i.valor_pago : null,
    forma_pagamento: i.forma_pagamento,
    por_fora: i.por_fora,
    obs: texto(i.obs),
  };
}

/** Carrega uma conta para o modal de edicao (aberto de qualquer lista). */
export async function buscarConta(id: number): Promise<{ error?: string; conta?: ContaView }> {
  if (!supabaseConfigured) return { error: "Supabase nao configurado." };
  const sb = await createClient();
  const { data, error } = await sb.from("vw_contas_pagar").select("*").eq("id", id).maybeSingle();
  if (error) return { error: traduz(error) };
  if (!data) return { error: "Conta nao encontrada." };
  return { conta: data };
}

/** Cria (id null) ou edita uma conta. Origem (fixa/folha/divida) nao muda na edicao. */
export async function salvarConta(id: number | null, input: ContaInput): Promise<Resultado> {
  const erro = validaConta(input);
  if (erro) return { error: erro };
  if (!supabaseConfigured) return { ok: true };

  const sb = await createClient();
  const linha = linhaConta(input);
  const { error } = id
    ? await sb.from("contas_pagar").update(linha).eq("id", id)
    : await sb
        .from("contas_pagar")
        .insert({ ...(linha as T["contas_pagar"]["Insert"]), id_recorrencia: input.id_recorrencia ?? null });
  if (error) return { error: traduz(error) };
  revalidar();
  return { ok: true };
}

async function mudaStatus(id: number, status: ContaStatus): Promise<Resultado> {
  if (!supabaseConfigured) return { ok: true };
  const sb = await createClient();
  // data_pagamento/valor_pago sao preenchidos (pago) ou limpos (demais) pelo trigger
  const { error } = await sb.from("contas_pagar").update({ status }).eq("id", id);
  if (error) return { error: traduz(error) };
  revalidar();
  return { ok: true };
}

/** Paga hoje pelo valor da conta. Para outra data/valor, use salvarConta. */
export async function pagarConta(id: number): Promise<Resultado> {
  return mudaStatus(id, "pago");
}

export async function reabrirConta(id: number): Promise<Resultado> {
  return mudaStatus(id, "pendente");
}

export async function cancelarConta(id: number): Promise<Resultado> {
  return mudaStatus(id, "cancelado");
}

/** Exclui. Contas geradas automaticamente sao protegidas pelo banco (cancele). */
export async function excluirConta(id: number): Promise<Resultado> {
  if (!supabaseConfigured) return { ok: true };
  const sb = await createClient();
  const { error } = await sb.from("contas_pagar").delete().eq("id", id);
  if (error) return { error: traduz(error) };
  revalidar();
  return { ok: true };
}

/**
 * Lanca o valor real de uma conta VARIAVEL (recorrencia sem valor) numa
 * competencia. Copia categoria e vinculos da recorrencia; a conta sai de
 * vw_contas_a_lancar.
 */
export async function lancarContaVariavel(input: {
  id_recorrencia: number;
  mes: string;
  vencimento: string;
  valor: number;
  pago: boolean;
}): Promise<Resultado> {
  if (!MES.test(input.mes)) return { error: "Competencia invalida." };
  if (!DATA.test(input.vencimento)) return { error: "Vencimento invalido." };
  if (!(input.valor > 0)) return { error: "Informe o valor da conta." };
  if (!supabaseConfigured) return { ok: true };

  const sb = await createClient();
  const { data: r, error: rErr } = await sb
    .from("recorrencias")
    .select("*")
    .eq("id", input.id_recorrencia)
    .single();
  if (rErr || !r) return { error: rErr ? traduz(rErr) : "Conta fixa nao encontrada." };

  const { error } = await sb.from("contas_pagar").insert({
    descricao: r.descricao,
    id_categoria: r.id_categoria,
    id_fornecedor: r.id_fornecedor,
    id_funcionario: r.id_funcionario,
    id_veiculo: r.id_veiculo,
    id_local: r.id_local,
    competencia: competenciaDe(input.mes),
    vencimento: input.vencimento,
    valor: input.valor,
    forma_pagamento: r.forma_pagamento,
    por_fora: r.por_fora,
    id_recorrencia: r.id,
    status: input.pago ? "pago" : "pendente",
  });
  if (error) return { error: traduz(error) };
  revalidar();
  return { ok: true };
}

/** Gera contas fixas + folha do mes (idempotente — o cron ja faz isso todo dia 1). */
export async function gerarContasDoMes(mes: string): Promise<{ error?: string; criadas?: number }> {
  if (!MES.test(mes)) return { error: "Mes invalido." };
  if (!supabaseConfigured) return { criadas: 0 };
  const sb = await createClient();
  const { data, error } = await sb.rpc("gerar_contas_competencia", {
    p_competencia: competenciaDe(mes),
  });
  if (error) return { error: traduz(error) };
  revalidar();
  return { criadas: data ?? 0 };
}

/* ================================================================== */
/* CONTAS FIXAS / VARIAVEIS (recorrencias)                            */
/* ================================================================== */

export type RecorrenciaInput = {
  descricao: string;
  id_categoria: number;
  id_funcionario: number | null;
  id_local: number | null;
  id_veiculo: number | null;
  id_fornecedor: number | null;
  valor: number | null; // null = variavel (lancada a mao)
  intervalo_meses: number;
  mes_inicio: string; // AAAA-MM
  mes_fim: string | null;
  regra_vencimento: RegraVencimento;
  dia_vencimento: number;
  meses_apos_competencia: number;
  ajuste_nao_util: AjusteNaoUtil;
  forma_pagamento: FormaPagamento | null;
  por_fora: boolean;
  ativa: boolean;
  obs: string | null;
};

export async function salvarRecorrencia(id: number | null, i: RecorrenciaInput): Promise<Resultado> {
  if (!i.descricao.trim()) return { error: "Informe a descricao." };
  if (!i.id_categoria) return { error: "Escolha a categoria." };
  if (i.valor != null && !(i.valor > 0)) return { error: "Valor invalido. Deixe vazio para conta variavel." };
  if (!MES.test(i.mes_inicio)) return { error: "Mes de inicio invalido." };
  if (i.mes_fim && (!MES.test(i.mes_fim) || i.mes_fim < i.mes_inicio))
    return { error: "Mes final invalido (antes do inicio?)." };
  const maxDia = i.regra_vencimento === "dia_util" ? 23 : 31;
  if (!(i.dia_vencimento >= 1 && i.dia_vencimento <= maxDia))
    return { error: `Dia de vencimento deve estar entre 1 e ${maxDia}.` };
  if (!supabaseConfigured) return { ok: true };

  const linha: T["recorrencias"]["Insert"] = {
    descricao: i.descricao.trim(),
    id_categoria: i.id_categoria,
    id_funcionario: i.id_funcionario,
    id_local: i.id_local,
    id_veiculo: i.id_veiculo,
    id_fornecedor: i.id_fornecedor,
    valor: i.valor,
    intervalo_meses: i.intervalo_meses,
    competencia_inicio: competenciaDe(i.mes_inicio),
    competencia_fim: i.mes_fim ? competenciaDe(i.mes_fim) : null,
    regra_vencimento: i.regra_vencimento,
    dia_vencimento: i.dia_vencimento,
    meses_apos_competencia: i.meses_apos_competencia,
    ajuste_nao_util: i.ajuste_nao_util,
    forma_pagamento: i.forma_pagamento,
    por_fora: i.por_fora,
    ativa: i.ativa,
    obs: texto(i.obs),
  };
  const sb = await createClient();
  const { error } = id
    ? await sb.from("recorrencias").update(linha).eq("id", id)
    : await sb.from("recorrencias").insert(linha);
  if (error) return { error: traduz(error) };
  revalidar();
  return { ok: true };
}

/* ================================================================== */
/* DIVIDAS                                                            */
/* ================================================================== */

export type DividaInput = {
  descricao: string;
  id_categoria: number;
  id_fornecedor: number | null;
  id_veiculo: number | null;
  id_local: number | null;
  valor_contratado: number | null;
  valor_parcela: number;
  numero_parcelas: number;
  parcelas_anteriores: number;
  primeiro_vencimento: string;
  forma_pagamento: FormaPagamento | null;
  obs: string | null;
};

/** Cadastra a divida; o banco gera uma conta por parcela restante. */
export async function criarDivida(i: DividaInput): Promise<Resultado> {
  if (!i.descricao.trim()) return { error: "Informe a descricao." };
  if (!i.id_categoria) return { error: "Escolha a categoria." };
  if (!(i.valor_parcela > 0)) return { error: "Informe o valor da parcela." };
  if (!(Number.isInteger(i.numero_parcelas) && i.numero_parcelas >= 1))
    return { error: "Numero de parcelas invalido." };
  if (!(i.parcelas_anteriores >= 0 && i.parcelas_anteriores < i.numero_parcelas))
    return { error: "Parcelas ja pagas deve ser menor que o total." };
  if (!DATA.test(i.primeiro_vencimento)) return { error: "Informe o vencimento da 1a parcela." };
  if (!supabaseConfigured) return { ok: true };

  const sb = await createClient();
  const { error } = await sb.from("dividas").insert({
    descricao: i.descricao.trim(),
    id_categoria: i.id_categoria,
    id_fornecedor: i.id_fornecedor,
    id_veiculo: i.id_veiculo,
    id_local: i.id_local,
    valor_contratado: i.valor_contratado,
    valor_parcela: i.valor_parcela,
    numero_parcelas: i.numero_parcelas,
    parcelas_anteriores: i.parcelas_anteriores,
    primeiro_vencimento: i.primeiro_vencimento,
    forma_pagamento: i.forma_pagamento,
    obs: texto(i.obs),
  });
  if (error) return { error: traduz(error) };
  revalidar();
  return { ok: true };
}

/** So exclui divida sem nenhuma parcela paga (cadastro errado). Remove as parcelas junto. */
export async function excluirDivida(id: number): Promise<Resultado> {
  if (!supabaseConfigured) return { ok: true };
  const sb = await createClient();
  const { count, error: cErr } = await sb
    .from("contas_pagar")
    .select("id", { count: "exact", head: true })
    .eq("id_divida", id)
    .eq("status", "pago");
  if (cErr) return { error: traduz(cErr) };
  if ((count ?? 0) > 0)
    return { error: "A divida tem parcelas pagas: cancele as parcelas restantes em vez de excluir." };

  const { error: pErr } = await sb.from("contas_pagar").delete().eq("id_divida", id);
  if (pErr) return { error: traduz(pErr) };
  const { error } = await sb.from("dividas").delete().eq("id", id);
  if (error) return { error: traduz(error) };
  revalidar();
  return { ok: true };
}

/* ================================================================== */
/* HORAS EXTRAS                                                       */
/* ================================================================== */

/**
 * Registra hora extra de um dia. O banco decide em qual pagamento ela sai
 * (dias 6-20 -> dia 20; 21-5 -> saldo) e atualiza a conta "Hora extra".
 */
export async function salvarHoraExtra(input: {
  id_funcionario: number;
  data: string;
  horas: number | null;
  valor: number;
  obs: string | null;
}): Promise<Resultado> {
  if (!input.id_funcionario) return { error: "Escolha o funcionario." };
  if (!DATA.test(input.data)) return { error: "Informe o dia trabalhado." };
  if (!(input.valor > 0)) return { error: "Informe o valor." };
  if (input.horas != null && !(input.horas > 0)) return { error: "Horas invalidas." };
  if (!supabaseConfigured) return { ok: true };

  const sb = await createClient();
  const { error } = await sb.from("horas_extras").insert({
    id_funcionario: input.id_funcionario,
    data: input.data,
    horas: input.horas,
    valor: input.valor,
    obs: texto(input.obs),
  });
  if (error) return { error: traduz(error) };
  revalidar();
  return { ok: true };
}

export async function excluirHoraExtra(id: number): Promise<Resultado> {
  if (!supabaseConfigured) return { ok: true };
  const sb = await createClient();
  const { error } = await sb.from("horas_extras").delete().eq("id", id);
  if (error) return { error: traduz(error) };
  revalidar();
  return { ok: true };
}

/* ================================================================== */
/* CADASTROS DE APOIO                                                 */
/* ================================================================== */

export async function salvarLocal(
  id: number | null,
  i: { nome: string; endereco: string | null; ativo: boolean },
): Promise<Resultado> {
  if (!i.nome.trim()) return { error: "Informe o nome." };
  if (!supabaseConfigured) return { ok: true };
  const linha = { nome: i.nome.trim(), endereco: texto(i.endereco), ativo: i.ativo };
  const sb = await createClient();
  const { error } = id
    ? await sb.from("locais").update(linha).eq("id", id)
    : await sb.from("locais").insert(linha);
  if (error) return { error: traduz(error) };
  revalidar();
  return { ok: true };
}

export async function salvarVeiculo(
  id: number | null,
  i: { nome: string; placa: string | null; modelo: string | null; ano: number | null; renavam: string | null; ativo: boolean },
): Promise<Resultado> {
  if (!i.nome.trim()) return { error: "Informe o nome." };
  const placa = (i.placa ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "") || null;
  if (placa && !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(placa)) return { error: "Placa invalida (ex.: ABC1D23)." };
  const renavam = soDigitos(i.renavam);
  if (renavam && !/^\d{9,11}$/.test(renavam)) return { error: "RENAVAM invalido." };
  if (i.ano != null && !(i.ano >= 1950 && i.ano <= 2100)) return { error: "Ano invalido." };
  if (!supabaseConfigured) return { ok: true };

  const linha = { nome: i.nome.trim(), placa, modelo: texto(i.modelo), ano: i.ano, renavam, ativo: i.ativo };
  const sb = await createClient();
  const { error } = id
    ? await sb.from("veiculos").update(linha).eq("id", id)
    : await sb.from("veiculos").insert(linha);
  if (error) return { error: traduz(error) };
  revalidar();
  return { ok: true };
}

export async function salvarFornecedor(
  id: number | null,
  i: {
    nome: string;
    documento: string | null;
    telefone: string | null;
    email: string | null;
    chave_pix: string | null;
    obs: string | null;
    ativo: boolean;
  },
): Promise<Resultado> {
  if (!i.nome.trim()) return { error: "Informe o nome." };
  const documento = soDigitos(i.documento);
  if (documento && !/^(\d{11}|\d{14})$/.test(documento)) return { error: "CPF/CNPJ deve ter 11 ou 14 digitos." };
  const telefone = soDigitos(i.telefone);
  if (telefone && !/^\d{10,11}$/.test(telefone)) return { error: "Telefone deve ter DDD + numero." };
  if (!supabaseConfigured) return { ok: true };

  const linha = {
    nome: i.nome.trim(),
    documento,
    telefone,
    email: texto(i.email),
    chave_pix: texto(i.chave_pix),
    obs: texto(i.obs),
    ativo: i.ativo,
  };
  const sb = await createClient();
  const { error } = id
    ? await sb.from("fornecedores").update(linha).eq("id", id)
    : await sb.from("fornecedores").insert(linha);
  if (error) return { error: traduz(error) };
  revalidar();
  return { ok: true };
}

export async function criarCategoria(i: { nome: string; id_grupo: number }): Promise<Resultado> {
  if (!i.nome.trim()) return { error: "Informe o nome da categoria." };
  if (!i.id_grupo) return { error: "Escolha o grupo." };
  if (!supabaseConfigured) return { ok: true };
  const sb = await createClient();
  const { error } = await sb.from("categorias_despesa").insert({ nome: i.nome.trim(), id_grupo: i.id_grupo });
  if (error) return { error: traduz(error) };
  revalidar();
  return { ok: true };
}
