/**
 * Aba "Visao geral": KPIs do mes, alertas de vencimento (qualquer mes),
 * contas variaveis a lancar, evolucao dos ultimos 6 meses, composicao do
 * mes por categoria e resumo das dividas.
 */
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, Wallet } from "lucide-react";
import { Card } from "@/components/card";
import { StatCard } from "@/components/stat-card";
import { Pill } from "@/components/status-pill";
import { brl, brlCompact, dateBR, pct } from "@/lib/format";
import {
  SITUACAO,
  composicaoPorCategoria,
  mesCurto,
  montarMensal,
  urlCom,
  vinculoDe,
  type ContaALancar,
  type ContaView,
  type Opcoes,
  type Params,
} from "@/lib/financeiro";
import { getContas, getDividas, getMensal } from "@/lib/financeiro-data";
import { ContaAcoes } from "./conta-acoes";
import { ContasALancar } from "./contas-a-lancar";
import { GraficoMensal } from "./grafico-mensal";
import { GraficoCategorias } from "./grafico-categorias";

const MESES_GRAFICO = 6;

export async function AbaVisao({
  mes,
  params,
  opcoes,
  alertas,
  aLancar,
}: {
  mes: string;
  params: Params;
  opcoes: Opcoes;
  alertas: ContaView[];
  aLancar: ContaALancar[];
}) {
  const [contas, mensal, dividas] = await Promise.all([
    getContas({ mes }),
    getMensal(mes, MESES_GRAFICO),
    getDividas(),
  ]);

  /* ---- KPIs do mes (canceladas fora) ---- */
  const validas = contas.filter((c) => c.status !== "cancelado");
  const total = validas.reduce((s, c) => s + c.valor_efetivo, 0);
  const pago = validas.filter((c) => c.status === "pago").reduce((s, c) => s + c.valor_efetivo, 0);
  const aberto = validas.filter((c) => c.status === "pendente").reduce((s, c) => s + c.valor, 0);
  const porFora = validas.filter((c) => c.por_fora).reduce((s, c) => s + c.valor_efetivo, 0);
  const aLancarDoMes = aLancar.filter((a) => a.competencia.startsWith(mes));

  /* ---- alertas (qualquer competencia) ---- */
  const vencidas = alertas.filter((a) => a.situacao === "vencido");
  const hoje = alertas.filter((a) => a.situacao === "vence_hoje");
  const semana = alertas.filter((a) => a.situacao === "vence_em_breve");
  const totalVencido = vencidas.reduce((s, c) => s + c.valor, 0);
  const aLancarAtrasadas = aLancar.filter((a) => a.situacao === "vencido" || a.situacao === "vence_hoje");

  /* ---- graficos ---- */
  const { meses, series, valores } = montarMensal(mensal, opcoes.grupos, mes, MESES_GRAFICO);
  const categorias = composicaoPorCategoria(validas);

  const dividasAtivas = dividas.filter((d) => !d.quitada);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total do mes"
          value={brlCompact(total)}
          hint={`${validas.length} contas · ${brl(total)}`}
          icon={Wallet}
          tone="neutral"
        />
        <StatCard
          label="Pago"
          value={brlCompact(pago)}
          hint={`${pct(pago, total)}% do mes${porFora ? ` · ${brlCompact(porFora)} por fora` : ""}`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Em aberto no mes"
          value={brlCompact(aberto)}
          hint={
            aLancarDoMes.length
              ? `+ ${aLancarDoMes.length} conta(s) variavel(is) sem valor`
              : `${validas.filter((c) => c.status === "pendente").length} contas`
          }
          icon={CalendarClock}
          tone="info"
        />
        <StatCard
          label="Vencido"
          value={brlCompact(totalVencido)}
          hint={vencidas.length ? `${vencidas.length} conta(s) em atraso` : "Nada em atraso"}
          icon={AlertTriangle}
          tone={vencidas.length ? "danger" : "success"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
        {/* alertas */}
        <Card
          title="Alertas de vencimento"
          action={
            <Link
              href={urlCom({ mes: params.mes }, { aba: "contas", sit: "pendente" })}
              className="text-[12px] font-semibold text-steel hover:underline"
            >
              ver contas em aberto
            </Link>
          }
          bodyClassName=""
        >
          {alertas.length === 0 && aLancarAtrasadas.length === 0 ? (
            <p className="flex items-center gap-2 px-5 py-8 text-[13px] text-muted">
              <CheckCircle2 size={16} className="text-success" /> Nenhuma conta vencida ou vencendo nos proximos 7
              dias.
            </p>
          ) : (
            <div className="divide-y divide-line">
              <GrupoAlerta titulo="Vencidas" contas={vencidas} />
              <GrupoAlerta titulo="Vencem hoje" contas={hoje} />
              <GrupoAlerta titulo="Proximos 7 dias" contas={semana} />
              {aLancarAtrasadas.length > 0 && (
                <p className="flex items-center gap-2 px-5 py-3 text-[12.5px] text-danger">
                  <AlertTriangle size={14} />
                  {aLancarAtrasadas.length} conta(s) variavel(is) vencida(s) sem valor lancado — veja abaixo.
                </p>
              )}
            </div>
          )}
        </Card>

        {/* contas a lancar */}
        <Card title={`Contas a lancar${aLancar.length ? ` (${aLancar.length})` : ""}`} bodyClassName="">
          <p className="border-b border-line px-5 py-2.5 text-[12px] text-muted">
            Contas de valor variavel: informe o valor do boleto quando ele chegar.
          </p>
          <ContasALancar itens={aLancar} />
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title={`Evolucao — ${mesCurto(meses[0])} a ${mesCurto(mes)}`}>
          <GraficoMensal meses={meses} series={series} valores={valores} destaque={mes} />
        </Card>
        <Card title={`Composicao de ${mesCurto(mes)}`}>
          <GraficoCategorias itens={categorias} />
        </Card>
      </div>

      {dividasAtivas.length > 0 && (
        <Card
          title="Dividas"
          action={
            <Link href={urlCom({ mes: params.mes }, { aba: "dividas" })} className="text-[12px] font-semibold text-steel hover:underline">
              detalhes
            </Link>
          }
        >
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {dividasAtivas.map((d) => {
              const p = pct(d.parcelas_pagas, d.numero_parcelas);
              return (
                <li key={d.id}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[13px] font-semibold text-ink">{d.descricao}</p>
                    <p className="tnum shrink-0 text-[12px] text-muted">
                      {d.parcelas_pagas}/{d.numero_parcelas}
                    </p>
                  </div>
                  <div className="mt-1.5 h-2 w-full rounded-full bg-steel-50">
                    <div className="h-full rounded-full bg-steel" style={{ width: `${p}%` }} />
                  </div>
                  <p className="mt-1.5 text-[12px] text-muted">
                    Saldo <span className="tnum font-semibold text-ink">{brl(d.saldo_devedor)}</span>
                    {d.proximo_vencimento && <> · proxima {dateBR(d.proximo_vencimento)}</>}
                  </p>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function GrupoAlerta({ titulo, contas }: { titulo: string; contas: ContaView[] }) {
  if (!contas.length) return null;
  const soma = contas.reduce((s, c) => s + c.valor, 0);
  return (
    <div>
      <p className="flex justify-between bg-surface/60 px-5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-faint">
        <span>
          {titulo} · {contas.length}
        </span>
        <span className="tnum">{brl(soma)}</span>
      </p>
      <ul className="divide-y divide-line">
        {contas.map((c) => {
          const sit = SITUACAO[c.situacao];
          const atraso = c.dias_para_vencer != null && c.dias_para_vencer < 0 ? -c.dias_para_vencer : 0;
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5">
              <div className="min-w-[160px] flex-1">
                <p className="text-[13px] font-medium text-ink">{c.descricao}</p>
                <p className="text-[11.5px] text-muted">
                  {[c.categoria, vinculoDe(c)].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="text-right">
                <p className="tnum text-[13px] font-semibold text-ink">{brl(c.valor)}</p>
                <p className="text-[11px] text-muted">
                  {dateBR(c.vencimento)}
                  {atraso > 0 && <span className="text-danger"> · {atraso}d atraso</span>}
                </p>
              </div>
              <Pill tone={sit.tone}>{sit.label}</Pill>
              <ContaAcoes id={c.id} status={c.status} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
