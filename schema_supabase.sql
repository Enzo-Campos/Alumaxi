-- ============================================================
-- Alumaxi - Migration inicial (PostgreSQL / Supabase)
-- Padrao: nomes minusculos, ASCII, snake_case, tabelas no plural
-- Dinheiro: numeric(12,2)  |  Percentual: numeric(5,2)
-- Timestamps: timestamptz
--
-- Este arquivo e a BASE inicial. Toda alteracao posterior fica em
-- supabase/migrations/ (ordem pelo timestamp do nome do arquivo).
-- ============================================================

-- ------------------------------------------------------------
-- TEARDOWN opcional - descomente para re-rodar do zero
-- (util se uma execucao anterior aplicou so uma parte)
-- ------------------------------------------------------------
-- drop table if exists saidas_financeiras, falta_materiais, materiais,
--     obra_etapas, obras, etapas, ferramentas, entregas_epi, epis,
--     funcionarios, clientes cascade;
-- drop type if exists funcionario_status, ferramenta_status, obra_status,
--     obra_etapa_status, material_unidade, falta_material_status,
--     saida_categoria cascade;
-- drop function if exists set_updated_at, falta_materiais_sync_etapa cascade;

-- ------------------------------------------------------------
-- Funcao generica para manter updated_at
-- ------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- ------------------------------------------------------------
-- Tipos enumerados
-- (para adicionar valor depois: alter type <nome> add value 'novo';)
-- ------------------------------------------------------------
create type funcionario_status          as enum ('ativo', 'desligado');
create type ferramenta_status           as enum ('disponivel', 'em_uso', 'manutencao');
create type obra_status                 as enum ('planejamento', 'em_andamento', 'pausada', 'finalizada', 'cancelada');
create type obra_etapa_status           as enum ('pendente', 'em_andamento', 'concluida', 'pausada');
create type material_unidade            as enum ('un', 'm', 'm2', 'barra', 'kg', 'par', 'conjunto');
create type falta_material_status       as enum ('a_comprar', 'comprado', 'entregue', 'cancelado');
create type saida_categoria             as enum ('compra_material', 'retirada_lucro');

-- ------------------------------------------------------------
-- CLIENTES
-- ------------------------------------------------------------
create table clientes (
    id         bigint generated always as identity primary key,
    nome       varchar(150) not null,
    documento  varchar(20),               -- CPF ou CNPJ
    telefone   varchar(20),
    email      varchar(150),
    endereco   varchar(255),
    obs        text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
create trigger trg_clientes_updated_at
    before update on clientes
    for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- FUNCIONARIOS
-- ------------------------------------------------------------
create table funcionarios (
    id            bigint generated always as identity primary key,
    nome          varchar(150) not null,
    link_doc      varchar(500),
    salario       numeric(12,2),
    data_admissao date,
    cargo         varchar(100),
    status        funcionario_status not null default 'ativo',
    data_demissao date,
    obs           text,
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);
create trigger trg_funcionarios_updated_at
    before update on funcionarios
    for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- EPIS (catalogo)
-- ------------------------------------------------------------
create table epis (
    id          bigint generated always as identity primary key,
    nome        varchar(150) not null,
    imagem_url  varchar(500),
    ca          varchar(50),        -- numero do Certificado de Aprovacao (NR-6)
    validade_ca date,
    ativo       boolean not null default true,
    created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ENTREGAS DE EPI (era "uso_epis")
-- ------------------------------------------------------------
create table entregas_epi (
    id              bigint generated always as identity primary key,
    id_funcionario  bigint not null references funcionarios(id) on delete restrict,
    id_epi          bigint not null references epis(id)         on delete restrict,
    quantidade      integer not null default 1,
    data_entrega    date not null,
    data_vencimento date,              -- vida util do EPI entregue
    data_devolucao  date,
    created_at      timestamptz not null default now()
);
create index idx_entregaepi_func on entregas_epi (id_funcionario);

-- ------------------------------------------------------------
-- FERRAMENTAS
-- ------------------------------------------------------------
create table ferramentas (
    id             bigint generated always as identity primary key,
    nome           varchar(150) not null,
    id_responsavel bigint references funcionarios(id) on delete set null,
    localizacao    varchar(150),
    status         ferramenta_status not null default 'disponivel',
    created_at     timestamptz not null default now(),
    updated_at     timestamptz not null default now()
);
create trigger trg_ferramentas_updated_at
    before update on ferramentas
    for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- ETAPAS (catalogo global - absorve a antiga tabela "Andamento")
-- ------------------------------------------------------------
create table etapas (
    id    bigint generated always as identity primary key,
    nome  varchar(100) not null,
    ordem integer not null default 0,      -- sequencia padrao no cronograma
    ativa boolean not null default true
);

-- Seed sugerido (ajuste a ordem conforme o fluxo real):
-- insert into etapas (nome, ordem) values
--  ('Contra marco dos tipos', 10), ('Corte do aluminio', 20), ('Usinagem', 30),
--  ('Montagem', 40), ('Instalacao de vidros', 50), ('Furacao de sacada', 60),
--  ('Instalacao de castilhos', 70), ('Lazer', 80), ('Corrimao', 90),
--  ('Terreo', 100), ('Portao', 110);

-- ------------------------------------------------------------
-- OBRAS
-- ------------------------------------------------------------
create table obras (
    id                    bigint generated always as identity primary key,
    id_cliente            bigint references clientes(id) on delete set null,
    nome                  varchar(150) not null,
    descricao             text,
    status                obra_status not null default 'planejamento',
    orcamento_material    numeric(12,2) not null default 0,   -- valor de material da obra (editavel)
    percentual_receita    numeric(5,2)  not null default 0,   -- % que o dono cobra sobre o material (ex.: 50.00)
    data_inicio           date,
    data_prevista_termino date,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);
create trigger trg_obras_updated_at
    before update on obras
    for each row execute function set_updated_at();

-- ------------------------------------------------------------
-- OBRA_ETAPAS (andamento de cada etapa em cada obra)
-- ------------------------------------------------------------
create table obra_etapas (
    id_obra        bigint not null references obras(id)  on delete cascade,
    id_etapa       bigint not null references etapas(id) on delete restrict,
    status         obra_etapa_status not null default 'pendente',
    data_inicio    timestamptz,   -- capturada ao iniciar
    data_conclusao timestamptz,   -- capturada ao concluir
    data_prevista  timestamptz,
    primary key (id_obra, id_etapa)
);

-- ------------------------------------------------------------
-- MATERIAIS (catalogo)
-- ------------------------------------------------------------
create table materiais (
    id         bigint generated always as identity primary key,
    nome       varchar(150) not null,
    unidade    material_unidade not null default 'un',
    imagem_url text,
    ativo      boolean not null default true,
    created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- FALTA_MATERIAIS (solicitacoes de compra -> alimenta o painel)
-- ------------------------------------------------------------
create table falta_materiais (
    id               bigint generated always as identity primary key,
    id_obra          bigint not null,
    id_etapa         bigint not null,
    id_material      bigint not null references materiais(id) on delete restrict,
    quantidade       numeric(10,2) not null,
    especificacoes   text,
    data_solicitacao timestamptz not null default now(),
    prazo_entrega    date,
    status           falta_material_status not null default 'a_comprar',
    observacoes      text,
    constraint fk_falta_obra_etapa foreign key (id_obra, id_etapa) references obra_etapas (id_obra, id_etapa) on delete cascade
);
create index idx_falta_painel     on falta_materiais (status, prazo_entrega);
create index idx_falta_obraetapa  on falta_materiais (id_obra, id_etapa);

-- ------------------------------------------------------------
-- SAIDAS_FINANCEIRAS (era "Saída receita")
-- TODAS as saidas debitam do valor a receber da obra.
-- compra_material e custo da obra: o cliente NAO ressarce.
-- ------------------------------------------------------------
create table saidas_financeiras (
    id             bigint generated always as identity primary key,
    id_obra        bigint not null references obras(id) on delete cascade,
    valor_retirado numeric(12,2) not null,
    categoria      saida_categoria not null,
    descricao      varchar(255),
    created_at     timestamptz not null default now()
);
create index idx_saida_obra on saidas_financeiras (id_obra);

-- ============================================================
-- VIEW FINANCEIRA DA OBRA  (a mais importante do sistema)
--
-- valor_a_receber_total = orcamento_material * percentual_receita / 100
--   -> quanto a obra gera de receita para o dono (recalcula sozinho
--      quando o orcamento_material e editado)
--
-- TODAS as saidas debitam desse total:
--   - compra_material : custo da obra, o cliente nao ressarce
--   - retirada_lucro  : dono sacando o lucro
--
-- saldo_a_receber = valor_a_receber_total - total_saidas
--   -> POSITIVO: ainda ha isso a receber da obra
--   -> NEGATIVO: obra no prejuizo
-- em_prejuizo = true quando saldo_a_receber < 0
-- ============================================================
create or replace view vw_obras_financeiro as
select
    o.id,
    o.nome,
    o.status,
    o.orcamento_material,
    o.percentual_receita,
    round(o.orcamento_material * o.percentual_receita / 100, 2) as valor_a_receber_total,
    coalesce(s.total_compra_material, 0) as total_compra_material,
    coalesce(s.total_retirada_lucro, 0) as total_retirada_lucro,
    coalesce(s.total_saidas, 0) as total_saidas,
    round(o.orcamento_material * o.percentual_receita / 100 - coalesce(s.total_saidas, 0), 2) as saldo_a_receber,
    (o.orcamento_material * o.percentual_receita / 100 - coalesce(s.total_saidas, 0)) < 0 as em_prejuizo
from obras o
left join (
    select
        id_obra,
        sum(valor_retirado)                                                       as total_saidas,
        sum(valor_retirado) filter (where categoria = 'compra_material')          as total_compra_material,
        sum(valor_retirado) filter (where categoria = 'retirada_lucro')           as total_retirada_lucro
    from saidas_financeiras
    group by id_obra
) s on s.id_obra = o.id;

-- ============================================================
-- PAINEL "PRECISA COMPRAR MATERIAL"
-- ============================================================
create or replace view vw_painel_compras as
select
    fm.id,
    o.nome                              as obra,
    e.nome                              as etapa,
    m.nome                              as material,
    fm.quantidade,
    m.unidade,
    fm.especificacoes,
    fm.data_solicitacao,
    fm.prazo_entrega,
    (current_date - fm.prazo_entrega)   as dias_de_atraso,   -- > 0 = prazo estourado
    fm.status,
    fm.observacoes
from falta_materiais fm
join obras     o on o.id = fm.id_obra
join etapas    e on e.id = fm.id_etapa
join materiais m on m.id = fm.id_material
where fm.status in ('a_comprar', 'comprado')
order by fm.prazo_entrega asc nulls last, fm.data_solicitacao asc;

-- ============================================================
-- AUTOMACAO: etapa entra em "pausada" quando ha falta de material
-- e volta para "em_andamento" quando todas as pendencias sao resolvidas.
-- (a etapa "concluida" nunca e alterada)
-- Um unico trigger cobre insert / update / delete.
-- ============================================================
create or replace function falta_materiais_sync_etapa()
returns trigger
language plpgsql
as $$
declare
    v_obra      bigint := coalesce(new.id_obra,  old.id_obra);
    v_etapa     bigint := coalesce(new.id_etapa, old.id_etapa);
    v_pendentes integer;
begin
    select count(*) into v_pendentes
    from falta_materiais
    where id_obra = v_obra
      and id_etapa = v_etapa
      and status = 'a_comprar';   -- so 'a_comprar' bloqueia; 'comprado' ja libera a etapa

    if v_pendentes > 0 then
        update obra_etapas
           set status = 'pausada'
         where id_obra = v_obra
           and id_etapa = v_etapa
           and status <> 'concluida';
    else
        update obra_etapas
           set status = 'em_andamento'
         where id_obra = v_obra
           and id_etapa = v_etapa
           and status = 'pausada';
    end if;

    return null;
end;
$$;

create trigger trg_falta_materiais_sync
    after insert or update or delete on falta_materiais
    for each row execute function falta_materiais_sync_etapa();

-- ============================================================
-- RLS (Supabase)
-- RLS ja fica ativado automaticamente nas tabelas novas neste projeto.
-- Sem policy, a tabela fica bloqueada para anon/authenticated (so a
-- service role passa). Crie as policies conforme sua autenticacao.
-- Exemplo minimo - libera tudo para usuarios logados:
-- ============================================================
-- do $$
-- declare t text;
-- begin
--   foreach t in array array[
--     'clientes','funcionarios','epis','entregas_epi','ferramentas',
--     'etapas','obras','obra_etapas','materiais','falta_materiais',
--     'saidas_financeiras'
--   ] loop
--     execute format(
--       'create policy "auth full access" on %I for all to authenticated using (true) with check (true);', t
--     );
--   end loop;
-- end $$;
