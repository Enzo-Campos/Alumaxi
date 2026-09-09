import { ShoppingCart, AlarmClock, CalendarClock, PauseOctagon } from "lucide-react";
import {
  getPainelCompras,
  getNovaSolicitacaoData,
  urgenciaDe,
} from "@/lib/painel-compras";
import { dateBR } from "@/lib/format";
import { Card } from "@/components/card";
import { StatCard } from "@/components/stat-card";
import { Pill, FALTA_STATUS } from "@/components/status-pill";
import { NovaSolicitacao } from "@/components/compras/nova-solicitacao";
import { FaltaAcoes } from "@/components/compras/falta-acoes";

export const dynamic = "force-dynamic";

export default async function ComprasPage() {
  const [itens, formData] = await Promise.all([
    getPainelCompras(),
    getNovaSolicitacaoData(),
  ]);

  const aComprar = itens.filter((i) => i.status === "a_comprar").length;
  const atrasados = itens.filter((i) => urgenciaDe(i) === "atrasado").length;
  const proximos = itens.filter((i) => urgenciaDe(i) === "proximo").length;
  const etapasParadas = new Set(itens.map((i) => `${i.obra}·${i.etapa}`)).size;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
            Operacao
          </p>
          <h1 className="mt-1 font-display text-[32px] leading-none tracking-tight text-ink">
            Compras de material
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            Solicitacoes em aberto — priorizadas por prazo.
          </p>
        </div>
      </header>

      <NovaSolicitacao data={formData} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Itens a comprar" value={aComprar} icon={ShoppingCart} tone="info" />
        <StatCard label="Atrasados" value={atrasados} icon={AlarmClock} tone="danger" />
        <StatCard label="Vencem em 3 dias" value={proximos} icon={CalendarClock} tone="warn" />
        <StatCard label="Etapas paradas" value={etapasParadas} icon={PauseOctagon} tone="neutral" />
      </div>

      <Card title="Precisa comprar" bodyClassName="">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left">
            <thead>
              <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.12em] text-faint">
                <th className="py-2.5 pl-5 pr-3 font-semibold">Material</th>
                <th className="px-3 py-2.5 font-semibold">Obra · Etapa</th>
                <th className="px-3 py-2.5 text-right font-semibold">Qtd</th>
                <th className="px-3 py-2.5 font-semibold">Prazo</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-3 py-2.5 pr-5 text-right font-semibold">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {itens.map((i) => {
                const u = urgenciaDe(i);
                const bar =
                  u === "atrasado" ? "bg-danger" : u === "proximo" ? "bg-warn" : "bg-transparent";
                const st = FALTA_STATUS[i.status];
                return (
                  <tr key={i.id}>
                    <td className="relative py-3 pl-5 pr-3">
                      <span
                        className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r ${bar}`}
                      />
                      <p className="text-[13.5px] font-medium text-ink">{i.material}</p>
                      {i.especificacoes && (
                        <p className="mt-0.5 text-[11.5px] text-muted">{i.especificacoes}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-[12.5px] text-muted">
                      {i.obra}
                      <span className="text-faint"> · {i.etapa}</span>
                    </td>
                    <td className="tnum whitespace-nowrap px-3 py-3 text-right text-[13px] text-ink">
                      {i.quantidade} {i.unidade}
                    </td>
                    <td className="px-3 py-3">
                      <div className="tnum text-[12.5px] text-ink">{dateBR(i.prazo_entrega)}</div>
                      {u === "atrasado" && (
                        <span className="text-[11px] font-semibold text-danger">
                          Atrasado {i.dias_de_atraso}d
                        </span>
                      )}
                      {u === "proximo" && (
                        <span className="text-[11px] font-semibold text-[#B9761A]">
                          Vence em {Math.abs(i.dias_de_atraso ?? 0)}d
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone={st.tone}>{st.label}</Pill>
                    </td>
                    <td className="px-3 py-3 pr-5">
                      <FaltaAcoes id={i.id} status={i.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
