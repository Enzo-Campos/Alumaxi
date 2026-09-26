"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ImagePlus, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";
import { UNIDADES, type Material, type MaterialUnidade } from "@/lib/materiais";
import {
  createMaterial,
  updateMaterial,
  deleteMaterial,
  type MaterialInput,
} from "@/app/(app)/materiais/actions";

const field =
  "w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-[13px] text-ink outline-none transition-colors placeholder:text-faint focus:border-steel focus:ring-2 focus:ring-steel/20";
const labelCls = "mb-1 block text-[11.5px] font-semibold text-muted";

export function MaterialModal({ materiais }: { materiais: Material[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const novo = params.get("novo") != null;
  const editarId = params.get("editar");
  const emEdicao = useMemo(
    () => (editarId ? materiais.find((m) => String(m.id) === editarId) ?? null : null),
    [editarId, materiais],
  );
  const open = novo || emEdicao != null;

  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [nome, setNome] = useState("");
  const [unidade, setUnidade] = useState<MaterialUnidade>("un");
  const [ativo, setAtivo] = useState(true);
  const [imagemUrl, setImagemUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setNome(emEdicao?.nome ?? "");
    setUnidade(emEdicao?.unidade ?? "un");
    setAtivo(emEdicao?.ativo ?? true);
    setImagemUrl(emEdicao?.imagem_url ?? null);
    setError(null);
    setConfirmDel(false);
  }, [open, emEdicao]);

  const close = () => router.replace(pathname, { scroll: false });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending && !uploading) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pending, uploading]);

  if (!open) return null;

  async function handleFile(file: File) {
    if (!supabaseConfigured) {
      setError("Upload precisa do Supabase configurado. Use o campo de URL abaixo.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Imagem muito grande (maximo 5 MB).");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const supabase = createClient();
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("materiais")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(`Falha no upload: ${upErr.message}`);
        return;
      }
      const { data } = supabase.storage.from("materiais").getPublicUrl(path);
      setImagemUrl(data.publicUrl);
    } finally {
      setUploading(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!nome.trim()) {
      setError("Informe o nome do material.");
      return;
    }
    const payload: MaterialInput = {
      nome,
      unidade,
      ativo,
      imagem_url: imagemUrl?.trim() || null,
    };
    start(async () => {
      const r = emEdicao
        ? await updateMaterial(emEdicao.id, payload)
        : await createMaterial(payload);
      if (r.error) {
        setError(r.error);
        return;
      }
      close();
    });
  }

  function excluir() {
    if (!emEdicao) return;
    if (!confirmDel) {
      setConfirmDel(true);
      return;
    }
    setError(null);
    start(async () => {
      const r = await deleteMaterial(emEdicao.id);
      if (r.error) {
        setError(r.error);
        setConfirmDel(false);
        return;
      }
      close();
    });
  }

  const busy = pending || uploading;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) close();
      }}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={emEdicao ? "Editar material" : "Novo material"}
        className="max-h-[90vh] w-full max-w-[460px] overflow-y-auto rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-[var(--shadow-pop)] sm:p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[18px] text-ink">
            {emEdicao ? "Editar material" : "Novo material"}
          </h2>
          <button
            type="button"
            onClick={close}
            className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-surface hover:text-muted"
            aria-label="Fechar"
          >
            <X size={15} />
          </button>
        </div>

        {/* imagem */}
        <div className="mb-4">
          <label className={labelCls}>Imagem</label>
          <div className="flex items-start gap-3">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-line bg-surface">
              {imagemUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagemUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-faint">
                  <ImagePlus size={20} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="rounded-lg border border-line-strong bg-card px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:bg-surface disabled:opacity-60"
                >
                  {uploading ? "Enviando…" : "Escolher arquivo"}
                </button>
                {imagemUrl && (
                  <button
                    type="button"
                    onClick={() => setImagemUrl(null)}
                    className="text-[12px] font-medium text-danger hover:underline"
                  >
                    remover
                  </button>
                )}
              </div>
              <input
                className={field}
                value={imagemUrl ?? ""}
                onChange={(e) => setImagemUrl(e.target.value || null)}
                placeholder="ou cole uma URL de imagem"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className={labelCls}>Nome</label>
            <input className={field} value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Unidade</label>
            <select
              className={field}
              value={unidade}
              onChange={(e) => setUnidade(e.target.value as MaterialUnidade)}
            >
              {UNIDADES.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
              className="h-4 w-4 rounded border-line-strong accent-steel"
            />
            Material ativo (aparece nas listas de solicitacao)
          </label>
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-[12.5px] font-medium text-danger">
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-2">
          {emEdicao ? (
            <button
              type="button"
              onClick={excluir}
              disabled={busy}
              className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
                confirmDel
                  ? "bg-danger text-white"
                  : "text-danger hover:bg-danger-50"
              }`}
            >
              {confirmDel ? "Confirmar exclusao" : "Excluir"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="rounded-lg border border-line-strong bg-card px-3.5 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-surface disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-steel px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-steel-600 disabled:opacity-60"
            >
              {pending ? "Salvando…" : emEdicao ? "Salvar" : "Criar material"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
