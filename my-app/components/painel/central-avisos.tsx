"use client";

/**
 * Central de avisos do Painel: lista unica (ja ordenada por gravidade) com
 * filtro por area e "ver todos". Os avisos chegam prontos do servidor.
 */
import { useState } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Info,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { AreaAviso, Aviso, Gravidade } from "@/lib/painel";

const LIMITE = 6;

const AREA: Record<AreaAviso, { label: string; icon: LucideIcon }> = {
  obras: { label: "Obras", icon: Building2 },
  compras: { label: "Compras", icon: ShoppingCart },
  financeiro: { label: "Financeiro", icon: Wallet },
};

const GRAV: Record<Gravidade, { icon: LucideIcon; chip: string; barra: string; label: string }> = {
  critico: { icon: AlertOctagon, chip: "bg-danger-50 text-danger", barra: "bg-danger", label: "Critico" },
  atencao: { icon: AlertTriangle, chip: "bg-warn-50 text-[#B9761A]", barra: "bg-warn", label: "Atencao" },
  info: { icon: Info, chip: "bg-steel-50 text-steel", barra: "bg-steel", label: "Info" },
};

type Filtro = "todos" | AreaAviso;

export function CentralAvisos({ avisos, falhas }: { avisos: Aviso[]; falhas: string[] }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [todos, setTodos] = useState(false);

  const filtrados = filtro === "todos" ? avisos : avisos.filter((a) => a.area === filtro);
  const visiveis = todos ? filtrados : filtrados.slice(0, LIMITE);
  const conta = (f: Filtro) => (f === "todos" ? avisos.length : avisos.filter((a) => a.area === f).length);
  const criticos = avisos.filter((a) => a.gravidade === "critico").length;

  const chips: Filtro[] = ["todos", "obras", "compras", "financeiro"];

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)]">
      <header className="border-b border-line px-4 pb-3 pt-3.5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-faint">Central de avisos</h2>
          {criticos > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-1 text-[11px] font-bold text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              {criticos} critico{criticos === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {/* filtro por area — rola na horizontal no celular */}
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="tablist" aria-label="Filtrar avisos">
          {chips.map((f) => {
            const ativo = filtro === f;
            const n = conta(f);
            return (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={ativo}
                onClick={() => {
                  setFiltro(f);
                  setTodos(false);
                }}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  ativo
                    ? "border-navy bg-navy text-white"
                    : "border-line-strong bg-card text-muted hover:border-navy/30 hover:text-ink"
                }`}
              >
                {f === "todos" ? "Todos" : AREA[f].label}
                <span
                  className={`tnum rounded-full px-1.5 text-[10.5px] ${ativo ? "bg-white/20" : "bg-navy/[0.06]"}`}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {falhas.length > 0 && (
        <p className="flex items-start gap-2 border-b border-line bg-warn-50 px-4 py-2 text-[12px] text-[#8a5a12] sm:px-5">
          <AlertTriangle size={14} className="mt-px shrink-0" />
          Nao foi possivel verificar: {falhas.join(", ")}. Os avisos dessas areas podem estar incompletos.
        </p>
      )}

      {filtrados.length === 0 ? (
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-success-50 text-success">
            <CheckCircle2 size={22} />
          </span>
          <p className="mt-3 text-[14px] font-semibold text-ink">Tudo em dia</p>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Nenhum aviso{filtro !== "todos" ? ` em ${AREA[filtro].label.toLowerCase()}` : ""} no momento.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {visiveis.map((a) => {
            const g = GRAV[a.gravidade];
            const Ar = AREA[a.area];
            const Icone = g.icon;
            return (
              <li key={a.id}>
                <Link
                  href={a.href}
                  className="group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface sm:px-5"
                >
                  <span className={`absolute bottom-2 left-0 top-2 w-[3px] rounded-r ${g.barra}`} />
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${g.chip}`} title={g.label}>
                    <Icone size={16} strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-ink">{a.titulo}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                      <Ar.icon size={12} className="shrink-0 text-faint" />
                      <span className="truncate">{a.detalhe}</span>
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-steel"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {filtrados.length > LIMITE && (
        <button
          type="button"
          onClick={() => setTodos((t) => !t)}
          className="flex w-full items-center justify-center gap-1.5 border-t border-line py-2.5 text-[12.5px] font-semibold text-steel transition-colors hover:bg-surface"
        >
          {todos ? "Mostrar menos" : `Ver todos os ${filtrados.length} avisos`}
          <ChevronDown size={15} className={`transition-transform ${todos ? "rotate-180" : ""}`} />
        </button>
      )}
    </section>
  );
}
