"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { updateEtapaStatus } from "@/app/(app)/obras/actions";
import type { EtapaStatus } from "@/lib/obra";

const OPCOES: { value: EtapaStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluida" },
  { value: "pausada", label: "Pausada" },
];

const TONE: Record<EtapaStatus, string> = {
  pendente: "text-muted",
  em_andamento: "text-steel",
  concluida: "text-success",
  pausada: "text-danger",
};

export function EtapaStatusSelect({
  obraId,
  etapaId,
  status,
}: {
  obraId: number;
  etapaId: number;
  status: EtapaStatus;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="shrink-0 text-right">
      <div className="relative inline-flex items-center">
        <select
          aria-label="Status da etapa"
          value={status}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.value as EtapaStatus;
            setError(null);
            start(async () => {
              const r = await updateEtapaStatus(obraId, etapaId, next);
              if (r.error) setError(r.error);
            });
          }}
          className={`appearance-none rounded-lg border border-line-strong bg-white py-1.5 pl-2.5 pr-7 text-[12px] font-semibold outline-none transition-colors focus:border-steel focus:ring-2 focus:ring-steel/20 disabled:opacity-60 ${TONE[status]}`}
        >
          {OPCOES.map((o) => (
            <option key={o.value} value={o.value} className="text-ink">
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          className="pointer-events-none absolute right-2 text-faint"
        />
      </div>
      {error && <p className="mt-1 text-[10.5px] text-danger">{error}</p>}
    </div>
  );
}
