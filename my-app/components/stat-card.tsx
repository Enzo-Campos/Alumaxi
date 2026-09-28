import type { LucideIcon } from "lucide-react";

type Tone = "neutral" | "danger" | "warn" | "info" | "success";

const TONE: Record<Tone, { value: string; chipBg: string; chipFg: string }> = {
  neutral: { value: "text-ink", chipBg: "bg-navy/[0.06]", chipFg: "text-navy" },
  danger: { value: "text-danger", chipBg: "bg-danger-50", chipFg: "text-danger" },
  warn: { value: "text-warn", chipBg: "bg-warn-50", chipFg: "text-warn" },
  info: { value: "text-steel", chipBg: "bg-steel-50", chipFg: "text-steel" },
  success: { value: "text-success", chipBg: "bg-success-50", chipFg: "text-success" },
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  hintDesktopOnly = false,
}: {
  label: string;
  value: number | string;
  hint?: string;
  /** esconde o hint no celular (abaixo de sm) */
  hintDesktopOnly?: boolean;
  icon: LucideIcon;
  tone?: Tone;
}) {
  const t = TONE[tone];
  return (
    // @container: o valor escala pela largura do proprio card (2 por linha no celular)
    <div className="@container min-w-0 rounded-[var(--radius-card)] border border-line bg-card p-3.5 shadow-[var(--shadow-card)] sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-[10px] font-semibold uppercase tracking-[0.1em] text-faint sm:text-[10.5px] sm:tracking-[0.14em]">
          {label}
        </p>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${t.chipBg} ${t.chipFg}`}>
          <Icon size={15} strokeWidth={2.25} />
        </span>
      </div>
      <p
        className={`tnum mt-3 whitespace-nowrap font-display text-[clamp(15px,12.5cqi,30px)] leading-none ${t.value}`}
      >
        {value}
      </p>
      {hint && (
        <p
          className={`mt-1.5 break-words text-[11.5px] leading-snug text-muted sm:text-[12px] ${hintDesktopOnly ? "hidden sm:block" : ""}`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
