-- ============================================================
-- Alumaxi - patch: so `a_comprar` bloqueia a etapa
--
-- Antes, o trigger considerava `a_comprar` E `comprado` como pendencia,
-- mantendo a etapa `pausada` ate a entrega. Agora, assim que a ultima
-- solicitacao vira `comprado` (ou e entregue/cancelada/excluida), a etapa
-- volta para `em_andamento`. `comprado` fica so nas listas, sem travar.
--
-- Rode este bloco uma vez no SQL Editor do Supabase.
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
      and status = 'a_comprar';        -- <- so 'a_comprar' bloqueia

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
