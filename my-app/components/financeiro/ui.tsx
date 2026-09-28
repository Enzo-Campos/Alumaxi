"use client";

/**
 * Pecas compartilhadas dos formularios do Financeiro: casca de modal
 * controlada por query param, classes de campo e selects de vinculo.
 */
import { type FormEvent, type ReactNode, useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import type { Opcoes } from "@/lib/financeiro";

export const field =
  "w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-[13px] text-ink outline-none transition-colors placeholder:text-faint focus:border-steel focus:ring-2 focus:ring-steel/20 disabled:bg-surface disabled:text-muted";
export const labelCls = "mb-1 block text-[11.5px] font-semibold text-muted";
export const btnPrimario =
  "rounded-lg bg-steel px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-steel-600 disabled:opacity-60";
export const btnSecundario =
  "rounded-lg border border-line-strong bg-card px-3.5 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-surface disabled:opacity-60";

/**
 * Modal aberto por `?<chave>=<valor>`. Fechar remove SO essa chave da URL
 * (mantem aba, mes e filtros).
 */
export function useModalParam(chave: string) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const valor = params.get(chave);

  const fechar = useCallback(() => {
    const q = new URLSearchParams(params.toString());
    q.delete(chave);
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [params, router, pathname, chave]);

  return { valor, fechar };
}

export function ModalForm({
  titulo,
  subtitulo,
  onSubmit,
  onClose,
  busy,
  largura = 520,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
  busy: boolean;
  largura?: number;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <form
        onSubmit={onSubmit}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        style={{ maxWidth: largura }}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-[var(--shadow-pop)] sm:p-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-[18px] text-ink">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-[12px] text-muted">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-faint hover:bg-surface hover:text-muted"
            aria-label="Fechar"
          >
            <X size={15} />
          </button>
        </div>
        {children}
      </form>
    </div>
  );
}

export function Erro({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-[12.5px] font-medium text-danger">{msg}</p>
  );
}

/** Select de categoria agrupado por grupo (optgroup). */
export function CategoriaSelect({
  opcoes,
  value,
  onChange,
  disabled,
}: {
  opcoes: Opcoes;
  value: number | "";
  onChange: (v: number | "") => void;
  disabled?: boolean;
}) {
  return (
    <select
      className={field}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
    >
      <option value="">Selecione…</option>
      {opcoes.grupos.map((g) => {
        const cats = opcoes.categorias.filter((c) => c.id_grupo === g.id && (c.ativa || c.id === value));
        if (!cats.length) return null;
        return (
          <optgroup key={g.id} label={g.nome}>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}

export type Vinculos = {
  id_funcionario: number | null;
  id_local: number | null;
  id_veiculo: number | null;
  id_fornecedor: number | null;
};

export const VINCULOS_VAZIOS: Vinculos = {
  id_funcionario: null,
  id_local: null,
  id_veiculo: null,
  id_fornecedor: null,
};

/**
 * Vinculos opcionais da conta: funcionario, local (Galpao, Terreno...),
 * veiculo e fornecedor. `mostrar` limita quais aparecem.
 */
export function VinculosFields({
  opcoes,
  value,
  onChange,
  mostrar = ["id_funcionario", "id_local", "id_veiculo", "id_fornecedor"],
  disabled,
}: {
  opcoes: Opcoes;
  value: Vinculos;
  onChange: (v: Vinculos) => void;
  mostrar?: (keyof Vinculos)[];
  disabled?: boolean;
}) {
  const campos: { k: keyof Vinculos; label: string; itens: { id: number; nome: string; ativo: boolean }[] }[] = [
    { k: "id_funcionario", label: "Funcionario", itens: opcoes.funcionarios },
    { k: "id_local", label: "Local", itens: opcoes.locais },
    { k: "id_veiculo", label: "Veiculo", itens: opcoes.veiculos },
    { k: "id_fornecedor", label: "Fornecedor / credor", itens: opcoes.fornecedores },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {campos
        .filter((c) => mostrar.includes(c.k))
        .map((c) => (
          <div key={c.k}>
            <label className={labelCls}>{c.label}</label>
            <select
              className={field}
              value={value[c.k] ?? ""}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, [c.k]: e.target.value ? Number(e.target.value) : null })}
            >
              <option value="">— nenhum —</option>
              {c.itens
                .filter((i) => i.ativo || i.id === value[c.k])
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome}
                  </option>
                ))}
            </select>
          </div>
        ))}
    </div>
  );
}

/** Botoes de alternancia (segmented control). */
export function Segmentado<T extends string>({
  opcoes,
  value,
  onChange,
}: {
  opcoes: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-line-strong bg-surface p-0.5">
      {opcoes.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
            value === o.value ? "bg-card text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
