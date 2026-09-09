"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Trash2 } from "lucide-react";
import {
  avancarFaltaMaterial,
  excluirFaltaMaterial,
} from "@/app/(app)/obras/actions";

const PROXIMO_LABEL: Record<string, string> = {
  a_comprar: "Marcar como comprado",
  comprado: "Marcar como entregue",
};

export function FaltaAcoes({ id, status }: { id: number; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  // reseta a confirmacao de exclusao apos alguns segundos
  useEffect(() => {
    if (!confirmDel) return;
    const t = setTimeout(() => setConfirmDel(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDel]);

  const avancarLabel = PROXIMO_LABEL[status];

  function avancar() {
    setError(null);
    start(async () => {
      const r = await avancarFaltaMaterial(id);
      if (r.error) setError(r.error);
    });
  }

  function excluir() {
    if (!confirmDel) {
      setConfirmDel(true);
      return;
    }
    setError(null);
    start(async () => {
      const r = await excluirFaltaMaterial(id);
      if (r.error) setError(r.error);
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {error && <span className="mr-1 text-[10.5px] text-danger">{error}</span>}

      {avancarLabel && (
        <button
          type="button"
          onClick={avancar}
          disabled={pending}
          title={avancarLabel}
          aria-label={avancarLabel}
          className="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-success-50 hover:text-success disabled:opacity-50"
        >
          <Check size={14} strokeWidth={2.5} />
        </button>
      )}

      <button
        type="button"
        onClick={excluir}
        disabled={pending}
        title={confirmDel ? "Clique de novo para excluir" : "Excluir solicitacao"}
        aria-label="Excluir solicitacao"
        className={`grid h-7 place-items-center rounded-md transition-colors disabled:opacity-50 ${
          confirmDel
            ? "w-auto gap-1 bg-danger-50 px-2 text-[11px] font-semibold text-danger"
            : "w-7 text-faint hover:bg-danger-50 hover:text-danger"
        }`}
      >
        <Trash2 size={14} />
        {confirmDel && <span>confirmar</span>}
      </button>
    </div>
  );
}
