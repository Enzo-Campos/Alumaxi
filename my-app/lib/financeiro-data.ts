/**
 * Financeiro — consultas ao banco (SO SERVER: importa next/headers via
 * createClient). Tipos e helpers puros ficam em `lib/financeiro.ts`.
 *
 * Tudo le das views (vw_contas_pagar, vw_contas_a_lancar,
 * vw_financeiro_mensal, vw_dividas): situacao, atraso e totais sao
 * calculados no banco, nunca aqui.
 */
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import {
  competenciaDe,
  somaMes,
  hojeISO,
  type ContaALancar,
  type ContaView,
  type DividaView,
  type FinanceiroMensal,
  type HoraExtra,
  type Opcoes,
  type Recorrencia,
} from "@/lib/financeiro";

function falha(onde: string, error: { message: string } | null): void {
  if (error) throw new Error(`[financeiro] ${onde}: ${error.message}`);
}

function somaDias(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/* ---------- listas de apoio (selects, nomes) ---------- */

export async function getOpcoes(): Promise<Opcoes> {
  if (!supabaseConfigured) {
    return { grupos: [], categorias: [], funcionarios: [], locais: [], veiculos: [], fornecedores: [] };
  }
  const sb = await createClient();
  const [g, c, fu, l, v, fo] = await Promise.all([
    sb.from("grupos_despesa").select("id,nome,ordem").order("ordem"),
    sb.from("categorias_despesa").select("id,nome,id_grupo,ativa").order("nome"),
    sb.from("funcionarios").select("id,nome,status").order("nome"),
    sb.from("locais").select("id,nome,ativo").order("nome"),
    sb.from("veiculos").select("id,nome,placa,ativo").order("nome"),
    sb.from("fornecedores").select("id,nome,ativo").order("nome"),
  ]);
  falha("grupos", g.error);
  falha("categorias", c.error);
  falha("funcionarios", fu.error);
  falha("locais", l.error);
  falha("veiculos", v.error);
  falha("fornecedores", fo.error);

  const grupos = g.data ?? [];
  const nomeGrupo = new Map(grupos.map((x) => [x.id, x.nome]));
  return {
    grupos,
    categorias: (c.data ?? []).map((x) => ({ ...x, grupo: nomeGrupo.get(x.id_grupo) ?? "" })),
    funcionarios: (fu.data ?? []).map((x) => ({
      id: x.id,
      nome: x.nome.trim(),
      ativo: x.status === "ativo",
    })),
    locais: l.data ?? [],
    veiculos: v.data ?? [],
    fornecedores: fo.data ?? [],
  };
}

/* ---------- contas ---------- */

export type FiltroContas = {
  mes: string; // "AAAA-MM"
  grupo?: number;
  situacao?: string; // "", pendente, vencido, vence_em_breve, pago, cancelado
  funcionario?: number;
  local?: number;
  veiculo?: number;
  busca?: string;
};

export async function getContas(f: FiltroContas): Promise<ContaView[]> {
  if (!supabaseConfigured) return [];
  const sb = await createClient();
  let q = sb
    .from("vw_contas_pagar")
    .select("*")
    .eq("competencia", competenciaDe(f.mes))
    .order("vencimento")
    .order("descricao");

  if (f.grupo) q = q.eq("id_grupo", f.grupo);
  if (f.funcionario) q = q.eq("id_funcionario", f.funcionario);
  if (f.local) q = q.eq("id_local", f.local);
  if (f.veiculo) q = q.eq("id_veiculo", f.veiculo);
  if (f.busca?.trim()) q = q.ilike("descricao", `%${f.busca.trim()}%`);

  switch (f.situacao) {
    case "pendente":
      q = q.eq("status", "pendente");
      break;
    case "vencido":
      q = q.in("situacao", ["vencido", "vence_hoje"]);
      break;
    case "vence_em_breve":
      q = q.in("situacao", ["vence_hoje", "vence_em_breve"]);
      break;
    case "pago":
    case "cancelado":
      q = q.eq("status", f.situacao);
      break;
  }

  const { data, error } = await q;
  falha("contas", error);
  return data ?? [];
}

/** Contas em aberto vencidas ou vencendo nos proximos `dias` (qualquer competencia). */
export async function getAlertas(dias = 7): Promise<ContaView[]> {
  if (!supabaseConfigured) return [];
  const sb = await createClient();
  const { data, error } = await sb
    .from("vw_contas_pagar")
    .select("*")
    .eq("status", "pendente")
    .lte("vencimento", somaDias(hojeISO(), dias))
    .order("vencimento")
    .order("descricao");
  falha("alertas", error);
  return data ?? [];
}

export async function getContasALancar(): Promise<ContaALancar[]> {
  if (!supabaseConfigured) return [];
  const sb = await createClient();
  const { data, error } = await sb
    .from("vw_contas_a_lancar")
    .select("*")
    .order("vencimento_previsto")
    .order("descricao");
  falha("contas a lancar", error);
  return data ?? [];
}

/** Totais por competencia x categoria, de `mesFim - (meses-1)` ate `mesFim`. */
export async function getMensal(mesFim: string, meses: number): Promise<FinanceiroMensal[]> {
  if (!supabaseConfigured) return [];
  const sb = await createClient();
  const { data, error } = await sb
    .from("vw_financeiro_mensal")
    .select("*")
    .gte("competencia", competenciaDe(somaMes(mesFim, -(meses - 1))))
    .lte("competencia", competenciaDe(mesFim));
  falha("mensal", error);
  return data ?? [];
}

/* ---------- origens ---------- */

export async function getRecorrencias(): Promise<Recorrencia[]> {
  if (!supabaseConfigured) return [];
  const sb = await createClient();
  const { data, error } = await sb
    .from("recorrencias")
    .select("*")
    .order("ativa", { ascending: false })
    .order("descricao");
  falha("recorrencias", error);
  return data ?? [];
}

export async function getDividas(): Promise<DividaView[]> {
  if (!supabaseConfigured) return [];
  const sb = await createClient();
  const { data, error } = await sb.from("vw_dividas").select("*").order("quitada").order("descricao");
  falha("dividas", error);
  return data ?? [];
}

/** Horas extras que sao pagas na competencia do mes. */
export async function getHorasExtras(mes: string): Promise<HoraExtra[]> {
  if (!supabaseConfigured) return [];
  const sb = await createClient();
  const { data, error } = await sb
    .from("horas_extras")
    .select("*")
    .eq("competencia", competenciaDe(mes))
    .order("data");
  falha("horas extras", error);
  return data ?? [];
}

/** Regras da folha (adiantamento, saldo, VA) — colunas da aba Folha. */
export async function getFolhaRegras() {
  if (!supabaseConfigured) return [];
  const sb = await createClient();
  const { data, error } = await sb
    .from("folha_regras")
    .select("id,nome,tipo,ordem")
    .eq("ativa", true)
    .order("ordem");
  falha("folha_regras", error);
  return data ?? [];
}

/* ---------- cadastros (aba Cadastros) ---------- */

export async function getCadastros() {
  if (!supabaseConfigured) return { locais: [], veiculos: [], fornecedores: [] };
  const sb = await createClient();
  const [l, v, f] = await Promise.all([
    sb.from("locais").select("*").order("nome"),
    sb.from("veiculos").select("*").order("nome"),
    sb.from("fornecedores").select("*").order("nome"),
  ]);
  falha("locais", l.error);
  falha("veiculos", v.error);
  falha("fornecedores", f.error);
  return { locais: l.data ?? [], veiculos: v.data ?? [], fornecedores: f.data ?? [] };
}
