import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Pill, OBRA_STATUS } from "@/components/status-pill";
import { brl, dateShortBR } from "@/lib/format";
import type { ObraPainel } from "@/lib/painel";

const ATIVAS = new Set(["em_andamento", "pausada", "planejamento"]);
const LIMITE = 5;

function prazoTexto(o: ObraPainel): { texto: string; cor: string } {
  if (o.diasParaPrazo == null) return { texto: "sem prazo", cor: "text-faint" };
  if (o.diasParaPrazo < 0) return { texto: `prazo estourado (${dateShortBR(o.data_prevista_termino)})`, cor: "text-danger" };
  if (o.diasParaPrazo <= 15) return { texto: `termina ${dateShortBR(o.data_prevista_termino)}`, cor: "text-[#B9761A]" };
  return { texto: `termina ${dateShortBR(o.data_prevista_termino)}`, cor: "text-muted" };
}

/** Obras ativas: progresso das etapas, saldo e prazo — as mais apertadas primeiro. */
export function ObrasAndamento({ obras }: { obras: ObraPainel[] }) {
  const ativas = obras
    .filter((o) => ATIVAS.has(o.status))
    .sort((a, b) => (a.diasParaPrazo ?? Infinity) - (b.diasParaPrazo ?? Infinity));

  if (ativas.length === 0) {
    return <p className="px-5 py-10 text-center text-[13px] text-muted">Nenhuma obra ativa no momento.</p>;
  }

  return (
    <>
      <ul className="divide-y divide-line">
        {ativas.slice(0, LIMITE).map((o) => {
          const st = OBRA_STATUS[o.status];
          const prazo = prazoTexto(o);
          return (
            <li key={o.id}>
              <Link
                href={`/obras/${o.id}`}
                className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-[13.5px] font-semibold text-ink">{o.nome}</p>
                    <Pill tone={st.tone} dot>
                      {st.label}
                    </Pill>
                  </div>

                  <div className="mt-2 flex items-center gap-2.5">
                    <div
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-navy/[0.07]"
                      role="progressbar"
                      aria-valuenow={o.progresso.pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Progresso de ${o.nome}`}
                    >
                      <div
                        className={`h-full rounded-full ${o.progresso.pct === 100 ? "bg-success" : "bg-steel"}`}
                        style={{ width: `${o.progresso.pct}%` }}
                      />
                    </div>
                    <span className="tnum w-9 shrink-0 text-right text-[12px] font-semibold text-ink">
                      {o.progresso.pct}%
                    </span>
                  </div>

                  <div className="tnum mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11.5px]">
                    <span className="text-muted">
                      {o.progresso.concluidas}/{o.progresso.total} etapas ·{" "}
                      <span className={prazo.cor}>{prazo.texto}</span>
                    </span>
                    <span className={`font-semibold ${o.em_prejuizo ? "text-danger" : "text-success"}`}>
                      {brl(o.saldo_a_receber)}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-faint group-hover:text-steel" />
              </Link>
            </li>
          );
        })}
      </ul>
      {ativas.length > LIMITE && (
        <Link
          href="/obras"
          className="block border-t border-line py-2.5 text-center text-[12.5px] font-semibold text-steel hover:bg-surface"
        >
          Ver todas as {ativas.length} obras ativas
        </Link>
      )}
    </>
  );
}
