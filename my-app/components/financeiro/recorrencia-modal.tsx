"use client";

/**
 * Modal de conta fixa/variavel (`?fixa=nova` | `?fixa=<id>`).
 * Com valor = FIXA (gerada todo mes pelo cron). Sem valor = VARIAVEL
 * (nada e gerado; aparece em "Contas a lancar" ate receber o valor real).
 * Alteracoes valem para as proximas geracoes; contas ja geradas nao mudam.
 */
import { type FormEvent, useState, useTransition } from "react";
import { salvarRecorrencia, type RecorrenciaInput } from "@/app/(app)/financeiro/actions";
import {
  AJUSTES,
  FORMAS_PAGAMENTO,
  mesAtual,
  parseValor,
  valorInput,
  type AjusteNaoUtil,
  type FormaPagamento,
  type Opcoes,
  type Recorrencia,
  type RegraVencimento,
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

const PERIODOS = [
  { value: 1, label: "Todo mes" },
  { value: 2, label: "A cada 2 meses" },
  { value: 3, label: "A cada 3 meses" },
  { value: 6, label: "A cada 6 meses" },
  { value: 12, label: "Uma vez por ano" },
];

export function RecorrenciaModal({ opcoes, recorrencias }: { opcoes: Opcoes; recorrencias: Recorrencia[] }) {
  const { valor: param, fechar } = useModalParam("fixa");
  const nova = param === "nova";
  const edicao = param && !nova ? recorrencias.find((r) => String(r.id) === param) ?? null : null;
  if (!nova && !edicao) return null;
  // key: trocar de registro remonta o formulario com o estado inicial certo
  return <RecorrenciaForm key={param} opcoes={opcoes} edicao={edicao} fechar={fechar} />;
}

function RecorrenciaForm({
  opcoes,
  edicao: r,
  fechar,
}: {
  opcoes: Opcoes;
  edicao: Recorrencia | null;
  fechar: () => void;
}) {
  const nova = r == null;
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [descricao, setDescricao] = useState(r?.descricao ?? "");
  const [categoria, setCategoria] = useState<number | "">(r?.id_categoria ?? "");
  const [vinculos, setVinculos] = useState<Vinculos>(
    r
      ? { id_funcionario: r.id_funcionario, id_local: r.id_local, id_veiculo: r.id_veiculo, id_fornecedor: r.id_fornecedor }
      : VINCULOS_VAZIOS,
  );
  const [tipo, setTipo] = useState<"fixa" | "variavel">(r && r.valor == null ? "variavel" : "fixa");
  const [valor, setValor] = useState(valorInput(r?.valor));
  const [intervalo, setIntervalo] = useState(r?.intervalo_meses ?? 1);
  const [regra, setRegra] = useState<RegraVencimento>(r?.regra_vencimento ?? "dia_fixo");
  const [dia, setDia] = useState(String(r?.dia_vencimento ?? 10));
  const [mesesApos, setMesesApos] = useState(r?.meses_apos_competencia ?? 0);
  const [ajuste, setAjuste] = useState<AjusteNaoUtil>(r?.ajuste_nao_util ?? "postergar");
  const [inicio, setInicio] = useState(r ? r.competencia_inicio.slice(0, 7) : mesAtual());
  const [fim, setFim] = useState(r?.competencia_fim?.slice(0, 7) ?? "");
  const [forma, setForma] = useState<FormaPagamento | "">(r?.forma_pagamento ?? "");
  const [porFora, setPorFora] = useState(r?.por_fora ?? false);
  const [ativa, setAtiva] = useState(r?.ativa ?? true);
  const [obs, setObs] = useState(r?.obs ?? "");

  function submit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const v = tipo === "fixa" ? parseValor(valor) : null;
    if (tipo === "fixa" && !(v! > 0)) return setErro("Informe o valor (ou escolha Variavel).");
    const input: RecorrenciaInput = {
      descricao,
      id_categoria: categoria || 0,
      ...vinculos,
      valor: v,
      intervalo_meses: intervalo,
      mes_inicio: inicio,
      mes_fim: fim || null,
      regra_vencimento: regra,
      dia_vencimento: Number(dia),
      meses_apos_competencia: mesesApos,
      ajuste_nao_util: ajuste,
      forma_pagamento: forma || null,
      por_fora: porFora,
      ativa,
      obs,
    };
    start(async () => {
      const res = await salvarRecorrencia(r?.id ?? null, input);
      if (res.error) return setErro(res.error);
      fechar();
    });
  }

  return (
    <ModalForm
      titulo={nova ? "Nova conta fixa" : "Editar conta fixa"}
      subtitulo="Mudancas valem para os proximos meses. Contas ja geradas nao sao alteradas."
      onSubmit={submit}
      onClose={fechar}
      busy={pending}
      largura={580}
    >
      <fieldset disabled={pending} className="space-y-3">
        <div>
          <label className={labelCls}>Descricao</label>
          <input
            className={field}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Aluguel galpao"
          />
        </div>
        <div>
          <label className={labelCls}>Categoria</label>
          <CategoriaSelect opcoes={opcoes} value={categoria} onChange={setCategoria} />
        </div>
        <VinculosFields opcoes={opcoes} value={vinculos} onChange={setVinculos} />

        <div className="rounded-lg border border-line bg-surface/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-muted">Valor</span>
            <Segmentado
              value={tipo}
              onChange={setTipo}
              opcoes={[
                { value: "fixa", label: "Fixo" },
                { value: "variavel", label: "Variavel" },
              ]}
            />
          </div>
          {tipo === "fixa" ? (
            <input
              className={`${field} tnum mt-3`}
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="R$ 0,00"
              aria-label="Valor"
            />
          ) : (
            <p className="mt-2 text-[12px] text-muted">
              Valor muda todo mes (luz, agua, impostos): a conta aparece em <b>Contas a lancar</b> e voce
              informa o valor do boleto.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Repete</label>
            <select className={field} value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))}>
              {PERIODOS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Vence</label>
            <select className={field} value={mesesApos} onChange={(e) => setMesesApos(Number(e.target.value))}>
              <option value={0}>No proprio mes</option>
              <option value={1}>No mes seguinte (ex.: impostos)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[auto_90px_1fr] sm:items-end">
          <div>
            <label className={labelCls}>Regra do vencimento</label>
            <Segmentado
              value={regra}
              onChange={setRegra}
              opcoes={[
                { value: "dia_fixo", label: "Dia fixo" },
                { value: "dia_util", label: "Dia util" },
              ]}
            />
          </div>
          <div>
            <label className={labelCls}>{regra === "dia_util" ? "N-esimo" : "Dia"}</label>
            <input
              type="number"
              min={1}
              max={regra === "dia_util" ? 23 : 31}
              className={`${field} tnum`}
              value={dia}
              onChange={(e) => setDia(e.target.value)}
            />
          </div>
          {regra === "dia_fixo" ? (
            <div>
              <label className={labelCls}>Se cair em fim de semana/feriado</label>
              <select className={field} value={ajuste} onChange={(e) => setAjuste(e.target.value as AjusteNaoUtil)}>
                {AJUSTES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="pb-2 text-[11.5px] text-faint">Conta dias uteis (seg–sex, sem feriados).</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>A partir de</label>
            <input type="month" className={field} value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Ate (opcional)</label>
            <input type="month" className={field} value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <div className="flex flex-col justify-end gap-1.5 pb-1">
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
              <input type="checkbox" checked={porFora} onChange={(e) => setPorFora(e.target.checked)} className="h-4 w-4 accent-steel" />
              Pago por fora
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
              <input type="checkbox" checked={ativa} onChange={(e) => setAtiva(e.target.checked)} className="h-4 w-4 accent-steel" />
              Ativa (continua gerando)
            </label>
          </div>
        </div>

        <div>
          <label className={labelCls}>Observacoes</label>
          <textarea className={field} rows={2} value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
      </fieldset>

      <Erro msg={erro} />

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={fechar} disabled={pending} className={btnSecundario}>
          Cancelar
        </button>
        <button type="submit" disabled={pending} className={btnPrimario}>
          {pending ? "Salvando…" : nova ? "Criar" : "Salvar"}
        </button>
      </div>
    </ModalForm>
  );
}
