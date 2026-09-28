"use client";

/**
 * Evolucao mensal das despesas — colunas empilhadas por grupo.
 * Specs (skill dataviz): coluna <= 24px, topo arredondado 4px e base reta,
 * 2px de superficie entre segmentos, grade hairline solida, total no topo,
 * tooltip por coluna (hit area = faixa inteira), legenda + visao em tabela.
 * A cor segue o GRUPO (corDoGrupo), nunca a posicao.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Table2, BarChart3 } from "lucide-react";
import { brl, brlCompact } from "@/lib/format";
import { mesCurto, mesLongo } from "@/lib/financeiro";

export type Serie = { id: number; nome: string; cor: string };

const ALTURA = 220; // area de plotagem
const EIXO_X = 26; // faixa dos rotulos de mes
const TOPO = 22; // espaco para o total acima da coluna
const EIXO_Y = 58; // largura dos rotulos do eixo Y
const GAP = 2;
const RAIO = 4;

/** Passo "redondo" para o eixo Y: 1, 2, 2.5, 5 x 10^n. */
function escala(max: number): number[] {
  if (max <= 0) return [0];
  const bruto = max / 4;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto) ?? 10 * pot;
  const ticks: number[] = [];
  for (let v = 0; v <= max + passo * 0.001; v += passo) ticks.push(v);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + passo);
  return ticks;
}

/** Retangulo com os dois cantos de cima arredondados. */
function topoArredondado(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export function GraficoMensal({
  meses,
  series,
  valores,
  destaque,
}: {
  meses: string[]; // "AAAA-MM", em ordem
  series: Serie[]; // ordem de empilhamento (de baixo para cima)
  valores: Record<string, Record<number, number>>; // mes -> grupo -> total
  destaque?: string; // mes selecionado na pagina
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(640);
  const [hover, setHover] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(260, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const totais = useMemo(
    () => meses.map((m) => series.reduce((s, g) => s + (valores[m]?.[g.id] ?? 0), 0)),
    [meses, series, valores],
  );
  const ticks = useMemo(() => escala(Math.max(...totais, 0)), [totais]);
  const max = ticks[ticks.length - 1] || 1;

  const plotW = largura - EIXO_Y;
  const banda = plotW / Math.max(meses.length, 1);
  const barW = Math.min(24, banda * 0.5);
  const y = (v: number) => TOPO + ALTURA - (v / max) * ALTURA;
  const vazio = totais.every((t) => t === 0);

  return (
    <div>
      {/* legenda + alternancia grafico/tabela */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
          {series.map((s) => (
            <li key={s.id} className="flex items-center gap-1.5 text-[12px] text-muted">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: s.cor }} />
              {s.nome}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setTabela((t) => !t)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          {tabela ? <BarChart3 size={14} /> : <Table2 size={14} />}
          {tabela ? "Ver grafico" : "Ver tabela"}
        </button>
      </div>

      {tabela ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.12em] text-faint">
                <th className="py-2 pr-3 font-semibold">Grupo</th>
                {meses.map((m) => (
                  <th key={m} className="px-2 py-2 text-right font-semibold">
                    {mesCurto(m)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {series.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 pr-3 text-ink">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-[3px] align-middle" style={{ background: s.cor }} />
                    {s.nome}
                  </td>
                  {meses.map((m) => (
                    <td key={m} className="tnum px-2 py-2 text-right text-muted">
                      {valores[m]?.[s.id] ? brl(valores[m][s.id]) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-2 pr-3 text-ink">Total</td>
                {totais.map((t, i) => (
                  <td key={meses[i]} className="tnum px-2 py-2 text-right text-ink">
                    {brl(t)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
          {vazio && (
            <p className="absolute inset-0 grid place-items-center text-[13px] text-muted">
              Sem contas no periodo.
            </p>
          )}
          <svg width={largura} height={TOPO + ALTURA + EIXO_X} role="img" aria-label="Despesas por mes e grupo">
            {/* grade + eixo Y */}
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={EIXO_Y}
                  x2={largura}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={t === 0 ? "rgba(7,16,51,0.18)" : "rgba(7,16,51,0.07)"}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text x={EIXO_Y - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-faint text-[10.5px]">
                  {t === 0 ? "0" : brlCompact(t).replace("R$", "").trim()}
                </text>
              </g>
            ))}

            {meses.map((m, i) => {
              const cx = EIXO_Y + banda * i + banda / 2;
              const x = cx - barW / 2;
              const segs = series
                .map((s) => ({ s, v: valores[m]?.[s.id] ?? 0 }))
                .filter((d) => d.v > 0);
              let acumulado = 0;
              const ativo = hover === i;
              return (
                <g key={m}>
                  {/* hit area = faixa inteira do mes */}
                  <rect
                    x={EIXO_Y + banda * i}
                    y={0}
                    width={banda}
                    height={TOPO + ALTURA}
                    fill={ativo ? "rgba(7,16,51,0.035)" : "transparent"}
                    onMouseEnter={() => setHover(i)}
                  />
                  {segs.map((d, k) => {
                    const y0 = y(acumulado);
                    acumulado += d.v;
                    const y1 = y(acumulado);
                    const ultimo = k === segs.length - 1;
                    // 2px de superficie entre segmentos (tira do topo de cada um, menos o ultimo)
                    const h = Math.max(0, y0 - y1 - (ultimo ? 0 : GAP));
                    const top = ultimo ? y1 : y1 + GAP;
                    return ultimo ? (
                      <path
                        key={d.s.id}
                        d={topoArredondado(x, top, barW, h, RAIO)}
                        fill={d.s.cor}
                        pointerEvents="none"
                      />
                    ) : (
                      <rect key={d.s.id} x={x} y={top} width={barW} height={h} fill={d.s.cor} pointerEvents="none" />
                    );
                  })}
                  {totais[i] > 0 && (
                    <text
                      x={cx}
                      y={y(totais[i]) - 6}
                      textAnchor="middle"
                      className="tnum fill-muted text-[10.5px] font-semibold"
                      pointerEvents="none"
                    >
                      {brlCompact(totais[i])}
                    </text>
                  )}
                  <text
                    x={cx}
                    y={TOPO + ALTURA + 17}
                    textAnchor="middle"
                    className={`text-[11px] ${m === destaque ? "fill-ink font-bold" : "fill-faint"}`}
                    pointerEvents="none"
                  >
                    {mesCurto(m)}
                  </text>
                </g>
              );
            })}
          </svg>

          {hover != null && totais[hover] > 0 && (
            <div
              className="pointer-events-none absolute top-2 z-10 w-[220px] rounded-lg border border-line bg-card p-3 shadow-[var(--shadow-pop)]"
              style={{
                left: Math.min(
                  Math.max(EIXO_Y + banda * hover + banda / 2 - 110, 0),
                  largura - 220,
                ),
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
                {mesLongo(meses[hover])}
              </p>
              <ul className="mt-2 space-y-1">
                {[...series].reverse().map((s) => {
                  const v = valores[meses[hover]]?.[s.id] ?? 0;
                  if (!v) return null;
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3 text-[12px]">
                      <span className="flex items-center gap-1.5 text-muted">
                        <span className="h-[3px] w-3 rounded-full" style={{ background: s.cor }} />
                        {s.nome}
                      </span>
                      <span className="tnum font-semibold text-ink">{brl(v)}</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 flex justify-between border-t border-line pt-2 text-[12px]">
                <span className="text-muted">Total</span>
                <span className="tnum font-bold text-ink">{brl(totais[hover])}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
