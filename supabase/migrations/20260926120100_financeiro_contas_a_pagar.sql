-- ============================================================
-- Alumaxi - Financeiro: contas a pagar
--
-- Substitui a planilha "Gestao de Dividas e Despesas da Empresa".
-- Em vez de uma aba por assunto (Impostos, Folha dia 5, Folha dia 20,
-- VA, Veiculos, Consumo), existe UM livro de contas (`contas_pagar`)
-- classificado por categoria, e tres ORIGENS que geram contas nele:
--
--   recorrencias  contas fixas (aluguel, internet, contador, seguro...)
--   folha_regras  salario (adiantamento + saldo) e VA, calculados a
--                 partir de funcionarios.salario / vale_alimentacao
--   dividas       financiamentos e parcelamentos -> uma conta por parcela
--
-- Contas avulsas (combustivel, manutencao, imposto eventual) entram
-- direto em `contas_pagar`, sem origem.
--
-- Principios:
--   * Nada derivado e armazenado: "vencido", "vence em 7 dias", saldo
--     devedor, totais do mes... tudo sai das views.
--   * Categorias, feriados e regras da folha sao DADOS, nao codigo:
--     criar categoria nova ou mudar a divisao do salario nao exige deploy.
--   * A geracao e idempotente (chaves unicas por origem + competencia):
--     pode rodar pelo pg_cron e pelo app sem duplicar nada.
--   * Historico nunca some: cadastros usam `ativo`, contas usam
--     status `cancelado`; FKs das contas sao `restrict`.
--
-- Depende de: schema_supabase.sql, 20260926120000_funcionarios_documentos.sql
-- ============================================================

begin;

-- ============================================================
-- TIPOS
-- ============================================================
create type conta_status      as enum ('pendente', 'pago', 'cancelado');
create type forma_pagamento   as enum ('pix', 'boleto', 'transferencia', 'dinheiro',
                                       'cartao_credito', 'cartao_debito', 'debito_automatico');
create type regra_vencimento  as enum ('dia_fixo', 'dia_util');
-- dia_fixo caindo em fim de semana/feriado: boleto costuma ir para o
-- proximo dia util (postergar); salario e pago no dia util anterior (antecipar)
create type ajuste_nao_util   as enum ('manter', 'antecipar', 'postergar');
create type folha_regra_tipo  as enum ('salario', 'vale_alimentacao');

-- ============================================================
-- DATAS: hoje no fuso da empresa, feriados e dias uteis
-- ============================================================

-- O banco roda em UTC; entre 21h e 0h (Brasilia) current_date ja e
-- "amanha". Todo calculo de vencimento usa esta funcao.
create or replace function hoje_br()
returns date
language sql
stable
as $$
    select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- Domingo de Pascoa (algoritmo de Meeus/Jones/Butcher).
create or replace function pascoa(p_ano int)
returns date
language plpgsql
immutable
as $$
declare
    a int := p_ano % 19;
    b int := p_ano / 100;
    c int := p_ano % 100;
    d int := b / 4;
    e int := b % 4;
    f int := (b + 8) / 25;
    g int := (b - f + 1) / 3;
    h int := (19 * a + b - d - g + 15) % 30;
    i int := c / 4;
    k int := c % 4;
    l int := (32 + 2 * e + 2 * i - h - k) % 7;
    m int := (a + 11 * h + 22 * l) / 451;
begin
    return make_date(
        p_ano,
        (h + l - 7 * m + 114) / 31,
        ((h + l - 7 * m + 114) % 31) + 1
    );
end;
$$;

-- ------------------------------------------------------------
-- FERIADOS - tres formas de cadastro (exatamente uma por linha):
--   data              ocorrencia unica        (ex.: 2026-07-09 ponte)
--   dia + mes         todo ano na mesma data  (ex.: 25/12)
--   dias_apos_pascoa  movel, relativo a Pascoa (ex.: -2 Sexta-feira Santa)
-- Nacionais ja vem cadastrados; municipais/estaduais sao adicionados aqui.
-- ------------------------------------------------------------
create table feriados (
    id               bigint generated always as identity primary key,
    nome             varchar(100) not null,
    data             date,
    dia              smallint,
    mes              smallint,
    dias_apos_pascoa smallint,
    ativo            boolean not null default true,
    constraint chk_feriados_forma check (
        (data is not null)::int
      + (dia is not null and mes is not null)::int
      + (dias_apos_pascoa is not null)::int = 1
    ),
    constraint chk_feriados_dia_mes check ((dia is null) = (mes is null)),
    constraint chk_feriados_dia     check (dia between 1 and 31),
    constraint chk_feriados_mes     check (mes between 1 and 12)
);

create or replace function eh_feriado(p_data date)
returns boolean
language sql
stable
as $$
    select exists (
        select 1
          from feriados f
         where f.ativo
           and (   f.data = p_data
                or (f.dia = extract(day from p_data) and f.mes = extract(month from p_data))
                or pascoa(extract(year from p_data)::int) + f.dias_apos_pascoa = p_data)
    );
$$;

-- p_conta_sabado: para pagamento de salario o sabado CONTA como dia util
-- (entendimento do MTE para o art. 459 da CLT); para boleto/banco, nao.
create or replace function eh_dia_util(p_data date, p_conta_sabado boolean default false)
returns boolean
language sql
stable
as $$
    select extract(isodow from p_data) <> 7
       and (p_conta_sabado or extract(isodow from p_data) <> 6)
       and not eh_feriado(p_data);
$$;

-- n-esimo dia util do mes de p_mes.
create or replace function dia_util(p_mes date, p_n int, p_conta_sabado boolean default false)
returns date
language plpgsql
stable
as $$
declare
    v_dia   date := date_trunc('month', p_mes)::date;
    v_count int  := 0;
begin
    if p_n < 1 then
        raise exception 'dia_util: n deve ser >= 1 (recebido %)', p_n;
    end if;
    loop
        if eh_dia_util(v_dia, p_conta_sabado) then
            v_count := v_count + 1;
            if v_count = p_n then
                return v_dia;
            end if;
        end if;
        v_dia := v_dia + 1;
    end loop;
end;
$$;

-- Vencimento a partir da regra. p_mes = mes em que a conta vence.
-- dia_fixo maior que o mes (ex.: 31 em fevereiro) cai no ultimo dia;
-- se cair em dia nao util, aplica p_ajuste.
create or replace function calcular_vencimento(
    p_mes          date,
    p_regra        regra_vencimento,
    p_dia          int,
    p_conta_sabado boolean default false,
    p_ajuste       ajuste_nao_util default 'manter'
)
returns date
language plpgsql
stable
as $$
declare
    v_data date;
begin
    if p_regra = 'dia_util' then
        return dia_util(p_mes, p_dia, p_conta_sabado);
    end if;

    v_data := least(
        date_trunc('month', p_mes)::date + (p_dia - 1),
        (date_trunc('month', p_mes) + interval '1 month - 1 day')::date
    );

    if p_ajuste <> 'manter' then
        while not eh_dia_util(v_data, p_conta_sabado) loop
            v_data := v_data + case p_ajuste when 'antecipar' then -1 else 1 end;
        end loop;
    end if;
    return v_data;
end;
$$;

-- ============================================================
-- CADASTROS DE APOIO
-- ============================================================

-- ------------------------------------------------------------
-- Classificacao em dois niveis: grupo (eixo dos graficos / "abas" da
-- planilha) > categoria (tipo da conta).
-- ------------------------------------------------------------
create table grupos_despesa (
    id    bigint generated always as identity primary key,
    nome  varchar(60) not null unique,
    ordem integer not null default 0,
    ativo boolean not null default true
);

create table categorias_despesa (
    id       bigint generated always as identity primary key,
    id_grupo bigint not null references grupos_despesa(id) on delete restrict,
    nome     varchar(80) not null,
    ativa    boolean not null default true,
    constraint uq_categorias_despesa unique (id_grupo, nome)
);

-- ------------------------------------------------------------
-- FORNECEDORES / credores (contador, concessionarias, banco da Kombi...)
-- Tambem serve ao modulo de compras de material no futuro.
-- ------------------------------------------------------------
create table fornecedores (
    id         bigint generated always as identity primary key,
    nome       varchar(150) not null,
    documento  varchar(14),     -- CPF (11) ou CNPJ (14), so digitos
    telefone   varchar(11),     -- so digitos
    email      varchar(150),
    chave_pix  varchar(140),
    obs        text,
    ativo      boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint chk_fornecedores_documento check (documento ~ '^(\d{11}|\d{14})$'),
    constraint chk_fornecedores_telefone  check (telefone ~ '^\d{10,11}$')
);
create unique index uq_fornecedores_documento on fornecedores (documento) where documento is not null;
create trigger trg_fornecedores_updated_at
    before update on fornecedores
    for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- VEICULOS (Caminhao, Kombi...)
-- ------------------------------------------------------------
create table veiculos (
    id         bigint generated always as identity primary key,
    nome       varchar(60) not null,
    placa      varchar(7),      -- sem hifen; padrao antigo ou Mercosul
    modelo     varchar(80),
    ano        smallint,
    renavam    varchar(11),
    ativo      boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint chk_veiculos_placa   check (placa ~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$'),
    constraint chk_veiculos_renavam check (renavam ~ '^\d{9,11}$'),
    constraint chk_veiculos_ano     check (ano between 1950 and 2100)
);
create unique index uq_veiculos_placa on veiculos (placa) where placa is not null;
create trigger trg_veiculos_updated_at
    before update on veiculos
    for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- LOCAIS da empresa (Galpao, Terreno, Escritorio) - centro de custo
-- das contas de consumo/estrutura.
-- ------------------------------------------------------------
create table locais (
    id         bigint generated always as identity primary key,
    nome       varchar(60) not null unique,
    endereco   varchar(255),
    ativo      boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create trigger trg_locais_updated_at
    before update on locais
    for each row execute function set_updated_at();

-- ============================================================
-- ORIGENS DAS CONTAS
-- ============================================================

-- ------------------------------------------------------------
-- RECORRENCIAS: modelo de conta fixa. Gera uma conta a cada
-- `intervalo_meses` (1 = mensal, 12 = anual) a partir de
-- `competencia_inicio`, ate `competencia_fim` (null = sem fim).
--
-- valor_estimado = true para contas de valor variavel (luz, agua):
-- a conta nasce com o valor previsto marcado como estimativa e o
-- valor real e confirmado quando o boleto chega.
-- ------------------------------------------------------------
create table recorrencias (
    id                     bigint generated always as identity primary key,
    descricao              varchar(200) not null,
    id_categoria           bigint not null references categorias_despesa(id) on delete restrict,
    id_fornecedor          bigint references fornecedores(id) on delete restrict,
    id_funcionario         bigint references funcionarios(id) on delete restrict,
    id_veiculo             bigint references veiculos(id)     on delete restrict,
    id_local               bigint references locais(id)       on delete restrict,
    valor                  numeric(12,2) not null,
    valor_estimado         boolean  not null default false,
    intervalo_meses        smallint not null default 1,
    competencia_inicio     date     not null,
    competencia_fim        date,
    regra_vencimento       regra_vencimento not null default 'dia_fixo',
    dia_vencimento         smallint not null,
    meses_apos_competencia smallint not null default 0,   -- 1 = vence no mes seguinte
    sabado_dia_util        boolean  not null default false,
    ajuste_nao_util        ajuste_nao_util not null default 'postergar',
    forma_pagamento        forma_pagamento,
    por_fora               boolean  not null default false,
    ativa                  boolean  not null default true,
    obs                    text,
    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now(),
    constraint chk_recorrencias_valor     check (valor > 0),
    constraint chk_recorrencias_intervalo check (intervalo_meses between 1 and 12),
    constraint chk_recorrencias_inicio    check (extract(day from competencia_inicio) = 1),
    constraint chk_recorrencias_fim       check (competencia_fim is null
                                                 or (extract(day from competencia_fim) = 1
                                                     and competencia_fim >= competencia_inicio)),
    constraint chk_recorrencias_dia       check (dia_vencimento between 1 and 31),
    constraint chk_recorrencias_dia_util  check (regra_vencimento <> 'dia_util' or dia_vencimento <= 23),
    constraint chk_recorrencias_meses     check (meses_apos_competencia between 0 and 2)
);
create trigger trg_recorrencias_updated_at
    before update on recorrencias
    for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- FOLHA_REGRAS: como a folha de cada funcionario vira contas.
--   tipo salario, percentual X    -> X% de funcionarios.salario
--   tipo salario, percentual null -> o RESTANTE do salario (evita
--                                    diferenca de centavo no arredondamento)
--   tipo vale_alimentacao         -> funcionarios.vale_alimentacao
-- Mudar a divisao (ex.: 40/60) e so editar esta tabela.
--
-- corte_hora_extra: hora extra feita APOS o corte anterior e ATE este
-- dia e paga junto com esta parcela (ver tabela horas_extras).
-- ------------------------------------------------------------
create table folha_regras (
    id                      bigint generated always as identity primary key,
    nome                    varchar(60) not null,
    tipo                    folha_regra_tipo not null,
    id_categoria            bigint not null references categorias_despesa(id) on delete restrict,
    percentual              numeric(5,2),
    regra_vencimento        regra_vencimento not null,
    dia_vencimento          smallint not null,
    meses_apos_competencia  smallint not null default 0,
    sabado_dia_util         boolean  not null default true,
    ajuste_nao_util         ajuste_nao_util not null default 'antecipar',
    corte_hora_extra        smallint,
    id_categoria_hora_extra bigint references categorias_despesa(id) on delete restrict,
    ordem                   integer  not null default 0,
    ativa                   boolean  not null default true,
    constraint chk_folha_regras_percentual check (
        percentual is null or (tipo = 'salario' and percentual > 0 and percentual <= 100)
    ),
    constraint chk_folha_regras_hora_extra check (
        (corte_hora_extra is null) = (id_categoria_hora_extra is null)
        and (corte_hora_extra is null or (tipo = 'salario' and corte_hora_extra between 1 and 31))
    ),
    constraint chk_folha_regras_dia       check (dia_vencimento between 1 and 31),
    constraint chk_folha_regras_dia_util  check (regra_vencimento <> 'dia_util' or dia_vencimento <= 23),
    constraint chk_folha_regras_meses     check (meses_apos_competencia between 0 and 2)
);
-- so pode existir uma regra "restante do salario" ativa
create unique index uq_folha_regras_restante
    on folha_regras (tipo)
    where ativa and tipo = 'salario' and percentual is null;

-- ------------------------------------------------------------
-- DIVIDAS: financiamentos e parcelamentos. Ao cadastrar, as parcelas
-- sao geradas em contas_pagar (trigger abaixo).
-- parcelas_anteriores: parcelas ja quitadas ANTES de a divida entrar
-- no sistema (nao sao geradas, mas contam no progresso).
-- Condicoes (valor/numero de parcelas) sao fixas apos o cadastro:
-- ajuste pontual de parcela e feito na propria conta.
-- ------------------------------------------------------------
create table dividas (
    id                  bigint generated always as identity primary key,
    descricao           varchar(200) not null,
    id_categoria        bigint not null references categorias_despesa(id) on delete restrict,
    id_fornecedor       bigint references fornecedores(id) on delete restrict,   -- credor
    id_veiculo          bigint references veiculos(id)     on delete restrict,
    id_local            bigint references locais(id)       on delete restrict,
    valor_contratado    numeric(12,2),            -- valor financiado (informativo)
    valor_parcela       numeric(12,2) not null,
    numero_parcelas     smallint not null,
    parcelas_anteriores smallint not null default 0,
    primeiro_vencimento date not null,            -- vencimento da parcela 1
    data_contratacao    date,
    forma_pagamento     forma_pagamento,
    obs                 text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    constraint chk_dividas_valor_parcela check (valor_parcela > 0),
    constraint chk_dividas_contratado    check (valor_contratado is null or valor_contratado > 0),
    constraint chk_dividas_parcelas      check (numero_parcelas between 1 and 600),
    constraint chk_dividas_anteriores    check (parcelas_anteriores >= 0 and parcelas_anteriores < numero_parcelas)
);
create trigger trg_dividas_updated_at
    before update on dividas
    for each row execute function set_updated_at();

create or replace function dividas_bloqueia_condicoes()
returns trigger
language plpgsql
as $$
begin
    if (new.valor_parcela, new.numero_parcelas, new.parcelas_anteriores, new.primeiro_vencimento)
       is distinct from
       (old.valor_parcela, old.numero_parcelas, old.parcelas_anteriores, old.primeiro_vencimento) then
        raise exception 'As condicoes da divida (parcela, quantidade, vencimento) nao podem ser alteradas. Ajuste as parcelas em contas_pagar.';
    end if;
    return new;
end;
$$;
create trigger trg_dividas_bloqueia_condicoes
    before update on dividas
    for each row execute function dividas_bloqueia_condicoes();

-- ============================================================
-- CONTAS_PAGAR - o livro unico de contas
-- ============================================================
create table contas_pagar (
    id              bigint generated always as identity primary key,
    descricao       varchar(200) not null,
    id_categoria    bigint not null references categorias_despesa(id) on delete restrict,

    -- a quem / a que se refere (todos opcionais e combinaveis)
    id_fornecedor   bigint references fornecedores(id) on delete restrict,
    id_funcionario  bigint references funcionarios(id) on delete restrict,
    id_veiculo      bigint references veiculos(id)     on delete restrict,
    id_local        bigint references locais(id)       on delete restrict,

    -- quando
    competencia     date not null,        -- mes de referencia (dia 1): regime de competencia
    vencimento      date not null,

    -- quanto
    valor           numeric(12,2) not null,
    valor_estimado  boolean not null default false,

    -- pagamento
    status          conta_status not null default 'pendente',
    data_pagamento  date,                 -- regime de caixa
    valor_pago      numeric(12,2),        -- pode diferir de `valor` (juros, multa, desconto)
    forma_pagamento forma_pagamento,
    por_fora        boolean not null default false,   -- pago fora da folha/contabilidade oficial
    comprovante_url text,

    -- origem (no maximo uma; nenhuma = conta avulsa)
    id_recorrencia  bigint references recorrencias(id) on delete restrict,
    id_folha_regra  bigint references folha_regras(id) on delete restrict,
    id_divida       bigint references dividas(id)      on delete restrict,
    parcela         smallint,

    obs             text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),

    constraint chk_contas_valor       check (valor > 0),
    constraint chk_contas_valor_pago  check (valor_pago is null or valor_pago >= 0),
    constraint chk_contas_competencia check (extract(day from competencia) = 1),
    constraint chk_contas_pagamento   check (
        case status
            when 'pago' then data_pagamento is not null and valor_pago is not null
            else             data_pagamento is null     and valor_pago is null
        end
    ),
    constraint chk_contas_origem      check (
        (id_recorrencia is not null)::int
      + (id_folha_regra is not null)::int
      + (id_divida      is not null)::int <= 1
    ),
    constraint chk_contas_parcela     check ((id_divida is null) = (parcela is null)),
    constraint chk_contas_folha       check (id_folha_regra is null or id_funcionario is not null)
);

-- chaves de idempotencia da geracao automatica
create unique index uq_contas_recorrencia on contas_pagar (id_recorrencia, competencia)
    where id_recorrencia is not null;
-- a categoria entra na chave: salario e hora extra do mesmo pagamento
-- sao contas distintas da mesma regra
create unique index uq_contas_folha       on contas_pagar (id_folha_regra, id_funcionario, competencia, id_categoria)
    where id_folha_regra is not null;
create unique index uq_contas_divida      on contas_pagar (id_divida, parcela)
    where id_divida is not null;

-- consultas do painel
create index idx_contas_abertas    on contas_pagar (vencimento) where status = 'pendente';
create index idx_contas_competencia on contas_pagar (competencia);
create index idx_contas_pagamento  on contas_pagar (data_pagamento) where status = 'pago';
create index idx_contas_categoria  on contas_pagar (id_categoria);
create index idx_contas_funcionario on contas_pagar (id_funcionario) where id_funcionario is not null;
create index idx_contas_veiculo    on contas_pagar (id_veiculo)     where id_veiculo     is not null;
create index idx_contas_local      on contas_pagar (id_local)       where id_local       is not null;
create index idx_contas_fornecedor on contas_pagar (id_fornecedor)  where id_fornecedor  is not null;

create trigger trg_contas_pagar_updated_at
    before update on contas_pagar
    for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- "Marcar como pago" com um unico campo: status = 'pago' preenche
-- data_pagamento (hoje) e valor_pago (= valor) se vierem vazios.
-- Sair de 'pago' limpa os dados de pagamento.
-- ------------------------------------------------------------
create or replace function contas_pagar_normaliza_pagamento()
returns trigger
language plpgsql
as $$
begin
    if new.status = 'pago' then
        new.data_pagamento := coalesce(new.data_pagamento, hoje_br());
        new.valor_pago     := coalesce(new.valor_pago, new.valor);
        new.valor_estimado := false;   -- se foi pago, o valor e real
    else
        new.data_pagamento := null;
        new.valor_pago     := null;
    end if;
    return new;
end;
$$;
create trigger trg_contas_pagar_normaliza
    before insert or update on contas_pagar
    for each row execute function contas_pagar_normaliza_pagamento();

-- ------------------------------------------------------------
-- Conta gerada automaticamente nao pode ser excluida: a geracao e
-- idempotente e a recriaria. Use status = 'cancelado'.
-- ------------------------------------------------------------
create or replace function contas_pagar_bloqueia_exclusao()
returns trigger
language plpgsql
as $$
begin
    if old.id_recorrencia is not null or old.id_folha_regra is not null then
        raise exception 'Conta gerada automaticamente (id %): cancele em vez de excluir.', old.id;
    end if;
    return old;
end;
$$;
create trigger trg_contas_pagar_bloqueia_exclusao
    before delete on contas_pagar
    for each row execute function contas_pagar_bloqueia_exclusao();

-- ============================================================
-- HORAS EXTRAS
-- Registro por dia trabalhado. Cada registro e roteado para a parcela
-- da folha pelo corte (folha_regras.corte_hora_extra) e, por
-- funcionario + parcela + competencia, vira UMA conta "Hora extra" em
-- contas_pagar com a soma, vencendo junto com o salario.
-- Com a folha atual: dias 6..20 -> pago no dia 20 (adiantamento);
-- dias 21..5 -> pago no 5o dia util (saldo da competencia).
-- ============================================================

-- Parcela da folha (e competencia) que paga a hora extra do dia p_data:
-- a regra cujo proximo corte (>= p_data) chega primeiro.
create or replace function folha_pagamento_da_hora_extra(
    p_data date,
    out id_folha_regra bigint,
    out competencia date
)
language sql
stable
as $$
    select r.id,
           (date_trunc('month', c.corte) - r.meses_apos_competencia * interval '1 month')::date
      from folha_regras r
      cross join lateral (
          select date_trunc('month', p_data)::date                      as m0,
                 (date_trunc('month', p_data) + interval '1 month')::date as m1
      ) mm
      cross join lateral (
          select case
              when least(mm.m0 + (r.corte_hora_extra - 1), mm.m1 - 1) >= p_data
                  then least(mm.m0 + (r.corte_hora_extra - 1), mm.m1 - 1)
              else least(mm.m1 + (r.corte_hora_extra - 1),
                         (mm.m1 + interval '1 month')::date - 1)
          end as corte
      ) c
     where r.ativa
       and r.tipo = 'salario'
       and r.corte_hora_extra is not null
     order by c.corte, r.ordem
     limit 1;
$$;

create table horas_extras (
    id             bigint generated always as identity primary key,
    id_funcionario bigint not null references funcionarios(id) on delete restrict,
    data           date not null,                 -- dia trabalhado
    horas          numeric(5,2),                  -- informativo
    valor          numeric(12,2) not null,
    obs            text,
    -- preenchidos pelo trigger a partir de `data` (nao informar)
    id_folha_regra bigint not null references folha_regras(id) on delete restrict,
    competencia    date   not null,
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now(),
    constraint chk_horas_extras_valor check (valor > 0),
    constraint chk_horas_extras_horas check (horas is null or horas > 0)
);
create index idx_horas_extras_pagamento on horas_extras (id_funcionario, id_folha_regra, competencia);
create trigger trg_horas_extras_updated_at
    before update on horas_extras
    for each row execute function set_updated_at();

create or replace function horas_extras_roteia()
returns trigger
language plpgsql
as $$
declare
    v record;
begin
    select * into v from folha_pagamento_da_hora_extra(new.data);
    if v.id_folha_regra is null then
        raise exception 'Nenhuma regra de folha ativa com corte de hora extra.';
    end if;
    new.id_folha_regra := v.id_folha_regra;
    new.competencia    := v.competencia;
    return new;
end;
$$;
create trigger trg_horas_extras_roteia
    before insert or update on horas_extras
    for each row execute function horas_extras_roteia();

-- Recalcula a conta "Hora extra" de um funcionario/parcela/competencia.
create or replace function sincronizar_hora_extra(p_funcionario bigint, p_regra bigint, p_competencia date)
returns void
language plpgsql
as $$
declare
    v_total numeric(12,2);
    v_regra folha_regras%rowtype;
    v_conta contas_pagar%rowtype;
begin
    select * into strict v_regra from folha_regras where id = p_regra;
    if v_regra.id_categoria_hora_extra is null then
        raise exception 'Regra de folha % nao aceita hora extra.', v_regra.nome;
    end if;

    select coalesce(sum(valor), 0) into v_total
      from horas_extras
     where id_funcionario = p_funcionario
       and id_folha_regra = p_regra
       and competencia    = p_competencia;

    select * into v_conta
      from contas_pagar
     where id_folha_regra = p_regra
       and id_funcionario = p_funcionario
       and competencia    = p_competencia
       and id_categoria   = v_regra.id_categoria_hora_extra;

    if found then
        if v_total = v_conta.valor and v_conta.status <> 'cancelado' then
            return;   -- nada mudou no valor (ex.: edicao de obs)
        end if;
        if v_conta.status = 'pago' then
            raise exception 'A hora extra deste pagamento ja foi paga (conta %). Lance a diferenca no proximo periodo.', v_conta.id;
        end if;
        if v_total > 0 then
            update contas_pagar set valor = v_total, status = 'pendente' where id = v_conta.id;
        else
            update contas_pagar set status = 'cancelado' where id = v_conta.id;
        end if;
    elsif v_total > 0 then
        insert into contas_pagar (
            descricao, id_categoria, id_funcionario, competencia, vencimento, valor, id_folha_regra
        )
        select
            'Hora extra (' || v_regra.nome || ') - ' || f.nome,
            v_regra.id_categoria_hora_extra,
            f.id,
            p_competencia,
            calcular_vencimento(
                (p_competencia + v_regra.meses_apos_competencia * interval '1 month')::date,
                v_regra.regra_vencimento, v_regra.dia_vencimento,
                v_regra.sabado_dia_util, v_regra.ajuste_nao_util
            ),
            v_total,
            v_regra.id
        from funcionarios f
        where f.id = p_funcionario;
    end if;
end;
$$;

create or replace function horas_extras_sincroniza()
returns trigger
language plpgsql
as $$
begin
    if tg_op in ('UPDATE', 'DELETE') then
        perform sincronizar_hora_extra(old.id_funcionario, old.id_folha_regra, old.competencia);
    end if;
    if tg_op in ('INSERT', 'UPDATE') then
        perform sincronizar_hora_extra(new.id_funcionario, new.id_folha_regra, new.competencia);
    end if;
    return null;
end;
$$;
create trigger trg_horas_extras_sincroniza
    after insert or update or delete on horas_extras
    for each row execute function horas_extras_sincroniza();

-- ============================================================
-- GERACAO
-- ============================================================

-- ------------------------------------------------------------
-- Parcelas de uma divida. Idempotente.
-- Parcela k vence em primeiro_vencimento + (k-1) meses (dia 31 vira
-- o ultimo dia nos meses curtos, sem "escorregar" nos seguintes).
-- ------------------------------------------------------------
create or replace function gerar_parcelas_divida(p_id_divida bigint)
returns integer
language plpgsql
as $$
declare
    v_inseridas integer;
begin
    insert into contas_pagar (
        descricao, id_categoria, id_fornecedor, id_veiculo, id_local,
        competencia, vencimento, valor, forma_pagamento, id_divida, parcela
    )
    select
        d.descricao || ' - parcela ' || k || '/' || d.numero_parcelas,
        d.id_categoria, d.id_fornecedor, d.id_veiculo, d.id_local,
        date_trunc('month', venc)::date,
        venc,
        d.valor_parcela,
        d.forma_pagamento,
        d.id,
        k
    from dividas d
    cross join lateral generate_series(d.parcelas_anteriores + 1, d.numero_parcelas) as k
    cross join lateral (
        select (d.primeiro_vencimento + (k - 1) * interval '1 month')::date as venc
    ) v
    where d.id = p_id_divida
    on conflict do nothing;

    get diagnostics v_inseridas = row_count;
    return v_inseridas;
end;
$$;

create or replace function dividas_gera_parcelas()
returns trigger
language plpgsql
as $$
begin
    perform gerar_parcelas_divida(new.id);
    return null;
end;
$$;
create trigger trg_dividas_gera_parcelas
    after insert on dividas
    for each row execute function dividas_gera_parcelas();

-- ------------------------------------------------------------
-- Gera as contas de uma competencia (recorrencias + folha).
-- Idempotente: rodar de novo so cria o que falta (ex.: funcionario
-- admitido depois). Chamada pelo pg_cron e/ou pelo app via RPC:
--   select gerar_contas_competencia('2026-10-01');
-- Retorna quantas contas foram criadas.
-- p_incluir_folha = false gera so as recorrencias (uso em importacao).
-- ------------------------------------------------------------
create or replace function gerar_contas_competencia(
    p_competencia   date,
    p_incluir_folha boolean default true
)
returns integer
language plpgsql
as $$
declare
    v_mes     date := date_trunc('month', p_competencia)::date;
    v_fim_mes date := (date_trunc('month', p_competencia) + interval '1 month - 1 day')::date;
    v_total   integer := 0;
    v_n       integer;
begin
    -- 1) contas fixas
    insert into contas_pagar (
        descricao, id_categoria, id_fornecedor, id_funcionario, id_veiculo, id_local,
        competencia, vencimento, valor, valor_estimado, forma_pagamento, por_fora,
        id_recorrencia
    )
    select
        r.descricao, r.id_categoria, r.id_fornecedor, r.id_funcionario, r.id_veiculo, r.id_local,
        v_mes,
        calcular_vencimento(
            (v_mes + r.meses_apos_competencia * interval '1 month')::date,
            r.regra_vencimento, r.dia_vencimento, r.sabado_dia_util, r.ajuste_nao_util
        ),
        r.valor, r.valor_estimado, r.forma_pagamento, r.por_fora,
        r.id
    from recorrencias r
    where r.ativa
      and r.competencia_inicio <= v_mes
      and (r.competencia_fim is null or r.competencia_fim >= v_mes)
      and (  (extract(year  from v_mes) - extract(year  from r.competencia_inicio)) * 12
           + (extract(month from v_mes) - extract(month from r.competencia_inicio))
          )::int % r.intervalo_meses = 0
    on conflict do nothing;
    get diagnostics v_n = row_count;
    v_total := v_total + v_n;

    if not p_incluir_folha then
        return v_total;
    end if;

    -- 2) folha: salario (parcelas) e vale-alimentacao
    --    Entra quem estava ativo em algum dia da competencia.
    insert into contas_pagar (
        descricao, id_categoria, id_funcionario,
        competencia, vencimento, valor, por_fora, id_folha_regra
    )
    select
        fr.nome || ' - ' || f.nome,
        fr.id_categoria,
        f.id,
        v_mes,
        calcular_vencimento(
            (v_mes + fr.meses_apos_competencia * interval '1 month')::date,
            fr.regra_vencimento, fr.dia_vencimento, fr.sabado_dia_util, fr.ajuste_nao_util
        ),
        x.valor,
        fr.tipo = 'vale_alimentacao' and f.vale_alimentacao_por_fora,
        fr.id
    from funcionarios f
    cross join folha_regras fr
    cross join lateral (
        select case
            when fr.tipo = 'vale_alimentacao' then f.vale_alimentacao
            when fr.percentual is not null    then round(f.salario * fr.percentual / 100, 2)
            else f.salario - coalesce((
                     select sum(round(f.salario * p.percentual / 100, 2))
                       from folha_regras p
                      where p.ativa and p.tipo = 'salario' and p.percentual is not null
                 ), 0)
        end as valor
    ) x
    where fr.ativa
      and (f.data_admissao is null or f.data_admissao <= v_fim_mes)
      and (f.status = 'ativo' or f.data_demissao >= v_mes)
      and x.valor > 0
    on conflict do nothing;
    get diagnostics v_n = row_count;
    v_total := v_total + v_n;

    return v_total;
end;
$$;

-- ============================================================
-- VIEWS
-- ============================================================

-- ------------------------------------------------------------
-- Contas com nomes resolvidos + situacao calculada na hora.
-- situacao: pago | cancelado | vencido | vence_hoje | vence_em_breve (<= 7 dias) | a_vencer
-- ------------------------------------------------------------
create or replace view vw_contas_pagar as
select
    c.id,
    c.descricao,
    c.competencia,
    c.vencimento,
    c.valor,
    c.valor_estimado,
    c.status,
    c.data_pagamento,
    c.valor_pago,
    coalesce(c.valor_pago, c.valor)                          as valor_efetivo,
    c.forma_pagamento,
    c.por_fora,
    c.comprovante_url,
    c.obs,
    c.id_categoria,  cat.nome as categoria,
    g.id             as id_grupo,
    g.nome           as grupo,
    c.id_fornecedor, fo.nome  as fornecedor,
    c.id_funcionario, fu.nome as funcionario,
    c.id_veiculo,    ve.nome  as veiculo,
    c.id_local,      lo.nome  as local,
    c.id_recorrencia,
    c.id_folha_regra,
    c.id_divida,     d.descricao as divida,
    c.parcela,       d.numero_parcelas,
    case
        when c.id_recorrencia is not null then 'recorrencia'
        when c.id_folha_regra is not null then 'folha'
        when c.id_divida      is not null then 'divida'
        else 'avulsa'
    end                                                      as origem,
    case
        when c.status = 'pago'                   then 'pago'
        when c.status = 'cancelado'              then 'cancelado'
        when c.vencimento <  hoje_br()           then 'vencido'
        when c.vencimento =  hoje_br()           then 'vence_hoje'
        when c.vencimento <= hoje_br() + 7       then 'vence_em_breve'
        else 'a_vencer'
    end                                                      as situacao,
    case when c.status = 'pendente'
         then c.vencimento - hoje_br() end                   as dias_para_vencer,
    (c.status = 'pago' and c.data_pagamento > c.vencimento)  as pago_em_atraso,
    c.created_at,
    c.updated_at
from contas_pagar c
join categorias_despesa cat on cat.id = c.id_categoria
join grupos_despesa     g   on g.id   = cat.id_grupo
left join fornecedores  fo  on fo.id  = c.id_fornecedor
left join funcionarios  fu  on fu.id  = c.id_funcionario
left join veiculos      ve  on ve.id  = c.id_veiculo
left join locais        lo  on lo.id  = c.id_local
left join dividas       d   on d.id   = c.id_divida;

-- ------------------------------------------------------------
-- Totais por competencia x grupo x categoria (base dos graficos).
-- Canceladas ficam de fora.
-- ------------------------------------------------------------
create or replace view vw_financeiro_mensal as
select
    c.competencia,
    g.id                                                                  as id_grupo,
    g.nome                                                                as grupo,
    cat.id                                                                as id_categoria,
    cat.nome                                                              as categoria,
    count(*)                                                              as qtd_contas,
    sum(coalesce(c.valor_pago, c.valor))                                  as total,
    coalesce(sum(c.valor_pago) filter (where c.status = 'pago'), 0)       as total_pago,
    coalesce(sum(c.valor)      filter (where c.status = 'pendente'), 0)   as total_pendente,
    coalesce(sum(c.valor)      filter (where c.status = 'pendente'
                                         and c.vencimento < hoje_br()), 0) as total_vencido,
    count(*) filter (where c.status = 'pendente' and c.vencimento < hoje_br()) as qtd_vencidas,
    coalesce(sum(coalesce(c.valor_pago, c.valor)) filter (where c.por_fora), 0) as total_por_fora
from contas_pagar c
join categorias_despesa cat on cat.id = c.id_categoria
join grupos_despesa     g   on g.id   = cat.id_grupo
where c.status <> 'cancelado'
group by c.competencia, g.id, g.nome, cat.id, cat.nome;

-- ------------------------------------------------------------
-- Situacao de cada divida.
-- ------------------------------------------------------------
create or replace view vw_dividas as
select
    d.id,
    d.descricao,
    d.id_categoria,
    d.id_fornecedor, fo.nome as credor,
    d.id_veiculo,    ve.nome as veiculo,
    d.valor_contratado,
    d.valor_parcela,
    d.numero_parcelas,
    d.parcelas_anteriores
      + count(c.id) filter (where c.status = 'pago')                        as parcelas_pagas,
    count(c.id) filter (where c.status = 'pendente')                        as parcelas_restantes,
    coalesce(sum(c.valor_pago) filter (where c.status = 'pago'), 0)         as total_pago_no_sistema,
    coalesce(sum(c.valor)      filter (where c.status = 'pendente'), 0)     as saldo_devedor,
    min(c.vencimento)          filter (where c.status = 'pendente')         as proximo_vencimento,
    count(c.id) filter (where c.status = 'pendente'
                          and c.vencimento < hoje_br())                     as parcelas_vencidas,
    count(c.id) filter (where c.status = 'pendente') = 0                    as quitada
from dividas d
left join contas_pagar c  on c.id_divida = d.id and c.status <> 'cancelado'
left join fornecedores fo on fo.id = d.id_fornecedor
left join veiculos     ve on ve.id = d.id_veiculo
group by d.id, fo.nome, ve.nome;

-- views respeitam o RLS de quem consulta
alter view vw_contas_pagar      set (security_invoker = on);
alter view vw_financeiro_mensal set (security_invoker = on);
alter view vw_dividas           set (security_invoker = on);

-- ============================================================
-- RLS - mesmo modelo do rls_policies.sql: autenticado tem acesso total
-- ============================================================
do $$
declare t text;
begin
    foreach t in array array[
        'feriados','grupos_despesa','categorias_despesa','fornecedores',
        'veiculos','locais','recorrencias','folha_regras','dividas','contas_pagar',
        'horas_extras'
    ] loop
        execute format('alter table %I enable row level security;', t);
        execute format('drop policy if exists "auth full access" on %I;', t);
        execute format(
            'create policy "auth full access" on %I for all to authenticated using (true) with check (true);',
            t
        );
    end loop;
end $$;

-- ============================================================
-- DADOS DE REFERENCIA
-- ============================================================

-- feriados nacionais (lei 662/1949, 6.802/1980, 14.759/2023)
insert into feriados (nome, dia, mes) values
    ('Confraternizacao Universal', 1, 1),
    ('Tiradentes', 21, 4),
    ('Dia do Trabalho', 1, 5),
    ('Independencia do Brasil', 7, 9),
    ('Nossa Senhora Aparecida', 12, 10),
    ('Finados', 2, 11),
    ('Proclamacao da Republica', 15, 11),
    ('Dia Nacional de Zumbi e da Consciencia Negra', 20, 11),
    ('Natal', 25, 12);
insert into feriados (nome, dias_apos_pascoa) values
    ('Sexta-feira Santa', -2);

-- grupos e categorias (espelham as abas/listas da planilha)
insert into grupos_despesa (nome, ordem) values
    ('Pessoal',   10),
    ('Impostos',  20),
    ('Estrutura', 30),
    ('Veiculos',  40),
    ('Servicos',  50),
    ('Outros',    90);

insert into categorias_despesa (id_grupo, nome)
select g.id, c.nome
from (values
    ('Pessoal',   'Salario'),
    ('Pessoal',   'Hora extra'),
    ('Pessoal',   'Vale-alimentacao'),
    ('Pessoal',   '13o salario'),
    ('Pessoal',   'Ferias'),
    ('Pessoal',   'Rescisao'),
    ('Impostos',  'FGTS'),
    ('Impostos',  'INSS'),
    ('Impostos',  'PIS/COFINS'),
    ('Impostos',  'Outros impostos'),
    ('Estrutura', 'Aluguel'),
    ('Estrutura', 'Agua'),
    ('Estrutura', 'Luz'),
    ('Estrutura', 'Internet'),
    ('Estrutura', 'Sistema'),
    ('Veiculos',  'Parcela'),
    ('Veiculos',  'Seguro'),
    ('Veiculos',  'Manutencao'),
    ('Veiculos',  'IPVA e licenciamento'),
    ('Veiculos',  'Combustivel'),
    ('Servicos',  'Contabilidade'),
    ('Servicos',  'Seguranca do trabalho'),
    ('Servicos',  'Outros servicos'),
    ('Outros',    'Diversos')
) as c(grupo, nome)
join grupos_despesa g on g.nome = c.grupo;

-- folha atual: metade no dia 20 (adiantamento da competencia),
-- o restante no 5o dia util do mes seguinte; VA no dia 20.
-- Dia 20 em fim de semana/feriado -> antecipa para o dia util anterior
-- (sabado nao conta). No 5o dia util o sabado conta (regra da CLT).
-- Hora extra: dias 6..20 saem no adiantamento; 21..5 saem no saldo.
insert into folha_regras (nome, tipo, id_categoria, percentual, regra_vencimento,
                          dia_vencimento, meses_apos_competencia, sabado_dia_util,
                          ajuste_nao_util, corte_hora_extra, id_categoria_hora_extra, ordem)
select r.nome, r.tipo::folha_regra_tipo, cat.id, r.percentual, r.regra::regra_vencimento,
       r.dia, r.meses, r.sabado, 'antecipar', r.corte,
       case when r.corte is not null then he.id end, r.ordem
from (values
    ('Adiantamento',     'salario',          50.00, 'dia_fixo', 20, 0, false, 20,   10, 'Salario'),
    ('Saldo do salario', 'salario',          null,  'dia_util',  5, 1, true,  5,    20, 'Salario'),
    ('Vale-alimentacao', 'vale_alimentacao', null,  'dia_fixo', 20, 0, false, null, 30, 'Vale-alimentacao')
) as r(nome, tipo, percentual, regra, dia, meses, sabado, corte, ordem, categoria)
join categorias_despesa cat on cat.nome = r.categoria
join categorias_despesa he  on he.nome  = 'Hora extra';

commit;

-- ============================================================
-- OPCIONAL - geracao automatica mensal com pg_cron
-- (Dashboard -> Database -> Extensions -> habilitar pg_cron)
-- Todo dia 1, gera as contas do mes corrente e do seguinte, para os
-- alertas de vencimento aparecerem com antecedencia. O app tambem pode
-- chamar gerar_contas_competencia() via RPC: e idempotente.
-- ============================================================
-- select cron.schedule(
--     'alumaxi-gerar-contas',
--     '0 9 1 * *',   -- 09:00 UTC = 06:00 em Brasilia
--     $$
--         select gerar_contas_competencia(date_trunc('month', now())::date);
--         select gerar_contas_competencia((date_trunc('month', now()) + interval '1 month')::date);
--     $$
-- );
