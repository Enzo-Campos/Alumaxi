import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/card";
import { Pill, FALTA_STATUS } from "@/components/status-pill";
import { dateBR } from "@/lib/format";
import type { FaltaMaterial } from "@/lib/obra";
import { FaltaAcoes } from "@/components/compras/falta-acoes";

function urgencia(f: FaltaMaterial) {
  if (f.dias_de_atraso == null || f.prazo_entrega == null)
    return { bar: "bg-transparent", tag: null as null | { tone: "warn" | "danger"; text: string } };
  if (f.dias_de_atraso > 0)
    return { bar: "bg-danger", tag: { tone: "danger" as const, text: `Atrasado ${f.dias_de_atraso}d` } };
  if (f.dias_de_atraso >= -3)
    return { bar: "bg-warn", tag: { tone: "warn" as const, text: `Vence em ${Math.abs(f.dias_de_atraso)}d` } };
  return { bar: "bg-transparent", tag: null };
}

export function FaltasTabela({ faltas }: { faltas: FaltaMaterial[] }) {
  return (
    <Card
      title="Material pendente"
      bodyClassName=""
      action={
        <a
          href="/compras"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-steel hover:underline"
        >
          abrir no painel de compras <ArrowUpRight size={13} />
        </a>
      }
    >
      {faltas.length === 0 ? (
        <p className="px-5 py-8 text-center text-[13px] text-muted">
          Nenhum material pendente nesta obra.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.12em] text-faint">
                <th className="py-2.5 pl-5 pr-3 font-semibold">Material</th>
                <th className="px-3 py-2.5 font-semibold">Etapa</th>
                <th className="px-3 py-2.5 text-right font-semibold">Qtd</th>
                <th className="px-3 py-2.5 font-semibold">Prazo</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 pr-5 text-right font-semibold">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {faltas.map((f) => {
                const u = urgencia(f);
                const st = FALTA_STATUS[f.status];
                return (
                  <tr key={f.id} className="group">
                    <td className="relative py-3 pl-5 pr-3">
                      <span
                        className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r ${u.bar}`}
                      />
                      <p className="text-[13.5px] font-medium text-ink">{f.material}</p>
                      {f.especificacoes && (
                        <p className="mt-0.5 text-[11.5px] text-muted">{f.especificacoes}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[12.5px] text-muted">{f.etapa}</td>
                    <td className="tnum whitespace-nowrap px-3 py-3 text-right text-[13px] text-ink">
                      {f.quantidade} {f.unidade}
                    </td>
                    <td className="px-3 py-3">
                      <div className="tnum text-[12.5px] text-ink">{dateBR(f.prazo_entrega)}</div>
                      {u.tag && (
                        <span
                          className={`text-[11px] font-semibold ${
                            u.tag.tone === "danger" ? "text-danger" : "text-[#B9761A]"
                          }`}
                        >
                          {u.tag.text}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone={st.tone}>{st.label}</Pill>
                    </td>
                    <td className="px-3 py-3 pr-5">
                      <FaltaAcoes id={f.id} status={f.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
