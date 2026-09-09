/**
 * Painel "precisa comprar material" — le a view `vw_painel_compras`.
 * Sem Supabase configurado, devolve MOCK (modo demonstracao).
 */
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";

export type FaltaStatus = "a_comprar" | "comprado";

export type ItemCompra = {
  id: number;
  obra: string;
  etapa: string;
  material: string;
  quantidade: number;
  unidade: string;
  especificacoes: string | null;
  data_solicitacao: string; // ISO
  prazo_entrega: string | null; // ISO date
  dias_de_atraso: number | null; // > 0 = prazo estourado
  status: FaltaStatus;
  observacoes: string | null;
};

export type Urgencia = "atrasado" | "proximo" | "no_prazo" | "sem_prazo";

export function urgenciaDe(item: ItemCompra): Urgencia {
  if (item.dias_de_atraso == null || item.prazo_entrega == null) return "sem_prazo";
  if (item.dias_de_atraso > 0) return "atrasado";
  if (item.dias_de_atraso >= -3) return "proximo";
  return "no_prazo";
}

const MOCK: ItemCompra[] = [
  {
    id: 1,
    obra: "Residencial Aurora",
    etapa: "Instalacao de vidros",
    material: "Vidro temperado incolor 8mm",
    quantidade: 24,
    unidade: "m2",
    especificacoes: "Lapidado, furos p/ ferragem conforme projeto EV-04",
    data_solicitacao: "2026-08-28T09:12:00Z",
    prazo_entrega: "2026-09-04",
    dias_de_atraso: 4,
    status: "a_comprar",
    observacoes: "Fornecedor Cebrace sem previsao; cotar Guardian",
  },
  {
    id: 2,
    obra: "Edificio Mirante",
    etapa: "Corte do aluminio",
    material: "Barra de aluminio linha 25 — natural",
    quantidade: 60,
    unidade: "barra",
    especificacoes: "6m, anodizado fosco",
    data_solicitacao: "2026-09-01T14:40:00Z",
    prazo_entrega: "2026-09-09",
    dias_de_atraso: -1,
    status: "a_comprar",
    observacoes: null,
  },
  {
    id: 3,
    obra: "Residencial Aurora",
    etapa: "Furacao de sacada",
    material: "Kit chumbador inox M10",
    quantidade: 200,
    unidade: "un",
    especificacoes: "Inox 304, com bucha",
    data_solicitacao: "2026-09-02T08:05:00Z",
    prazo_entrega: "2026-09-08",
    dias_de_atraso: 0,
    status: "comprado",
    observacoes: "NF 4412 — entrega parcial 120un",
  },
  {
    id: 4,
    obra: "Casa Beira-Mar",
    etapa: "Instalacao de castilhos",
    material: "Castilho reto 1,10m — aluminio",
    quantidade: 8,
    unidade: "un",
    especificacoes: null,
    data_solicitacao: "2026-09-03T11:20:00Z",
    prazo_entrega: "2026-09-15",
    dias_de_atraso: -7,
    status: "a_comprar",
    observacoes: null,
  },
  {
    id: 5,
    obra: "Edificio Mirante",
    etapa: "Corrimao",
    material: "Tubo redondo aluminio 2 pol",
    quantidade: 40,
    unidade: "m",
    especificacoes: "Parede 2mm, acabamento escovado",
    data_solicitacao: "2026-08-25T16:00:00Z",
    prazo_entrega: "2026-09-02",
    dias_de_atraso: 6,
    status: "a_comprar",
    observacoes: "Trava a etapa de corrimao inteira",
  },
  {
    id: 6,
    obra: "Galpao Sul",
    etapa: "Portao",
    material: "Motor deslizante 1/2 CV",
    quantidade: 2,
    unidade: "un",
    especificacoes: "Ate 600kg, 220V",
    data_solicitacao: "2026-09-04T09:00:00Z",
    prazo_entrega: "2026-09-12",
    dias_de_atraso: -4,
    status: "comprado",
    observacoes: null,
  },
  {
    id: 7,
    obra: "Casa Beira-Mar",
    etapa: "Montagem",
    material: "Silicone estrutural preto",
    quantidade: 30,
    unidade: "un",
    especificacoes: "Bisnaga 280ml",
    data_solicitacao: "2026-09-05T10:30:00Z",
    prazo_entrega: null,
    dias_de_atraso: null,
    status: "a_comprar",
    observacoes: "Sem prazo definido pelo mestre",
  },
  {
    id: 8,
    obra: "Residencial Aurora",
    etapa: "Contra marco dos tipos",
    material: "Contramarco chapa dobrada galvanizada",
    quantidade: 52,
    unidade: "un",
    especificacoes: "Conforme mapa de vaos MV-01",
    data_solicitacao: "2026-09-06T13:15:00Z",
    prazo_entrega: "2026-09-10",
    dias_de_atraso: -2,
    status: "a_comprar",
    observacoes: null,
  },
];

export type NovaSolicitacaoData = {
  obras: { id: number; nome: string }[];
  obraEtapas: { id_obra: number; id_etapa: number; nome: string }[];
  materiais: { id: number; nome: string; unidade: string }[];
};

/** dados para o formulario "Nova solicitacao de material" */
export async function getNovaSolicitacaoData(): Promise<NovaSolicitacaoData> {
  if (!supabaseConfigured) {
    return {
      obras: [{ id: 1, nome: "Residencial Aurora" }],
      obraEtapas: [
        { id_obra: 1, id_etapa: 4, nome: "Montagem" },
        { id_obra: 1, id_etapa: 5, nome: "Instalacao de vidros" },
        { id_obra: 1, id_etapa: 6, nome: "Furacao de sacada" },
      ],
      materiais: [
        { id: 1, nome: "Vidro temperado incolor 8mm", unidade: "m2" },
        { id: 2, nome: "Perfil de acabamento linha 25", unidade: "barra" },
        { id: 3, nome: "Silicone estrutural preto", unidade: "un" },
      ],
    };
  }

  const supabase = await createClient();
  const [obrasRes, oeRes, matRes] = await Promise.all([
    supabase.from("obras").select("id,nome").order("nome"),
    supabase.from("obra_etapas").select("id_obra,id_etapa"),
    supabase.from("materiais").select("id,nome,unidade").eq("ativo", true).order("nome"),
  ]);

  const etapasCat = new Map(
    ((await supabase.from("etapas").select("id,nome,ordem")).data ?? []).map((e) => [
      e.id,
      { nome: e.nome, ordem: e.ordem },
    ]),
  );

  const obraEtapas = (oeRes.data ?? [])
    .map((oe) => ({
      id_obra: oe.id_obra,
      id_etapa: oe.id_etapa,
      nome: etapasCat.get(oe.id_etapa)?.nome ?? `Etapa ${oe.id_etapa}`,
      ordem: etapasCat.get(oe.id_etapa)?.ordem ?? 0,
    }))
    .sort((a, b) => a.ordem - b.ordem);

  return {
    obras: obrasRes.data ?? [],
    obraEtapas: obraEtapas.map((oe) => ({
      id_obra: oe.id_obra,
      id_etapa: oe.id_etapa,
      nome: oe.nome,
    })),
    materiais: (matRes.data ?? []).map((m) => ({
      id: m.id,
      nome: m.nome,
      unidade: m.unidade,
    })),
  };
}

export async function getPainelCompras(): Promise<ItemCompra[]> {
  if (!supabaseConfigured) return MOCK;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vw_painel_compras")
    .select("*")
    .order("prazo_entrega", { ascending: true, nullsFirst: false });

  if (error) throw new Error(`Falha ao carregar painel de compras: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id ?? 0,
    obra: r.obra ?? "—",
    etapa: r.etapa ?? "—",
    material: r.material ?? "—",
    quantidade: Number(r.quantidade ?? 0),
    unidade: r.unidade ?? "un",
    especificacoes: r.especificacoes,
    data_solicitacao: r.data_solicitacao ?? new Date().toISOString(),
    prazo_entrega: r.prazo_entrega,
    dias_de_atraso: r.dias_de_atraso,
    status: (r.status ?? "a_comprar") as FaltaStatus,
    observacoes: r.observacoes,
  }));
}
