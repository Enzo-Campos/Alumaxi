const brlFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const brlCompactFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

/** R$ 12.345,67 */
export function brl(n: number): string {
  return brlFmt.format(n);
}

/** R$ 12,3 mil — para KPIs com pouco espaco */
export function brlCompact(n: number): string {
  return brlCompactFmt.format(n);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Converte ISO em Date. Datas puras ("2026-10-20", colunas `date` do banco)
 * viram meio-dia LOCAL: `new Date("2026-10-20")` seria meia-noite UTC, que no
 * fuso do Brasil ainda e 19/10 — o dia mostrado sairia errado.
 */
function toDate(iso: string): Date {
  return DATE_ONLY.test(iso) ? new Date(`${iso}T12:00:00`) : new Date(iso);
}

/** 08/09/2026 */
export function dateBR(iso: string | null): string {
  if (!iso) return "—";
  return toDate(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** 08/set */
export function dateShortBR(iso: string | null): string {
  if (!iso) return "—";
  return toDate(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

/** 0–100, quanto do intervalo [inicio, fim] ja passou */
export function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((part / total) * 100)));
}
