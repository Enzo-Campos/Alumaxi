import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card } from "@/components/card";
import { Pill, OBRA_STATUS } from "@/components/status-pill";
import { brl, dateBR } from "@/lib/format";
import { getObrasResumo } from "@/lib/obra";

export const dynamic = "force-dynamic";

export default async function ObrasPage() {
  const obras = await getObrasResumo();

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[32px] leading-none tracking-tight text-ink">
            Obras
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            {obras.length} obra{obras.length === 1 ? "" : "s"} cadastrada
            {obras.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-steel px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-steel-600"
        >
          Nova obra
        </button>
      </header>

      <Card bodyClassName="">
        {obras.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-muted">
            Nenhuma obra cadastrada ainda.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {obras.map((o) => {
              const st = OBRA_STATUS[o.status];
              return (
                <li key={o.id}>
                  <Link
                    href={`/obras/${o.id}`}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <p className="text-[14px] font-semibold text-ink">{o.nome}</p>
                        <Pill tone={st.tone} dot>
                          {st.label}
                        </Pill>
                      </div>
                      <p className="tnum mt-1 text-[12px] text-muted">
                        {o.cliente ?? "sem cliente"} · previsao{" "}
                        {dateBR(o.data_prevista_termino)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10.5px] uppercase tracking-[0.12em] text-faint">
                        Saldo a receber
                      </p>
                      <p
                        className={`tnum text-[14px] font-bold ${
                          o.em_prejuizo ? "text-danger" : "text-success"
                        }`}
                      >
                        {brl(o.saldo_a_receber)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-faint" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
