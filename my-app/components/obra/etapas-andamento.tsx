import { Check, TriangleAlert } from "lucide-react";
import { Card } from "@/components/card";
import { dateShortBR } from "@/lib/format";
import type { ObraEtapa, FaltaMaterial } from "@/lib/obra";
import { EtapaStatusSelect } from "@/components/obra/etapa-status-select";

function Marker({
  status,
  faltaMaterial,
}: {
  status: ObraEtapa["status"];
  faltaMaterial: boolean;
}) {
  if (status === "concluida") {
    return (
      <span className="grid h-6 w-6 place-items-center rounded-full bg-success-50 text-success">
        <Check size={13} strokeWidth={3} />
      </span>
    );
  }
  const ring =
    status === "em_andamento"
      ? "border-steel bg-steel-50"
      : status === "pausada"
        ? faltaMaterial
          ? "border-danger bg-danger-50"
          : "border-warn bg-warn-50"
        : "border-line-strong bg-white";
  return <span className={`h-6 w-6 rounded-full border-2 ${ring}`} />;
}

export function EtapasAndamento({
  obraId,
  etapas,
  faltas,
  concluidas,
  total,
  pct,
  previsao,
}: {
  obraId: number;
  etapas: ObraEtapa[];
  faltas: FaltaMaterial[];
  concluidas: number;
  total: number;
  pct: number;
  previsao: string | null;
}) {
  // so `a_comprar` bloqueia a etapa; `comprado` ja liberou o andamento
  const pendentesPorEtapa = new Map<string, number>();
  for (const f of faltas) {
    if (f.status === "a_comprar") {
      pendentesPorEtapa.set(f.etapa, (pendentesPorEtapa.get(f.etapa) ?? 0) + 1);
    }
  }

  return (
    <Card
      title="Andamento"
      action={
        <span className="tnum text-[12px] text-muted">
          {concluidas}/{total} etapas · previsao {dateShortBR(previsao)}
        </span>
      }
    >
      {/* barra de progresso */}
      <div className="mb-5">
        <div className="mb-1.5 flex items-end justify-between">
          <span className="font-display text-[26px] leading-none text-ink">{pct}%</span>
          <span className="text-[12px] text-faint">concluido</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-navy/[0.07]">
          <div
            className="h-full rounded-full bg-steel transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* trilha de etapas */}
      <ol className="relative space-y-1">
        {etapas.map((e, i) => {
          const last = i === etapas.length - 1;
          const qtdPendente = pendentesPorEtapa.get(e.nome) ?? 0;
          return (
            <li key={e.id_etapa} className="relative flex gap-3.5">
              {!last && (
                <span className="absolute left-[11px] top-7 bottom-0 w-px bg-line-strong" />
              )}
              <div className="relative z-10 pt-0.5">
                <Marker status={e.status} faltaMaterial={qtdPendente > 0} />
              </div>

              <div className="flex-1 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p
                      className={`text-[13.5px] font-medium ${
                        e.status === "pendente" ? "text-faint" : "text-ink"
                      }`}
                    >
                      {e.nome}
                    </p>
                    <p className="tnum mt-0.5 text-[11.5px] text-muted">
                      {e.status === "concluida"
                        ? `${dateShortBR(e.data_inicio)} – ${dateShortBR(e.data_conclusao)}`
                        : e.status === "em_andamento"
                          ? `desde ${dateShortBR(e.data_inicio)} · prev. ${dateShortBR(e.data_prevista)}`
                          : e.status === "pausada"
                            ? `parada desde ${dateShortBR(e.data_inicio)}`
                            : `prevista p/ ${dateShortBR(e.data_prevista)}`}
                    </p>
                  </div>

                  <EtapaStatusSelect obraId={obraId} etapaId={e.id_etapa} status={e.status} />
                </div>

                {qtdPendente > 0 && (
                  <div className="mt-2 flex items-start gap-2 rounded-lg bg-danger px-3 py-2 text-white ring-2 ring-danger/25">
                    <TriangleAlert size={15} className="mt-px shrink-0" />
                    <p className="text-[12px] font-bold leading-snug">
                      Etapa parada por falta de material
                      <span className="font-medium">
                        {" "}
                        — {qtdPendente} {qtdPendente === 1 ? "item" : "itens"} a
                        resolver
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
