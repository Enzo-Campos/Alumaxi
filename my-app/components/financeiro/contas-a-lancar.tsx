"use client";

/**
 * Contas VARIAVEIS (luz, agua, impostos) ainda sem valor lancado.
 * Cada linha vira um mini-formulario: valor + vencimento + "ja paga".
 * Ao lancar, a conta sai da lista (vw_contas_a_lancar).
 */
import { useState, useTransition } from "react";
import { FileWarning } from "lucide-react";
import { lancarContaVariavel } from "@/app/(app)/financeiro/actions";
import { brl, dateBR } from "@/lib/format";
import { SITUACAO, mesCurto, parseValor, vinculoDe, type ContaALancar } from "@/lib/financeiro";
import { Pill } from "@/components/status-pill";
import { field } from "./ui";

function Linha({ item }: { item: ContaALancar }) {
  const [valor, setValor] = useState("");
  const [venc, setVenc] = useState(item.vencimento_previsto);
  const [pago, setPago] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const sit = SITUACAO[item.situacao];

  function lancar() {
    setErro(null);
    const v = parseValor(valor);
    if (!(v > 0)) return setErro("Informe o valor do boleto.");
    start(async () => {
      const r = await lancarContaVariavel({
        id_recorrencia: item.id_recorrencia,
        mes: item.competencia.slice(0, 7),
        vencimento: venc,
        valor: v,
        pago,
      });
      if (r.error) setErro(r.error);
    });
  }

  return (
    <li className="px-5 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-[180px] flex-1">
          <p className="text-[13.5px] font-medium text-ink">
            {item.descricao}{" "}
            <span className="text-[11.5px] font-normal text-faint">· {mesCurto(item.competencia)}</span>
          </p>
          <p className="mt-0.5 text-[11.5px] text-muted">
            {[item.categoria, vinculoDe(item)].filter(Boolean).join(" · ")}
            {item.ultimo_valor != null && (
              <>
                {" "}
                · ultimo: <span className="tnum">{brl(item.ultimo_valor)}</span>
              </>
            )}
          </p>
        </div>
        <Pill tone={sit.tone} dot>
          {item.situacao === "a_vencer" ? `vence ${dateBR(item.vencimento_previsto)}` : sit.label}
        </Pill>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={`${field} tnum w-[110px]`}
            inputMode="decimal"
            placeholder="R$ 0,00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), lancar())}
            aria-label={`Valor de ${item.descricao}`}
          />
          <input
            type="date"
            className={`${field} w-[140px]`}
            value={venc}
            onChange={(e) => setVenc(e.target.value)}
            aria-label="Vencimento"
          />
          <label className="flex items-center gap-1.5 text-[12px] text-muted">
            <input
              type="checkbox"
              checked={pago}
              onChange={(e) => setPago(e.target.checked)}
              className="h-3.5 w-3.5 accent-steel"
            />
            ja paga
          </label>
          <button
            type="button"
            onClick={lancar}
            disabled={pending}
            className="rounded-lg bg-steel px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-steel-600 disabled:opacity-60"
          >
            {pending ? "…" : "Lancar"}
          </button>
        </div>
      </div>
      {erro && <p className="mt-1.5 text-[11.5px] font-medium text-danger">{erro}</p>}
    </li>
  );
}

export function ContasALancar({ itens }: { itens: ContaALancar[] }) {
  if (!itens.length) {
    return (
      <p className="flex items-center gap-2 px-5 py-6 text-[13px] text-muted">
        <FileWarning size={16} className="text-faint" /> Nenhuma conta variavel pendente de lancamento.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-line">
      {itens.map((i) => (
        <Linha key={`${i.id_recorrencia}-${i.competencia}`} item={i} />
      ))}
    </ul>
  );
}
