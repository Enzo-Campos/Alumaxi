import { Suspense } from "react";
import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { UNIDADES } from "@/lib/materiais";
import { getMateriais } from "@/lib/materiais-data";
import { Card } from "@/components/card";
import { Pill } from "@/components/status-pill";
import { MaterialModal } from "@/components/materiais/material-modal";
import { MaterialAcoes } from "@/components/materiais/material-acoes";

export const dynamic = "force-dynamic";

const UNIDADE_LABEL = Object.fromEntries(
  UNIDADES.map((u) => [u.value, u.label.split(" — ")[0]]),
);

export default async function MateriaisPage() {
  const materiais = await getMateriais();
  const ativos = materiais.filter((m) => m.ativo).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">
            Cadastros
          </p>
          <h1 className="mt-1 font-display text-[32px] leading-none tracking-tight text-ink">
            Materiais
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            {materiais.length} cadastrado{materiais.length === 1 ? "" : "s"} ·{" "}
            {ativos} ativo{ativos === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href="?novo=1"
          scroll={false}
          className="inline-flex items-center gap-1.5 rounded-lg bg-steel px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-steel-600"
        >
          <Plus size={15} /> Novo material
        </Link>
      </header>

      <Card bodyClassName="">
        {materiais.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-muted">
            Nenhum material cadastrado ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.12em] text-faint">
                  <th className="py-2.5 pl-5 pr-3 font-semibold">Material</th>
                  <th className="px-3 py-2.5 font-semibold">Unidade</th>
                  <th className="px-3 py-2.5 pr-5 text-right font-semibold">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {materiais.map((m) => (
                  <tr key={m.id} className={m.ativo ? "" : "opacity-60"}>
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-faint">
                          <Package size={16} />
                        </span>
                        <span className="text-[13.5px] font-medium text-ink">
                          {m.nome}
                        </span>
                        {!m.ativo && <Pill tone="neutral">Inativo</Pill>}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[12.5px] text-muted">
                      {UNIDADE_LABEL[m.unidade] ?? m.unidade}
                    </td>
                    <td className="px-3 py-3 pr-5">
                      <MaterialAcoes id={m.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Suspense fallback={null}>
        <MaterialModal materiais={materiais} />
      </Suspense>
    </div>
  );
}
