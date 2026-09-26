/**
 * Aba "Folha": pagamentos da competencia por funcionario (colunas = regras
 * da folha: adiantamento, saldo, VA) + hora extra, e a lista de horas
 * extras lancadas que caem nesta competencia. Cada celula abre a conta.
 */
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card } from "@/components/card";
import { brl, dateBR, dateShortBR } from "@/lib/format";
import { urlCom, type ContaView, type Opcoes, type Params } from "@/lib/financeiro";
import { getContas, getFolhaRegras, getHorasExtras } from "@/lib/financeiro-data";
import { BotaoExcluir } from "./botao-excluir";

const HE = -1; // coluna virtual de hora extra

function tomDaCelula(c: ContaView[]): string {
  if (c.every((x) => x.status === "pago")) return "text-success";
  if (c.some((x) => x.situacao === "vencido" || x.situacao === "vence_hoje")) return "text-danger";
  return "text-ink";
}

export async function AbaFolha({ mes, params, opcoes }: { mes: string; params: Params; opcoes: Opcoes }) {
  const [contas, regras, horas] = await Promise.all([getContas({ mes }), getFolhaRegras(), getHorasExtras(mes)]);

  const folha = contas.filter((c) => c.origem === "folha" && c.status !== "cancelado");
  const colunas = [...regras.map((r) => ({ id: r.id, nome: r.nome })), { id: HE, nome: "Hora extra" }];

  // funcionario -> coluna -> contas
  const linhas = new Map<number, { nome: string; cel: Map<number, ContaView[]> }>();
  for (const c of folha) {
    if (c.id_funcionario == null || c.id_folha_regra == null) continue;
    const col = c.categoria === "Hora extra" ? HE : c.id_folha_regra;
    const l = linhas.get(c.id_funcionario) ?? { nome: c.funcionario?.trim() ?? "—", cel: new Map() };
    l.cel.set(col, [...(l.cel.get(col) ?? []), c]);
    linhas.set(c.id_funcionario, l);
  }
  const ordenadas = [...linhas.entries()].sort((a, b) => a[1].nome.localeCompare(b[1].nome));

  const somaCol = (col: number) => folha
    .filter((c) => (col === HE ? c.categoria === "Hora extra" : c.id_folha_regra === col && c.categoria !== "Hora extra"))
    .reduce((s, c) => s + c.valor_efetivo, 0);
  const vencCol = (col: number) => folha.find((c) => c.id_folha_regra === col && c.categoria !== "Hora extra")?.vencimento;
  const total = folha.reduce((s, c) => s + c.valor_efetivo, 0);
  const nomeFunc = new Map(opcoes.funcionarios.map((f) => [f.id, f.nome]));
  const nomeRegra = new Map(regras.map((r) => [r.id, r.nome]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-muted">
          Salario e vale-alimentacao vem do cadastro de cada funcionario. Adiantamento no dia 20, saldo no 5º dia util
          do mes seguinte.
        </p>
        <Link
          href={urlCom(params, { he: "nova" })}
          scroll={false}
          className="inline-flex items-center gap-1.5 rounded-lg bg-steel px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-steel-600"
        >
          <Plus size={15} /> Lancar hora extra
        </Link>
      </div>

      <Card title="Folha do mes" bodyClassName="">
        {ordenadas.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-muted">
            Nenhum pagamento de folha neste mes. Gere as contas do mes na aba Contas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.12em] text-faint">
                  <th className="py-2.5 pl-5 pr-3 font-semibold">Funcionario</th>
                  {colunas.map((c) => {
                    const v = c.id !== HE ? vencCol(c.id) : undefined;
                    return (
                      <th key={c.id} className="px-3 py-2.5 text-right font-semibold">
                        {c.nome}
                        {v && <span className="block text-[10px] normal-case tracking-normal">vence {dateShortBR(v)}</span>}
                      </th>
                    );
                  })}
                  <th className="px-3 py-2.5 pr-5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ordenadas.map(([id, l]) => {
                  const tot = [...l.cel.values()].flat().reduce((s, c) => s + c.valor_efetivo, 0);
                  return (
                    <tr key={id}>
                      <td className="py-2.5 pl-5 pr-3 text-[13.5px] font-medium text-ink">{l.nome}</td>
                      {colunas.map((col) => {
                        const cs = l.cel.get(col.id);
                        if (!cs?.length) {
                          return (
                            <td key={col.id} className="px-3 py-2.5 text-right text-[12.5px] text-faint">
                              —
                            </td>
                          );
                        }
                        const soma = cs.reduce((s, c) => s + c.valor_efetivo, 0);
                        return (
                          <td key={col.id} className="px-3 py-2.5 text-right">
                            <Link
                              href={urlCom(params, { conta: cs[0].id })}
                              scroll={false}
                              title={cs[0].status === "pago" ? `Pago em ${dateBR(cs[0].data_pagamento)}` : "Em aberto"}
                              className={`tnum rounded px-1 text-[13px] font-semibold hover:bg-steel-50 ${tomDaCelula(cs)}`}
                            >
                              {brl(soma)}
                            </Link>
                            {cs.some((c) => c.por_fora) && (
                              <span className="block text-[10px] uppercase text-faint">por fora</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="tnum px-3 py-2.5 pr-5 text-right text-[13px] font-bold text-ink">{brl(tot)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-line-strong">
                  <td className="py-3 pl-5 pr-3 text-[12.5px] text-muted">{ordenadas.length} funcionario(s)</td>
                  {colunas.map((c) => (
                    <td key={c.id} className="tnum px-3 py-3 text-right text-[12.5px] font-semibold text-ink">
                      {brl(somaCol(c.id))}
                    </td>
                  ))}
                  <td className="tnum px-3 py-3 pr-5 text-right text-[13px] font-bold text-ink">{brl(total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="border-t border-line px-5 py-2.5 text-[11.5px] text-faint">
          <span className="font-semibold text-success">Verde</span> = pago ·{" "}
          <span className="font-semibold text-danger">vermelho</span> = vencido · clique no valor para pagar ou editar.
        </p>
      </Card>

      <Card title="Horas extras desta competencia" bodyClassName="">
        {horas.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-muted">Nenhuma hora extra lancada.</p>
        ) : (
          <ul className="divide-y divide-line">
            {horas.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5">
                <div className="min-w-[160px] flex-1">
                  <p className="text-[13px] font-medium text-ink">{nomeFunc.get(h.id_funcionario) ?? "—"}</p>
                  <p className="text-[11.5px] text-muted">
                    Trabalhada em {dateBR(h.data)}
                    {h.horas != null && ` · ${h.horas}h`}
                    {h.obs && ` · ${h.obs}`}
                  </p>
                </div>
                <p className="text-[12px] text-muted">paga no {nomeRegra.get(h.id_folha_regra)?.toLowerCase() ?? "—"}</p>
                <p className="tnum w-[100px] text-right text-[13px] font-semibold text-ink">{brl(h.valor)}</p>
                <BotaoExcluir tipo="hora_extra" id={h.id} rotulo="Excluir hora extra" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
