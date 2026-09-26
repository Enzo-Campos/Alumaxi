"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteMaterial } from "@/app/(app)/materiais/actions";

export function MaterialAcoes({ id }: { id: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (!confirmDel) return;
    const t = setTimeout(() => setConfirmDel(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDel]);

  function excluir() {
    if (!confirmDel) {
      setConfirmDel(true);
      return;
    }
    setError(null);
    start(async () => {
      const r = await deleteMaterial(id);
      if (r.error) {
        setError(r.error);
        setConfirmDel(false);
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {error && <span className="mr-1 text-[10.5px] text-danger">{error}</span>}

      <Link
        href={`?editar=${id}`}
        scroll={false}
        title="Editar material"
        aria-label="Editar material"
        className="grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-steel-50 hover:text-steel"
      >
        <Pencil size={14} />
      </Link>

      <button
        type="button"
        onClick={excluir}
        disabled={pending}
        title={confirmDel ? "Clique de novo para excluir" : "Excluir material"}
        aria-label="Excluir material"
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
