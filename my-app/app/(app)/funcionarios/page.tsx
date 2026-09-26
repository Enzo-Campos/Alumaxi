/**
 * Funcionarios — cadastro da equipe. Salario e VA daqui geram a folha
 * (adiantamento, saldo e VA) no Financeiro. Modal: ?novo=1 / ?editar=<id>.
 */
import { Suspense } from "react";
import Link from "next/link";
import { Pencil, Plus, UserRound, Users, Utensils, Wallet } from "lucide-react";
import { Card } from "@/components/card";
import { Pill } from "@/components/status-pill";
import { StatCard } from "@/components/stat-card";
import { brl, brlCompact, dateBR } from "@/lib/format";
import { cpf, telefone } from "@/lib/mascaras";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { FuncionarioModal, type Funcionario } from "@/components/funcionarios/funcionario-modal";

export const dynamic = "force-dynamic";

async function getFuncionarios(): Promise<Funcionario[]> {
  if (!supabaseConfigured) return [];
  const sb = await createClient();
  const { data, error } = await sb.from("funcionarios").select("*").order("status").order("nome");
  if (error) throw new Error(`[funcionarios] ${error.message}`);
  return data ?? [];
}

export default async function FuncionariosPage() {
  const funcionarios = await getFuncionarios();
  const ativos = funcionarios.filter((f) => f.status === "ativo");
  const folha = ativos.reduce((s, f) => s + (f.salario ?? 0), 0);
  const va = ativos.reduce((s, f) => s + f.vale_alimentacao, 0);
  const vaPorFora = ativos.filter((f) => f.vale_alimentacao_por_fora).reduce((s, f) => s + f.vale_alimentacao, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">Cadastros</p>
          <h1 className="mt-1 font-display text-[32px] leading-none tracking-tight text-ink">Funcionarios</h1>
          <p className="mt-2 text-[13px] text-muted">
            {ativos.length} ativo{ativos.length === 1 ? "" : "s"}
            {funcionarios.length > ativos.length && ` · ${funcionarios.length - ativos.length} desligado(s)`}
          </p>
        </div>
        <Link
          href="?novo=1"
          scroll={false}
          className="inline-flex items-center gap-1.5 rounded-lg bg-steel px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-steel-600"
        >
          <Plus size={15} /> Novo funcionario
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Equipe ativa" value={ativos.length} icon={Users} />
        <StatCard label="Folha mensal" value={brlCompact(folha)} hint={brl(folha)} icon={Wallet} tone="info" />
        <StatCard
          label="Vale-alimentacao"
          value={brlCompact(va)}
          hint={vaPorFora ? `${brl(vaPorFora)} por fora` : brl(va)}
          icon={Utensils}
        />
      </div>

      <Card bodyClassName="">
        {funcionarios.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-muted">Nenhum funcionario cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.12em] text-faint">
                  <th className="py-2.5 pl-5 pr-3 font-semibold">Funcionario</th>
                  <th className="px-3 py-2.5 font-semibold">Documentos · contato</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Salario</th>
                  <th className="px-3 py-2.5 text-right font-semibold">VA</th>
                  <th className="px-3 py-2.5 pr-5 text-right font-semibold"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {funcionarios.map((f) => (
                  <tr key={f.id} className={f.status === "ativo" ? "" : "opacity-55"}>
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-faint">
                          <UserRound size={16} />
                        </span>
                        <div>
                          <p className="text-[13.5px] font-medium text-ink">
                            {f.nome.trim()} {f.status !== "ativo" && <Pill tone="neutral">Desligado</Pill>}
                          </p>
                          <p className="text-[11.5px] text-muted">
                            {[f.cargo, f.data_admissao && `desde ${dateBR(f.data_admissao)}`].filter(Boolean).join(" · ") ||
                              "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[12.5px] text-muted">
                      <p className="tnum">{f.cpf ? `CPF ${cpf(f.cpf)}` : <span className="text-faint">sem CPF</span>}</p>
                      <p className="tnum text-[11.5px]">
                        {[f.rg && `RG ${f.rg}`, f.telefone && telefone(f.telefone)].filter(Boolean).join(" · ")}
                      </p>
                    </td>
                    <td className="tnum px-3 py-3 text-right text-[13.5px] font-semibold text-ink">
                      {f.salario != null ? brl(f.salario) : "—"}
                    </td>
                    <td className="tnum px-3 py-3 text-right text-[12.5px] text-ink">
                      {f.vale_alimentacao ? brl(f.vale_alimentacao) : <span className="text-faint">—</span>}
                      {f.vale_alimentacao_por_fora && (
                        <span className="block text-[10px] uppercase text-faint">por fora</span>
                      )}
                    </td>
                    <td className="px-3 py-3 pr-5 text-right">
                      <Link
                        href={`?editar=${f.id}`}
                        scroll={false}
                        aria-label={`Editar ${f.nome}`}
                        className="ml-auto grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-steel-50 hover:text-steel"
                      >
                        <Pencil size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Suspense fallback={null}>
        <FuncionarioModal funcionarios={funcionarios} />
      </Suspense>
    </div>
  );
}
