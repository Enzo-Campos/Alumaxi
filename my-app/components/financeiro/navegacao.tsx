/**
 * Abas e seletor de mes do Financeiro (server components — so links).
 * Trocar de aba mantem o mes; trocar de mes mantem a aba e os filtros.
 */
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mesAtual, mesLongo, somaMes, urlCom, type Params } from "@/lib/financeiro";

export const ABAS = [
  { id: "visao", label: "Visao geral" },
  { id: "contas", label: "Contas" },
  { id: "folha", label: "Folha" },
  { id: "fixas", label: "Contas fixas" },
  { id: "dividas", label: "Dividas" },
  { id: "cadastros", label: "Cadastros" },
] as const;

export type Aba = (typeof ABAS)[number]["id"];

export function parseAba(v: string | undefined): Aba {
  return ABAS.some((a) => a.id === v) ? (v as Aba) : "visao";
}

export function Abas({ params, ativa, badges }: { params: Params; ativa: Aba; badges?: Partial<Record<Aba, number>> }) {
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1" aria-label="Secoes do financeiro">
      {ABAS.map((a) => {
        const on = a.id === ativa;
        const n = badges?.[a.id];
        return (
          <Link
            key={a.id}
            // filtros da lista so fazem sentido na aba Contas
            href={urlCom(
              { mes: params.mes },
              { aba: a.id === "visao" ? null : a.id },
            )}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={`relative inline-flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[13px] font-semibold transition-colors ${
              on ? "text-ink" : "text-faint hover:text-muted"
            }`}
          >
            {a.label}
            {!!n && (
              <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] leading-none text-white">{n}</span>
            )}
            {on && <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-steel" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function SeletorMes({ params, mes }: { params: Params; mes: string }) {
  const atual = mesAtual();
  const btn =
    "grid h-8 w-8 place-items-center rounded-lg border border-line-strong bg-card text-muted transition-colors hover:bg-surface hover:text-ink";
  return (
    <div className="flex items-center gap-2">
      <Link href={urlCom(params, { mes: somaMes(mes, -1) })} scroll={false} className={btn} aria-label="Mes anterior">
        <ChevronLeft size={16} />
      </Link>
      <span className="min-w-[150px] text-center text-[14px] font-semibold capitalize text-ink">{mesLongo(mes)}</span>
      <Link href={urlCom(params, { mes: somaMes(mes, 1) })} scroll={false} className={btn} aria-label="Proximo mes">
        <ChevronRight size={16} />
      </Link>
      {mes !== atual && (
        <Link
          href={urlCom(params, { mes: null })}
          scroll={false}
          className="ml-1 text-[12px] font-medium text-steel hover:underline"
        >
          ir para o mes atual
        </Link>
      )}
    </div>
  );
}
