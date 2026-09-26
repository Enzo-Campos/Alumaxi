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
  const [materialSel, setMaterialSel] = useState<string>(""); // "" | "<id>" | "__novo__"
  const [materialNovo, setMaterialNovo] = useState("");
  const [unidade, setUnidade] = useState<NovaSolicitacaoInput["unidade"]>("un");
  const [quantidade, setQuantidade] = useState("");
  const [prazo, setPrazo] = useState("");
  const [espec, setEspec] = useState("");
  const [obs, setObs] = useState("");

  const isNovoMaterial = materialSel === "__novo__";

  const etapasDaObra = useMemo(
    () => data.obraEtapas.filter((oe) => oe.id_obra === idObra),
    [data.obraEtapas, idObra],
  );

  function reset() {
    setIdObra("");
    setIdEtapa("");
    setMaterialSel("");
    setMaterialNovo("");
    setUnidade("un");
    setQuantidade("");
    setPrazo("");
    setEspec("");
    setObs("");
  }

  function onMaterialSel(v: string) {
    setMaterialSel(v);
    if (v && v !== "__novo__") {
      const m = data.materiais.find((x) => String(x.id) === v);
      if (m && (UNIDADES as string[]).includes(m.unidade)) {
        setUnidade(m.unidade as NovaSolicitacaoInput["unidade"]);
      }
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
    if (materialSel === "") {
      setError("Selecione o material.");
      return;
    }
    if (isNovoMaterial && !materialNovo.trim()) {
      setError("Informe o nome do novo material.");
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
        id_material: isNovoMaterial ? null : Number(materialSel),
        material: isNovoMaterial ? materialNovo.trim() : "",
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
          <select
            className={field}
            value={materialSel}
            onChange={(e) => onMaterialSel(e.target.value)}
          >
            <option value="">Selecione…</option>
            {data.materiais.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}
              </option>
            ))}
            <option value="__novo__">+ Cadastrar novo material</option>
          </select>
        </div>

        {isNovoMaterial && (
          <div className="sm:col-span-2">
            <label className={labelCls}>Nome do novo material</label>
            <input
              className={field}
              value={materialNovo}
              onChange={(e) => setMaterialNovo(e.target.value)}
              placeholder="Ex.: Fita dupla-face estrutural"
            />
            <p className="mt-1 text-[11px] text-faint">
              Sera cadastrado em Materiais automaticamente.
            </p>
          </div>
        )}

        <div className="grid grid-cols-[1fr_120px] gap-3">
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
              className={`${field} disabled:bg-surface disabled:text-muted`}
              value={unidade}
              disabled={!isNovoMaterial}
              title={isNovoMaterial ? undefined : "Definida pelo material cadastrado"}
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
