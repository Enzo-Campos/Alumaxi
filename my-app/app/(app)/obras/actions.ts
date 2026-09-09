"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import type { EtapaStatus, ObraStatus } from "@/lib/obra";
import type { Database } from "@/lib/supabase/database.types";

type ObraEtapaUpdate = Database["public"]["Tables"]["obra_etapas"]["Update"];
type ObraUpdate = Database["public"]["Tables"]["obras"]["Update"];
type MaterialUnidade = Database["public"]["Enums"]["material_unidade"];
type Supa = Awaited<ReturnType<typeof createClient>>;

const VALID: EtapaStatus[] = ["pendente", "em_andamento", "concluida", "pausada"];
const OBRA_STATUS_VALIDOS: ObraStatus[] = [
  "planejamento",
  "em_andamento",
  "pausada",
  "finalizada",
  "cancelada",
];

/** Quantas solicitacoes AINDA bloqueiam a etapa (apenas status `a_comprar`). */
async function contarPendencias(
  supabase: Supa,
  idObra: number,
  idEtapa: number,
): Promise<number> {
  const { count } = await supabase
    .from("falta_materiais")
    .select("id", { count: "exact", head: true })
    .eq("id_obra", idObra)
    .eq("id_etapa", idEtapa)
    .eq("status", "a_comprar");
  return count ?? 0;
}

/**
 * Reavalia a etapa com base nas pendencias de material:
 * - tem `a_comprar` pendente  -> `pausada`
 * - nao tem                   -> se estava `pausada`, volta para `em_andamento`
 * Nunca mexe em etapa `concluida`.
 */
async function sincronizarEtapa(supabase: Supa, idObra: number, idEtapa: number) {
  const pendencias = await contarPendencias(supabase, idObra, idEtapa);

  const { data: etapa } = await supabase
    .from("obra_etapas")
    .select("status")
    .eq("id_obra", idObra)
    .eq("id_etapa", idEtapa)
    .maybeSingle();
  if (!etapa || etapa.status === "concluida") return;

  if (pendencias > 0 && etapa.status !== "pausada") {
    await supabase
      .from("obra_etapas")
      .update({ status: "pausada" })
      .eq("id_obra", idObra)
      .eq("id_etapa", idEtapa);
  } else if (pendencias === 0 && etapa.status === "pausada") {
    await supabase
      .from("obra_etapas")
      .update({ status: "em_andamento", data_conclusao: null })
      .eq("id_obra", idObra)
      .eq("id_etapa", idEtapa);
  }
}

export async function updateEtapaStatus(
  obraId: number,
  etapaId: number,
  status: EtapaStatus,
): Promise<{ error?: string }> {
  if (!VALID.includes(status)) return { error: "Status invalido." };
  if (!supabaseConfigured) return {}; // modo demonstracao: sem persistencia

  const supabase = await createClient();

  // trava manual: nao deixa retomar/concluir com material a comprar pendente
  if (status === "em_andamento" || status === "concluida") {
    const pendencias = await contarPendencias(supabase, obraId, etapaId);
    if (pendencias > 0) {
      return {
        error:
          "Ha material a comprar pendente nesta etapa. Resolva as solicitacoes antes de retomar.",
      };
    }
  }

  const now = new Date().toISOString();
  const { data: atual } = await supabase
    .from("obra_etapas")
    .select("data_inicio")
    .eq("id_obra", obraId)
    .eq("id_etapa", etapaId)
    .maybeSingle();

  const patch: ObraEtapaUpdate = { status };
  if (status === "pendente") {
    patch.data_inicio = null;
    patch.data_conclusao = null;
  } else if (status === "em_andamento" || status === "pausada") {
    if (!atual?.data_inicio) patch.data_inicio = now;
    patch.data_conclusao = null;
  } else if (status === "concluida") {
    if (!atual?.data_inicio) patch.data_inicio = now;
    patch.data_conclusao = now;
  }

  const { error } = await supabase
    .from("obra_etapas")
    .update(patch)
    .eq("id_obra", obraId)
    .eq("id_etapa", etapaId);
  if (error) return { error: error.message };

  revalidatePath(`/obras/${obraId}`);
  return {};
}

export type EditarObraInput = {
  nome: string;
  cliente: string | null; // nome; resolve ou cria o cliente
  status: ObraStatus;
  orcamento_material: number;
  percentual_receita: number;
  data_inicio: string | null;
  data_prevista_termino: string | null;
  descricao: string | null;
};

/** Edita os campos da obra (inclui orcamento de material e % de receita). */
export async function updateObra(
  id: number,
  input: EditarObraInput,
): Promise<{ error?: string; ok?: boolean }> {
  const nome = input.nome.trim();
  if (!nome) return { error: "Informe o nome da obra." };
  if (!OBRA_STATUS_VALIDOS.includes(input.status)) return { error: "Status invalido." };
  if (!(input.orcamento_material >= 0)) return { error: "Orcamento de material invalido." };
  if (!(input.percentual_receita >= 0 && input.percentual_receita <= 100))
    return { error: "Percentual de receita deve estar entre 0 e 100." };

  if (!supabaseConfigured) return { ok: true }; // modo demonstracao: sem persistencia

  const supabase = await createClient();

  // resolve o cliente pelo nome (usa existente ou cria um minimo)
  let id_cliente: number | null = null;
  const nomeCliente = input.cliente?.trim() || "";
  if (nomeCliente) {
    const { data: existente } = await supabase
      .from("clientes")
      .select("id")
      .ilike("nome", nomeCliente)
      .limit(1)
      .maybeSingle();
    if (existente) {
      id_cliente = existente.id;
    } else {
      const { data: criado, error: cliErr } = await supabase
        .from("clientes")
        .insert({ nome: nomeCliente })
        .select("id")
        .single();
      if (cliErr || !criado) return { error: cliErr?.message ?? "Falha ao criar o cliente." };
      id_cliente = criado.id;
    }
  }

  const patch: ObraUpdate = {
    nome,
    id_cliente,
    status: input.status,
    orcamento_material: input.orcamento_material,
    percentual_receita: input.percentual_receita,
    data_inicio: input.data_inicio || null,
    data_prevista_termino: input.data_prevista_termino || null,
    descricao: input.descricao?.trim() || null,
  };

  const { error } = await supabase.from("obras").update(patch).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath(`/obras/${id}`);
  revalidatePath("/obras");
  return { ok: true };
}

export type NovaSolicitacaoInput = {
  id_obra: number;
  id_etapa: number;
  material: string;
  unidade: MaterialUnidade;
  quantidade: number;
  prazo_entrega: string | null;
  especificacoes: string | null;
  observacoes: string | null;
};

/**
 * Registra uma falta de material (status `a_comprar`). Identifica obra + etapa
 * pelo input e reavalia a etapa (fica `pausada` -> aviso vermelho na obra).
 */
export async function createFaltaMaterial(
  input: NovaSolicitacaoInput,
): Promise<{ error?: string; ok?: boolean }> {
  const material = input.material.trim();
  if (!input.id_obra || !input.id_etapa) return { error: "Selecione a obra e a etapa." };
  if (!material) return { error: "Informe o material." };
  if (!(input.quantidade > 0)) return { error: "Quantidade deve ser maior que zero." };

  if (!supabaseConfigured) return { ok: true }; // modo demonstracao: sem persistencia

  const supabase = await createClient();

  // resolve o material: usa o existente (case-insensitive) ou cria um novo
  let id_material: number;
  const { data: existente } = await supabase
    .from("materiais")
    .select("id")
    .ilike("nome", material)
    .limit(1)
    .maybeSingle();

  if (existente) {
    id_material = existente.id;
  } else {
    const { data: criado, error: matErr } = await supabase
      .from("materiais")
      .insert({ nome: material, unidade: input.unidade })
      .select("id")
      .single();
    if (matErr || !criado) return { error: matErr?.message ?? "Falha ao criar o material." };
    id_material = criado.id;
  }

  const { error: insErr } = await supabase.from("falta_materiais").insert({
    id_obra: input.id_obra,
    id_etapa: input.id_etapa,
    id_material,
    quantidade: input.quantidade,
    especificacoes: input.especificacoes?.trim() || null,
    prazo_entrega: input.prazo_entrega || null,
    observacoes: input.observacoes?.trim() || null,
    status: "a_comprar",
  });
  if (insErr) return { error: insErr.message };

  await sincronizarEtapa(supabase, input.id_obra, input.id_etapa);

  revalidatePath("/compras");
  revalidatePath(`/obras/${input.id_obra}`);
  return { ok: true };
}

/**
 * Avanca a solicitacao um passo: `a_comprar` -> `comprado` -> `entregue`.
 * Ao virar `comprado`, a linha permanece nas telas; a etapa da obra volta
 * para `em_andamento` se nao houver mais nenhuma solicitacao `a_comprar`.
 */
export async function avancarFaltaMaterial(
  id: number,
): Promise<{ error?: string; ok?: boolean }> {
  if (!supabaseConfigured) return { ok: true };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("falta_materiais")
    .select("id_obra, id_etapa, status")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { error: "Solicitacao nao encontrada." };

  const proximo =
    row.status === "a_comprar"
      ? "comprado"
      : row.status === "comprado"
        ? "entregue"
        : null;
  if (!proximo) return { ok: true }; // ja entregue/cancelado

  const { error } = await supabase
    .from("falta_materiais")
    .update({ status: proximo })
    .eq("id", id);
  if (error) return { error: error.message };

  await sincronizarEtapa(supabase, row.id_obra, row.id_etapa);

  revalidatePath("/compras");
  revalidatePath(`/obras/${row.id_obra}`);
  return { ok: true };
}

/** Exclui a solicitacao de material e reavalia a etapa. */
export async function excluirFaltaMaterial(
  id: number,
): Promise<{ error?: string; ok?: boolean }> {
  if (!supabaseConfigured) return { ok: true };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("falta_materiais")
    .select("id_obra, id_etapa")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("falta_materiais").delete().eq("id", id);
  if (error) return { error: error.message };

  if (row) await sincronizarEtapa(supabase, row.id_obra, row.id_etapa);

  revalidatePath("/compras");
  if (row?.id_obra) revalidatePath(`/obras/${row.id_obra}`);
  return { ok: true };
}
