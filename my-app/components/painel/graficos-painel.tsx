"use client";

/**
 * Graficos do financeiro no Painel: alterna entre a evolucao dos ultimos
 * meses e a composicao do mes (mesmos graficos da Visao geral).
 */
import { useState } from "react";
import { BarChart3, ListOrdered } from "lucide-react";
import type { CategoriaMes, SerieMensal } from "@/lib/financeiro";
import { GraficoMensal } from "@/components/financeiro/grafico-mensal";
import { GraficoCategorias } from "@/components/financeiro/grafico-categorias";

type Aba = "evolucao" | "composicao";

export function GraficosPainel({
  meses,
  series,
  valores,
  mes,
  categorias,
}: {
  meses: string[];
  series: SerieMensal[];
  valores: Record<string, Record<number, number>>;
  mes: string;
  categorias: CategoriaMes[];
}) {
  const [aba, setAba] = useState<Aba>("evolucao");

  const abas: { id: Aba; label: string; icon: typeof BarChart3 }[] = [
    { id: "evolucao", label: `Ultimos ${meses.length} meses`, icon: BarChart3 },
    { id: "composicao", label: "Por categoria", icon: ListOrdered },
  ];

  return (
    <div>
      <div className="mb-4 inline-flex rounded-lg bg-surface p-1" role="tablist" aria-label="Grafico">
        {abas.map((a) => {
          const ativo = aba === a.id;
          return (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => setAba(a.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                ativo ? "bg-card text-ink shadow-[0_1px_2px_rgba(7,16,51,0.08)]" : "text-muted hover:text-ink"
              }`}
            >
              <a.icon size={14} />
              {a.label}
            </button>
          );
        })}
      </div>

      {aba === "evolucao" ? (
        <GraficoMensal meses={meses} series={series} valores={valores} destaque={mes} />
      ) : categorias.some((c) => c.total > 0) ? (
        <GraficoCategorias itens={categorias} />
      ) : (
        <p className="py-10 text-center text-[13px] text-muted">Nenhuma conta neste mes.</p>
      )}
    </div>
  );
}
