-- ============================================================
-- Alumaxi - Financeiro: contas variaveis sao lancadas a mao
--
-- Antes: luz, agua e impostos eram gerados com um valor "estimado" que
-- sempre precisava ser corrigido. Agora:
--
--   recorrencias.valor preenchido -> conta FIXA, gerada automaticamente
--   recorrencias.valor null       -> conta VARIAVEL, nada e gerado; ela
--                                    aparece em vw_contas_a_lancar ate o
--                                    valor real ser lancado (com
--                                    id_recorrencia + competencia)
--
-- O conceito de "valor estimado" sai do banco.
-- Contas estimadas ainda pendentes sao removidas (voltam como "a lancar").
--
-- Depende de: 20260926120100_financeiro_contas_a_pagar.sql
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1) Recorrencia variavel = sem valor
-- ------------------------------------------------------------
alter table recorrencias alter column valor drop not null;
alter table recorrencias drop constraint chk_recorrencias_valor;
alter table recorrencias add constraint chk_recorrencias_valor check (valor is null or valor > 0);

update recorrencias set valor = null where valor_estimado;

comment on column recorrencias.valor is
    'Preenchido = conta fixa (gerada todo mes). Null = conta variavel (lancada a mao, listada em vw_contas_a_lancar).';

-- ------------------------------------------------------------
-- 2) Estimativas pendentes saem (o trigger de protecao e desligado so
--    nesta limpeza). Pagas ja tem valor real e ficam.
-- ------------------------------------------------------------
alter table contas_pagar disable trigger trg_contas_pagar_bloqueia_exclusao;
delete from contas_pagar where valor_estimado and status = 'pendente';
alter table contas_pagar enable trigger trg_contas_pagar_bloqueia_exclusao;

-- ------------------------------------------------------------
-- 3) Remove "valor_estimado" (views e funcoes que o usam primeiro)
-- ------------------------------------------------------------
drop view vw_contas_pagar;

create or replace function contas_pagar_normaliza_pagamento()
returns trigger
language plpgsql
as $$
begin
    if new.status = 'pago' then
        new.data_pagamento := coalesce(new.data_pagamento, hoje_br());
        new.valor_pago     := coalesce(new.valor_pago, new.valor);
    else
        new.data_pagamento := null;
        new.valor_pago     := null;
    end if;
    return new;
end;
$$;

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
    -- 1) contas fixas (recorrencias variaveis, sem valor, nao geram nada)
    insert into contas_pagar (
        descricao, id_categoria, id_fornecedor, id_funcionario, id_veiculo, id_local,
        competencia, vencimento, valor, forma_pagamento, por_fora, id_recorrencia
    )
    select
        r.descricao, r.id_categoria, r.id_fornecedor, r.id_funcionario, r.id_veiculo, r.id_local,
        v_mes,
        calcular_vencimento(
            (v_mes + r.meses_apos_competencia * interval '1 month')::date,
            r.regra_vencimento, r.dia_vencimento, r.sabado_dia_util, r.ajuste_nao_util
        ),
        r.valor, r.forma_pagamento, r.por_fora, r.id
    from recorrencias r
    where r.ativa
      and r.valor is not null
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

alter table recorrencias drop column valor_estimado;
alter table contas_pagar drop column valor_estimado;

-- ------------------------------------------------------------
-- 4) Exclusao: so e bloqueada para o que a geracao recriaria
--    (folha e recorrencia FIXA). Conta variavel lancada a mao pode
--    ser excluida - ela volta para "a lancar".
-- ------------------------------------------------------------
create or replace function contas_pagar_bloqueia_exclusao()
returns trigger
language plpgsql
as $$
begin
    if old.id_folha_regra is not null
       or exists (select 1 from recorrencias r
                   where r.id = old.id_recorrencia and r.valor is not null) then
        raise exception 'Conta gerada automaticamente (id %): cancele em vez de excluir.', old.id;
    end if;
    return old;
end;
$$;

-- ------------------------------------------------------------
-- 5) Views
-- ------------------------------------------------------------
create view vw_contas_pagar as
select
    c.id,
    c.descricao,
    c.competencia,
    c.vencimento,
    c.valor,
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
-- Contas variaveis que ainda nao foram lancadas, da competencia
-- inicial ate o mes seguinte ao atual. Some da lista quando existir
-- uma conta (de qualquer status) com id_recorrencia + competencia.
-- ultimo_valor e so referencia para quem vai lancar.
-- ------------------------------------------------------------
create view vw_contas_a_lancar as
select
    r.id                                   as id_recorrencia,
    r.descricao,
    m.competencia,
    x.vencimento_previsto,
    case
        when x.vencimento_previsto <  hoje_br()     then 'vencido'
        when x.vencimento_previsto =  hoje_br()     then 'vence_hoje'
        when x.vencimento_previsto <= hoje_br() + 7 then 'vence_em_breve'
        else 'a_vencer'
    end                                    as situacao,
    x.vencimento_previsto - hoje_br()      as dias_para_vencer,
    r.id_categoria,  cat.nome as categoria,
    g.id             as id_grupo,
    g.nome           as grupo,
    r.id_fornecedor, fo.nome  as fornecedor,
    r.id_veiculo,    ve.nome  as veiculo,
    r.id_local,      lo.nome  as local,
    ult.valor                              as ultimo_valor,
    ult.competencia                        as ultima_competencia
from recorrencias r
cross join lateral generate_series(
    r.competencia_inicio,
    date_trunc('month', hoje_br()) + interval '1 month',
    make_interval(months => r.intervalo_meses)
) as s(mes)
cross join lateral (select s.mes::date as competencia) m
cross join lateral (
    select calcular_vencimento(
               (m.competencia + r.meses_apos_competencia * interval '1 month')::date,
               r.regra_vencimento, r.dia_vencimento, r.sabado_dia_util, r.ajuste_nao_util
           ) as vencimento_previsto
) x
join categorias_despesa cat on cat.id = r.id_categoria
join grupos_despesa     g   on g.id   = cat.id_grupo
left join fornecedores  fo  on fo.id  = r.id_fornecedor
left join veiculos      ve  on ve.id  = r.id_veiculo
left join locais        lo  on lo.id  = r.id_local
left join lateral (
    select coalesce(c.valor_pago, c.valor) as valor, c.competencia
      from contas_pagar c
     where c.id_recorrencia = r.id and c.status <> 'cancelado'
     order by c.competencia desc
     limit 1
) ult on true
where r.ativa
  and r.valor is null
  and (r.competencia_fim is null or m.competencia <= r.competencia_fim)
  and not exists (
      select 1 from contas_pagar c
       where c.id_recorrencia = r.id
         and c.competencia    = m.competencia
  );

alter view vw_contas_pagar    set (security_invoker = on);
alter view vw_contas_a_lancar set (security_invoker = on);

commit;
