"use client";

/**
 * Filtros da lista de contas (uma linha acima de tudo que filtram) e botao
 * de gerar contas do mes. Estado na URL: os filtros sobrevivem a refresh e
 * podem ser compartilhados.
 */
import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, Search } from "lucide-react";
import { gerarContasDoMes } from "@/app/(app)/financeiro/actions";
import { FILTRO_SITUACAO, type Opcoes } from "@/lib/financeiro";

const sel =
  "rounded-lg border border-line-strong bg-card px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-steel focus:ring-2 focus:ring-steel/20";

export function FiltrosContas({ opcoes }: { opcoes: Opcoes }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  function aplica(k: string, v: string) {
    const q = new URLSearchParams(params.toString());
    if (v) q.set(k, v);
    else q.delete(k);
    start(() => router.replace(`${pathname}?${q.toString()}`, { scroll: false }));
  }

  const ativos = ["grupo", "sit", "func", "local", "veic", "q"].some((k) => params.get(k));

  return (
    <div className={`flex flex-wrap items-center gap-2 transition-opacity ${pending ? "opacity-60" : ""}`}>
      {/* key: busca limpa/alterada pela URL remonta o campo com o valor novo */}
      <Busca key={params.get("q") ?? ""} inicial={params.get("q") ?? ""} aplica={(v) => aplica("q", v)} />
      <select className={sel} value={params.get("sit") ?? ""} onChange={(e) => aplica("sit", e.target.value)} aria-label="Situacao">
        {FILTRO_SITUACAO.map((s) => (
          <option key={s.value} value={s.value}>
            {s.value ? s.label : "Todas as situacoes"}
          </option>
        ))}
      </select>
      <select className={sel} value={params.get("grupo") ?? ""} onChange={(e) => aplica("grupo", e.target.value)} aria-label="Grupo">
        <option value="">Todos os grupos</option>
        {opcoes.grupos.map((g) => (
          <option key={g.id} value={g.id}>
            {g.nome}
          </option>
        ))}
      </select>
      <select className={sel} value={params.get("func") ?? ""} onChange={(e) => aplica("func", e.target.value)} aria-label="Funcionario">
        <option value="">Qualquer funcionario</option>
        {opcoes.funcionarios.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nome}
          </option>
        ))}
      </select>
      <select className={sel} value={params.get("local") ?? ""} onChange={(e) => aplica("local", e.target.value)} aria-label="Local">
        <option value="">Qualquer local</option>
        {opcoes.locais.map((l) => (
          <option key={l.id} value={l.id}>
            {l.nome}
          </option>
        ))}
      </select>
      <select className={sel} value={params.get("veic") ?? ""} onChange={(e) => aplica("veic", e.target.value)} aria-label="Veiculo">
        <option value="">Qualquer veiculo</option>
        {opcoes.veiculos.map((v) => (
          <option key={v.id} value={v.id}>
            {v.nome}
          </option>
        ))}
      </select>
      {ativos && (
        <button
          type="button"
          onClick={() => {
            const q = new URLSearchParams(params.toString());
            ["grupo", "sit", "func", "local", "veic", "q"].forEach((k) => q.delete(k));
            start(() => router.replace(`${pathname}?${q.toString()}`, { scroll: false }));
          }}
          className="px-1 text-[12px] font-medium text-steel hover:underline"
        >
          limpar filtros
        </button>
      )}
    </div>
  );
}

function Busca({ inicial, aplica }: { inicial: string; aplica: (v: string) => void }) {
  const [busca, setBusca] = useState(inicial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        aplica(busca.trim());
      }}
      className="relative"
    >
      <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
      <input
        className={`${sel} w-[180px] pl-8`}
        placeholder="Buscar descricao"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        onBlur={() => busca.trim() !== inicial && aplica(busca.trim())}
      />
    </form>
  );
}

/** Gera contas fixas + folha do mes. O cron ja faz isso todo dia 1; serve para meses futuros. */
export function GerarMesBotao({ mes }: { mes: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-[12px] text-muted">{msg}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await gerarContasDoMes(mes);
            setMsg(r.error ?? (r.criadas ? `${r.criadas} conta(s) criada(s).` : "Nada novo: o mes ja estava gerado."));
          })
        }
        title="Cria as contas fixas e a folha deste mes (sem duplicar)"
        className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-card px-3 py-2 text-[12.5px] font-semibold text-ink transition-colors hover:bg-surface disabled:opacity-60"
      >
        <RefreshCw size={14} className={pending ? "animate-spin" : ""} /> Gerar contas do mes
      </button>
    </div>
  );
}
