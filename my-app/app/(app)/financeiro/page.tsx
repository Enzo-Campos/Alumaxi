/**
 * Financeiro — contas a pagar da empresa (substitui a planilha de despesas).
 *
 * Estado na URL: ?aba=<visao|contas|folha|fixas|dividas|cadastros>&mes=AAAA-MM
 * + filtros da aba Contas + modais (?conta= ?fixa= ?divida= ?he= ?cad=).
 * Dados: lib/financeiro-data.ts (views do banco). Escrita: ./actions.ts.
 * Modelo do banco: supabase/README.md.
 */
import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { param, parseMes, urlCom, type Params } from "@/lib/financeiro";
import {
  getAlertas,
  getCadastros,
  getContasALancar,
  getOpcoes,
  getRecorrencias,
} from "@/lib/financeiro-data";
import { Abas, SeletorMes, parseAba } from "@/components/financeiro/navegacao";
import { AbaVisao } from "@/components/financeiro/aba-visao";
import { AbaContas } from "@/components/financeiro/aba-contas";
import { AbaFolha } from "@/components/financeiro/aba-folha";
import { AbaCadastros, AbaDividas, AbaFixas } from "@/components/financeiro/aba-cadastros";
import { ContaModal } from "@/components/financeiro/conta-modal";
import { RecorrenciaModal } from "@/components/financeiro/recorrencia-modal";
import { DividaModal } from "@/components/financeiro/divida-modal";
import { HoraExtraModal } from "@/components/financeiro/hora-extra-modal";
import { CadastroModal } from "@/components/financeiro/cadastro-modal";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const aba = parseAba(param(params, "aba"));
  const mes = parseMes(params.mes);
  const porMes = aba === "visao" || aba === "contas" || aba === "folha";

  const [opcoes, alertas, aLancar, recorrencias, cadastros] = await Promise.all([
    getOpcoes(),
    getAlertas(),
    getContasALancar(),
    aba === "fixas" ? getRecorrencias() : Promise.resolve([]),
    aba === "cadastros" ? getCadastros() : Promise.resolve({ locais: [], veiculos: [], fornecedores: [] }),
  ]);

  const atrasadas =
    alertas.filter((a) => a.situacao === "vencido" || a.situacao === "vence_hoje").length +
    aLancar.filter((a) => a.situacao === "vencido" || a.situacao === "vence_hoje").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">Financeiro</p>
          <h1 className="mt-1 font-display text-[32px] leading-none tracking-tight text-ink">Contas a pagar</h1>
          <p className="mt-2 text-[13px] text-muted">
            Despesas da empresa: folha, impostos, estrutura, veiculos e dividas.
          </p>
        </div>
        <Link
          href={urlCom(params, { conta: "nova" })}
          scroll={false}
          className="inline-flex items-center gap-1.5 rounded-lg bg-steel px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-steel-600"
        >
          <Plus size={15} /> Nova conta
        </Link>
      </header>

      <div className="space-y-4">
        <Abas params={params} ativa={aba} badges={{ visao: atrasadas }} />
        {porMes && <SeletorMes params={params} mes={mes} />}
      </div>

      {aba === "visao" && <AbaVisao mes={mes} params={params} opcoes={opcoes} alertas={alertas} aLancar={aLancar} />}
      {aba === "contas" && <AbaContas mes={mes} params={params} opcoes={opcoes} />}
      {aba === "folha" && <AbaFolha mes={mes} params={params} opcoes={opcoes} />}
      {aba === "fixas" && <AbaFixas params={params} opcoes={opcoes} recorrencias={recorrencias} />}
      {aba === "dividas" && <AbaDividas params={params} />}
      {aba === "cadastros" && <AbaCadastros params={params} opcoes={opcoes} cadastros={cadastros} />}

      {/* modais controlados pela URL (useSearchParams exige Suspense) */}
      <Suspense fallback={null}>
        <ContaModal opcoes={opcoes} mes={mes} />
        <HoraExtraModal opcoes={opcoes} />
        <DividaModal opcoes={opcoes} />
        {aba === "fixas" && <RecorrenciaModal opcoes={opcoes} recorrencias={recorrencias} />}
        {aba === "cadastros" && <CadastroModal cadastros={cadastros} opcoes={opcoes} />}
      </Suspense>
    </div>
  );
}
