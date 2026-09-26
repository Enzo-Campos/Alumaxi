/**
 * Aba "Contas": todas as contas do mes (competencia) com filtros por
 * situacao, grupo, funcionario, local, veiculo e busca. Totais no rodape
 * respeitam os filtros.
 */
import { Suspense } from "react";
import { Card } from "@/components/card";
import { Pill } from "@/components/status-pill";
import { brl, dateBR } from "@/lib/format";
import {
  ORIGEM_LABEL,
  SITUACAO,
  corDoGrupo,
  param,
  vinculoDe,
  type Opcoes,
  type Params,
} from "@/lib/financeiro";
import { getContas } from "@/lib/financeiro-data";
import { ContaAcoes } from "./conta-acoes";
import { FiltrosContas, GerarMesBotao } from "./filtros";

const num = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : undefined);

export async function AbaContas({ mes, params, opcoes }: { mes: string; params: Params; opcoes: Opcoes }) {
  const contas = await getContas({
    mes,
    situacao: param(params, "sit"),
    grupo: num(param(params, "grupo")),
    funcionario: num(param(params, "func")),
    local: num(param(params, "local")),
    veiculo: num(param(params, "veic")),
    busca: param(params, "q"),
  });

  const validas = contas.filter((c) => c.status !== "cancelado");
  const total = validas.reduce((s, c) => s + c.valor_efetivo, 0);
  const pago = validas.filter((c) => c.status === "pago").reduce((s, c) => s + c.valor_efetivo, 0);
  const aberto = validas.filter((c) => c.status === "pendente").reduce((s, c) => s + c.valor, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Suspense fallback={null}>
          <FiltrosContas opcoes={opcoes} />
        </Suspense>
        <GerarMesBotao mes={mes} />
      </div>

      <Card bodyClassName="">
        {contas.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-muted">
            Nenhuma conta encontrada para este mes{params.sit || params.grupo || params.q ? " com esses filtros" : ""}.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.12em] text-faint">
                  <th className="py-2.5 pl-5 pr-3 font-semibold">Vencimento</th>
                  <th className="px-3 py-2.5 font-semibold">Conta</th>
                  <th className="px-3 py-2.5 font-semibold">Categoria</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Valor</th>
                  <th className="px-3 py-2.5 font-semibold">Situacao</th>
                  <th className="px-3 py-2.5 pr-5 text-right font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {contas.map((c) => {
                  const sit = SITUACAO[c.situacao];
                  const barra =
                    c.situacao === "vencido" || c.situacao === "vence_hoje"
                      ? "bg-danger"
                      : c.situacao === "vence_em_breve"
                        ? "bg-warn"
                        : "bg-transparent";
                  const vinc = vinculoDe(c);
                  const difPago = c.status === "pago" && c.valor_pago != null && c.valor_pago !== c.valor;
                  return (
                    <tr key={c.id} className={c.status === "cancelado" ? "opacity-50" : ""}>
                      <td className="relative py-3 pl-5 pr-3">
                        <span className={`absolute bottom-1.5 left-0 top-1.5 w-[3px] rounded-r ${barra}`} />
                        <p className="tnum text-[13px] text-ink">{dateBR(c.vencimento)}</p>
                        {c.status === "pago" && c.data_pagamento && (
                          <p className="text-[11px] text-success">pago {dateBR(c.data_pagamento)}</p>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-[13.5px] font-medium text-ink">
                          {c.descricao}
                          {c.por_fora && (
                            <span className="ml-1.5 rounded bg-navy/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">
                              por fora
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-muted">
                          {[vinc, c.origem !== "avulsa" ? ORIGEM_LABEL[c.origem] : null].filter(Boolean).join(" · ") ||
                            "Avulsa"}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-1.5 text-[12.5px] text-ink">
                          <span
                            className="h-2 w-2 shrink-0 rounded-[2px]"
                            style={{ background: corDoGrupo(opcoes.grupos, c.id_grupo) }}
                          />
                          {c.categoria}
                        </span>
                        <span className="pl-3.5 text-[11px] text-faint">{c.grupo}</span>
                      </td>
                      <td className="tnum px-3 py-3 text-right">
                        <p className="text-[13.5px] font-semibold text-ink">{brl(c.valor_efetivo)}</p>
                        {difPago && <p className="text-[11px] text-faint line-through">{brl(c.valor)}</p>}
                      </td>
                      <td className="px-3 py-3">
                        <Pill tone={sit.tone}>{sit.label}</Pill>
                      </td>
                      <td className="px-3 py-3 pr-5">
                        <ContaAcoes id={c.id} status={c.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-line-strong text-[12.5px]">
                  <td className="py-3 pl-5 pr-3 text-muted" colSpan={3}>
                    {validas.length} conta(s){contas.length !== validas.length && ` · ${contas.length - validas.length} cancelada(s)`}
                  </td>
                  <td className="tnum px-3 py-3 text-right font-bold text-ink">{brl(total)}</td>
                  <td className="px-3 py-3 pr-5 text-[12px] text-muted" colSpan={2}>
                    <span className="text-success">pago {brl(pago)}</span> ·{" "}
                    <span className="text-ink">em aberto {brl(aberto)}</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
