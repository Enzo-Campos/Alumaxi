"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { createObra, type CriarObraInput } from "@/app/(app)/obras/actions";
import type { ObraStatus } from "@/lib/obra";

const STATUS: { value: ObraStatus; label: string }[] = [
  { value: "planejamento", label: "Planejamento" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "pausada", label: "Pausada" },
  { value: "finalizada", label: "Finalizada" },
  { value: "cancelada", label: "Cancelada" },
];

const field =
  "w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-[13px] text-ink outline-none transition-colors placeholder:text-faint focus:border-steel focus:ring-2 focus:ring-steel/20";
const labelCls = "mb-1 block text-[11.5px] font-semibold text-muted";

function num(v: string): number {
  return Number(v.replace(/\s/g, "").replace(",", "."));
}

export function NovaObraModal({
  clientes,
  etapas,
}: {
  clientes: { id: number; nome: string }[];
  etapas: { id: number; nome: string; ordem: number }[];
}) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const open = params.get("nova") != null;

  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [cliente, setCliente] = useState("");
  const [status, setStatus] = useState<ObraStatus>("planejamento");
  const [orcamento, setOrcamento] = useState("0");
  const [percentual, setPercentual] = useState("0");
  const [inicio, setInicio] = useState("");
  const [termino, setTermino] = useState("");
  const [descricao, setDescricao] = useState("");
  const [etapaIds, setEtapaIds] = useState<number[]>([]);

  useEffect(() => {
    if (!open) return;
    setNome("");
    setCliente("");
    setStatus("planejamento");
    setOrcamento("0");
    setPercentual("0");
    setInicio("");
    setTermino("");
    setDescricao("");
    setEtapaIds(etapas.map((e) => e.id)); // todas marcadas por padrao
    setError(null);
  }, [open, etapas]);

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

  function toggleEtapa(id: number) {
    setEtapaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const orc = num(orcamento);
    const pct = num(percentual);
    if (!nome.trim()) return setError("Informe o nome da obra.");
    if (!(orc >= 0)) return setError("Orcamento de material invalido.");
    if (!(pct >= 0 && pct <= 100))
      return setError("Percentual de receita deve estar entre 0 e 100.");

    const payload: CriarObraInput = {
      nome,
      cliente: cliente.trim() || null,
      status,
      orcamento_material: orc,
      percentual_receita: pct,
      data_inicio: inicio || null,
      data_prevista_termino: termino || null,
      descricao: descricao.trim() || null,
      etapaIds,
    };

    start(async () => {
      const r = await createObra(payload);
      if (r.error && !r.id) {
        setError(r.error);
        return;
      }
      if (r.id) router.push(`/obras/${r.id}`);
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
        aria-label="Nova obra"
        className="max-h-[90dvh] w-full max-w-[560px] overflow-y-auto rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-[var(--shadow-pop)] sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[18px] text-ink">Nova obra</h2>
          <button
            type="button"
            onClick={close}
            className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-surface hover:text-muted"
            aria-label="Fechar"
          >
            <X size={15} />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Nome da obra</label>
            <input
              className={field}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Residencial Aurora"
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Cliente</label>
            <input
              className={field}
              list="clientes-nova-obra"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Digite ou escolha da lista (opcional)"
            />
            <datalist id="clientes-nova-obra">
              {clientes.map((c) => (
                <option key={c.id} value={c.nome} />
              ))}
            </datalist>
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Status</label>
            <select
              className={field}
              value={status}
              onChange={(e) => setStatus(e.target.value as ObraStatus)}
            >
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Orcamento de material (R$)</label>
            <input
              className={field}
              inputMode="decimal"
              value={orcamento}
              onChange={(e) => setOrcamento(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div>
            <label className={labelCls}>Percentual de receita (%)</label>
            <input
              className={field}
              inputMode="decimal"
              value={percentual}
              onChange={(e) => setPercentual(e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className={labelCls}>Data de inicio</label>
            <input
              type="date"
              className={field}
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Previsao de termino</label>
            <input
              type="date"
              className={field}
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2">
            <label className={labelCls}>Descricao</label>
            <textarea
              className={`${field} min-h-[64px] resize-y`}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          {etapas.length > 0 && (
            <div className="sm:col-span-2">
              <div className="mb-1.5 flex items-center justify-between">
                <label className={`${labelCls} mb-0`}>
                  Etapas da obra ({etapaIds.length}/{etapas.length})
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setEtapaIds(
                      etapaIds.length === etapas.length ? [] : etapas.map((e) => e.id),
                    )
                  }
                  className="text-[11.5px] font-medium text-steel hover:underline"
                >
                  {etapaIds.length === etapas.length ? "desmarcar todas" : "marcar todas"}
                </button>
              </div>
              <div className="grid max-h-44 gap-1 overflow-y-auto rounded-lg border border-line p-2 sm:grid-cols-2">
                {etapas.map((et) => (
                  <label
                    key={et.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[12.5px] text-ink hover:bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={etapaIds.includes(et.id)}
                      onChange={() => toggleEtapa(et.id)}
                      className="h-3.5 w-3.5 rounded border-line-strong accent-steel"
                    />
                    {et.nome}
                  </label>
                ))}
              </div>
            </div>
          )}
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
            {pending ? "Criando…" : "Criar obra"}
          </button>
        </div>
      </form>
    </div>
  );
}
