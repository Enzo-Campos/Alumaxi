import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

export type Tom = "ok" | "atencao" | "critico" | "neutro";

export type Area = {
  href: string;
  titulo: string;
  icon: LucideIcon;
  /** numero/texto principal; ausente = area ainda em construcao */
  valor?: string;
  legenda?: string;
  status?: { texto: string; tom: Tom };
};

const TOM: Record<Tom, string> = {
  ok: "bg-success-50 text-success",
  atencao: "bg-warn-50 text-[#B9761A]",
  critico: "bg-danger-50 text-danger",
  neutro: "bg-navy/[0.06] text-muted",
};

/** Um tile por area do sistema; areas sem `valor` aparecem como "Em breve". */
export function MapaAreas({ areas }: { areas: Area[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {areas.map((a) => {
        const emBreve = a.valor == null;
        const Icone = a.icon;
        return (
          <li key={a.href}>
            <Link
              href={a.href}
              className={`group flex h-full flex-col rounded-[var(--radius-card)] border p-3.5 transition-all sm:p-4 ${
                emBreve
                  ? "border-dashed border-line-strong bg-transparent hover:bg-card"
                  : "border-line bg-card shadow-[var(--shadow-card)] hover:-translate-y-0.5 hover:border-steel/30 hover:shadow-[var(--shadow-pop)]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl ${
                    emBreve ? "bg-navy/[0.05] text-faint" : "bg-steel-50 text-steel"
                  }`}
                >
                  <Icone size={18} />
                </span>
                {emBreve ? (
                  <span className="rounded-full bg-navy/[0.06] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
                    Em breve
                  </span>
                ) : (
                  <ArrowUpRight size={16} className="text-faint transition-colors group-hover:text-steel" />
                )}
              </div>

              <p className={`mt-3 text-[12.5px] font-semibold ${emBreve ? "text-muted" : "text-ink"}`}>{a.titulo}</p>
              {emBreve ? (
                <p className="mt-0.5 text-[11.5px] leading-snug text-faint">{a.legenda ?? "Em desenvolvimento"}</p>
              ) : (
                <>
                  <p className="tnum mt-0.5 font-display text-[20px] leading-tight text-ink">{a.valor}</p>
                  {a.legenda && <p className="mt-0.5 text-[11.5px] leading-snug text-muted">{a.legenda}</p>}
                  {a.status && (
                    <span
                      className={`mt-2.5 self-start rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${TOM[a.status.tom]}`}
                    >
                      {a.status.texto}
                    </span>
                  )}
                </>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
