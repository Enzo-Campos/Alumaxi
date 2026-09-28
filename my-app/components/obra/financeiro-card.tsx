import Link from "next/link";
import { Pencil } from "lucide-react";
import { Card } from "@/components/card";
import { Pill } from "@/components/status-pill";
import { brl, dateShortBR } from "@/lib/format";
import type { ObraFinanceiro, Saida } from "@/lib/obra";

function Row({
  label,
  value,
  op,
  strong = false,
  tone,
  editable = false,
}: {
  label: string;
  value: string;
  op?: "=" | "−" | "+";
  strong?: boolean;
  tone?: "success" | "danger";
  editable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex min-w-0 items-center gap-1.5 text-[13px] text-muted">
        {op && <span className="inline-block w-3 text-center text-faint">{op}</span>}
        {label}
        {editable && (
          <Link
            href="?editar=1"
            scroll={false}
            className="ml-1 text-faint transition-colors hover:text-steel"
            aria-label={`Editar ${label}`}
          >
            <Pencil size={12} />
          </Link>
        )}
      </span>
      <span
        className={`tnum shrink-0 whitespace-nowrap ${strong ? "text-[15px] font-bold" : "text-[13.5px] font-medium"} ${
          tone === "success"
            ? "text-success"
            : tone === "danger"
              ? "text-danger"
              : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function FinanceiroCard({
  fin,
  saidas,
}: {
  fin: ObraFinanceiro;
  saidas: Saida[];
}) {
  const recentes = [...saidas]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 4);

  return (
    <Card
      title="Financeiro"
      action={
        <Link
          href="?saida=1"
          scroll={false}
          className="rounded-lg bg-steel px-2.5 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-steel-600"
        >
          Registrar saida
        </Link>
      }
    >
      <div className="divide-y divide-line">
        <Row
          label="Orcamento de material"
          value={brl(fin.orcamento_material)}
          editable
        />
        <Row label="Percentual de receita" value={`${fin.percentual_receita}%`} />
        <Row op="=" label="Valor a receber" value={brl(fin.valor_a_receber_total)} />
        <Row op="−" label="Compras de material" value={brl(fin.total_compra_material)} />
        <Row op="−" label="Retiradas de lucro" value={brl(fin.total_retirada_lucro)} />
      </div>

      <div className="mt-1 rounded-xl bg-surface px-3 py-2.5">
        <Row
          op="="
          label="Saldo a receber"
          value={brl(fin.saldo_a_receber)}
          strong
          tone={fin.em_prejuizo ? "danger" : "success"}
        />
        {fin.em_prejuizo && (
          <p className="text-[11.5px] font-medium text-danger">
            Obra no prejuizo — saidas passaram o valor a receber.
          </p>
        )}
      </div>

      {/* saidas recentes */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
            Saidas recentes
          </p>
          <button type="button" className="text-[12px] font-medium text-steel hover:underline">
            ver todas
          </button>
        </div>
        <ul className="divide-y divide-line">
          {recentes.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-[12.5px] text-ink">{s.descricao ?? "—"}</p>
                <p className="tnum mt-0.5 flex items-center gap-1.5 text-[11px] text-faint">
                  {dateShortBR(s.created_at)}
                  <Pill tone={s.categoria === "retirada_lucro" ? "info" : "neutral"}>
                    {s.categoria === "retirada_lucro" ? "Lucro" : "Material"}
                  </Pill>
                </p>
              </div>
              <span className="tnum shrink-0 whitespace-nowrap text-[13px] font-semibold text-ink">
                {brl(s.valor_retirado)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
