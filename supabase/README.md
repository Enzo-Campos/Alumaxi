# Banco de dados (Supabase / PostgreSQL)

Guia para quem for dar manutenção no banco — pessoa ou IA. As regras de negócio
detalhadas estão nos comentários de cada arquivo SQL; aqui fica o mapa.

## Arquivos e ordem de aplicação

| Ordem | Arquivo | O que é |
|---|---|---|
| 1 | `../schema_supabase.sql` | Base inicial: obras, etapas, materiais, compras, funcionários, EPIs, ferramentas |
| 2 | `../rls_policies.sql` | RLS da base: usuário autenticado tem acesso total |
| 3 | `migrations/*.sql` | Alterações posteriores, **em ordem de nome** (timestamp) |

Banco novo do zero = rodar 1, 2 e todas as migrations em ordem no SQL Editor.
Cada migration roda em transação (`begin`/`commit`): se falhar, nada é gravado.

**Produção (26/09/2026):** tudo aplicado até `20260926120200`. A planilha
"Gestão de Dívidas e Despesas da Empresa.xlsx" já foi importada (dados até a
competência 10/2026) por um script único, removido depois — não reimportar.

## Criando uma migration nova

- Nome: `migrations/AAAAMMDDHHMMSS_descricao_curta.sql`. Nunca editar migration já aplicada em produção: crie outra.
- Envolver em `begin; ... commit;`.
- Convenções: identificadores em minúsculo, ASCII, `snake_case`, tabelas no plural; dinheiro `numeric(12,2)`; percentual `numeric(5,2)`; datas `date`, instantes `timestamptz`; `updated_at` via trigger `set_updated_at()`.
- CPF, CNPJ, telefone e placa são gravados **só com dígitos/letras, sem máscara** (a máscara é do front) e validados por `check`.
- Tabela nova: `enable row level security` + policy `"auth full access"` (mesmo modelo de `rls_policies.sql`).
- View nova: `alter view ... set (security_invoker = on)` — sem isso a view ignora o RLS.
- Datas "de hoje" usam `hoje_br()` (fuso de São Paulo). `current_date` é UTC e erra entre 21h e 0h.
- `my-app/lib/supabase/database.types.ts` é **escrito à mão**: atualize junto com a migration.

## Módulo financeiro (contas a pagar)

Substituiu a planilha de despesas. Escopo atual: **só saídas** (contas a receber ficou para depois).
Não confundir com `vw_obras_financeiro`, que é a receita de cada obra (outro modelo, em `schema_supabase.sql`).

**Um livro único, `contas_pagar`,** classificado por `grupos_despesa` → `categorias_despesa`.
Cada conta tem `competencia` (mês de referência, sempre dia 1 — é o filtro "por mês")
e `vencimento`. As contas nascem de quatro jeitos:

| Origem | Como funciona |
|---|---|
| `recorrencias` com `valor` | Conta **fixa** (aluguel, internet, contador, seguros). Gerada automaticamente todo mês. |
| `recorrencias` com `valor` **null** | Conta **variável** (luz, água, FGTS, INSS, PIS/COFINS). **Não é gerada**: aparece em `vw_contas_a_lancar` até alguém lançar o valor real com `id_recorrencia` + `competencia`. Decisão do dono: valor estimado confundia. |
| `folha_regras` | Folha a partir de `funcionarios.salario` / `vale_alimentacao`: adiantamento 50% no dia 20, saldo no 5º dia útil do mês seguinte (sábado conta, regra CLT), VA no dia 20. |
| `dividas` | Financiamento: ao cadastrar, gera uma conta por parcela. |
| (nenhuma) | Conta avulsa lançada à mão (combustível, manutenção...). |

**Hora extra** (`horas_extras`): lança-se o dia trabalhado e o valor. O trigger decide o
pagamento pelo `folha_regras.corte_hora_extra`: dias 6–20 saem no dia 20; dias 21–5 saem
no saldo. Soma tudo numa conta "Hora extra" por funcionário/pagamento. Período já pago fica travado.

**Geração:** `gerar_contas_competencia('AAAA-MM-01')` — idempotente (chaves únicas por
origem + competência), pode rodar quantas vezes quiser. Roda sozinha pelo pg_cron:
job `alumaxi-gerar-contas`, dia 1 às 09:00 UTC, gera o mês atual e o seguinte.
Conferir com `select * from cron.job;`.

**Invariantes (não quebre):**
- Status derivado **nunca** é gravado: vencido, vence em 7 dias, saldo devedor, totais — tudo nas views.
- Pagar = `update contas_pagar set status = 'pago'`: o trigger preenche `data_pagamento` (hoje) e `valor_pago` (= `valor`) se vierem vazios. Sair de `pago` limpa os dois.
- Conta gerada automaticamente (folha ou recorrência fixa) **não pode ser excluída** — a geração a recriaria. Use `status = 'cancelado'`.
- Cadastros não são apagados: use `ativo = false`. As FKs das contas são `restrict`.
- Condições de uma dívida (parcela, quantidade, 1º vencimento) são imutáveis; ajuste parcelas direto em `contas_pagar`.
- Vencimento: data fixa em dia não útil segue `ajuste_nao_util` (boleto posterga, salário antecipa). Feriados vêm de `feriados` (nacionais + Santos/SP; Carnaval e Corpus Christi não contam, são facultativos para o funcionário). Páscoa é calculada (`pascoa()`), não precisa cadastrar ano a ano.

**No app:** página `/financeiro` (`my-app/app/(app)/financeiro/`), consultas em
`my-app/lib/financeiro-data.ts`, helpers puros em `my-app/lib/financeiro.ts`,
componentes em `my-app/components/financeiro/`. Salário e VA são editados em `/funcionarios`.

**Views para o front:**
- `vw_contas_pagar` — contas com nomes resolvidos, `situacao` (pago, cancelado, vencido, vence_hoje, vence_em_breve, a_vencer), `dias_para_vencer`, `origem`.
- `vw_contas_a_lancar` — contas variáveis pendentes de lançamento, com `vencimento_previsto` e `ultimo_valor` (referência).
- `vw_financeiro_mensal` — totais por competência × grupo × categoria (base dos gráficos).
- `vw_dividas` — parcelas pagas/restantes, saldo devedor, próximo vencimento.

## Pendências conhecidas

- Parcela da Kombi está como recorrência fixa sem fim: não se sabe o número de parcelas. Quando souber, encerrar a recorrência (`competencia_fim`) e cadastrar em `dividas`.
- Água do Galpão e do Terreno não foram cadastradas (sem valor na planilha).
- Feriados municipais de Santos (26/01 e 08/09) foram cadastrados de memória — confirmar com o contador.
- `folha_regras` e `feriados` só são editáveis por SQL (não há tela). Mudam raramente.
- RLS: todo usuário autenticado vê tudo, inclusive CPF/RG e salários. Se entrarem usuários não administradores, criar papéis e policies por papel.
