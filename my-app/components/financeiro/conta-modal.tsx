"use client";

/**
 * Modal de conta: `?conta=nova` cria uma conta avulsa; `?conta=<id>` edita
 * qualquer conta (inclusive geradas — a origem nao muda). Pagamento com data
 * ou valor diferente (juros, desconto) e feito aqui.
 */
import { type FormEvent, useEffect, useState, useTransition } from "react";
import {
  buscarConta,
  excluirConta,
  salvarConta,
  type ContaInput,
} from "@/app/(app)/financeiro/actions";
import {
  FORMAS_PAGAMENTO,
  ORIGEM_LABEL,
  hojeISO,
  parseValor,
  valorInput,
  type ContaStatus,
  type ContaView,
  type FormaPagamento,
  type Opcoes,
} from "@/lib/financeiro";
import {
  CategoriaSelect,
  Erro,
  ModalForm,
  Segmentado,
  VINCULOS_VAZIOS,
  VinculosFields,
  btnPrimario,
  btnSecundario,
  field,
  labelCls,
  useModalParam,
  type Vinculos,
} from "./ui";

export function ContaModal({ opcoes, mes }: { opcoes: Opcoes; mes: string }) {
  const { valor: param, fechar } = useModalParam("conta");
  if (param === "nova") return <ContaForm key="nova" opcoes={opcoes} mes={mes} conta={null} fechar={fechar} />;
  const id = param ? Number(param) : NaN;
  if (!Number.isInteger(id)) return null;
  return <ContaCarregada key={id} id={id} opcoes={opcoes} mes={mes} fechar={fechar} />;
}

/** Busca a conta (pode vir de qualquer mes/lista) e so entao monta o formulario. */
function ContaCarregada({ id, opcoes, mes, fechar }: { id: number; opcoes: Opcoes; mes: string; fechar: () => void }) {
  const [res, setRes] = useState<{ conta?: ContaView; error?: string } | null>(null);

  useEffect(() => {
    let vivo = true;
    buscarConta(id).then((r) => vivo && setRes(r));
    return () => {
      vivo = false;
    };
  }, [id]);

  if (res?.conta) return <ContaForm opcoes={opcoes} mes={mes} conta={res.conta} fechar={fechar} />;
  return (
    <ModalForm titulo="Editar conta" onSubmit={(e) => e.preventDefault()} onClose={fechar} busy={false} largura={560}>
      {res?.error ? <Erro msg={res.error} /> : <p className="py-6 text-center text-[13px] text-muted">Carregando…</p>}
    </ModalForm>
  );
}

function ContaForm({
  opcoes,
  mes,
  conta: original,
  fechar,
}: {
  opcoes: Opcoes;
  mes: string;
  conta: ContaView | null;
  fechar: () => void;
}) {
  const c = original;
  const nova = c == null;
  const idEdicao = c?.id ?? null;

  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const [descricao, setDescricao] = useState(c?.descricao ?? "");
  const [categoria, setCategoria] = useState<number | "">(c?.id_categoria ?? "");
  const [vinculos, setVinculos] = useState<Vinculos>(
    c
      ? { id_funcionario: c.id_funcionario, id_local: c.id_local, id_veiculo: c.id_veiculo, id_fornecedor: c.id_fornecedor }
      : VINCULOS_VAZIOS,
  );
  const [competencia, setCompetencia] = useState(c ? c.competencia.slice(0, 7) : mes);
  const [vencimento, setVencimento] = useState(
    () => c?.vencimento ?? (mes === hojeISO().slice(0, 7) ? hojeISO() : `${mes}-10`),
  );
  const [valor, setValor] = useState(valorInput(c?.valor));
  const [status, setStatus] = useState<ContaStatus>(c?.status ?? "pendente");
  const [dataPag, setDataPag] = useState(c?.data_pagamento ?? "");
  const [valorPago, setValorPago] = useState(valorInput(c?.valor_pago));
  const [forma, setForma] = useState<FormaPagamento | "">(c?.forma_pagamento ?? "");
  const [porFora, setPorFora] = useState(c?.por_fora ?? false);
  const [obs, setObs] = useState(c?.obs ?? "");

  const gerada = original != null && original.origem !== "avulsa";

  function submit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const v = parseValor(valor);
    const vp = valorPago.trim() ? parseValor(valorPago) : null;
    if (!(v > 0)) return setErro("Informe o valor.");
    if (vp != null && Number.isNaN(vp)) return setErro("Valor pago invalido.");
    const input: ContaInput = {
      descricao,
      id_categoria: categoria || 0,
      ...vinculos,
      mes: competencia,
      vencimento,
      valor: v,
      status,
      data_pagamento: status === "pago" ? dataPag || null : null,
      valor_pago: status === "pago" ? vp : null,
      forma_pagamento: forma || null,
      por_fora: porFora,
      obs,
    };
    start(async () => {
      const r = await salvarConta(idEdicao, input);
      if (r.error) return setErro(r.error);
      fechar();
    });
  }

  function excluir() {
    if (!idEdicao) return;
    if (!confirmDel) return setConfirmDel(true);
    start(async () => {
      const r = await excluirConta(idEdicao);
      if (r.error) {
        setErro(r.error);
        setConfirmDel(false);
        return;
      }
      fechar();
    });
  }

  const busy = pending;

  return (
    <ModalForm
      titulo={nova ? "Nova conta" : "Editar conta"}
      subtitulo={
        gerada
          ? `${ORIGEM_LABEL[original!.origem]}${original!.parcela ? ` — parcela ${original!.parcela}/${original!.numero_parcelas}` : ""} · gerada automaticamente`
          : nova
            ? "Conta avulsa: combustivel, manutencao, compra eventual…"
            : undefined
      }
      onSubmit={submit}
      onClose={fechar}
      busy={busy}
      largura={560}
    >
      <fieldset disabled={busy} className="space-y-3">
        <div>
          <label className={labelCls}>Descricao</label>
          <input
            className={field}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Manutencao do caminhao"
          />
        </div>

        <div>
          <label className={labelCls}>Categoria</label>
          <CategoriaSelect opcoes={opcoes} value={categoria} onChange={setCategoria} />
        </div>

        <VinculosFields opcoes={opcoes} value={vinculos} onChange={setVinculos} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>Valor (R$)</label>
            <input
              className={`${field} tnum`}
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div>
            <label className={labelCls}>Vencimento</label>
            <input
              type="date"
              className={field}
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls} title="Mes a que a conta se refere (filtro por mes)">
              Mes de referencia
            </label>
            <input
              type="month"
              className={field}
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-muted">Situacao</span>
            <Segmentado<ContaStatus>
              value={status}
              onChange={setStatus}
              opcoes={[
                { value: "pendente", label: "Em aberto" },
                { value: "pago", label: "Paga" },
                ...(nova ? [] : [{ value: "cancelado" as const, label: "Cancelada" }]),
              ]}
            />
          </div>
          {status === "pago" && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Pago em</label>
                <input
                  type="date"
                  className={field}
                  value={dataPag}
                  onChange={(e) => setDataPag(e.target.value)}
                />
                <p className="mt-1 text-[11px] text-faint">Vazio = hoje.</p>
              </div>
              <div>
                <label className={labelCls}>Valor pago (R$)</label>
                <input
                  className={`${field} tnum`}
                  inputMode="decimal"
                  value={valorPago}
                  onChange={(e) => setValorPago(e.target.value)}
                  placeholder={valor || "0,00"}
                />
                <p className="mt-1 text-[11px] text-faint">Com juros ou desconto. Vazio = valor da conta.</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Forma de pagamento</label>
            <select
              className={field}
              value={forma}
              onChange={(e) => setForma(e.target.value as FormaPagamento | "")}
            >
              <option value="">—</option>
              {FORMAS_PAGAMENTO.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-[13px] text-ink">
            <input
              type="checkbox"
              checked={porFora}
              onChange={(e) => setPorFora(e.target.checked)}
              className="h-4 w-4 accent-steel"
            />
            Pago por fora (fora da folha oficial)
          </label>
        </div>

        <div>
          <label className={labelCls}>Observacoes</label>
          <textarea className={field} rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </fieldset>

      <Erro msg={erro} />

      <div className="mt-5 flex items-center justify-between gap-2">
        {idEdicao ? (
          <button
            type="button"
            onClick={excluir}
            disabled={busy}
            title={gerada ? "Contas geradas sao protegidas: use a situacao Cancelada" : undefined}
            className={`rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
              confirmDel ? "bg-danger text-white" : "text-danger hover:bg-danger-50"
            }`}
          >
            {confirmDel ? "Confirmar exclusao" : "Excluir"}
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" onClick={fechar} disabled={pending} className={btnSecundario}>
            Cancelar
          </button>
          <button type="submit" disabled={busy} className={btnPrimario}>
            {pending ? "Salvando…" : nova ? "Criar conta" : "Salvar"}
          </button>
        </div>
      </div>
    </ModalForm>
  );
}
