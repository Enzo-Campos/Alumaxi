"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Pencil, RotateCcw } from "lucide-react";
import { pagarConta, reabrirConta } from "@/app/(app)/financeiro/actions";
import type { ContaStatus } from "@/lib/financeiro";

/** Href que abre o modal de edicao preservando aba/mes/filtros. */
export function useHrefConta(id: number | "nova") {
  const params = useSearchParams();
  const q = new URLSearchParams(params.toString());
  q.set("conta", String(id));
  return `?${q.toString()}`;
}

/**
 * Acoes da linha: pagar (hoje, pelo valor da conta) / reabrir, e editar.
 * Pagamento com outra data/valor e cancelamento ficam no modal.
 */
export function ContaAcoes({ id, status }: { id: number; status: ContaStatus }) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const href = useHrefConta(id);

  function alterna() {
    setErro(null);
    start(async () => {
      const r = status === "pago" ? await reabrirConta(id) : await pagarConta(id);
      if (r.error) setErro(r.error);
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {erro && (
        <span className="mr-1 max-w-[180px] truncate text-[10.5px] text-danger" title={erro}>
          {erro}
        </span>
      )}
      {status === "pendente" && (
        <button
          type="button"
          onClick={alterna}
          disabled={pending}
          title="Marcar como paga hoje"
          className="inline-flex h-7 items-center gap-1 rounded-md bg-success-50 px-2 text-[11.5px] font-semibold text-success transition-colors hover:bg-success hover:text-white disabled:opacity-50"
        >
          <Check size={13} strokeWidth={2.5} /> {pending ? "…" : "Pagar"}
        </button>
      )}
      {status === "pago" && (
        <button
          type="button"
          onClick={alterna}
          disabled={pending}
          title="Desfazer pagamento"
          aria-label="Desfazer pagamento"
          className="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-warn-50 hover:text-[#B9761A] disabled:opacity-50"
        >
          <RotateCcw size={14} />
        </button>
      )}
      <Link
        href={href}
        scroll={false}
        title="Editar conta"
        aria-label="Editar conta"
        className="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-steel-50 hover:text-steel"
      >
        <Pencil size={14} />
      </Link>
    </div>
  );
}
