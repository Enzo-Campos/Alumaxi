"use client";

/**
 * Composicao do mes por categoria — barras horizontais de uma serie so
 * (magnitude: uma cor, sem legenda). Barra <= 14px, ponta arredondada 4px e
 * base reta, valor na ponta, detalhe (pago / em aberto / % do mes) no hover
 * e no foco. Categorias alem de `limite` somam em "Outras".
 */
import { useMemo, useState } from "react";
import { brl } from "@/lib/format";

export type ItemCategoria = {
  id: number;
  nome: string;
  grupo: string;
  total: number;
  pago: number;
  aberto: number;
};

export function GraficoCategorias({ itens, limite = 8 }: { itens: ItemCategoria[]; limite?: number }) {
  const [hover, setHover] = useState<number | null>(null);

  const linhas = useMemo(() => {
    const ord = [...itens].filter((i) => i.total > 0).sort((a, b) => b.total - a.total);
    if (ord.length <= limite) return ord;
    const resto = ord.slice(limite - 1);
    return [
      ...ord.slice(0, limite - 1),
      {
        id: -1,
        nome: `Outras (${resto.length})`,
        grupo: "",
        total: resto.reduce((s, i) => s + i.total, 0),
        pago: resto.reduce((s, i) => s + i.pago, 0),
        aberto: resto.reduce((s, i) => s + i.aberto, 0),
      },
    ];
  }, [itens, limite]);

  const soma = linhas.reduce((s, i) => s + i.total, 0);
  const max = Math.max(...linhas.map((i) => i.total), 1);

  if (!linhas.length) {
    return <p className="py-8 text-center text-[13px] text-muted">Sem contas neste mes.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {linhas.map((i) => {
        const ativo = hover === i.id;
        return (
          <li
            key={i.id}
            tabIndex={0}
            onMouseEnter={() => setHover(i.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i.id)}
            onBlur={() => setHover(null)}
            className="relative rounded-md outline-none focus-visible:ring-2 focus-visible:ring-steel/30"
          >
            <div className="flex items-baseline justify-between gap-3 text-[12.5px]">
              <span className="truncate text-ink">
                {i.nome}
                {i.grupo && <span className="text-faint"> · {i.grupo}</span>}
              </span>
              <span className="tnum shrink-0 font-semibold text-ink">{brl(i.total)}</span>
            </div>
            <div className="mt-1 h-3.5 w-full">
              <div
                className="h-full rounded-r-[4px] transition-[filter]"
                style={{
                  width: `${Math.max((i.total / max) * 100, 1.5)}%`,
                  background: "#2e5bff",
                  filter: ativo ? "brightness(1.15)" : undefined,
                }}
              />
            </div>
            {ativo && (
              <div className="pointer-events-none absolute right-0 top-full z-10 mt-1 w-[210px] rounded-lg border border-line bg-card p-2.5 text-[12px] shadow-[var(--shadow-pop)]">
                <p className="flex justify-between">
                  <span className="text-muted">Pago</span>
                  <span className="tnum font-semibold text-ink">{brl(i.pago)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted">Em aberto</span>
                  <span className="tnum font-semibold text-ink">{brl(i.aberto)}</span>
                </p>
                <p className="mt-1 flex justify-between border-t border-line pt-1">
                  <span className="text-muted">Do total do mes</span>
                  <span className="tnum font-semibold text-ink">
                    {soma ? Math.round((i.total / soma) * 100) : 0}%
                  </span>
                </p>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
