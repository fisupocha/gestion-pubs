-- NO EJECUTAR en esta tarea.
-- Añade el local, la consulta paginada y el guardado protegido.
-- No reescribe los movimientos ya guardados: la columna nace en NULL.
-- No toca las tablas operativas, Pocha, anclas, importaciones ni saldos.

alter table public.punteo_movimientos
  add column if not exists local text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'punteo_movimientos_local_check'
      and conrelid = 'public.punteo_movimientos'::regclass
  ) then
    alter table public.punteo_movimientos
      add constraint punteo_movimientos_local_check
      check (local is null or local in ('Tarantino', 'Hangar', 'Cue', 'Riverocio', 'Fisu'));
  end if;
end $$;

comment on column public.punteo_movimientos.local is
  'Local asignado a mano. NULL es Sin asignar. No cambia el estado de revisión.';

create index if not exists punteo_movimientos_local_orden_idx
  on public.punteo_movimientos (banco, local, orden_banco desc, id desc)
  where vigente
    and clase in ('normal', 'credito-cuota', 'pendiente-clasificacion');

create or replace function punteo_interno.texto_importe(p_centimos bigint)
returns text
language plpgsql
immutable
as $$
declare
  v_signo text := case when p_centimos < 0 then '-' else '' end;
  v_euros text := (abs(p_centimos) / 100)::text;
  v_resto text := lpad((abs(p_centimos) % 100)::text, 2, '0');
  v_agrupado text := '';
begin
  while length(v_euros) > 3 loop
    v_agrupado := '.' || right(v_euros, 3) || v_agrupado;
    v_euros := left(v_euros, length(v_euros) - 3);
  end loop;

  v_agrupado := v_euros || v_agrupado;

  return v_signo || v_agrupado || ',' || v_resto
    || ' ' || v_signo || (abs(p_centimos) / 100)::text || ',' || v_resto
    || ' ' || v_signo || (abs(p_centimos) / 100)::text || '.' || v_resto
    || ' ' || p_centimos::text;
end;
$$;

create or replace function punteo_interno.texto_busqueda(
  p_fecha date,
  p_fecha_valor date,
  p_importe bigint,
  p_saldo bigint,
  p_concepto text,
  p_concepto_original text,
  p_concepto_normalizado text,
  p_detalles text,
  p_observaciones text,
  p_local text,
  p_estado text,
  p_clase text,
  p_motivo text,
  p_origen text,
  p_referencias text[],
  p_orden bigint,
  p_fila integer
)
returns text
language sql
immutable
as $$
  select lower(concat_ws(' ',
    p_fecha::text,
    to_char(p_fecha, 'DD/MM/YYYY'),
    p_fecha_valor::text,
    to_char(p_fecha_valor, 'DD/MM/YYYY'),
    punteo_interno.texto_importe(p_importe),
    punteo_interno.texto_importe(p_saldo),
    p_concepto,
    p_concepto_original,
    p_concepto_normalizado,
    p_detalles,
    p_observaciones,
    coalesce(p_local, 'Sin asignar'),
    p_estado,
    case p_estado
      when 'pendiente' then 'Pendiente'
      when 'comprobar' then 'Comprobar'
      when 'ok' then 'OK'
      else p_estado
    end,
    p_clase,
    case p_clase
      when 'tpv-ingreso' then 'ingreso'
      when 'tpv-comision' then 'comision comisión'
      when 'tpv-devolucion' then 'devolucion devolución'
      when 'tpv-mantenimiento' then 'mantenimiento'
      else replace(p_clase, '-', ' ')
    end,
    p_motivo,
    p_origen,
    array_to_string(p_referencias, ' '),
    p_orden::text,
    p_fila::text
  ));
$$;

create or replace function punteo_interno.historial_aplicar()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if tg_table_name = 'punteo_movimientos' then
    if tg_op = 'INSERT' then
      perform punteo_interno.historial_insertar(
        'movimiento', new.id, new.importacion_id, null, 'alta', null,
        'estado=' || new.estado || '; orden=' || new.orden_banco || '; saldo_centimos=' || new.saldo_centimos
      );
    else
      if new.estado is distinct from old.estado then
        perform punteo_interno.historial_insertar('movimiento', new.id, new.importacion_id, null, 'estado', old.estado, new.estado);
      end if;
      if new.motivo_estado is distinct from old.motivo_estado then
        perform punteo_interno.historial_insertar('movimiento', new.id, new.importacion_id, null, 'motivo_estado', old.motivo_estado, new.motivo_estado);
      end if;
      if new.observaciones is distinct from old.observaciones then
        perform punteo_interno.historial_insertar('movimiento', new.id, new.importacion_id, null, 'observaciones', old.observaciones, new.observaciones);
      end if;
      if new.local is distinct from old.local then
        perform punteo_interno.historial_insertar('movimiento', new.id, new.importacion_id, null, 'local', old.local, new.local);
      end if;
      if new.clase is distinct from old.clase then
        perform punteo_interno.historial_insertar('movimiento', new.id, new.importacion_id, null, 'clase', old.clase, new.clase);
      end if;
      if new.decision_protegida is distinct from old.decision_protegida then
        perform punteo_interno.historial_insertar('movimiento', new.id, new.importacion_id, null, 'decision_protegida', old.decision_protegida::text, new.decision_protegida::text);
      end if;
      if new.origen_estado is distinct from old.origen_estado then
        perform punteo_interno.historial_insertar('movimiento', new.id, new.importacion_id, null, 'origen_estado', old.origen_estado, new.origen_estado);
      end if;
      if new.vigente is distinct from old.vigente then
        perform punteo_interno.historial_insertar('movimiento', new.id, new.importacion_id, null, 'vigente', old.vigente::text, new.vigente::text);
      end if;
      if new.orden_banco is distinct from old.orden_banco then
        perform punteo_interno.historial_insertar('movimiento', new.id, new.importacion_id, null, 'orden_banco', old.orden_banco::text, new.orden_banco::text);
      end if;
    end if;
  elsif tg_table_name = 'punteo_importaciones' then
    if tg_op = 'INSERT' then
      perform punteo_interno.historial_insertar(
        'importacion', null, new.id, null, 'alta', null,
        'tipo=' || new.tipo || '; estado=' || new.estado || '; huella=' || new.huella_sha256
          || '; archivo=' || coalesce(new.huella_archivo, '')
      );
    elsif new.estado is distinct from old.estado then
      perform punteo_interno.historial_insertar('importacion', null, new.id, null, 'estado', old.estado, new.estado);
    end if;
  elsif tg_table_name = 'punteo_huecos' then
    if tg_op = 'INSERT' then
      perform punteo_interno.historial_insertar(
        'hueco', null, null, new.id, 'alta', null,
        new.banco || ' ' || new.desde::text || ' ' || new.hasta::text
      );
    elsif new.vigente is distinct from old.vigente then
      perform punteo_interno.historial_insertar('hueco', null, null, new.id, 'vigente', old.vigente::text, new.vigente::text);
    end if;
  elsif tg_table_name = 'punteo_anclas' and tg_op = 'UPDATE' then
    if new.movimiento_ancla_id is distinct from old.movimiento_ancla_id then
      perform punteo_interno.historial_insertar('ancla', new.movimiento_ancla_id, null, null, 'movimiento_ancla_id', old.movimiento_ancla_id::text, new.movimiento_ancla_id::text);
    end if;
    if new.movimiento_ultimo_id is distinct from old.movimiento_ultimo_id then
      perform punteo_interno.historial_insertar('ancla', new.movimiento_ultimo_id, null, null, 'movimiento_ultimo_id', old.movimiento_ultimo_id::text, new.movimiento_ultimo_id::text);
    end if;
  end if;

  return null;
end;
$$;

create or replace function punteo_interno.escritura_controlar()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_accion text := punteo_interno.accion_actual();
begin
  if tg_table_name = 'punteo_movimientos' then
    if tg_op = 'INSERT' then
      if v_accion not in ('importacion', 'carga-historica') then
        raise exception 'Alta de movimiento no autorizada';
      end if;
      if new.estado <> 'pendiente' or new.decision_protegida then
        raise exception 'Un movimiento nuevo entra en pendiente y sin decisión protegida';
      end if;
      if new.local is not null then
        raise exception 'Un movimiento nuevo entra sin local asignado';
      end if;
      return new;
    end if;

    if new.banco is distinct from old.banco
      or new.fecha_operacion is distinct from old.fecha_operacion
      or new.fecha_valor is distinct from old.fecha_valor
      or new.importe_centimos is distinct from old.importe_centimos
      or new.saldo_anterior_centimos is distinct from old.saldo_anterior_centimos
      or new.saldo_centimos is distinct from old.saldo_centimos
      or new.concepto is distinct from old.concepto
      or new.concepto_original is distinct from old.concepto_original
      or new.detalles_originales is distinct from old.detalles_originales
      or new.concepto_normalizado is distinct from old.concepto_normalizado
      or new.referencias is distinct from old.referencias
      or new.fila_excel is distinct from old.fila_excel
      or new.posicion_archivo is distinct from old.posicion_archivo
      or new.orden_extracto is distinct from old.orden_extracto
      or new.importacion_id is distinct from old.importacion_id
      or new.regla_codigo is distinct from old.regla_codigo
      or new.incidencia_firma is distinct from old.incidencia_firma
    then
      raise exception 'Los datos bancarios originales no se modifican';
    end if;

    if old.decision_protegida and v_accion in ('importacion', 'carga-historica', 'revision-automatica', 'revision-ia') then
      raise exception 'La decisión del usuario está protegida. Una revisión no puede cambiarla.';
    end if;

    if v_accion = 'decision-usuario' then
      if new.orden_banco is distinct from old.orden_banco or new.vigente is distinct from old.vigente then
        raise exception 'La decisión del usuario no reordena ni oculta el movimiento';
      end if;
      if new.local is distinct from old.local then
        raise exception 'La decisión del usuario no cambia el local';
      end if;
      return new;
    end if;

    if v_accion = 'reordenacion' then
      if new.estado is distinct from old.estado
        or new.motivo_estado is distinct from old.motivo_estado
        or new.observaciones is distinct from old.observaciones
        or new.local is distinct from old.local
        or new.clase is distinct from old.clase
        or new.decision_protegida is distinct from old.decision_protegida
        or new.origen_estado is distinct from old.origen_estado
        or new.vigente is distinct from old.vigente
      then
        raise exception 'La reordenación no cambia estados ni observaciones';
      end if;
      return new;
    end if;

    if v_accion = 'deshacer-autorizado' then
      if new.vigente or not old.vigente then
        raise exception 'Deshacer solo oculta un movimiento vigente';
      end if;
      if new.estado is distinct from old.estado
        or new.observaciones is distinct from old.observaciones
        or new.local is distinct from old.local
        or new.decision_protegida is distinct from old.decision_protegida
        or new.orden_banco is distinct from old.orden_banco
      then
        raise exception 'Deshacer no modifica la decisión ni el orden en el mismo paso';
      end if;
      return new;
    end if;

    if v_accion = 'observacion' then
      if new.estado is distinct from old.estado
        or new.motivo_estado is distinct from old.motivo_estado
        or new.origen_estado is distinct from old.origen_estado
        or new.decision_protegida is distinct from old.decision_protegida
        or new.clase is distinct from old.clase
        or new.orden_banco is distinct from old.orden_banco
        or new.vigente is distinct from old.vigente
        or new.local is distinct from old.local
        or new.analizado_en is distinct from old.analizado_en
        or new.estado_actualizado_en is distinct from old.estado_actualizado_en
        or new.estado_actualizado_por is distinct from old.estado_actualizado_por
      then
        raise exception 'Una observación no cambia el estado ni los datos del movimiento';
      end if;
      return new;
    end if;

    if v_accion = 'local' then
      if new.estado is distinct from old.estado
        or new.motivo_estado is distinct from old.motivo_estado
        or new.origen_estado is distinct from old.origen_estado
        or new.decision_protegida is distinct from old.decision_protegida
        or new.clase is distinct from old.clase
        or new.orden_banco is distinct from old.orden_banco
        or new.vigente is distinct from old.vigente
        or new.observaciones is distinct from old.observaciones
        or new.analizado_en is distinct from old.analizado_en
        or new.estado_actualizado_en is distinct from old.estado_actualizado_en
        or new.estado_actualizado_por is distinct from old.estado_actualizado_por
      then
        raise exception 'El local no cambia el estado ni los demás datos del movimiento';
      end if;
      return new;
    end if;

    raise exception 'Cambio de movimiento no autorizado';
  end if;

  if tg_table_name = 'punteo_importaciones' then
    if tg_op = 'INSERT' then
      if v_accion not in ('importacion', 'carga-historica') then
        raise exception 'Alta de importación no autorizada';
      end if;
      return new;
    end if;

    if v_accion <> 'deshacer-autorizado' then
      raise exception 'La importación confirmada no se edita. Solo se puede deshacer.';
    end if;

    if old.estado <> 'confirmada' or new.estado <> 'deshecha' then
      raise exception 'Solo se deshace una importación confirmada';
    end if;

    if new.banco is distinct from old.banco
      or new.tipo is distinct from old.tipo
      or new.huella_sha256 is distinct from old.huella_sha256
      or new.huella_archivo is distinct from old.huella_archivo
      or new.nombre_archivo is distinct from old.nombre_archivo
      or new.continuidad is distinct from old.continuidad
      or new.periodo_desde is distinct from old.periodo_desde
      or new.periodo_hasta is distinct from old.periodo_hasta
      or new.primera_fecha_real is distinct from old.primera_fecha_real
      or new.ultima_fecha_real is distinct from old.ultima_fecha_real
      or new.saldo_apertura_centimos is distinct from old.saldo_apertura_centimos
      or new.saldo_final_centimos is distinct from old.saldo_final_centimos
      or new.filas_leidas is distinct from old.filas_leidas
      or new.filas_nuevas is distinct from old.filas_nuevas
      or new.filas_omitidas is distinct from old.filas_omitidas
      or new.lineas_json is distinct from old.lineas_json
      or new.importada_en is distinct from old.importada_en
      or new.importada_por is distinct from old.importada_por
    then
      raise exception 'Deshacer no reescribe el extracto';
    end if;

    return new;
  end if;

  if tg_table_name = 'punteo_anclas' then
    if tg_op = 'INSERT' then
      if v_accion <> 'sistema' then
        raise exception 'Las anclas iniciales solo las crea la migración';
      end if;
      return new;
    end if;

    if new.fecha_ancla is distinct from old.fecha_ancla
      or new.concepto is distinct from old.concepto
      or new.importe_centimos is distinct from old.importe_centimos
      or new.saldo_centimos is distinct from old.saldo_centimos
      or new.fecha_historico_desde is distinct from old.fecha_historico_desde
      or new.banco is distinct from old.banco
    then
      raise exception 'El ancla inicial no se convierte en otro saldo ni en otro movimiento';
    end if;

    if v_accion not in ('carga-historica', 'importacion', 'deshacer-autorizado') then
      raise exception 'Actualización de ancla no autorizada';
    end if;

    return new;
  end if;

  if tg_table_name = 'punteo_huecos' then
    if tg_op = 'INSERT' then
      if v_accion <> 'hueco' then
        raise exception 'Alta de hueco no autorizada';
      end if;
      return new;
    end if;

    if v_accion <> 'hueco' then
      raise exception 'Anulación de hueco no autorizada';
    end if;

    if new.banco is distinct from old.banco
      or new.desde is distinct from old.desde
      or new.hasta is distinct from old.hasta
    then
      raise exception 'Un hueco confirmado no cambia de fechas. Se anula y se confirma otro.';
    end if;

    return new;
  end if;

  raise exception 'Tabla de punteo no controlada';
end;
$$;

create or replace function public.punteo_guardar_local(
  p_movimiento_id bigint,
  p_local text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_mov public.punteo_movimientos%rowtype;
  v_local text := nullif(btrim(coalesce(p_local, '')), '');
begin
  perform punteo_interno.exigir_admin();

  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'motivo', 'No hay una sesión de administrador');
  end if;

  if v_local is not null and v_local not in ('Tarantino', 'Hangar', 'Cue', 'Riverocio', 'Fisu') then
    return jsonb_build_object('ok', false, 'motivo', 'El local no está autorizado');
  end if;

  select * into v_mov
  from public.punteo_movimientos
  where id = p_movimiento_id
    and vigente
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'No existe ese movimiento vigente');
  end if;

  if v_mov.local is not distinct from v_local then
    return jsonb_build_object(
      'ok', true,
      'cambio', false,
      'movimiento_id', v_mov.id,
      'local', v_mov.local,
      'estado', v_mov.estado
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('punteo-banco:' || v_mov.banco, 0));
  perform set_config('punteo.accion', 'local', true);
  perform set_config('punteo.origen', 'usuario', true);
  perform set_config('punteo.proceso', 'punteo_guardar_local', true);
  perform set_config('punteo.motivo', 'Local del administrador. No cambia el estado ni la protección.', true);

  update public.punteo_movimientos
    set local = v_local
  where id = v_mov.id;

  return jsonb_build_object(
    'ok', true,
    'cambio', true,
    'movimiento_id', v_mov.id,
    'local', v_local,
    'estado', v_mov.estado
  );
end;
$$;

comment on function public.punteo_guardar_local(bigint, text) is
  'Guarda solo el local. NULL es Sin asignar. El estado, los saldos y el orden no cambian.';

create or replace function public.punteo_consultar_movimientos(
  p_banco text,
  p_anio integer,
  p_filtro_local text,
  p_busqueda text,
  p_orden text,
  p_ascendente boolean,
  p_ambito text,
  p_desde integer,
  p_limite integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_filtro text := coalesce(nullif(btrim(coalesce(p_filtro_local, '')), ''), 'todos');
  v_texto text := lower(btrim(coalesce(p_busqueda, '')));
  v_patron text;
  v_orden text := coalesce(p_orden, 'orden_banco');
  v_asc boolean := coalesce(p_ascendente, false);
  v_ambito text := coalesce(p_ambito, '');
  v_desde integer := coalesce(p_desde, 0);
  v_limite integer := least(200, greatest(1, coalesce(p_limite, 100)));
  v_filas jsonb := '[]'::jsonb;
  v_n integer := 0;
  v_hay boolean := false;
  v_mov public.punteo_movimientos%rowtype;
begin
  perform punteo_interno.exigir_admin();

  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'motivo', 'No hay una sesión de administrador', 'filas', '[]'::jsonb, 'hay_mas', false);
  end if;

  if p_banco not in ('caixabank', 'ibercaja') then
    return jsonb_build_object('ok', false, 'motivo', 'Banco no reconocido', 'filas', '[]'::jsonb, 'hay_mas', false);
  end if;

  if p_anio is null or p_anio < 2000 or p_anio > 2100 then
    return jsonb_build_object('ok', false, 'motivo', 'El año no es válido', 'filas', '[]'::jsonb, 'hay_mas', false);
  end if;

  if v_filtro not in ('todos', 'sin-asignar', 'Tarantino', 'Hangar', 'Cue', 'Riverocio', 'Fisu') then
    return jsonb_build_object('ok', false, 'motivo', 'El filtro de local no es válido', 'filas', '[]'::jsonb, 'hay_mas', false);
  end if;

  if v_orden not in (
    'orden_banco', 'fecha_operacion', 'fecha_valor', 'importe',
    'concepto', 'observaciones', 'local', 'estado'
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'La columna de orden no es válida', 'filas', '[]'::jsonb, 'hay_mas', false);
  end if;

  if v_ambito not in ('ordinarios', 'tpv') then
    return jsonb_build_object('ok', false, 'motivo', 'El ámbito de la consulta no es válido', 'filas', '[]'::jsonb, 'hay_mas', false);
  end if;

  if v_desde < 0 then
    return jsonb_build_object('ok', false, 'motivo', 'El desplazamiento no es válido', 'filas', '[]'::jsonb, 'hay_mas', false);
  end if;

  v_patron := '%' || replace(replace(replace(v_texto, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  for v_mov in
    select *
    from public.punteo_movimientos
    where banco = p_banco
      and vigente
      and fecha_operacion >= make_date(p_anio, 1, 1)
      and fecha_operacion <= make_date(p_anio, 12, 31)
      and (
        (v_ambito = 'ordinarios' and clase in ('normal', 'credito-cuota', 'pendiente-clasificacion'))
        or (v_ambito = 'tpv' and clase in ('tpv-ingreso', 'tpv-comision', 'tpv-mantenimiento', 'tpv-devolucion'))
      )
      and (
        v_filtro = 'todos'
        or (v_filtro = 'sin-asignar' and local is null)
        or local = v_filtro
      )
      and (
        v_texto = ''
        or punteo_interno.texto_busqueda(
          fecha_operacion, fecha_valor, importe_centimos, saldo_centimos,
          concepto, concepto_original, concepto_normalizado, detalles_originales,
          observaciones, local, estado, clase, motivo_estado, origen_estado,
          referencias, orden_banco, fila_excel
        ) ilike v_patron escape '\'
      )
    order by
      case when v_orden = 'fecha_operacion' and v_asc then fecha_operacion end asc nulls last,
      case when v_orden = 'fecha_operacion' and not v_asc then fecha_operacion end desc nulls last,
      case when v_orden = 'fecha_valor' and v_asc then fecha_valor end asc nulls last,
      case when v_orden = 'fecha_valor' and not v_asc then fecha_valor end desc nulls last,
      case when v_orden = 'importe' and v_asc then importe_centimos end asc nulls last,
      case when v_orden = 'importe' and not v_asc then importe_centimos end desc nulls last,
      case when v_orden = 'concepto' and v_asc then lower(concepto_original) end asc nulls last,
      case when v_orden = 'concepto' and not v_asc then lower(concepto_original) end desc nulls last,
      case when v_orden = 'observaciones' and v_asc then lower(observaciones) end asc nulls last,
      case when v_orden = 'observaciones' and not v_asc then lower(observaciones) end desc nulls last,
      case when v_orden = 'local' and v_asc then local end asc nulls last,
      case when v_orden = 'local' and not v_asc then local end desc nulls last,
      case when v_orden = 'estado' and v_asc then estado end asc nulls last,
      case when v_orden = 'estado' and not v_asc then estado end desc nulls last,
      case when v_orden = 'orden_banco' and v_asc then orden_banco end asc nulls last,
      case
        when v_orden = 'orden_banco' and not v_asc then orden_banco
        when v_orden <> 'orden_banco' then orden_banco
      end desc nulls last,
      case when v_orden = 'orden_banco' and v_asc then id end asc,
      case when not (v_orden = 'orden_banco' and v_asc) then id end desc
    offset v_desde
    limit v_limite + 1
  loop
    if v_n = v_limite then
      v_hay := true;
      exit;
    end if;

    v_filas := v_filas || jsonb_build_array(jsonb_build_object(
      'id', v_mov.id,
      'fecha_operacion', v_mov.fecha_operacion,
      'fecha_valor', v_mov.fecha_valor,
      'importe_centimos', v_mov.importe_centimos,
      'saldo_centimos', v_mov.saldo_centimos,
      'concepto', v_mov.concepto,
      'concepto_original', v_mov.concepto_original,
      'detalles_originales', v_mov.detalles_originales,
      'observaciones', v_mov.observaciones,
      'local', v_mov.local,
      'estado', v_mov.estado,
      'decision_protegida', v_mov.decision_protegida,
      'orden_banco', v_mov.orden_banco,
      'motivo_estado', v_mov.motivo_estado,
      'origen_estado', v_mov.origen_estado,
      'clase', v_mov.clase,
      'referencias', to_jsonb(v_mov.referencias)
    ));
    v_n := v_n + 1;
  end loop;

  return jsonb_build_object('ok', true, 'filas', v_filas, 'hay_mas', v_hay);
end;
$$;

comment on function public.punteo_consultar_movimientos(text, integer, text, text, text, boolean, text, integer, integer) is
  'Lista movimientos vigentes del banco y año. Filtra, busca y ordena en la base. No escribe.';

revoke all on function punteo_interno.texto_importe(bigint) from public;
revoke all on function punteo_interno.texto_busqueda(date, date, bigint, bigint, text, text, text, text, text, text, text, text, text, text, text[], bigint, integer) from public;
grant execute on function punteo_interno.texto_importe(bigint) to authenticated;
grant execute on function punteo_interno.texto_busqueda(date, date, bigint, bigint, text, text, text, text, text, text, text, text, text, text, text[], bigint, integer) to authenticated;

revoke all on function public.punteo_guardar_local(bigint, text) from public, anon;
grant execute on function public.punteo_guardar_local(bigint, text) to authenticated;

revoke all on function public.punteo_consultar_movimientos(text, integer, text, text, text, boolean, text, integer, integer) from public, anon;
grant execute on function public.punteo_consultar_movimientos(text, integer, text, text, text, boolean, text, integer, integer) to authenticated;
