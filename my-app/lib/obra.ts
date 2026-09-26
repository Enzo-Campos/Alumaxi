/**
 * Detalhe da obra — dados agregados de:
 *   obras, clientes, obra_etapas + etapas, falta_materiais + materiais,
 *   saidas_financeiras, e a view vw_obras_financeiro.
 *
 * Sem Supabase configurado, `getObra(id)` devolve MOCK (modo demonstracao).
 */
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

export type ObraStatus =
  | "planejamento"
  | "em_andamento"
  | "pausada"
  | "finalizada"
  | "cancelada";

export type EtapaStatus = "pendente" | "em_andamento" | "concluida" | "pausada";

export type FaltaStatus = "a_comprar" | "comprado" | "entregue" | "cancelado";

export type SaidaCategoria = "compra_material" | "retirada_lucro";

export type ObraEtapa = {
  id_etapa: number;
  nome: string;
  ordem: number;
  status: EtapaStatus;
  data_inicio: string | null;
  data_conclusao: string | null;
  data_prevista: string | null;
};

export type FaltaMaterial = {
  id: number;
  etapa: string;
  material: string;
  quantidade: number;
  unidade: string;
  especificacoes: string | null;
  prazo_entrega: string | null;
  dias_de_atraso: number | null;
  status: FaltaStatus;
};

export type Saida = {
  id: number;
  valor_retirado: number;
  categoria: SaidaCategoria;
  descricao: string | null;
  created_at: string;
};

/** espelha vw_obras_financeiro */
export type ObraFinanceiro = {
  orcamento_material: number;
  percentual_receita: number;
  valor_a_receber_total: number;
  total_compra_material: number;
  total_retirada_lucro: number;
  total_saidas: number;
  saldo_a_receber: number;
  em_prejuizo: boolean;
};

export type Obra = {
  id: number;
  nome: string;
  descricao: string | null;
  status: ObraStatus;
  cliente: string | null;
  endereco: string | null;
  data_inicio: string | null;
  data_prevista_termino: string | null;
  financeiro: ObraFinanceiro;
  etapas: ObraEtapa[];
  faltas: FaltaMaterial[];
  saidas: Saida[];
};

const MOCK_OBRA: Obra = {
  id: 1,
  nome: "Residencial Aurora",
  descricao:
    "Fachada em pele de vidro, guarda-corpos de sacada e esquadrias linha 25 — torre unica, 14 pavimentos.",
  status: "em_andamento",
  cliente: "Construtora Vega",
  endereco: "Av. das Palmeiras, 1200 — Balneario Camboriu/SC",
  data_inicio: "2026-06-02",
  data_prevista_termino: "2026-11-28",
  financeiro: {
    orcamento_material: 320000,
    percentual_receita: 50,
    valor_a_receber_total: 160000,
    total_compra_material: 74200,
    total_retirada_lucro: 45000,
    total_saidas: 119200,
    saldo_a_receber: 40800,
    em_prejuizo: false,
  },
  etapas: [
    { id_etapa: 1, nome: "Contra marco dos tipos", ordem: 10, status: "concluida", data_inicio: "2026-06-02", data_conclusao: "2026-06-20", data_prevista: "2026-06-18" },
    { id_etapa: 2, nome: "Corte do aluminio", ordem: 20, status: "concluida", data_inicio: "2026-06-18", data_conclusao: "2026-07-10", data_prevista: "2026-07-08" },
    { id_etapa: 3, nome: "Usinagem", ordem: 30, status: "concluida", data_inicio: "2026-07-08", data_conclusao: "2026-07-29", data_prevista: "2026-07-30" },
    { id_etapa: 4, nome: "Montagem", ordem: 40, status: "em_andamento", data_inicio: "2026-07-29", data_conclusao: null, data_prevista: "2026-09-15" },
    { id_etapa: 5, nome: "Instalacao de vidros", ordem: 50, status: "pausada", data_inicio: "2026-08-25", data_conclusao: null, data_prevista: "2026-09-30" },
    { id_etapa: 6, nome: "Furacao de sacada", ordem: 60, status: "pendente", data_inicio: null, data_conclusao: null, data_prevista: "2026-10-10" },
    { id_etapa: 7, nome: "Instalacao de castilhos", ordem: 70, status: "pendente", data_inicio: null, data_conclusao: null, data_prevista: "2026-10-22" },
    { id_etapa: 8, nome: "Corrimao", ordem: 90, status: "pendente", data_inicio: null, data_conclusao: null, data_prevista: "2026-11-05" },
    { id_etapa: 9, nome: "Portao", ordem: 110, status: "pendente", data_inicio: null, data_conclusao: null, data_prevista: "2026-11-20" },
  ],
  faltas: [
    { id: 1, etapa: "Instalacao de vidros", material: "Vidro temperado incolor 8mm", quantidade: 24, unidade: "m2", especificacoes: "Lapidado, furos p/ ferragem EV-04", prazo_entrega: "2026-09-04", dias_de_atraso: 4, status: "a_comprar" },
    { id: 2, etapa: "Instalacao de vidros", material: "Perfil de acabamento linha 25", quantidade: 90, unidade: "barra", especificacoes: "6m, anodizado fosco", prazo_entrega: "2026-09-09", dias_de_atraso: -1, status: "comprado" },
    { id: 3, etapa: "Montagem", material: "Silicone estrutural preto", quantidade: 30, unidade: "un", especificacoes: "Bisnaga 280ml", prazo_entrega: null, dias_de_atraso: null, status: "a_comprar" },
  ],
  saidas: [
    { id: 1, valor_retirado: 28000, categoria: "compra_material", descricao: "Chapas e barras — lote inicial", created_at: "2026-06-05T12:00:00Z" },
    { id: 2, valor_retirado: 20000, categoria: "retirada_lucro", descricao: "Retirada mensal", created_at: "2026-07-01T12:00:00Z" },
    { id: 3, valor_retirado: 31200, categoria: "compra_material", descricao: "Vidros pavimentos 1–6", created_at: "2026-07-22T12:00:00Z" },
    { id: 4, valor_retirado: 15000, categoria: "compra_material", descricao: "Ferragens e insumos", created_at: "2026-08-14T12:00:00Z" },
    { id: 5, valor_retirado: 25000, categoria: "retirada_lucro", descricao: "Retirada mensal", created_at: "2026-08-30T12:00:00Z" },
  ],
};

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

/** dias corridos desde o prazo (positivo = atrasado), igual a `current_date - prazo` no Postgres */
function diasDeAtraso(prazo: string | null): number | null {
  if (!prazo) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${prazo}T00:00:00`);
  return Math.round((hoje.getTime() - alvo.getTime()) / 86_400_000);
}

export type ObraResumo = {
  id: number;
  nome: string;
  status: ObraStatus;
  cliente: string | null;
  data_prevista_termino: string | null;
  saldo_a_receber: number;
  em_prejuizo: boolean;
};

export async function getObrasResumo(): Promise<ObraResumo[]> {
  if (!supabaseConfigured) {
    return [
      {
        id: MOCK_OBRA.id,
        nome: MOCK_OBRA.nome,
        status: MOCK_OBRA.status,
        cliente: MOCK_OBRA.cliente,
        data_prevista_termino: MOCK_OBRA.data_prevista_termino,
        saldo_a_receber: MOCK_OBRA.financeiro.saldo_a_receber,
        em_prejuizo: MOCK_OBRA.financeiro.em_prejuizo,
      },
    ];
  }

  const supabase = await createClient();
  const [obrasRes, finRes] = await Promise.all([
    supabase
      .from("obras")
      .select("id,nome,status,data_prevista_termino,cliente:clientes(nome)")
      .order("created_at", { ascending: false }),
    supabase.from("vw_obras_financeiro").select("id,saldo_a_receber,em_prejuizo"),
  ]);

  if (obrasRes.error) throw new Error(`Falha ao listar obras: ${obrasRes.error.message}`);

  const finById = new Map(
    (finRes.data ?? []).map((r) => [
      r.id,
      { saldo: Number(r.saldo_a_receber ?? 0), prej: Boolean(r.em_prejuizo) },
    ]),
  );

  return (obrasRes.data ?? []).map((o) => {
    const fin = finById.get(o.id);
    const cli = pickOne(o.cliente as { nome: string } | null);
    return {
      id: o.id,
      nome: o.nome,
      status: o.status,
      cliente: cli?.nome ?? null,
      data_prevista_termino: o.data_prevista_termino,
      saldo_a_receber: fin?.saldo ?? 0,
      em_prejuizo: fin?.prej ?? false,
    };
  });
}

export async function getObra(id: number): Promise<Obra | null> {
  if (!supabaseConfigured) return MOCK_OBRA;

  const supabase = await createClient();

  const { data: obraRow, error: obraErr } = await supabase
    .from("obras")
    .select(
      "id,nome,descricao,status,data_inicio,data_prevista_termino,cliente:clientes(nome,endereco)",
    )
    .eq("id", id)
    .maybeSingle();

  if (obraErr) throw new Error(`Falha ao carregar obra: ${obraErr.message}`);
  if (!obraRow) return null;

  const [fin, catRes, etapasRes, faltasRes, saidasRes] = await Promise.all([
    supabase.from("vw_obras_financeiro").select("*").eq("id", id).maybeSingle(),
    supabase.from("etapas").select("id,nome,ordem"),
    supabase
      .from("obra_etapas")
      .select("id_etapa,status,data_inicio,data_conclusao,data_prevista")
      .eq("id_obra", id),
    supabase
      .from("falta_materiais")
      .select(
        "id,id_etapa,quantidade,especificacoes,prazo_entrega,status,material:materiais(nome,unidade)",
      )
      .eq("id_obra", id)
      .in("status", ["a_comprar", "comprado"]),
    supabase
      .from("saidas_financeiras")
      .select("*")
      .eq("id_obra", id)
      .order("created_at", { ascending: false }),
  ]);

  const f = fin.data;
  const catEtapas = new Map(
    (catRes.data ?? []).map((e) => [e.id, { nome: e.nome, ordem: e.ordem }]),
  );
  const cliente = pickOne(
    obraRow.cliente as { nome: string; endereco: string | null } | null,
  );

  const etapas: ObraEtapa[] = (etapasRes.data ?? [])
    .map((e) => {
      const cat = catEtapas.get(e.id_etapa);
      return {
        id_etapa: e.id_etapa,
        nome: cat?.nome ?? `Etapa ${e.id_etapa}`,
        ordem: cat?.ordem ?? 0,
        status: e.status,
        data_inicio: e.data_inicio,
        data_conclusao: e.data_conclusao,
        data_prevista: e.data_prevista,
      };
    })
    .sort((a, b) => a.ordem - b.ordem);

  const faltas: FaltaMaterial[] = (faltasRes.data ?? []).map((r) => {
    const mat = pickOne(
      r.material as { nome: string; unidade: string } | null,
    );
    return {
      id: r.id,
      etapa: catEtapas.get(r.id_etapa)?.nome ?? "—",
      material: mat?.nome ?? "—",
      quantidade: Number(r.quantidade ?? 0),
      unidade: mat?.unidade ?? "un",
      especificacoes: r.especificacoes,
      prazo_entrega: r.prazo_entrega,
      dias_de_atraso: diasDeAtraso(r.prazo_entrega),
      status: r.status,
    };
  });

  const saidas: Saida[] = (saidasRes.data ?? []).map((s) => ({
    id: s.id,
    valor_retirado: Number(s.valor_retirado),
    categoria: s.categoria,
    descricao: s.descricao,
    created_at: s.created_at,
  }));

  const financeiro: ObraFinanceiro = {
    orcamento_material: Number(f?.orcamento_material ?? 0),
    percentual_receita: Number(f?.percentual_receita ?? 0),
    valor_a_receber_total: Number(f?.valor_a_receber_total ?? 0),
    total_compra_material: Number(f?.total_compra_material ?? 0),
    total_retirada_lucro: Number(f?.total_retirada_lucro ?? 0),
    total_saidas: Number(f?.total_saidas ?? 0),
    saldo_a_receber: Number(f?.saldo_a_receber ?? 0),
    em_prejuizo: Boolean(f?.em_prejuizo),
  };

  return {
    id: obraRow.id,
    nome: obraRow.nome,
    descricao: obraRow.descricao,
    status: obraRow.status,
    cliente: cliente?.nome ?? null,
    endereco: cliente?.endereco ?? null,
    data_inicio: obraRow.data_inicio,
    data_prevista_termino: obraRow.data_prevista_termino,
    financeiro,
    etapas,
    faltas,
    saidas,
  };
}

export async function getClientes(): Promise<{ id: number; nome: string }[]> {
  if (!supabaseConfigured) {
    return [
      { id: 1, nome: "Construtora Vega" },
      { id: 2, nome: "Incorporadora Litoral" },
    ];
  }
  const supabase = await createClient();
  const { data } = await supabase.from("clientes").select("id,nome").order("nome");
  return data ?? [];
}

export async function getEtapasAtivas(): Promise<
  { id: number; nome: string; ordem: number }[]
> {
  if (!supabaseConfigured) {
    return [
      { id: 1, nome: "Contra marco dos tipos", ordem: 10 },
      { id: 2, nome: "Corte do aluminio", ordem: 20 },
      { id: 3, nome: "Usinagem", ordem: 30 },
      { id: 4, nome: "Montagem", ordem: 40 },
      { id: 5, nome: "Instalacao de vidros", ordem: 50 },
      { id: 6, nome: "Furacao de sacada", ordem: 60 },
      { id: 7, nome: "Instalacao de castilhos", ordem: 70 },
      { id: 8, nome: "Lazer", ordem: 80 },
      { id: 9, nome: "Corrimao", ordem: 90 },
      { id: 10, nome: "Terreo", ordem: 100 },
      { id: 11, nome: "Portao", ordem: 110 },
    ];
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("etapas")
    .select("id,nome,ordem")
    .eq("ativa", true)
    .order("ordem");
  return data ?? [];
}

/* ---- derivados ---- */

export function progressoEtapas(etapas: ObraEtapa[]): {
  concluidas: number;
  total: number;
  pct: number;
} {
  const total = etapas.length;
  const concluidas = etapas.filter((e) => e.status === "concluida").length;
  const pct = total ? Math.round((concluidas / total) * 100) : 0;
  return { concluidas, total, pct };
}
