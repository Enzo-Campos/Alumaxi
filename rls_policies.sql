-- ============================================================
-- Alumaxi - RLS policies (PostgreSQL / Supabase)
-- Modelo atual: qualquer usuario AUTENTICADO tem acesso total.
-- (quando existir papel admin/operacional, trocar por policies por role)
-- ============================================================

-- 1) Habilita RLS (idempotente - se ja estiver ligado, nao faz nada)
do $$
declare t text;
begin
    foreach t in array array[
        'clientes','funcionarios','epis','entregas_epi','ferramentas',
        'etapas','obras','obra_etapas','materiais','falta_materiais',
        'saidas_financeiras'
    ] loop
        execute format('alter table %I enable row level security;', t);
    end loop;
end $$;

-- 2) Policy unica por tabela: acesso total para "authenticated"
do $$
declare t text;
begin
    foreach t in array array[
        'clientes','funcionarios','epis','entregas_epi','ferramentas',
        'etapas','obras','obra_etapas','materiais','falta_materiais',
        'saidas_financeiras'
    ] loop
        execute format('drop policy if exists "auth full access" on %I;', t);
        execute format(
            'create policy "auth full access" on %I for all to authenticated using (true) with check (true);',
            t
        );
    end loop;
end $$;

-- 3) Views: rodar com a permissao de quem consulta (respeita RLS das tabelas base)
alter view vw_obras_financeiro set (security_invoker = on);
alter view vw_painel_compras   set (security_invoker = on);
