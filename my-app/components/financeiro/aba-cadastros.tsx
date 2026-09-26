/**
 * Abas de configuracao do Financeiro:
 *  - AbaFixas: contas fixas (geradas todo mes) e variaveis (lancadas a mao)
 *  - AbaDividas: financiamentos/parcelamentos com progresso
 *  - AbaCadastros: locais, veiculos, fornecedores e categorias
 */
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/card";
import { Pill } from "@/components/status-pill";
import { brl, dateBR, pct } from "@/lib/format";
import { corDoGrupo, mesCurto, urlCom, type Opcoes, type Params, type Recorrencia } from "@/lib/financeiro";
import { getDividas } from "@/lib/financeiro-data";
import { BotaoExcluir } from "./botao-excluir";
import type { Cadastros } from "./cadastro-modal";

const btnNovo =
  "inline-flex items-center gap-1.5 rounded-lg bg-steel px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-steel-600";
const lapis =
  "grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-steel-50 hover:text-steel";

const PERIODO: Record<number, string> = { 1: "mensal", 2: "bimestral", 3: "trimestral", 6: "semestral", 12: "anual" };

/** "dia 5 · mes seguinte" / "5º dia util" */
function regraTexto(r: Recorrencia): string {
  const base = r.regra_vencimento === "dia_util" ? `${r.dia_vencimento}º dia util` : `dia ${r.dia_vencimento}`;
  return r.meses_apos_competencia ? `${base} do mes seguinte` : base;
}

/* ================================================================== */

function TabelaRecorrencias({
  itens,
  vazio,
  params,
  opcoes,
}: {
  itens: Recorrencia[];
  vazio: string;
  params: Params;
  opcoes: Opcoes;
}) {
  const cat = new Map(opcoes.categorias.map((c) => [c.id, c]));
  const nome = (lista: { id: number; nome: string }[], id: number | null) =>
    id == null ? null : lista.find((x) => x.id === id)?.nome ?? null;
  return itens.length === 0 ? (
      <p className="px-5 py-8 text-center text-[13px] text-muted">{vazio}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-line text-[10.5px] uppercase tracking-[0.12em] text-faint">
              <th className="py-2.5 pl-5 pr-3 font-semibold">Conta</th>
              <th className="px-3 py-2.5 font-semibold">Categoria</th>
              <th className="px-3 py-2.5 font-semibold">Vencimento</th>
              <th className="px-3 py-2.5 text-right font-semibold">Valor</th>
              <th className="px-3 py-2.5 pr-5 text-right font-semibold"> </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {itens.map((r) => {
              const c = cat.get(r.id_categoria);
              const vinc = [
                nome(opcoes.funcionarios, r.id_funcionario),
                nome(opcoes.locais, r.id_local),
                nome(opcoes.veiculos, r.id_veiculo),
                nome(opcoes.fornecedores, r.id_fornecedor),
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <tr key={r.id} className={r.ativa ? "" : "opacity-55"}>
                  <td className="py-3 pl-5 pr-3">
                    <p className="text-[13.5px] font-medium text-ink">
                      {r.descricao} {!r.ativa && <Pill tone="neutral">Inativa</Pill>}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      {[vinc, PERIODO[r.intervalo_meses] ?? `a cada ${r.intervalo_meses} meses`, r.por_fora ? "por fora" : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-1.5 text-[12.5px] text-ink">
                      <span
                        className="h-2 w-2 shrink-0 rounded-[2px]"
                        style={{ background: c ? corDoGrupo(opcoes.grupos, c.id_grupo) : "#999" }}
                      />
                      {c?.nome ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[12.5px] text-muted">
                    {regraTexto(r)}
                    <span className="block text-[11px] text-faint">
                      desde {mesCurto(r.competencia_inicio)}
                      {r.competencia_fim && ` ate ${mesCurto(r.competencia_fim)}`}
                    </span>
                  </td>
                  <td className="tnum px-3 py-3 text-right text-[13.5px] font-semibold text-ink">
                    {r.valor != null ? brl(r.valor) : <span className="text-[12px] font-normal text-faint">variavel</span>}
                  </td>
                  <td className="px-3 py-3 pr-5 text-right">
                    <Link href={urlCom(params, { fixa: r.id })} scroll={false} className={`${lapis} ml-auto`} aria-label="Editar">
                      <Pencil size={14} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
}

export function AbaFixas({ params, opcoes, recorrencias }: { params: Params; opcoes: Opcoes; recorrencias: Recorrencia[] }) {
  const fixas = recorrencias.filter((r) => r.valor != null);
  const variaveis = recorrencias.filter((r) => r.valor == null);
  const totalFixoMes = fixas
    .filter((r) => r.ativa && r.intervalo_meses === 1)
    .reduce((s, r) => s + (r.valor ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-muted">
          Contas fixas somam <span className="tnum font-semibold text-ink">{brl(totalFixoMes)}</span> por mes. Sao geradas
          todo dia 1 (tambem pelo botao na aba Contas).
        </p>
        <Link href={urlCom(params, { fixa: "nova" })} scroll={false} className={btnNovo}>
          <Plus size={15} /> Nova conta fixa
        </Link>
      </div>
      <Card title={`Valor fixo (${fixas.length})`} bodyClassName="">
        <TabelaRecorrencias itens={fixas} vazio="Nenhuma conta fixa cadastrada." params={params} opcoes={opcoes} />
      </Card>
      <Card title={`Valor variavel — lancadas a mao (${variaveis.length})`} bodyClassName="">
        <TabelaRecorrencias itens={variaveis} vazio="Nenhuma conta variavel cadastrada." params={params} opcoes={opcoes} />
      </Card>
    </div>
  );
}

/* ================================================================== */

export async function AbaDividas({ params }: { params: Params }) {
  const dividas = await getDividas();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-muted">
          Cada parcela vira uma conta na data certa. Parcela com valor diferente? Edite a conta na aba Contas.
        </p>
        <Link href={urlCom(params, { divida: "nova" })} scroll={false} className={btnNovo}>
          <Plus size={15} /> Nova divida
        </Link>
      </div>

      {dividas.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-[13px] text-muted">
            Nenhuma divida cadastrada. A parcela da Kombi esta como conta fixa ate o contrato ser cadastrado aqui.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {dividas.map((d) => {
            const p = pct(d.parcelas_pagas, d.numero_parcelas);
            return (
              <Card key={d.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[15px] font-semibold text-ink">{d.descricao}</p>
                    <p className="text-[12px] text-muted">
                      {[d.credor, d.veiculo, `${brl(d.valor_parcela)} / mes`].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {d.quitada ? (
                    <Pill tone="success">Quitada</Pill>
                  ) : d.parcelas_vencidas > 0 ? (
                    <Pill tone="danger">{d.parcelas_vencidas} vencida(s)</Pill>
                  ) : (
                    <Pill tone="info">Em dia</Pill>
                  )}
                </div>
                <div className="mt-4 flex items-baseline justify-between text-[12px] text-muted">
                  <span>
                    <span className="tnum font-semibold text-ink">{d.parcelas_pagas}</span> de {d.numero_parcelas} parcelas
                  </span>
                  <span className="tnum">{p}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-steel-50">
                  <div className="h-full rounded-full bg-steel" style={{ width: `${p}%` }} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <dt className="text-faint">Saldo devedor</dt>
                    <dd className="tnum text-[15px] font-bold text-ink">{brl(d.saldo_devedor)}</dd>
                  </div>
                  <div>
                    <dt className="text-faint">Proxima parcela</dt>
                    <dd className="text-[13px] font-semibold text-ink">{dateBR(d.proximo_vencimento)}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  <Link
                    href={urlCom({}, { aba: "contas", q: d.descricao, mes: d.proximo_vencimento?.slice(0, 7) })}
                    className="text-[12px] font-semibold text-steel hover:underline"
                  >
                    ver parcela do mes
                  </Link>
                  {d.parcelas_pagas - d.parcelas_anteriores === 0 && (
                    <BotaoExcluir tipo="divida" id={d.id} rotulo="Excluir divida (nenhuma parcela paga)" />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */

function Lista({
  titulo,
  novo,
  children,
}: {
  titulo: string;
  novo: string;
  children: ReactNode;
}) {
  return (
    <Card
      title={titulo}
      action={
        <Link href={novo} scroll={false} className="inline-flex items-center gap-1 text-[12px] font-semibold text-steel hover:underline">
          <Plus size={13} /> novo
        </Link>
      }
      bodyClassName=""
    >
      {children}
    </Card>
  );
}

function Item({ nome, sub, ativo, editar }: { nome: string; sub?: string | null; ativo: boolean; editar: string }) {
  return (
    <li className={`flex items-center gap-3 px-5 py-2.5 ${ativo ? "" : "opacity-55"}`}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-ink">
          {nome} {!ativo && <Pill tone="neutral">Inativo</Pill>}
        </p>
        {sub && <p className="truncate text-[11.5px] text-muted">{sub}</p>}
      </div>
      <Link href={editar} scroll={false} className={lapis} aria-label={`Editar ${nome}`}>
        <Pencil size={14} />
      </Link>
    </li>
  );
}

export function AbaCadastros({ params, opcoes, cadastros }: { params: Params; opcoes: Opcoes; cadastros: Cadastros }) {
  const vazio = <p className="px-5 py-6 text-center text-[12.5px] text-muted">Nada cadastrado.</p>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Lista titulo="Locais" novo={urlCom(params, { cad: "local:nova" })}>
        {cadastros.locais.length ? (
          <ul className="divide-y divide-line">
            {cadastros.locais.map((l) => (
              <Item key={l.id} nome={l.nome} sub={l.endereco} ativo={l.ativo} editar={urlCom(params, { cad: `local:${l.id}` })} />
            ))}
          </ul>
        ) : (
          vazio
        )}
      </Lista>

      <Lista titulo="Veiculos" novo={urlCom(params, { cad: "veiculo:nova" })}>
        {cadastros.veiculos.length ? (
          <ul className="divide-y divide-line">
            {cadastros.veiculos.map((v) => (
              <Item
                key={v.id}
                nome={v.nome}
                sub={[v.placa, v.modelo, v.ano].filter(Boolean).join(" · ")}
                ativo={v.ativo}
                editar={urlCom(params, { cad: `veiculo:${v.id}` })}
              />
            ))}
          </ul>
        ) : (
          vazio
        )}
      </Lista>

      <Lista titulo="Fornecedores e credores" novo={urlCom(params, { cad: "fornecedor:nova" })}>
        {cadastros.fornecedores.length ? (
          <ul className="divide-y divide-line">
            {cadastros.fornecedores.map((f) => (
              <Item
                key={f.id}
                nome={f.nome}
                sub={[f.obs, f.chave_pix && `PIX ${f.chave_pix}`].filter(Boolean).join(" · ")}
                ativo={f.ativo}
                editar={urlCom(params, { cad: `fornecedor:${f.id}` })}
              />
            ))}
          </ul>
        ) : (
          vazio
        )}
      </Lista>

      <Lista titulo="Categorias" novo={urlCom(params, { cad: "categoria:nova" })}>
        <div className="divide-y divide-line">
          {opcoes.grupos.map((g) => {
            const cats = opcoes.categorias.filter((c) => c.id_grupo === g.id);
            if (!cats.length) return null;
            return (
              <div key={g.id} className="px-5 py-2.5">
                <p className="flex items-center gap-1.5 text-[12px] font-semibold text-ink">
                  <span className="h-2 w-2 rounded-[2px]" style={{ background: corDoGrupo(opcoes.grupos, g.id) }} />
                  {g.nome}
                </p>
                <p className="mt-0.5 pl-3.5 text-[12px] text-muted">{cats.map((c) => c.nome).join(" · ")}</p>
              </div>
            );
          })}
        </div>
      </Lista>
    </div>
  );
}
