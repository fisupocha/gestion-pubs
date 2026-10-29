-- Preparado, NO aplicado. Revisar identidad y respaldo antes de ejecutarlo.
-- Convierte exclusivamente el estado, sin tocar importes, conceptos o notas.
begin;
lock table public.punteo_movimientos in share row exclusive mode;

-- Se conserva la definición instalada y sus permisos. Ante una función distinta,
-- abortar en lugar de sustituirla por una versión antigua del repositorio.
do $$
declare
  definicion text;
begin
  definicion := pg_get_functiondef('public.punteo_cambiar_estado(bigint,text,text,text,text)'::regprocedure);
  if position('p_estado not in (''pendiente'', ''comprobar'', ''ok'')' in definicion) = 0 then
    raise exception 'Revisar la función instalada: no coincide la validación esperada';
  end if;
  definicion := replace(definicion,
    'p_estado not in (''pendiente'', ''comprobar'', ''ok'')',
    'p_estado is null or p_estado not in (''pendiente'', ''ok'')');
  definicion := replace(definicion,
    'El estado tiene que ser pendiente, comprobar u ok',
    'El estado tiene que ser pendiente u ok');
  execute definicion;
end;
$$;

-- Los triggers existentes mantienen la auditoría y protegen los datos originales.
select set_config('punteo.accion', 'decision-usuario', true);
select set_config('punteo.origen', 'usuario', true);
select set_config('punteo.proceso', 'retirada-estado-comprobar', true);
select set_config('punteo.motivo', 'Retirada de Comprobar por instrucción del usuario: pasa a Pendiente', true);
update public.punteo_movimientos
set estado = 'pendiente', estado_actualizado_en = now()
where estado = 'comprobar';

-- La restricción anterior puede permanecer: esta es más estricta.
alter table public.punteo_movimientos
  add constraint punteo_movimientos_solo_dos_estados
  check (estado in ('pendiente', 'ok'));
commit;

-- Reversión: conservar previamente la definición REAL de punteo_cambiar_estado.
-- En una transacción, retirar solo punteo_movimientos_solo_dos_estados y restaurar
-- esa definición. No restaurar estados antiguos automáticamente: podrían existir
-- decisiones posteriores. El historial conserva qué filas cambiaron y sus valores.
