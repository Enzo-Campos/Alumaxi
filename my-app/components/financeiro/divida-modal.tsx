"use client";

/**
 * Nova divida (`?divida=nova`): financiamento ou parcelamento. O banco gera
 * uma conta por parcela restante. Condicoes nao podem ser alteradas depois
 * (ajuste parcelas individualmente em Contas).
 */
import { type FormEvent, useState, useTransition } from "react";
import { criarDivida } from "@/app/(app)/financeiro/actions";
import { brl } from "@/lib/format";
import { FORMAS_PAGAMENTO, parseValor, type FormaPagamento, type Opcoes } from "@/lib/financeiro";
import {
  CategoriaSelect,
  Erro,
  ModalForm,
  VINCULOS_VAZIOS,
  VinculosFields,
  btnPrimario,
  btnSecundario,
  field,
  labelCls,
  useModalParam,
  type Vinculos,
} from "./ui";

export function DividaModal({ opcoes }: { opcoes: Opcoes }) {
  const { valor: param, fechar } = useModalParam("divida");
  if (param !== "nova") return null;
  return <DividaForm opcoes={opcoes} fechar={fechar} />;
}

function DividaForm({ opcoes, fechar }: { opcoes: Opcoes; fechar: () => void }) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<number | "">(
    () => opcoes.categorias.find((c) => c.nome === "Parcela")?.id ?? "",
  );
  const [vinculos, setVinculos] = useState<Vinculos>(VINCULOS_VAZIOS);
  const [contratado, setContratado] = useState("");
  const [parcela, setParcela] = useState("");
  const [numero, setNumero] = useState("");
  const [anteriores, setAnteriores] = useState("0");
  const [primeiro, setPrimeiro] = useState("");
  const [forma, setForma] = useState<FormaPagamento | "">("");
  const [obs, setObs] = useState("");

  const vParcela = parseValor(parcela);
  const n = Number(numero);
  const ant = Number(anteriores) || 0;
  const restantes = n > 0 ? Math.max(n - ant, 0) : 0;

  function submit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const vc = contratado.trim() ? parseValor(contratado) : null;
    if (vc != null && !(vc > 0)) return setErro("Valor contratado invalido.");
    start(async () => {
      const r = await criarDivida({
        descricao,
        id_categoria: categoria || 0,
        id_fornecedor: vinculos.id_fornecedor,
        id_veiculo: vinculos.id_veiculo,
        id_local: vinculos.id_local,
        valor_contratado: vc,
        valor_parcela: vParcela,
        numero_parcelas: n,
        parcelas_anteriores: ant,
        primeiro_vencimento: primeiro,
        forma_pagamento: forma || null,
        obs,
      });
      if (r.error) return setErro(r.error);
      fechar();
    });
  }

  return (
    <ModalForm
      titulo="Nova divida"
      subtitulo="Financiamento ou parcelamento: cada parcela vira uma conta."
      onSubmit={submit}
      onClose={fechar}
      busy={pending}
      largura={560}
    >
      <fieldset disabled={pending} className="space-y-3">
        <div>
          <label className={labelCls}>Descricao</label>
          <input
            className={field}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Financiamento Kombi"
          />
        </div>
        <div>
          <label className={labelCls}>Categoria</label>
          <CategoriaSelect opcoes={opcoes} value={categoria} onChange={setCategoria} />
        </div>
        <VinculosFields
          opcoes={opcoes}
          value={vinculos}
          onChange={setVinculos}
          mostrar={["id_fornecedor", "id_veiculo", "id_local"]}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Parcela (R$)</label>
            <input className={`${field} tnum`} inputMode="decimal" value={parcela} onChange={(e) => setParcela(e.target.value)} placeholder="0,00" />
          </div>
          <div>
            <label className={labelCls}>Nº de parcelas</label>
            <input type="number" min={1} className={`${field} tnum`} value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div>
            <label className={labelCls} title="Parcelas pagas antes de cadastrar no sistema">
              Ja pagas
            </label>
            <input type="number" min={0} className={`${field} tnum`} value={anteriores} onChange={(e) => setAnteriores(e.target.value)} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Valor financiado</label>
            <input className={`${field} tnum`} inputMode="decimal" value={contratado} onChange={(e) => setContratado(e.target.value)} placeholder="opcional" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Vencimento da parcela 1</label>
            <input type="date" className={field} value={primeiro} onChange={(e) => setPrimeiro(e.target.value)} />
            <p className="mt-1 text-[11px] text-faint">As demais vencem no mesmo dia dos meses seguintes.</p>
          </div>
          <div>
            <label className={labelCls}>Forma de pagamento</label>
            <select className={field} value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento | "")}>
              <option value="">—</option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Observacoes</label>
          <textarea className={field} rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>

        {vParcela > 0 && restantes > 0 && (
          <p className="rounded-lg bg-steel-50 px-3 py-2 text-[12.5px] text-steel">
            Serao geradas <b>{restantes}</b> contas de <b>{brl(vParcela)}</b> — saldo devedor{" "}
            <b>{brl(vParcela * restantes)}</b>.
          </p>
        )}
      </fieldset>

      <Erro msg={erro} />

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={fechar} disabled={pending} className={btnSecundario}>
          Cancelar
        </button>
        <button type="submit" disabled={pending} className={btnPrimario}>
          {pending ? "Salvando…" : "Cadastrar divida"}
        </button>
      </div>
    </ModalForm>
  );
}
