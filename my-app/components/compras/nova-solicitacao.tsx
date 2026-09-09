"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import {
  createFaltaMaterial,
  type NovaSolicitacaoInput,
} from "@/app/(app)/obras/actions";
import type { NovaSolicitacaoData } from "@/lib/painel-compras";

const UNIDADES: NovaSolicitacaoInput["unidade"][] = [
  "un",
  "m",
  "m2",
  "barra",
  "kg",
  "par",
  "conjunto",
];

const field =
  "w-full rounded-lg border border-line-strong bg-white px-3 py-2 text-[13px] text-ink outline-none transition-colors placeholder:text-faint focus:border-steel focus:ring-2 focus:ring-steel/20";
const labelCls = "mb-1 block text-[11.5px] font-semibold text-muted";

export function NovaSolicitacao({ data }: { data: NovaSolicitacaoData }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [idObra, setIdObra] = useState<number | "">("");
  const [idEtapa, setIdEtapa] = useState<number | "">("");
  const [material, setMaterial] = useState("");
  const [unidade, setUnidade] = useState<NovaSolicitacaoInput["unidade"]>("un");
  const [quantidade, setQuantidade] = useState("");
  const [prazo, setPrazo] = useState("");
  const [espec, setEspec] = useState("");
  const [obs, setObs] = useState("");

  const etapasDaObra = useMemo(
    () => data.obraEtapas.filter((oe) => oe.id_obra === idObra),
    [data.obraEtapas, idObra],
  );

  function reset() {
    setIdObra("");
    setIdEtapa("");
    setMaterial("");
    setUnidade("un");
    setQuantidade("");
    setPrazo("");
    setEspec("");
    setObs("");
  }

  function onMaterial(v: string) {
    setMaterial(v);
    const known = data.materiais.find(
      (m) => m.nome.toLowerCase() === v.trim().toLowerCase(),
    );
    if (known && (UNIDADES as string[]).includes(known.unidade)) {
      setUnidade(known.unidade as NovaSolicitacaoInput["unidade"]);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);
    if (idObra === "" || idEtapa === "") {
      setError("Selecione a obra e a etapa.");
      return;
    }
    const qtd = Number(quantidade.replace(",", "."));
    if (!(qtd > 0)) {
      setError("Quantidade invalida.");
      return;
    }
    start(async () => {
      const r = await createFaltaMaterial({
        id_obra: Number(idObra),
        id_etapa: Number(idEtapa),
        material,
        unidade,
        quantidade: qtd,
        prazo_entrega: prazo || null,
        especificacoes: espec || null,
        observacoes: obs || null,
      });
      if (r.error) {
        setError(r.error);
        return;
      }
      reset();
      setOpen(false);
      setOkMsg("Solicitacao registrada — a etapa da obra ficou pausada por falta de material.");
    });
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-3">
        {okMsg ? (
          <p className="text-[12.5px] font-medium text-success">{okMsg}</p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => {
            setOkMsg(null);
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-steel px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-steel-600"
        >
          <Plus size={15} /> Nova solicitacao
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-[var(--radius-card)] border border-line bg-card p-5 shadow-[var(--shadow-card)]"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-faint">
          Nova solicitacao de material
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-surface hover:text-muted"
          aria-label="Fechar"
        >
          <X size={15} />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Obra</label>
          <select
            className={field}
            value={idObra}
            onChange={(e) => {
              setIdObra(e.target.value ? Number(e.target.value) : "");
              setIdEtapa("");
            }}
          >
            <option value="">Selecione…</option>
            {data.obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>Etapa</label>
          <select
            className={field}
            value={idEtapa}
            disabled={idObra === ""}
            onChange={(e) => setIdEtapa(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">
              {idObra === "" ? "Escolha a obra primeiro" : "Selecione…"}
            </option>
            {etapasDaObra.map((oe) => (
              <option key={oe.id_etapa} value={oe.id_etapa}>
                {oe.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Material</label>
          <input
            className={field}
            list="materiais-lista"
            value={material}
            onChange={(e) => onMaterial(e.target.value)}
            placeholder="Digite ou escolha da lista"
          />
          <datalist id="materiais-lista">
            {data.materiais.map((m) => (
              <option key={m.id} value={m.nome} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-[1fr_110px] gap-3">
          <div>
            <label className={labelCls}>Quantidade</label>
            <input
              className={field}
              inputMode="decimal"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className={labelCls}>Unidade</label>
            <select
              className={field}
              value={unidade}
              onChange={(e) =>
                setUnidade(e.target.value as NovaSolicitacaoInput["unidade"])
              }
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Prazo de entrega</label>
          <input
            type="date"
            className={field}
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Especificacoes</label>
          <textarea
            className={`${field} min-h-[56px] resize-y`}
            value={espec}
            onChange={(e) => setEspec(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls}>Observacoes</label>
          <textarea
            className={`${field} min-h-[48px] resize-y`}
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-danger-50 px-3 py-2 text-[12.5px] font-medium text-danger">
          {error}
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-line-strong bg-card px-3.5 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-surface"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-steel px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-steel-600 disabled:opacity-60"
        >
          {pending ? "Salvando…" : "Registrar falta"}
        </button>
      </div>
    </form>
  );
}
