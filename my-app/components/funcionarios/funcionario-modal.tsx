"use client";

/**
 * Modal de funcionario: `?novo=1` ou `?editar=<id>`. Reusa as pecas de
 * formulario do Financeiro (components/financeiro/ui).
 */
import { type FormEvent, useState, useTransition } from "react";
import { salvarFuncionario } from "@/app/(app)/funcionarios/actions";
import type { Database } from "@/lib/supabase/database.types";
import { cpf as mascaraCpf, cpfValido, soDigitos, telefone as mascaraTel } from "@/lib/mascaras";
import { parseValor, valorInput } from "@/lib/financeiro";
import {
  Erro,
  ModalForm,
  Segmentado,
  btnPrimario,
  btnSecundario,
  field,
  labelCls,
  useModalParam,
} from "@/components/financeiro/ui";

export type Funcionario = Database["public"]["Tables"]["funcionarios"]["Row"];

export function FuncionarioModal({ funcionarios }: { funcionarios: Funcionario[] }) {
  const novo = useModalParam("novo");
  const editar = useModalParam("editar");
  if (novo.valor) return <FuncionarioForm key="novo" f={null} fechar={novo.fechar} />;
  const f = editar.valor ? funcionarios.find((x) => String(x.id) === editar.valor) : undefined;
  if (!f) return null;
  return <FuncionarioForm key={f.id} f={f} fechar={editar.fechar} />;
}

function FuncionarioForm({ f, fechar }: { f: Funcionario | null; fechar: () => void }) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState(f?.nome.trim() ?? "");
  const [cargo, setCargo] = useState(f?.cargo ?? "");
  const [cpf, setCpf] = useState(mascaraCpf(f?.cpf));
  const [rg, setRg] = useState(f?.rg ?? "");
  const [tel, setTel] = useState(mascaraTel(f?.telefone));
  const [salario, setSalario] = useState(valorInput(f?.salario));
  const [va, setVa] = useState(valorInput(f?.vale_alimentacao ?? 0));
  const [vaPorFora, setVaPorFora] = useState(f?.vale_alimentacao_por_fora ?? false);
  const [admissao, setAdmissao] = useState(f?.data_admissao ?? "");
  const [ativo, setAtivo] = useState<"ativo" | "desligado">(f?.status ?? "ativo");
  const [demissao, setDemissao] = useState(f?.data_demissao ?? "");
  const [obs, setObs] = useState(f?.obs ?? "");

  const cpfIncompleto = soDigitos(cpf).length > 0 && soDigitos(cpf).length < 11;
  const cpfErrado = soDigitos(cpf).length === 11 && !cpfValido(cpf);

  function submit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const sal = salario.trim() ? parseValor(salario) : null;
    const vaN = va.trim() ? parseValor(va) : 0;
    if (sal != null && Number.isNaN(sal)) return setErro("Salario invalido.");
    if (Number.isNaN(vaN)) return setErro("Vale-alimentacao invalido.");
    start(async () => {
      const r = await salvarFuncionario(f?.id ?? null, {
        nome,
        cargo,
        cpf,
        rg,
        telefone: tel,
        salario: sal,
        vale_alimentacao: vaN,
        vale_alimentacao_por_fora: vaPorFora,
        data_admissao: admissao || null,
        ativo: ativo === "ativo",
        data_demissao: demissao || null,
        obs,
      });
      if (r.error) return setErro(r.error);
      fechar();
    });
  }

  const sal = parseValor(salario);

  return (
    <ModalForm
      titulo={f ? "Editar funcionario" : "Novo funcionario"}
      subtitulo="Salario e VA geram a folha automaticamente no Financeiro."
      onSubmit={submit}
      onClose={fechar}
      busy={pending}
      largura={560}
    >
      <fieldset disabled={pending} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_1fr]">
          <div>
            <label className={labelCls}>Nome</label>
            <input className={field} value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Cargo</label>
            <input className={field} value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex.: Serralheiro" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className={labelCls}>CPF</label>
            <input
              className={`${field} tnum ${cpfErrado ? "border-danger" : ""}`}
              inputMode="numeric"
              value={cpf}
              onChange={(e) => setCpf(mascaraCpf(e.target.value))}
              placeholder="000.000.000-00"
            />
            {cpfErrado && <p className="mt-1 text-[11px] text-danger">CPF invalido</p>}
            {cpfIncompleto && <p className="mt-1 text-[11px] text-faint">incompleto</p>}
          </div>
          <div>
            <label className={labelCls}>RG</label>
            <input className={field} value={rg} onChange={(e) => setRg(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Telefone</label>
            <input
              className={`${field} tnum`}
              inputMode="tel"
              value={tel}
              onChange={(e) => setTel(mascaraTel(e.target.value))}
              placeholder="(13) 98765-4321"
            />
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface/60 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Salario mensal (R$)</label>
              <input
                className={`${field} tnum`}
                inputMode="decimal"
                value={salario}
                onChange={(e) => setSalario(e.target.value)}
                placeholder="0,00"
              />
              {sal > 0 && (
                <p className="mt-1 text-[11px] text-faint">
                  Metade no dia 20, restante no 5º dia util do mes seguinte.
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Vale-alimentacao (R$/mes)</label>
              <input
                className={`${field} tnum`}
                inputMode="decimal"
                value={va}
                onChange={(e) => setVa(e.target.value)}
                placeholder="0 = nao recebe"
              />
              <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-[12px] text-ink">
                <input
                  type="checkbox"
                  checked={vaPorFora}
                  onChange={(e) => setVaPorFora(e.target.checked)}
                  className="h-3.5 w-3.5 accent-steel"
                />
                VA pago por fora
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
          <div>
            <label className={labelCls}>Admissao</label>
            <input type="date" className={field} value={admissao} onChange={(e) => setAdmissao(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Situacao</label>
            <Segmentado
              value={ativo}
              onChange={setAtivo}
              opcoes={[
                { value: "ativo", label: "Ativo" },
                { value: "desligado", label: "Desligado" },
              ]}
            />
          </div>
          {ativo === "desligado" && (
            <div>
              <label className={labelCls}>Desligado em</label>
              <input type="date" className={field} value={demissao} onChange={(e) => setDemissao(e.target.value)} />
            </div>
          )}
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
        <button type="submit" disabled={pending || cpfErrado} className={btnPrimario}>
          {pending ? "Salvando…" : f ? "Salvar" : "Cadastrar"}
        </button>
      </div>
    </ModalForm>
  );
}
