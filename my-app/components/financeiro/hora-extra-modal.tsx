"use client";

/**
 * Lancar hora extra (`?he=nova`). O banco decide em qual pagamento ela sai:
 * trabalhada nos dias 6–20 -> paga no dia 20; dias 21–5 -> paga no 5o dia
 * util (saldo). O valor soma na conta "Hora extra" daquele pagamento.
 */
import { type FormEvent, useState, useTransition } from "react";
import { salvarHoraExtra } from "@/app/(app)/financeiro/actions";
import { hojeISO, parseValor, type Opcoes } from "@/lib/financeiro";
import { Erro, ModalForm, btnPrimario, btnSecundario, field, labelCls, useModalParam } from "./ui";

function pagamentoDe(dataISO: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) return null;
  const dia = Number(dataISO.slice(8, 10));
  return dia >= 6 && dia <= 20 ? "no pagamento do dia 20" : "no pagamento do 5º dia util (saldo)";
}

export function HoraExtraModal({ opcoes }: { opcoes: Opcoes }) {
  const { valor: param, fechar } = useModalParam("he");
  if (param !== "nova") return null;
  return <HoraExtraForm opcoes={opcoes} fechar={fechar} />;
}

function HoraExtraForm({ opcoes, fechar }: { opcoes: Opcoes; fechar: () => void }) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [func, setFunc] = useState<number | "">("");
  const [data, setData] = useState(hojeISO());
  const [horas, setHoras] = useState("");
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");

  function submit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const h = horas.trim() ? parseValor(horas) : null;
    start(async () => {
      const r = await salvarHoraExtra({
        id_funcionario: func || 0,
        data,
        horas: h,
        valor: parseValor(valor),
        obs,
      });
      if (r.error) return setErro(r.error);
      fechar();
    });
  }

  const quando = pagamentoDe(data);

  return (
    <ModalForm titulo="Lancar hora extra" onSubmit={submit} onClose={fechar} busy={pending} largura={460}>
      <fieldset disabled={pending} className="space-y-3">
        <div>
          <label className={labelCls}>Funcionario</label>
          <select className={field} value={func} onChange={(e) => setFunc(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Selecione…</option>
            {opcoes.funcionarios
              .filter((f) => f.ativo)
              .map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome}
                </option>
              ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 sm:col-span-1">
            <label className={labelCls}>Dia trabalhado</label>
            <input type="date" className={field} value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Horas</label>
            <input className={`${field} tnum`} inputMode="decimal" value={horas} onChange={(e) => setHoras(e.target.value)} placeholder="opcional" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Valor (R$)</label>
            <input className={`${field} tnum`} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
        </div>
        {quando && <p className="rounded-lg bg-steel-50 px-3 py-2 text-[12.5px] text-steel">Sera paga {quando}.</p>}
        <div>
          <label className={labelCls}>Observacoes</label>
          <input className={field} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: obra do Condominio X" />
        </div>
      </fieldset>

      <Erro msg={erro} />

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={fechar} disabled={pending} className={btnSecundario}>
          Cancelar
        </button>
        <button type="submit" disabled={pending} className={btnPrimario}>
          {pending ? "Salvando…" : "Lancar"}
        </button>
      </div>
    </ModalForm>
  );
}
