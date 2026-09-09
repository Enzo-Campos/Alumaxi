import type { ReactNode } from "react";

export type PillTone = "neutral" | "info" | "warn" | "danger" | "success" | "navy";

const TONE: Record<PillTone, string> = {
  neutral: "bg-navy/[0.06] text-muted",
  navy: "bg-navy text-white",
  info: "bg-steel-50 text-steel",
  warn: "bg-warn-50 text-[#B9761A]",
  danger: "bg-danger-50 text-danger",
  success: "bg-success-50 text-success",
};

export function Pill({
  tone = "neutral",
  children,
  dot = false,
}: {
  tone?: PillTone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold leading-none ${TONE[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ---- mapeamentos por dominio ---- */

export const OBRA_STATUS: Record<string, { label: string; tone: PillTone }> = {
  planejamento: { label: "Planejamento", tone: "neutral" },
  em_andamento: { label: "Em andamento", tone: "info" },
  pausada: { label: "Pausada", tone: "warn" },
  finalizada: { label: "Finalizada", tone: "success" },
  cancelada: { label: "Cancelada", tone: "danger" },
};

export const ETAPA_STATUS: Record<string, { label: string; tone: PillTone }> = {
  pendente: { label: "Pendente", tone: "neutral" },
  em_andamento: { label: "Em andamento", tone: "info" },
  concluida: { label: "Concluida", tone: "success" },
  pausada: { label: "Pausada — material", tone: "warn" },
};

export const FALTA_STATUS: Record<string, { label: string; tone: PillTone }> = {
  a_comprar: { label: "A comprar", tone: "navy" },
  comprado: { label: "Comprado", tone: "info" },
  entregue: { label: "Entregue", tone: "success" },
  cancelado: { label: "Cancelado", tone: "neutral" },
};
