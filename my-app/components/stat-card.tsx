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
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  const t = TONE[tone];
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-faint">
          {label}
        </p>
        <span className={`grid h-7 w-7 place-items-center rounded-lg ${t.chipBg} ${t.chipFg}`}>
          <Icon size={15} strokeWidth={2.25} />
        </span>
      </div>
      <p className={`tnum mt-3 font-display text-[30px] leading-none ${t.value}`}>{value}</p>
      {hint && <p className="mt-1.5 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}
