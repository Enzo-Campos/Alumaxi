-- ============================================================
-- Alumaxi - funcionarios: documentos, contato e vale-alimentacao
--
-- Documentos e telefone sao guardados SO COM DIGITOS (a mascara e papel
-- do front). Assim a busca, a unicidade e a validacao ficam simples e
-- nao dependem de como o dado foi digitado.
--
--   cpf       11 digitos, com digitos verificadores validados no banco
--   rg        texto livre curto (formato varia por estado/orgao emissor)
--   telefone  DDD + numero: 10 (fixo) ou 11 (celular) digitos
--
-- vale_alimentacao / vale_alimentacao_por_fora alimentam a geracao
-- automatica da folha (ver migration do financeiro).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Valida CPF (formato + digitos verificadores).
-- immutable: pode ser usada em check constraint e indice.
-- ------------------------------------------------------------
create or replace function cpf_valido(p_cpf text)
returns boolean
language plpgsql
immutable
as $$
declare
    d     int[];
    soma  int;
    resto int;
begin
    if p_cpf is null or p_cpf !~ '^\d{11}$' then
        return false;
    end if;

    -- 000.000.000-00, 111.111.111-11... passam no calculo mas sao invalidos
    if p_cpf ~ '^(\d)\1{10}$' then
        return false;
    end if;

    select array_agg(substr(p_cpf, i, 1)::int order by i)
      into d
      from generate_series(1, 11) as i;

    -- 1o digito verificador
    soma := 0;
    for i in 1..9 loop
        soma := soma + d[i] * (11 - i);
    end loop;
    resto := (soma * 10) % 11;
    if resto = 10 then resto := 0; end if;
    if resto <> d[10] then
        return false;
    end if;

    -- 2o digito verificador
    soma := 0;
    for i in 1..10 loop
        soma := soma + d[i] * (12 - i);
    end loop;
    resto := (soma * 10) % 11;
    if resto = 10 then resto := 0; end if;
    return resto = d[11];
end;
$$;

alter table funcionarios
    add column if not exists cpf                       varchar(11),
    add column if not exists rg                        varchar(20),
    add column if not exists telefone                  varchar(11),
    add column if not exists vale_alimentacao          numeric(12,2) not null default 0,
    add column if not exists vale_alimentacao_por_fora boolean       not null default false;

alter table funcionarios
    add constraint chk_funcionarios_cpf
        check (cpf is null or cpf_valido(cpf)),
    add constraint chk_funcionarios_rg
        check (rg is null or rg ~ '^[0-9A-Za-z]{4,20}$'),
    add constraint chk_funcionarios_telefone
        check (telefone is null or telefone ~ '^\d{10,11}$'),
    add constraint chk_funcionarios_vale_alimentacao
        check (vale_alimentacao >= 0),
    add constraint chk_funcionarios_salario
        check (salario is null or salario >= 0);

-- um CPF por pessoa (quem ainda nao tem CPF cadastrado nao conflita)
create unique index if not exists uq_funcionarios_cpf
    on funcionarios (cpf)
    where cpf is not null;

comment on column funcionarios.cpf is 'Somente digitos (11). Validado por cpf_valido().';
comment on column funcionarios.rg is 'Somente letras/digitos, sem pontuacao.';
comment on column funcionarios.telefone is 'Somente digitos: DDD + numero (10 ou 11).';
comment on column funcionarios.salario is 'Salario mensal cheio. A folha gera as parcelas (adiantamento/saldo) a partir dele.';
comment on column funcionarios.vale_alimentacao is 'Valor mensal do VA. 0 = nao recebe.';
comment on column funcionarios.vale_alimentacao_por_fora is 'VA pago fora da folha oficial.';

commit;
