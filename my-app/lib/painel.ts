/**
 * Painel — visao geral de todas as areas (SO SERVER).
 *
 * Reaproveita as consultas de cada area e soma so o que falta (progresso
 * das etapas por obra e contagens de cadastros). Cada bloco carrega de
 * forma isolada: se uma area falhar, o resto do painel continua.
 *
 * Os avisos sao 100% derivados dos dados (`gerarAvisos`, funcao pura);
 * nao existe tabela de lembretes.
 */
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { brl, dateShortBR } from "@/lib/format";
import { getObra, getObrasResumo, progressoEtapas, type ObraResumo } from "@/lib/obra";
import { getPainelCompras, urgenciaDe, type ItemCompra } from "@/lib/painel-compras";
import { getAlertas, getContas, getContasALancar, getDividas, getMensal, getOpcoes } from "@/lib/financeiro-data";
import {
  hojeISO,
  mesAtual,
  type ContaALancar,
  type ContaView,
  type DividaView,
  type FinanceiroMensal,
  type Opcoes,
} from "@/lib/financeiro";

/* ------------------------------------------------------------------ */
/* tipos                                                               */
/* ------------------------------------------------------------------ */

export type Resultado<T> = { ok: true; data: T } | { ok: false; erro: string };

export type ObraPainel = ObraResumo & {
  progresso: { pct: number; concluidas: number; total: number };
  /** dias ate o prazo de termino (negativo = estourado); null sem prazo */
  diasParaPrazo: number | null;
};

export type FinanceiroPainel = {
  alertas: ContaView[];
  aLancar: ContaALancar[];
  contasMes: ContaView[];
  mensal: FinanceiroMensal[];
  dividas: DividaView[];
  grupos: Opcoes["grupos"];
};

export type CadastrosPainel = {
  materiais: number;
  funcionariosAtivos: number;
  folhaMensal: number;
};

export type Painel = {
  hoje: string; // AAAA-MM-DD
  mes: string; // AAAA-MM
  obras: Resultado<ObraPainel[]>;
  compras: Resultado<ItemCompra[]>;
  financeiro: Resultado<FinanceiroPainel>;
  cadastros: Resultado<CadastrosPainel>;
};

export type AreaAviso = "obras" | "compras" | "financeiro";
export type Gravidade = "critico" | "atencao" | "info";

export type Aviso = {
  id: string;
  area: AreaAviso;
  gravidade: Gravidade;
  titulo: string;
  detalhe: string;
  href: string;
  /** data de referencia (AAAA-MM-DD) para ordenar dentro da mesma gravidade */
  data: string | null;
};

export const MESES_GRAFICO = 6;
const OBRA_ATIVA = new Set(["planejamento", "em_andamento", "pausada"]);
const PRAZO_OBRA_DIAS = 15; // avisa quando o termino previsto esta a <= 15 dias

/* ------------------------------------------------------------------ */
/* carga                                                               */
/* ------------------------------------------------------------------ */

async function tenta<T>(fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    console.error("[painel]", e);
    return { ok: false, erro: e instanceof Error ? e.message : String(e) };
  }
}

function diasEntre(de: string, ate: string): number {
  const a = Date.UTC(+de.slice(0, 4), +de.slice(5, 7) - 1, +de.slice(8, 10));
  const b = Date.UTC(+ate.slice(0, 4), +ate.slice(5, 7) - 1, +ate.slice(8, 10));
  return Math.round((b - a) / 86_400_000);
}

async function carregaObras(hoje: string): Promise<ObraPainel[]> {
  const obras = await getObrasResumo();
  const progresso = new Map<number, ObraPainel["progresso"]>();

  if (supabaseConfigured) {
    const sb = await createClient();
    const { data, error } = await sb.from("obra_etapas").select("id_obra,status");
    if (error) throw new Error(`obra_etapas: ${error.message}`);
    const cont = new Map<number, { concluidas: number; total: number }>();
    for (const r of data ?? []) {
      const c = cont.get(r.id_obra) ?? { concluidas: 0, total: 0 };
      c.total++;
      if (r.status === "concluida") c.concluidas++;
      cont.set(r.id_obra, c);
    }
    for (const [id, c] of cont) {
      progresso.set(id, { ...c, pct: c.total ? Math.round((c.concluidas / c.total) * 100) : 0 });
    }
  } else {
    // modo demonstracao: so ha a obra mock
    for (const o of obras) {
      const det = await getObra(o.id);
      if (det) progresso.set(o.id, progressoEtapas(det.etapas));
    }
  }

  return obras.map((o) => ({
    ...o,
    progresso: progresso.get(o.id) ?? { pct: 0, concluidas: 0, total: 0 },
    diasParaPrazo: o.data_prevista_termino ? diasEntre(hoje, o.data_prevista_termino.slice(0, 10)) : null,
  }));
}

async function carregaFinanceiro(mes: string): Promise<FinanceiroPainel> {
  const [alertas, aLancar, contasMes, mensal, dividas, opcoes] = await Promise.all([
    getAlertas(),
    getContasALancar(),
    getContas({ mes }),
    getMensal(mes, MESES_GRAFICO),
    getDividas(),
    getOpcoes(),
  ]);
  return { alertas, aLancar, contasMes, mensal, dividas, grupos: opcoes.grupos };
}

async function carregaCadastros(): Promise<CadastrosPainel> {
  if (!supabaseConfigured) return { materiais: 0, funcionariosAtivos: 0, folhaMensal: 0 };
  const sb = await createClient();
  const [m, f] = await Promise.all([
    sb.from("materiais").select("id", { count: "exact", head: true }).eq("ativo", true),
    sb.from("funcionarios").select("salario").eq("status", "ativo"),
  ]);
  if (m.error) throw new Error(`materiais: ${m.error.message}`);
  if (f.error) throw new Error(`funcionarios: ${f.error.message}`);
  return {
    materiais: m.count ?? 0,
    funcionariosAtivos: f.data?.length ?? 0,
    folhaMensal: (f.data ?? []).reduce((s, x) => s + (x.salario ?? 0), 0),
  };
}

export async function getPainel(): Promise<Painel> {
  const hoje = hojeISO();
  const mes = mesAtual();
  const [obras, compras, financeiro, cadastros] = await Promise.all([
    tenta(() => carregaObras(hoje)),
    tenta(() => getPainelCompras()),
    tenta(() => carregaFinanceiro(mes)),
    tenta(() => carregaCadastros()),
  ]);
  return { hoje, mes, obras, compras, financeiro, cadastros };
}

/* ------------------------------------------------------------------ */
/* avisos (puro)                                                       */
/* ------------------------------------------------------------------ */

const PESO: Record<Gravidade, number> = { critico: 0, atencao: 1, info: 2 };

function dias(n: number): string {
  return `${n} dia${n === 1 ? "" : "s"}`;
}

/**
 * Lista unica de avisos, do mais grave para o mais leve. Parcelas de divida
 * nao entram a parte: viram contas a pagar e ja aparecem nos alertas.
 */
export function gerarAvisos(p: Painel): Aviso[] {
  const out: Aviso[] = [];

  /* ---- financeiro ---- */
  if (p.financeiro.ok) {
    for (const c of p.financeiro.data.alertas) {
      const atraso = c.dias_para_vencer != null && c.dias_para_vencer < 0 ? -c.dias_para_vencer : 0;
      const gravidade: Gravidade =
        c.situacao === "vencido" || c.situacao === "vence_hoje" ? "critico" : "atencao";
      out.push({
        id: `conta-${c.id}`,
        area: "financeiro",
        gravidade,
        titulo:
          c.situacao === "vencido"
            ? `Conta vencida: ${c.descricao}`
            : c.situacao === "vence_hoje"
              ? `Vence hoje: ${c.descricao}`
              : `Vence ${dateShortBR(c.vencimento)}: ${c.descricao}`,
        detalhe: [brl(c.valor), atraso ? `${dias(atraso)} de atraso` : null, c.categoria].filter(Boolean).join(" · "),
        href: `/financeiro?aba=contas&mes=${c.competencia.slice(0, 7)}&conta=${c.id}`,
        data: c.vencimento,
      });
    }
    for (const a of p.financeiro.data.aLancar) {
      const atrasada = a.situacao === "vencido" || a.situacao === "vence_hoje";
      out.push({
        id: `lancar-${a.id_recorrencia}-${a.competencia}`,
        area: "financeiro",
        gravidade: atrasada ? "critico" : a.situacao === "vence_em_breve" ? "atencao" : "info",
        titulo: `Lancar valor: ${a.descricao}`,
        detalhe: `boleto sem valor · vence ${dateShortBR(a.vencimento_previsto)}`,
        href: "/financeiro",
        data: a.vencimento_previsto,
      });
    }
  }

  /* ---- obras ---- */
  const idDaObra = new Map<string, number>();
  if (p.obras.ok) {
    for (const o of p.obras.data) {
      idDaObra.set(o.nome, o.id);
      if (!OBRA_ATIVA.has(o.status)) continue;
      if (o.em_prejuizo) {
        out.push({
          id: `prejuizo-${o.id}`,
          area: "obras",
          gravidade: "critico",
          titulo: `Obra no prejuizo: ${o.nome}`,
          detalhe: `saldo ${brl(o.saldo_a_receber)}`,
          href: `/obras/${o.id}`,
          data: null,
        });
      }
      if (o.diasParaPrazo != null && o.diasParaPrazo <= PRAZO_OBRA_DIAS) {
        const estourado = o.diasParaPrazo < 0;
        out.push({
          id: `prazo-${o.id}`,
          area: "obras",
          gravidade: estourado ? "critico" : "atencao",
          titulo: estourado ? `Prazo estourado: ${o.nome}` : `Termino proximo: ${o.nome}`,
          detalhe: estourado
            ? `previsto p/ ${dateShortBR(o.data_prevista_termino)} · ${dias(-o.diasParaPrazo)} atras · ${o.progresso.pct}% concluido`
            : o.diasParaPrazo === 0
              ? `termina hoje · ${o.progresso.pct}% concluido`
              : `faltam ${dias(o.diasParaPrazo)} · ${o.progresso.pct}% concluido`,
          href: `/obras/${o.id}`,
          data: o.data_prevista_termino,
        });
      }
    }
  }

  /* ---- compras + etapas paradas ---- */
  if (p.compras.ok) {
    const paradas = new Map<string, { obra: string; etapa: string; itens: number }>();
    for (const i of p.compras.data) {
      const u = urgenciaDe(i);
      if (u === "atrasado" || u === "proximo") {
        out.push({
          id: `compra-${i.id}`,
          area: "compras",
          gravidade: u === "atrasado" ? "critico" : "atencao",
          titulo: u === "atrasado" ? `Compra atrasada: ${i.material}` : `Comprar ate ${dateShortBR(i.prazo_entrega)}: ${i.material}`,
          detalhe: [
            `${i.quantidade} ${i.unidade}`,
            i.obra,
            u === "atrasado" ? `${dias(i.dias_de_atraso ?? 0)} de atraso` : null,
          ]
            .filter(Boolean)
            .join(" · "),
          href: "/compras",
          data: i.prazo_entrega,
        });
      }
      if (i.status === "a_comprar") {
        const k = `${i.obra}·${i.etapa}`;
        const e = paradas.get(k) ?? { obra: i.obra, etapa: i.etapa, itens: 0 };
        e.itens++;
        paradas.set(k, e);
      }
    }
    for (const [k, e] of paradas) {
      const id = idDaObra.get(e.obra);
      out.push({
        id: `parada-${k}`,
        area: "obras",
        gravidade: "atencao",
        titulo: `Etapa parada: ${e.etapa}`,
        detalhe: `${e.obra} · falta material (${e.itens} ${e.itens === 1 ? "item" : "itens"})`,
        href: id ? `/obras/${id}` : "/compras",
        data: null,
      });
    }
  }

  return out.sort(
    (a, b) =>
      PESO[a.gravidade] - PESO[b.gravidade] ||
      (a.data ?? "9999").localeCompare(b.data ?? "9999") ||
      a.titulo.localeCompare(b.titulo),
  );
}
