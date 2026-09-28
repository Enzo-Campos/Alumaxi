import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, CalendarDays, CalendarClock, Wallet, TrendingDown, TrendingUp, ListChecks } from "lucide-react";
import { getObra, getClientes, progressoEtapas } from "@/lib/obra";
import { brl, dateBR } from "@/lib/format";
import { StatCard } from "@/components/stat-card";
import { Pill, OBRA_STATUS } from "@/components/status-pill";
import { EtapasAndamento } from "@/components/obra/etapas-andamento";
import { FinanceiroCard } from "@/components/obra/financeiro-card";
import { FaltasTabela } from "@/components/obra/faltas-tabela";
import { EditarObraModal } from "@/components/obra/editar-obra";
import { NovaSaidaModal } from "@/components/obra/nova-saida";

export default async function ObraPage(props: PageProps<"/obras/[id]">) {
  const { id } = await props.params;
  const [obra, clientes] = await Promise.all([
    getObra(Number(id)),
    getClientes(),
  ]);
  if (!obra) notFound();

  const fin = obra.financeiro;
  const prog = progressoEtapas(obra.etapas);
  const statusMeta = OBRA_STATUS[obra.status];

  return (
    <div className="space-y-6">
      {/* cabecalho */}
      <header>
        <nav className="mb-3 flex items-center gap-1 text-[12px] text-faint">
          <Link href="/obras" className="hover:text-steel">
            Obras
          </Link>
          <ChevronRight size={13} />
          <span className="text-muted">{obra.nome}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="break-words font-display text-[26px] leading-none tracking-tight text-ink sm:text-[32px]">
                {obra.nome}
              </h1>
              <Pill tone={statusMeta.tone} dot>
                {statusMeta.label}
              </Pill>
            </div>
            <p className="mt-2 text-[13px] text-muted">
              {obra.cliente}
              {obra.endereco ? ` · ${obra.endereco}` : ""}
            </p>
          </div>

          <div className="flex gap-2">
            <Link
              href="?editar=1"
              scroll={false}
              className="rounded-lg border border-line-strong bg-card px-3.5 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-surface"
            >
              Editar obra
            </Link>
            <Link
              href="?saida=1"
              scroll={false}
              className="rounded-lg bg-steel px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-steel-600"
            >
              Registrar saida
            </Link>
          </div>
        </div>

        <div className="tnum mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-muted">
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} className="text-faint" />
            Inicio {dateBR(obra.data_inicio)}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarClock size={14} className="text-faint" />
            Previsao de termino {dateBR(obra.data_prevista_termino)}
          </span>
        </div>

        {obra.descricao && (
          <p className="mt-3 max-w-3xl text-[13px] leading-relaxed text-muted">
            {obra.descricao}
          </p>
        )}
      </header>

      {/* KPIs — dinheiro + progresso */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Valor a receber"
          value={brl(fin.valor_a_receber_total)}
          hint={`${fin.percentual_receita}% sobre ${brl(fin.orcamento_material)} de material`}
          icon={Wallet}
          tone="info"
          hintDesktopOnly
        />
        <StatCard
          label="Ja retirado"
          value={brl(fin.total_saidas)}
          hint={`material ${brl(fin.total_compra_material)} · lucro ${brl(fin.total_retirada_lucro)}`}
          icon={TrendingDown}
          tone="neutral"
          hintDesktopOnly
        />
        <StatCard
          label="Saldo a receber"
          value={brl(fin.saldo_a_receber)}
          hint={fin.em_prejuizo ? "obra no prejuizo" : "quanto ainda entra nesta obra"}
          icon={fin.em_prejuizo ? TrendingDown : TrendingUp}
          tone={fin.em_prejuizo ? "danger" : "success"}
          hintDesktopOnly
        />
        <StatCard
          label="Progresso"
          value={`${prog.pct}%`}
          hint={`${prog.concluidas} de ${prog.total} etapas concluidas`}
          icon={ListChecks}
          tone="neutral"
        />
      </div>

      {/* andamento + financeiro */}
      <div className="grid gap-5 lg:grid-cols-[1.45fr_1fr]">
        <EtapasAndamento
          obraId={obra.id}
          etapas={obra.etapas}
          faltas={obra.faltas}
          concluidas={prog.concluidas}
          total={prog.total}
          pct={prog.pct}
          previsao={obra.data_prevista_termino}
        />
        <FinanceiroCard fin={fin} saidas={obra.saidas} />
      </div>

      {/* material pendente */}
      <FaltasTabela faltas={obra.faltas} />

      <Suspense fallback={null}>
        <NovaSaidaModal obraId={obra.id} />
      </Suspense>

      <Suspense fallback={null}>
        <EditarObraModal
          obra={{
            id: obra.id,
            nome: obra.nome,
            cliente: obra.cliente,
            status: obra.status,
            orcamento_material: fin.orcamento_material,
            percentual_receita: fin.percentual_receita,
            data_inicio: obra.data_inicio,
            data_prevista_termino: obra.data_prevista_termino,
            descricao: obra.descricao,
          }}
          clientes={clientes}
        />
      </Suspense>
    </div>
  );
}
