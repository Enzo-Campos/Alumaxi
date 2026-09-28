/**
 * Financeiro (contas a pagar) — tipos, constantes e helpers PUROS.
 * Seguro para client e server. Consultas ao banco ficam em
 * `lib/financeiro-data.ts` (so server). Modelo do banco: supabase/README.md.
 */
import type { Database } from "@/lib/supabase/database.types";
import type { PillTone } from "@/components/status-pill";

type Views = Database["public"]["Views"];
type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type ContaView = Views["vw_contas_pagar"]["Row"];
export type ContaALancar = Views["vw_contas_a_lancar"]["Row"];
export type FinanceiroMensal = Views["vw_financeiro_mensal"]["Row"];
export type DividaView = Views["vw_dividas"]["Row"];
export type Recorrencia = Tables["recorrencias"]["Row"];
export type HoraExtra = Tables["horas_extras"]["Row"];
export type ContaStatus = Enums["conta_status"];
export type FormaPagamento = Enums["forma_pagamento"];
export type RegraVencimento = Enums["regra_vencimento"];
export type AjusteNaoUtil = Enums["ajuste_nao_util"];
export type Situacao = ContaView["situacao"];

/** Listas para selects e vinculos das contas. */
export type Opcoes = {
  grupos: { id: number; nome: string; ordem: number }[];
  categorias: { id: number; nome: string; id_grupo: number; grupo: string; ativa: boolean }[];
  funcionarios: { id: number; nome: string; ativo: boolean }[];
  locais: { id: number; nome: string; ativo: boolean }[];
  veiculos: { id: number; nome: string; placa: string | null; ativo: boolean }[];
  fornecedores: { id: number; nome: string; ativo: boolean }[];
};

/* ------------------------------------------------------------------ */
/* situacao / status                                                   */
/* ------------------------------------------------------------------ */

export const SITUACAO: Record<Situacao, { label: string; tone: PillTone }> = {
  vencido: { label: "Vencida", tone: "danger" },
  vence_hoje: { label: "Vence hoje", tone: "danger" },
  vence_em_breve: { label: "Vence em breve", tone: "warn" },
  a_vencer: { label: "A vencer", tone: "neutral" },
  pago: { label: "Paga", tone: "success" },
  cancelado: { label: "Cancelada", tone: "neutral" },
};

/** Filtro de situacao da lista de contas (pendente agrupa as 4 em aberto). */
export const FILTRO_SITUACAO = [
  { value: "", label: "Todas" },
  { value: "pendente", label: "Em aberto" },
  { value: "vencido", label: "Vencidas" },
  { value: "vence_em_breve", label: "Vencem em 7 dias" },
  { value: "pago", label: "Pagas" },
  { value: "cancelado", label: "Canceladas" },
] as const;

export const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "transferencia", label: "Transferencia" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartao de credito" },
  { value: "cartao_debito", label: "Cartao de debito" },
  { value: "debito_automatico", label: "Debito automatico" },
];

export const ORIGEM_LABEL: Record<ContaView["origem"], string> = {
  recorrencia: "Conta fixa",
  folha: "Folha",
  divida: "Divida",
  avulsa: "Avulsa",
};

export const AJUSTES: { value: AjusteNaoUtil; label: string }[] = [
  { value: "postergar", label: "Proximo dia util (boletos)" },
  { value: "antecipar", label: "Dia util anterior" },
  { value: "manter", label: "Manter a data" },
];

/* ------------------------------------------------------------------ */
/* cores dos grupos (graficos)                                         */
/* Paleta categorica validada (dataviz validate_palette, superficie    */
/* branca): passa CVD e normal-vision nos pares adjacentes. A cor      */
/* segue o GRUPO (pela ordem de cadastro), nunca a posicao no grafico. */
/* 3 cores ficam < 3:1 no branco: sempre com legenda/tooltip/tabela.   */
/* ------------------------------------------------------------------ */

const PALETA = ["#2e5bff", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];
const OUTROS = "#9a9a9a";

export function corDoGrupo(grupos: Opcoes["grupos"], idGrupo: number): string {
  const ordenados = [...grupos].sort((a, b) => a.ordem - b.ordem || a.id - b.id);
  const i = ordenados.findIndex((g) => g.id === idGrupo);
  return i >= 0 && i < PALETA.length ? PALETA[i] : OUTROS;
}

/* ------------------------------------------------------------------ */
/* competencia (mes) — sempre "AAAA-MM-01" no banco, "AAAA-MM" na URL  */
/* ------------------------------------------------------------------ */

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = [
  "janeiro", "fevereiro", "marco", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Hoje (AAAA-MM-DD) no fuso da empresa — o servidor (Vercel) roda em UTC. */
export function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/** "2026-10" do mes atual. */
export function mesAtual(): string {
  return hojeISO().slice(0, 7);
}

/** Valida "AAAA-MM" vindo da URL; invalido cai no mes atual. */
export function parseMes(v: string | string[] | undefined): string {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s) ? s : mesAtual();
}

/** "2026-10" -> "2026-10-01" (formato de `competencia`). */
export function competenciaDe(mes: string): string {
  return `${mes}-01`;
}

/** Soma meses a "AAAA-MM". */
export function somaMes(mes: string, n: number): string {
  const [a, m] = mes.split("-").map(Number);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/** "2026-10" | "2026-10-01" -> "out/26" */
export function mesCurto(mes: string): string {
  const [a, m] = mes.split("-");
  return `${MESES[Number(m) - 1]}/${a.slice(2)}`;
}

/** "2026-10" -> "outubro de 2026" */
export function mesLongo(mes: string): string {
  const [a, m] = mes.split("-");
  return `${MESES_LONGOS[Number(m) - 1]} de ${a}`;
}

/** Ultimo dia do mes "AAAA-MM" -> "AAAA-MM-DD". */
export function fimDoMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return `${mes}-${String(d).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ */
/* dados dos graficos (usados na Visao geral e no Painel)              */
/* ------------------------------------------------------------------ */

export type SerieMensal = { id: number; nome: string; cor: string };
export type CategoriaMes = { id: number; nome: string; grupo: string; total: number; pago: number; aberto: number };

/** Colunas empilhadas por grupo dos `n` meses ate `mesFim`. */
export function montarMensal(mensal: FinanceiroMensal[], grupos: Opcoes["grupos"], mesFim: string, n: number) {
  const meses = Array.from({ length: n }, (_, i) => somaMes(mesFim, i - (n - 1)));
  const valores: Record<string, Record<number, number>> = {};
  const presentes = new Set<number>();
  for (const r of mensal) {
    const m = r.competencia.slice(0, 7);
    valores[m] ??= {};
    valores[m][r.id_grupo] = (valores[m][r.id_grupo] ?? 0) + r.total;
    presentes.add(r.id_grupo);
  }
  const series: SerieMensal[] = grupos
    .filter((g) => presentes.has(g.id))
    .map((g) => ({ id: g.id, nome: g.nome, cor: corDoGrupo(grupos, g.id) }));
  return { meses, series, valores };
}

/** Total / pago / em aberto do mes por categoria (canceladas ja devem vir fora). */
export function composicaoPorCategoria(validas: ContaView[]): CategoriaMes[] {
  const por = new Map<number, CategoriaMes>();
  for (const c of validas) {
    const it = por.get(c.id_categoria) ?? {
      id: c.id_categoria,
      nome: c.categoria,
      grupo: c.grupo,
      total: 0,
      pago: 0,
      aberto: 0,
    };
    it.total += c.valor_efetivo;
    if (c.status === "pago") it.pago += c.valor_efetivo;
    else it.aberto += c.valor;
    por.set(c.id_categoria, it);
  }
  return [...por.values()];
}

/* ------------------------------------------------------------------ */
/* vinculo da conta (a quem/ao que se refere) em texto                 */
/* ------------------------------------------------------------------ */

export function vinculoDe(c: {
  funcionario?: string | null;
  local: string | null;
  veiculo: string | null;
  fornecedor?: string | null;
}): string | null {
  return [c.funcionario, c.local, c.veiculo, c.fornecedor].filter(Boolean).join(" · ") || null;
}

/* ------------------------------------------------------------------ */
/* URL: aba, mes, filtros e modais vivem na query string               */
/* ------------------------------------------------------------------ */

export type Params = Record<string, string | string[] | undefined>;

/** Query string com `patch` aplicado sobre `params` (undefined/"" remove a chave). */
export function urlCom(params: Params, patch: Record<string, string | number | null | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s) q.set(k, s);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === "") q.delete(k);
    else q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "?";
}

/** Le um parametro como string simples. */
export function param(params: Params, k: string): string | undefined {
  const v = params[k];
  return (Array.isArray(v) ? v[0] : v) || undefined;
}

/** "1.234,56" / "1234.56" / "1234" -> number (NaN se invalido). */
export function parseValor(v: string): number {
  const s = v.trim().replace(/\s|R\$/g, "");
  if (!s) return NaN;
  const norm = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  return Number(norm);
}

/** number -> "1234,56" para preencher input. */
export function valorInput(n: number | null | undefined): string {
  return n == null ? "" : n.toFixed(2).replace(".", ",");
}
