"use client";

/**
 * Cadastros de apoio das contas: `?cad=<tipo>:<nova|id>` com tipo em
 * local | veiculo | fornecedor | categoria (categoria so cria).
 * Nada e excluido: desmarque "ativo" para tirar das listas (historico fica).
 */
import { type FormEvent, useState, useTransition } from "react";
import {
  criarCategoria,
  salvarFornecedor,
  salvarLocal,
  salvarVeiculo,
} from "@/app/(app)/financeiro/actions";
import type { Database } from "@/lib/supabase/database.types";
import type { Opcoes } from "@/lib/financeiro";
import { Erro, ModalForm, btnPrimario, btnSecundario, field, labelCls, useModalParam } from "./ui";

type T = Database["public"]["Tables"];
export type Cadastros = {
  locais: T["locais"]["Row"][];
  veiculos: T["veiculos"]["Row"][];
  fornecedores: T["fornecedores"]["Row"][];
};

const TITULO: Record<string, string> = {
  local: "local",
  veiculo: "veiculo",
  fornecedor: "fornecedor",
  categoria: "categoria",
};

export function CadastroModal({ cadastros, opcoes }: { cadastros: Cadastros; opcoes: Opcoes }) {
  const { valor: param, fechar } = useModalParam("cad");
  const [tipo, alvo] = (param ?? "").split(":");
  const nova = alvo === "nova";
  const id = !nova && alvo ? Number(alvo) : null;

  const registro =
    id == null
      ? null
      : tipo === "local"
        ? cadastros.locais.find((x) => x.id === id)
        : tipo === "veiculo"
          ? cadastros.veiculos.find((x) => x.id === id)
          : tipo === "fornecedor"
            ? cadastros.fornecedores.find((x) => x.id === id)
            : null;
  if (!(tipo in TITULO) || (!nova && registro == null)) return null;
  return (
    <CadastroForm
      key={param}
      tipo={tipo}
      id={id}
      registro={(registro ?? null) as Record<string, unknown> | null}
      opcoes={opcoes}
      fechar={fechar}
    />
  );
}

function CadastroForm({
  tipo,
  id,
  registro,
  opcoes,
  fechar,
}: {
  tipo: string;
  id: number | null;
  registro: Record<string, unknown> | null;
  opcoes: Opcoes;
  fechar: () => void;
}) {
  const nova = id == null;
  const [pending, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [f, setF] = useState<Record<string, string>>(() => {
    const s = (k: string) => (registro?.[k] == null ? "" : String(registro[k]));
    return {
      nome: s("nome"),
      endereco: s("endereco"),
      placa: s("placa"),
      modelo: s("modelo"),
      ano: s("ano"),
      renavam: s("renavam"),
      documento: s("documento"),
      telefone: s("telefone"),
      email: s("email"),
      chave_pix: s("chave_pix"),
      obs: s("obs"),
      id_grupo: String(opcoes.grupos[0]?.id ?? ""),
    };
  });
  const [ativo, setAtivo] = useState(registro ? Boolean(registro.ativo) : true);

  const set = (k: string) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const nul = (k: string) => f[k]?.trim() || null;

  function submit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    start(async () => {
      let r: { error?: string };
      if (tipo === "local") r = await salvarLocal(id, { nome: f.nome, endereco: nul("endereco"), ativo });
      else if (tipo === "veiculo")
        r = await salvarVeiculo(id, {
          nome: f.nome,
          placa: nul("placa"),
          modelo: nul("modelo"),
          ano: f.ano ? Number(f.ano) : null,
          renavam: nul("renavam"),
          ativo,
        });
      else if (tipo === "fornecedor")
        r = await salvarFornecedor(id, {
          nome: f.nome,
          documento: nul("documento"),
          telefone: nul("telefone"),
          email: nul("email"),
          chave_pix: nul("chave_pix"),
          obs: nul("obs"),
          ativo,
        });
      else r = await criarCategoria({ nome: f.nome, id_grupo: Number(f.id_grupo) });
      if (r.error) return setErro(r.error);
      fechar();
    });
  }

  return (
    <ModalForm
      titulo={`${nova ? "Novo" : "Editar"} ${TITULO[tipo]}`.replace("Novo categoria", "Nova categoria")}
      onSubmit={submit}
      onClose={fechar}
      busy={pending}
      largura={480}
    >
      <fieldset disabled={pending} className="space-y-3">
        <div>
          <label className={labelCls}>Nome</label>
          <input
            className={field}
            value={f.nome ?? ""}
            onChange={set("nome")}
            placeholder={
              tipo === "local" ? "Ex.: Galpao" : tipo === "veiculo" ? "Ex.: Kombi" : tipo === "categoria" ? "Ex.: Marketing" : ""
            }
          />
        </div>

        {tipo === "categoria" && (
          <div>
            <label className={labelCls}>Grupo</label>
            <select className={field} value={f.id_grupo} onChange={set("id_grupo")}>
              {opcoes.grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {tipo === "local" && (
          <div>
            <label className={labelCls}>Endereco</label>
            <input className={field} value={f.endereco ?? ""} onChange={set("endereco")} />
          </div>
        )}

        {tipo === "veiculo" && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Placa</label>
              <input className={`${field} uppercase`} value={f.placa ?? ""} onChange={set("placa")} placeholder="ABC1D23" />
            </div>
            <div>
              <label className={labelCls}>Ano</label>
              <input type="number" className={field} value={f.ano ?? ""} onChange={set("ano")} />
            </div>
            <div>
              <label className={labelCls}>Modelo</label>
              <input className={field} value={f.modelo ?? ""} onChange={set("modelo")} />
            </div>
            <div>
              <label className={labelCls}>RENAVAM</label>
              <input className={field} inputMode="numeric" value={f.renavam ?? ""} onChange={set("renavam")} />
            </div>
          </div>
        )}

        {tipo === "fornecedor" && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>CPF / CNPJ</label>
                <input className={field} inputMode="numeric" value={f.documento ?? ""} onChange={set("documento")} />
              </div>
              <div>
                <label className={labelCls}>Telefone</label>
                <input className={field} inputMode="tel" value={f.telefone ?? ""} onChange={set("telefone")} placeholder="(13) 99999-9999" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>E-mail</label>
                <input type="email" className={field} value={f.email ?? ""} onChange={set("email")} />
              </div>
              <div>
                <label className={labelCls}>Chave PIX</label>
                <input className={field} value={f.chave_pix ?? ""} onChange={set("chave_pix")} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Observacoes</label>
              <input className={field} value={f.obs ?? ""} onChange={set("obs")} />
            </div>
          </>
        )}

        {tipo !== "categoria" && (
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="h-4 w-4 accent-steel" />
            Ativo (aparece nas listas)
          </label>
        )}
      </fieldset>

      <Erro msg={erro} />

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={fechar} disabled={pending} className={btnSecundario}>
          Cancelar
        </button>
        <button type="submit" disabled={pending} className={btnPrimario}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </ModalForm>
  );
}
