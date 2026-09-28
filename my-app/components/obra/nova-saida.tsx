"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { createSaida, type SaidaInput } from "@/app/(app)/obras/actions";

const CATEGORIAS: { value: SaidaInput["categoria"]; label: string; hint: string }[] = [
  {
    value: "compra_material",
    label: "Compra de material",
    hint: "Custo da obra — o cliente nao ressarce.",
  },
  {
    value: "retirada_lucro",
    label: "Retirada de lucro",
    hint: "Retirada do lucro da obra.",
  },
];

const field =
  "w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-[13px] text-ink outline-none transition-colors placeholder:text-faint focus:border-steel focus:ring-2 focus:ring-steel/20";
const labelCls = "mb-1 block text-[11.5px] font-semibold text-muted";

const hoje = () => new Date().toISOString().slice(0, 10);

export function NovaSaidaModal({ obraId }: { obraId: number }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const open = params.get("saida") != null;

  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [categoria, setCategoria] =
    useState<SaidaInput["categoria"]>("compra_material");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());
  const [descricao, setDescricao] = useState("");

  useEffect(() => {
    if (!open) return;
    setCategoria("compra_material");
    setValor("");
    setData(hoje());
    setDescricao("");
    setError(null);
  }, [open]);

  const close = () => router.replace(pathname, { scroll: false });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pending]);

  if (!open) return null;

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const v = Number(valor.replace(/\s/g, "").replace(/\./g, "").replace(",", "."));
    if (!(v > 0)) {
      setError("Informe um valor maior que zero.");
      return;
    }
    start(async () => {
      const r = await createSaida(obraId, {
        valor: v,
        categoria,
        descricao: descricao.trim() || null,
        data: data || null,
      });
      if (r.error) {
        setError(r.error);
        return;
      }
      close();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !pending) close();
      }}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label="Registrar saida"
        className="max-h-[90dvh] w-full max-w-[440px] overflow-y-auto rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-[var(--shadow-pop)] sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[18px] text-ink">Registrar saida</h2>
          <button
            type="button"
            onClick={close}
            className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-surface hover:text-muted"
            aria-label="Fechar"
          >
            <X size={15} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className={labelCls}>Categoria</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategoria(c.value)}
                  className={`rounded-lg border px-3 py-2 text-left text-[12.5px] font-semibold transition-colors ${
                    categoria === c.value
                      ? "border-steel bg-steel-50 text-steel"
                      : "border-line-strong bg-white text-muted hover:bg-surface"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-faint">
              {CATEGORIAS.find((c) => c.value === categoria)?.hint}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Valor (R$)</label>
              <input
                className={field}
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                autoFocus
              />
            </div>
            <div>
              <label className={labelCls}>Data</label>
              <input
                type="date"
                className={field}
                value={data}
                max={hoje()}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Descricao</label>
            <input
              className={field}
              maxLength={255}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex.: NF 1234 — vidros pav. 1-6"
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-[12.5px] font-medium text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={close}
            disabled={pending}
            className="rounded-lg border border-line-strong bg-card px-3.5 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-surface disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-steel px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-steel-600 disabled:opacity-60"
          >
            {pending ? "Salvando…" : "Registrar saida"}
          </button>
        </div>
      </form>
    </div>
  );
}
