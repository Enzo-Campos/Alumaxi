/**
 * Painel — visao geral de todas as areas: resumo do dia, KPIs, central de
 * avisos (gerados dos dados), graficos do financeiro, obras ativas e o mapa
 * das areas (incluindo as que ainda estao em construcao).
 * Dados: lib/painel.ts. Cada bloco falha sozinho, sem derrubar a pagina.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  Building2,
  CheckCircle2,
  HardHat,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { Card } from "@/components/card";
import { StatCard } from "@/components/stat-card";
import { CentralAvisos } from "@/components/painel/central-avisos";
import { GraficosPainel } from "@/components/painel/graficos-painel";
import { ObrasAndamento } from "@/components/painel/obras-andamento";
import { MapaAreas, type Area } from "@/components/painel/mapa-areas";
import { brl, brlCompact, pct } from "@/lib/format";
import { composicaoPorCategoria, mesCurto, mesLongo, montarMensal } from "@/lib/financeiro";
import { urgenciaDe } from "@/lib/painel-compras";
import { MESES_GRAFICO, gerarAvisos, getPainel } from "@/lib/painel";

export const dynamic = "force-dynamic";

const FUSO = "America/Sao_Paulo";

function saudacao(): string {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: FUSO }).format(new Date()));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function dataExtenso(): string {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: FUSO }).format(
    new Date(),
  );
}

function Falhou({ area }: { area: string }) {
  return (
    <p className="flex items-center justify-center gap-2 px-5 py-8 text-center text-[13px] text-muted">
      <AlertTriangle size={15} className="text-[#B9761A]" /> Nao foi possivel carregar {area}.
    </p>
  );
}

/** StatCard clicavel. */
function Kpi({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="block min-w-0 rounded-[var(--radius-card)] transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-steel"
    >
      {children}
    </Link>
  );
}

export default async function PainelPage() {
  const p = await getPainel();
  const avisos = gerarAvisos(p);
  const criticos = avisos.filter((a) => a.gravidade === "critico").length;
  const atencao = avisos.filter((a) => a.gravidade === "atencao").length;

  const falhas = [
    !p.obras.ok && "obras",
    !p.compras.ok && "compras",
    !p.financeiro.ok && "financeiro",
    !p.cadastros.ok && "cadastros",
  ].filter((x): x is string => Boolean(x));

  /* ---- obras ---- */
  const obras = p.obras.ok ? p.obras.data : [];
  const emAndamento = obras.filter((o) => o.status === "em_andamento").length;
  const pausadas = obras.filter((o) => o.status === "pausada").length;
  const ativas = obras.filter((o) => ["em_andamento", "pausada", "planejamento"].includes(o.status));
  const aReceber = ativas.reduce((s, o) => s + o.saldo_a_receber, 0);
  const noPrejuizo = ativas.filter((o) => o.em_prejuizo).length;

  /* ---- compras ---- */
  const compras = p.compras.ok ? p.compras.data : [];
  const aComprar = compras.filter((i) => i.status === "a_comprar").length;
  const compradas = compras.filter((i) => i.status === "comprado").length;
  const comprasAtrasadas = compras.filter((i) => urgenciaDe(i) === "atrasado").length;

  /* ---- financeiro ---- */
  const fin = p.financeiro.ok ? p.financeiro.data : null;
  const vencidas = fin?.alertas.filter((c) => c.situacao === "vencido" || c.situacao === "vence_hoje") ?? [];
  const semana = fin?.alertas.filter((c) => c.situacao === "vence_em_breve") ?? [];
  const totalVencido = vencidas.reduce((s, c) => s + c.valor, 0);
  const validas = fin?.contasMes.filter((c) => c.status !== "cancelado") ?? [];
  const totalMes = validas.reduce((s, c) => s + c.valor_efetivo, 0);
  const pagoMes = validas.filter((c) => c.status === "pago").reduce((s, c) => s + c.valor_efetivo, 0);
  const abertoMes = validas.filter((c) => c.status === "pendente").reduce((s, c) => s + c.valor, 0);
  const graf = fin ? montarMensal(fin.mensal, fin.grupos, p.mes, MESES_GRAFICO) : null;
  const dividasAtivas = fin?.dividas.filter((d) => !d.quitada) ?? [];
  const saldoDividas = dividasAtivas.reduce((s, d) => s + d.saldo_devedor, 0);

  /* ---- resumo do dia ---- */
  const resumo =
    criticos > 0
      ? `${criticos} ${criticos === 1 ? "item precisa" : "itens precisam"} de atencao agora${atencao ? ` e ${atencao} para acompanhar` : ""}.`
      : atencao > 0
        ? `Nada critico. ${atencao} ${atencao === 1 ? "item" : "itens"} para acompanhar.`
        : "Tudo em dia por aqui.";

  /* ---- mapa das areas ---- */
  const cad = p.cadastros.ok ? p.cadastros.data : null;
  const areas: Area[] = [
    {
      href: "/obras",
      titulo: "Obras",
      icon: Building2,
      valor: p.obras.ok ? String(ativas.length) : "—",
      legenda: `${emAndamento} em andamento · ${pausadas} pausada${pausadas === 1 ? "" : "s"}`,
      status: noPrejuizo
        ? { texto: `${noPrejuizo} no prejuizo`, tom: "critico" }
        : { texto: "Saldo positivo", tom: "ok" },
    },
    {
      href: "/compras",
      titulo: "Compras",
      icon: ShoppingCart,
      valor: p.compras.ok ? String(aComprar) : "—",
      legenda: `a comprar · ${compradas} aguardando entrega`,
      status: comprasAtrasadas
        ? { texto: `${comprasAtrasadas} atrasada${comprasAtrasadas === 1 ? "" : "s"}`, tom: "critico" }
        : aComprar
          ? { texto: "No prazo", tom: "ok" }
          : { texto: "Nada pendente", tom: "neutro" },
    },
    {
      href: "/financeiro",
      titulo: "Contas a pagar",
      icon: Wallet,
      valor: fin ? brlCompact(abertoMes) : "—",
      legenda: `em aberto em ${mesCurto(p.mes)}`,
      status: vencidas.length
        ? { texto: `${vencidas.length} vencida${vencidas.length === 1 ? "" : "s"}`, tom: "critico" }
        : semana.length
          ? { texto: `${semana.length} vence${semana.length === 1 ? "" : "m"} na semana`, tom: "atencao" }
          : { texto: "Em dia", tom: "ok" },
    },
    {
      href: "/funcionarios",
      titulo: "Funcionarios",
      icon: Users,
      valor: cad ? String(cad.funcionariosAtivos) : "—",
      legenda: cad ? `ativos · folha ${brlCompact(cad.folhaMensal)}` : "ativos",
    },
    {
      href: "/materiais",
      titulo: "Materiais",
      icon: Boxes,
      valor: cad ? String(cad.materiais) : "—",
      legenda: "materiais cadastrados",
    },
    {
      href: "/financeiro?aba=dividas",
      titulo: "Dividas",
      icon: TrendingUp,
      valor: fin ? brlCompact(saldoDividas) : "—",
      legenda: `saldo devedor · ${dividasAtivas.length} ativa${dividasAtivas.length === 1 ? "" : "s"}`,
    },
    { href: "/epis", titulo: "EPIs", icon: HardHat, legenda: "Entregas e validade dos EPIs" },
    { href: "/ferramentas", titulo: "Ferramentas", icon: Wrench, legenda: "Controle e emprestimo" },
  ];

  return (
    <div className="space-y-6">
      {/* saudacao + resumo do dia */}
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint first-letter:uppercase">
          {dataExtenso()}
        </p>
        <h1 className="mt-1 font-display text-[26px] leading-tight tracking-tight text-ink sm:text-[32px] sm:leading-none">
          {saudacao()}
        </h1>
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-muted">
          {criticos > 0 ? (
            <AlertTriangle size={15} className="shrink-0 text-danger" />
          ) : atencao > 0 ? (
            <Sparkles size={15} className="shrink-0 text-steel" />
          ) : (
            <CheckCircle2 size={15} className="shrink-0 text-success" />
          )}
          {resumo}
        </p>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi href="/obras">
          <StatCard
            label="Obras ativas"
            value={p.obras.ok ? ativas.length : "—"}
            hint={`${emAndamento} em andamento`}
            icon={Building2}
            tone="info"
          />
        </Kpi>
        <Kpi href="/obras">
          <StatCard
            label="A receber"
            value={p.obras.ok ? brlCompact(aReceber) : "—"}
            hint={noPrejuizo ? `${noPrejuizo} obra(s) no prejuizo` : "saldo das obras ativas"}
            icon={TrendingUp}
            tone={noPrejuizo ? "danger" : "success"}
            hintDesktopOnly
          />
        </Kpi>
        <Kpi href="/compras">
          <StatCard
            label="A comprar"
            value={p.compras.ok ? aComprar : "—"}
            hint={comprasAtrasadas ? `${comprasAtrasadas} atrasada(s)` : "nenhuma atrasada"}
            icon={ShoppingCart}
            tone={comprasAtrasadas ? "danger" : "neutral"}
          />
        </Kpi>
        <Kpi href="/financeiro?aba=contas&sit=vencido">
          <StatCard
            label="Contas vencidas"
            value={fin ? brlCompact(totalVencido) : "—"}
            hint={vencidas.length ? `${vencidas.length} conta(s) em atraso` : "nada em atraso"}
            icon={Wallet}
            tone={vencidas.length ? "danger" : "success"}
          />
        </Kpi>
      </div>

      {/* avisos + mes financeiro */}
      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <CentralAvisos avisos={avisos} falhas={falhas} />

        <Card
          title={`Financeiro · ${mesLongo(p.mes)}`}
          action={
            <Link href="/financeiro" className="text-[12px] font-semibold text-steel hover:underline">
              abrir
            </Link>
          }
        >
          {!fin || !graf ? (
            <Falhou area="o financeiro" />
          ) : (
            <div className="space-y-5">
              {/* pago x em aberto do mes */}
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="tnum font-display text-[22px] leading-none text-ink">{brl(totalMes)}</p>
                  <p className="text-[12px] text-muted">
                    {validas.length} conta{validas.length === 1 ? "" : "s"} no mes
                  </p>
                </div>
                <div
                  className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-navy/[0.07]"
                  role="img"
                  aria-label={`${pct(pagoMes, totalMes)}% pago`}
                >
                  <div className="h-full bg-success" style={{ width: `${pct(pagoMes, totalMes)}%` }} />
                </div>
                <div className="tnum mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[12px]">
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="h-2 w-2 rounded-full bg-success" />
                    pago <b className="font-semibold text-ink">{brl(pagoMes)}</b>
                  </span>
                  <span className="flex items-center gap-1.5 text-muted">
                    <span className="h-2 w-2 rounded-full bg-navy/20" />
                    em aberto <b className="font-semibold text-ink">{brl(abertoMes)}</b>
                  </span>
                </div>
              </div>

              <GraficosPainel
                meses={graf.meses}
                series={graf.series}
                valores={graf.valores}
                mes={p.mes}
                categorias={composicaoPorCategoria(validas)}
              />
            </div>
          )}
        </Card>
      </div>

      {/* obras ativas */}
      <Card
        title="Obras ativas"
        action={
          <Link href="/obras" className="text-[12px] font-semibold text-steel hover:underline">
            ver obras
          </Link>
        }
        bodyClassName="p-0"
      >
        {p.obras.ok ? <ObrasAndamento obras={obras} /> : <Falhou area="as obras" />}
      </Card>

      {/* todas as areas */}
      <section>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-faint">Todas as areas</h2>
        <MapaAreas areas={areas} />
      </section>
    </div>
  );
}
