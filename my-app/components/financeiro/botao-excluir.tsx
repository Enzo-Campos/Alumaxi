"use client";

/**
 * Lixeira com confirmacao em 2 cliques (padrao do app: volta sozinha em 4s).
 * Recebe a server action a chamar.
 */
import { useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { excluirDivida, excluirHoraExtra } from "@/app/(app)/financeiro/actions";

const ACOES = {
  hora_extra: excluirHoraExtra,
  divida: excluirDivida,
} as const;

export function BotaoExcluir({ tipo, id, rotulo }: { tipo: keyof typeof ACOES; id: number; rotulo: string }) {
  const [pending, start] = useTransition();
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!confirmar) return;
    const t = setTimeout(() => setConfirmar(false), 4000);
    return () => clearTimeout(t);
  }, [confirmar]);

  return (
    <span className="inline-flex items-center gap-1">
      {erro && (
        <span className="max-w-[220px] text-[10.5px] leading-tight text-danger" title={erro}>
          {erro}
        </span>
      )}
      <button
        type="button"
        disabled={pending}
        aria-label={rotulo}
        title={confirmar ? "Clique de novo para excluir" : rotulo}
        onClick={() => {
          if (!confirmar) return setConfirmar(true);
          setErro(null);
          start(async () => {
            const r = await ACOES[tipo](id);
            if (r.error) {
              setErro(r.error);
              setConfirmar(false);
            }
          });
        }}
        className={`grid h-7 place-items-center rounded-md transition-colors disabled:opacity-50 ${
          confirmar
            ? "w-auto grid-flow-col gap-1 bg-danger-50 px-2 text-[11px] font-semibold text-danger"
            : "w-7 text-faint hover:bg-danger-50 hover:text-danger"
        }`}
      >
        <Trash2 size={14} />
        {confirmar && <span>confirmar</span>}
      </button>
    </span>
  );
}
