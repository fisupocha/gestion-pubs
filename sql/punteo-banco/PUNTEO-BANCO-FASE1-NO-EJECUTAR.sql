-- PREPARADO PARA REVISIÓN Y PRUEBAS.
-- NO EJECUTAR EN PRODUCCIÓN SIN AUTORIZACIÓN.
--
-- Fase 1 de Punteo banco. Solo prepara objetos nuevos.
-- No modifica las 37 tablas operativas, ni perfiles, ni el almacén, ni Consultas, ni Pocha.
-- No importa movimientos y no llama a las funciones de carga.
--
-- Futuro, todavía sin crear y sin implementar:
-- revisión automática, revisión IA, correspondencias con facturas,
-- alta automática de gastos bancarios y alta automática de cuotas de crédito.
-- El analizador antiguo de revision-conjunta.sql no se usa.
--
-- Ejecutar el archivo entero, de una vez. Si algo falla, la transacción no deja objetos a medias.

begin;

set local lock_timeout = '4s';
set local statement_timeout = '120s';

do $guard$
begin
  if to_regprocedure('public.es_admin()') is null then
    raise exception 'Falta public.es_admin(). Este archivo no modifica la seguridad ya existente.';
  end if;

  if to_regprocedure('auth.uid()') is null then
    raise exception 'Falta auth.uid(). Este archivo es para el Supabase ya auditado.';
  end if;
end
$guard$;

create schema if not exists punteo_interno;

revoke all on schema punteo_interno from public;
grant usage on schema punteo_interno to authenticated;

comment on schema punteo_interno is
  'Funciones internas de Punteo banco. No forma parte del API público: PostgREST solo expone public.';

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.punteo_importaciones (
  id bigint generated always as identity primary key,
  banco text not null check (banco in ('caixabank', 'ibercaja')),
  tipo text not null check (tipo in ('historica', 'ordinaria')),
  estado text not null check (estado in ('pendiente_comprobacion', 'confirmada', 'rechazada', 'deshecha')),
  continuidad text not null check (continuidad in (
    'cuadra',
    'no-cuadra',
    'sin-nuevos',
    'secuencia-incierta',
    'ancla-no-coincide',
    'fuera-de-rango',
    'duplicada',
    'ya-ejecutada'
  )),
  nombre_archivo text not null check (length(btrim(nombre_archivo)) > 0),
  huella_sha256 text not null check (huella_sha256 ~ '^[0-9a-f]{64}$'),
  huella_archivo text check (huella_archivo is null or huella_archivo ~ '^[0-9a-f]{64}$'),
  periodo_desde date,
  periodo_hasta date,
  primera_fecha_real date,
  ultima_fecha_real date,
  saldo_apertura_centimos bigint,
  saldo_final_centimos bigint,
  filas_leidas integer not null default 0 check (filas_leidas >= 0),
  filas_nuevas integer not null default 0 check (filas_nuevas >= 0),
  filas_omitidas integer not null default 0 check (filas_omitidas >= 0),
  motivo text not null check (length(btrim(motivo)) > 0),
  lineas_json jsonb,
  importada_en timestamptz not null default now(),
  importada_por uuid not null,
  deshecha_en timestamptz,
  deshecha_por uuid,
  check (periodo_desde is null or periodo_hasta is null or periodo_desde <= periodo_hasta),
  check (primera_fecha_real is null or ultima_fecha_real is null or primera_fecha_real <= ultima_fecha_real),
  check (
    (estado = 'confirmada' and lineas_json is null)
    or estado <> 'confirmada'
  ),
  check (
    (estado = 'deshecha' and deshecha_en is not null and deshecha_por is not null)
    or (estado <> 'deshecha' and deshecha_en is null and deshecha_por is null)
  )
);

comment on table public.punteo_importaciones is
  'Cada intento de extracto. Varias el mismo día están permitidas. La huella confirmada no se repite.';

comment on column public.punteo_importaciones.huella_sha256 is
  'Identidad de la parte importada. Una confirmación por banco y huella. No se debilita para separar el histórico de octubre.';

comment on column public.punteo_importaciones.huella_archivo is
  'SHA-256 de los bytes del Excel original. Las dos partes comparten este valor y conservan huellas de parte distintas.';

create table public.punteo_movimientos (
  id bigint generated always as identity primary key,
  importacion_id bigint not null references public.punteo_importaciones (id) on delete restrict,
  banco text not null check (banco in ('caixabank', 'ibercaja')),
  fecha_operacion date not null,
  fecha_valor date,
  importe_centimos bigint not null,
  saldo_anterior_centimos bigint not null,
  saldo_centimos bigint not null,
  concepto text not null default '',
  concepto_original text not null default '',
  detalles_originales text not null default '',
  concepto_normalizado text not null default '',
  clase text not null check (clase in (
    'normal',
    'credito-cuota',
    'tpv-ingreso',
    'tpv-comision',
    'tpv-mantenimiento',
    'tpv-devolucion',
    'pendiente-clasificacion'
  )),
  referencias text[] not null default '{}',
  fila_excel integer not null check (fila_excel >= 0),
  posicion_archivo integer not null check (posicion_archivo > 0),
  orden_extracto integer,
  orden_banco bigint not null check (orden_banco > 0),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'comprobar', 'ok')),
  motivo_estado text not null default 'Importado. Pendiente de revisión.',
  origen_estado text not null default 'importacion' check (origen_estado in ('importacion', 'usuario')),
  decision_protegida boolean not null default false,
  regla_codigo text,
  incidencia_firma text,
  observaciones text not null default '',
  analizado_en timestamptz,
  estado_actualizado_en timestamptz,
  estado_actualizado_por uuid,
  vigente boolean not null default true,
  creado_en timestamptz not null default now(),
  check (saldo_centimos = saldo_anterior_centimos + importe_centimos),
  check (regla_codigo is null),
  check (incidencia_firma is null)
);

comment on table public.punteo_movimientos is
  'Apuntes reales del banco, TPV incluidos. No hay clave única por fecha, importe o concepto: dos cargos iguales y legítimos conviven. El saldo anterior y el posterior los distinguen.';

create table public.punteo_anclas (
  banco text primary key check (banco in ('caixabank', 'ibercaja')),
  fecha_ancla date not null,
  concepto text not null,
  importe_centimos bigint not null,
  saldo_centimos bigint not null,
  fecha_historico_desde date not null,
  movimiento_ancla_id bigint references public.punteo_movimientos (id) on delete restrict,
  movimiento_ultimo_id bigint references public.punteo_movimientos (id) on delete restrict,
  actualizada_en timestamptz not null default now(),
  actualizada_por uuid,
  check (fecha_historico_desde <= fecha_ancla)
);

comment on table public.punteo_anclas is
  'Referencia del 30/09/2026. No es un movimiento. El apunte real de ese día, cuando la carga histórica lo encuentre, se guarda en punteo_movimientos y aquí solo se apunta su id.';

create table public.punteo_huecos (
  id bigint generated always as identity primary key,
  banco text not null check (banco in ('caixabank', 'ibercaja')),
  desde date not null,
  hasta date not null,
  motivo text not null check (length(btrim(motivo)) > 0),
  vigente boolean not null default true,
  confirmado_en timestamptz not null default now(),
  confirmado_por uuid not null,
  anulado_en timestamptz,
  anulado_por uuid,
  check (desde <= hasta),
  check (
    (vigente and anulado_en is null and anulado_por is null)
    or (not vigente and anulado_en is not null and anulado_por is not null)
  )
);

comment on table public.punteo_huecos is
  'Periodo que el administrador declara inexistente. No crea apuntes para rellenar fechas.';

create table public.punteo_historial (
  id bigint generated always as identity primary key,
  entidad text not null check (entidad in ('movimiento', 'importacion', 'hueco', 'ancla')),
  movimiento_id bigint references public.punteo_movimientos (id) on delete restrict,
  importacion_id bigint references public.punteo_importaciones (id) on delete restrict,
  hueco_id bigint references public.punteo_huecos (id) on delete restrict,
  campo text not null check (length(btrim(campo)) > 0),
  valor_anterior text,
  valor_nuevo text,
  motivo text not null check (length(btrim(motivo)) > 0),
  origen text not null check (origen in (
    'usuario',
    'importacion',
    'carga-historica',
    'reordenacion',
    'deshacer',
    'sistema',
    'hueco'
  )),
  actor_id uuid,
  proceso text,
  creado_en timestamptz not null default now(),
  check (
    (entidad = 'movimiento' and movimiento_id is not null)
    or (entidad = 'importacion' and importacion_id is not null)
    or (entidad = 'hueco' and hueco_id is not null)
    or entidad = 'ancla'
  )
);

comment on table public.punteo_historial is
  'Bitácora inalterable. El administrador la consulta. Ni la aplicación ni un proceso posterior pueden modificarla o borrarla por las vías normales.';

-- Una carga histórica confirmada por banco. Un intento rechazado no ocupa esta plaza.
create unique index punteo_importaciones_historica_unica
  on public.punteo_importaciones (banco)
  where tipo = 'historica' and estado = 'confirmada';

-- El mismo archivo ya confirmado no se vuelve a confirmar. Una huella rechazada sí puede reintentarse.
create unique index punteo_importaciones_huella_confirmada
  on public.punteo_importaciones (banco, huella_sha256)
  where estado = 'confirmada';

create index punteo_importaciones_banco_fecha_idx
  on public.punteo_importaciones (banco, importada_en desc);

-- Orden interno único entre filas vivas. No identifica el cargo bancario: lo asigna la aplicación al confirmar.
create unique index punteo_movimientos_orden_vivo_idx
  on public.punteo_movimientos (banco, orden_banco)
  where vigente;

create index punteo_movimientos_visibles_idx
  on public.punteo_movimientos (banco, orden_banco desc)
  where vigente and clase in ('normal', 'credito-cuota');

create index punteo_movimientos_tpv_idx
  on public.punteo_movimientos (banco, fecha_operacion, clase)
  where vigente and clase in ('tpv-ingreso', 'tpv-comision');

create index punteo_movimientos_importacion_idx
  on public.punteo_movimientos (importacion_id);

create unique index punteo_huecos_vivos_idx
  on public.punteo_huecos (banco, desde, hasta)
  where vigente;

create index punteo_historial_movimiento_idx
  on public.punteo_historial (movimiento_id, creado_en);

create index punteo_historial_importacion_idx
  on public.punteo_historial (importacion_id, creado_en);

-- ---------------------------------------------------------------------------
-- Funciones internas. No se exponen en el API de public.
-- ---------------------------------------------------------------------------

create or replace function punteo_interno.normalizar_texto(p_valor text)
returns text
language sql
immutable
parallel safe
set search_path = public
as $$
  select trim(
    both from regexp_replace(
      regexp_replace(
        translate(
          lower(coalesce(p_valor, '')),
          'áéíóúüñàèìòù',
          'aeiouunaeiou'
        ),
        '[^a-z0-9]+',
        ' ',
        'g'
      ),
      ' +',
      ' ',
      'g'
    )
  );
$$;

create or replace function punteo_interno.exigir_admin()
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(public.es_admin(), false) is not true then
    raise exception 'Punteo banco solo está disponible para el administrador'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function punteo_interno.accion_actual()
returns text
language sql
stable
set search_path = public
as $$
  select nullif(current_setting('punteo.accion', true), '');
$$;

create or replace function punteo_interno.borrar_bloqueado()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'Punteo banco no admite borrado físico. Se deshace la importación o se anula el hueco, y el historial permanece.';
end;
$$;

create or replace function punteo_interno.historial_bloquear()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'El historial de Punteo banco no se puede modificar ni borrar.';
end;
$$;

create or replace function punteo_interno.historial_insertar(
  p_entidad text,
  p_movimiento_id bigint,
  p_importacion_id bigint,
  p_hueco_id bigint,
  p_campo text,
  p_anterior text,
  p_nuevo text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_origen text;
  v_motivo text;
begin
  -- Una llamada directa, aunque sea de administrador, no puede fabricar historial.
  -- Dentro del disparador la profundidad es mayor que cero.
  if pg_catalog.pg_trigger_depth() < 1 then
    raise exception 'El historial solo se escribe desde el disparador';
  end if;

  -- La marca solo vive durante este insert. El navegador no puede activarla:
  -- PostgREST no ejecuta SET y esta función no está en el esquema public.
  perform set_config('punteo.historial_interno', '1', true);

  v_origen := coalesce(nullif(current_setting('punteo.origen', true), ''), 'sistema');
  v_motivo := coalesce(nullif(current_setting('punteo.motivo', true), ''), 'Cambio autorizado');

  insert into public.punteo_historial (
    entidad,
    movimiento_id,
    importacion_id,
    hueco_id,
    campo,
    valor_anterior,
    valor_nuevo,
    motivo,
    origen,
    actor_id,
    proceso
  ) values (
    p_entidad,
    p_movimiento_id,
    p_importacion_id,
    p_hueco_id,
    p_campo,
    p_anterior,
    p_nuevo,
    v_motivo,
    v_origen,
    auth.uid(),
    nullif(current_setting('punteo.proceso', true), '')
  );

  perform set_config('punteo.historial_interno', '', true);
end;
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
      return new;
    end if;

    if v_accion = 'reordenacion' then
      if new.estado is distinct from old.estado
        or new.motivo_estado is distinct from old.motivo_estado
        or new.observaciones is distinct from old.observaciones
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
        or new.analizado_en is distinct from old.analizado_en
        or new.estado_actualizado_en is distinct from old.estado_actualizado_en
        or new.estado_actualizado_por is distinct from old.estado_actualizado_por
      then
        raise exception 'Una observación no cambia el estado ni los datos del movimiento';
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

create trigger punteo_movimientos_control
  before insert or update on public.punteo_movimientos
  for each row execute function punteo_interno.escritura_controlar();

create or replace function punteo_interno.copiar_huella_archivo()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.huella_archivo is null then
    new.huella_archivo := nullif(current_setting('punteo.huella_archivo', true), '');
  end if;

  return new;
end;
$$;

create trigger punteo_importaciones_archivo
  before insert on public.punteo_importaciones
  for each row execute function punteo_interno.copiar_huella_archivo();

create trigger punteo_importaciones_control
  before insert or update on public.punteo_importaciones
  for each row execute function punteo_interno.escritura_controlar();

create trigger punteo_anclas_control
  before insert or update on public.punteo_anclas
  for each row execute function punteo_interno.escritura_controlar();

create trigger punteo_huecos_control
  before insert or update on public.punteo_huecos
  for each row execute function punteo_interno.escritura_controlar();

create trigger punteo_movimientos_historial
  after insert or update on public.punteo_movimientos
  for each row execute function punteo_interno.historial_aplicar();

create trigger punteo_importaciones_historial
  after insert or update on public.punteo_importaciones
  for each row execute function punteo_interno.historial_aplicar();

create trigger punteo_huecos_historial
  after insert or update on public.punteo_huecos
  for each row execute function punteo_interno.historial_aplicar();

create trigger punteo_anclas_historial
  after update on public.punteo_anclas
  for each row execute function punteo_interno.historial_aplicar();

create trigger punteo_movimientos_no_borrar
  before delete on public.punteo_movimientos
  for each row execute function punteo_interno.borrar_bloqueado();

create trigger punteo_importaciones_no_borrar
  before delete on public.punteo_importaciones
  for each row execute function punteo_interno.borrar_bloqueado();

create trigger punteo_anclas_no_borrar
  before delete on public.punteo_anclas
  for each row execute function punteo_interno.borrar_bloqueado();

create trigger punteo_huecos_no_borrar
  before delete on public.punteo_huecos
  for each row execute function punteo_interno.borrar_bloqueado();

create trigger punteo_historial_no_cambiar
  before update or delete on public.punteo_historial
  for each row execute function punteo_interno.historial_bloquear();

-- Prepara la cadena en el orden recibido. La posición 1 es el eslabón más antiguo.
-- No reordena por fecha: el mismo día conserva el orden del extracto.
-- No crea filas en las tablas definitivas.

create or replace function punteo_interno.preparar_lineas(p_lineas jsonb)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_n integer;
  v_i integer;
  v_elem jsonb;
  v_pos integer;
  v_pos_texto text;
  v_fecha_texto text;
  v_valor_texto text;
  v_importe_texto text;
  v_saldo_texto text;
  v_clase text;
  v_concepto text;
  v_original text;
  v_detalles text;
  v_fecha date;
  v_valor date;
  v_importe bigint;
  v_saldo bigint;
  v_anterior bigint;
  v_prev_saldo bigint;
  v_refs text[];
  v_fila integer;
  v_orden_extracto integer;
  v_error text;
begin
  drop table if exists tmp_punteo_entrada;

  create temp table tmp_punteo_entrada (
    posicion integer primary key,
    fecha_operacion date not null,
    fecha_valor date,
    importe_centimos bigint not null,
    saldo_centimos bigint not null,
    saldo_anterior_centimos bigint,
    concepto text not null,
    concepto_original text not null,
    detalles_originales text not null,
    concepto_normalizado text not null,
    clase text not null,
    referencias text[] not null,
    fila_excel integer not null,
    orden_extracto integer
  ) on commit drop;

  if p_lineas is null or jsonb_typeof(p_lineas) <> 'array' then
    return 'La carga no contiene una lista de movimientos';
  end if;

  v_n := jsonb_array_length(p_lineas);

  if v_n = 0 then
    return 'La carga no contiene movimientos';
  end if;

  if v_n > 20000 then
    return 'La carga supera el máximo previsto de 20000 líneas';
  end if;

  for v_i in 0 .. v_n - 1 loop
    v_elem := p_lineas -> v_i;

    if jsonb_typeof(v_elem) <> 'object' then
      return format('La línea %s no tiene el formato previsto', v_i + 1);
    end if;

    v_pos_texto := v_elem ->> 'posicion_archivo';
    v_fecha_texto := v_elem ->> 'fecha_operacion';
    v_valor_texto := nullif(v_elem ->> 'fecha_valor', '');
    v_importe_texto := v_elem ->> 'importe_centimos';
    v_saldo_texto := v_elem ->> 'saldo_centimos';
    v_clase := v_elem ->> 'clase';
    v_concepto := coalesce(v_elem ->> 'concepto', '');
    v_original := coalesce(v_elem ->> 'concepto_original', v_concepto);
    v_detalles := coalesce(v_elem ->> 'detalles_originales', '');

    if v_pos_texto is null or v_pos_texto !~ '^[1-9][0-9]*$' then
      return format('La posición de archivo no es válida en el elemento %s', v_i + 1);
    end if;

    if v_fecha_texto is null or v_fecha_texto !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      return format('La fecha de operación no es válida en la posición %s', v_pos_texto);
    end if;

    if v_importe_texto is null or v_importe_texto !~ '^-?[0-9]+$'
      or v_saldo_texto is null or v_saldo_texto !~ '^-?[0-9]+$'
    then
      return format('El importe o el saldo no están en céntimos enteros en la posición %s', v_pos_texto);
    end if;

    if v_clase not in (
      'normal', 'credito-cuota', 'tpv-ingreso', 'tpv-comision',
      'tpv-mantenimiento', 'tpv-devolucion', 'pendiente-clasificacion'
    ) then
      return format('La clase del movimiento no es válida en la posición %s', v_pos_texto);
    end if;

    v_pos := v_pos_texto::integer;
    v_importe := v_importe_texto::bigint;
    v_saldo := v_saldo_texto::bigint;
    v_error := null;

    begin
      v_fecha := v_fecha_texto::date;
      v_valor := v_valor_texto::date;
    exception
      when others then
        v_error := format('Hay una fecha imposible en la posición %s', v_pos);
    end;

    if v_error is not null then
      return v_error;
    end if;

    if v_elem ? 'fila_excel' and coalesce(v_elem ->> 'fila_excel', '') ~ '^[0-9]+$' then
      v_fila := (v_elem ->> 'fila_excel')::integer;
    else
      v_fila := v_pos;
    end if;

    if coalesce(v_elem ->> 'orden_extracto', '') ~ '^-?[0-9]+$' then
      v_orden_extracto := (v_elem ->> 'orden_extracto')::integer;
    else
      v_orden_extracto := null;
    end if;

    if v_elem ? 'referencias' and jsonb_typeof(v_elem -> 'referencias') is distinct from 'array' then
      return format('Las referencias no son una lista en la posición %s', v_pos_texto);
    end if;

    select coalesce(array_agg(btrim(t.valor) order by t.ord), '{}')
      into v_refs
    from jsonb_array_elements_text(coalesce(v_elem -> 'referencias', '[]'::jsonb)) with ordinality as t(valor, ord)
    where length(btrim(t.valor)) > 0;

    v_refs := coalesce(v_refs, '{}');

    insert into tmp_punteo_entrada (
      posicion, fecha_operacion, fecha_valor, importe_centimos, saldo_centimos,
      concepto, concepto_original, detalles_originales, concepto_normalizado,
      clase, referencias, fila_excel, orden_extracto
    ) values (
      v_pos, v_fecha, v_valor, v_importe, v_saldo,
      v_concepto, v_original, v_detalles, punteo_interno.normalizar_texto(v_original || ' ' || v_detalles),
      v_clase, v_refs, v_fila, v_orden_extracto
    );
  end loop;

  if (select count(*) from tmp_punteo_entrada) <> v_n
    or (select count(distinct posicion) from tmp_punteo_entrada) <> v_n
    or (select min(posicion) from tmp_punteo_entrada) <> 1
    or (select max(posicion) from tmp_punteo_entrada) <> v_n
  then
    return 'La posición de archivo debe ser única y correlativa, empezando en 1 por el movimiento más antiguo';
  end if;

  for v_i in 1 .. v_n loop
    select importe_centimos, saldo_centimos
      into v_importe, v_saldo
    from tmp_punteo_entrada
    where posicion = v_i;

    if v_i = 1 then
      v_anterior := v_saldo - v_importe;
    else
      if v_saldo <> v_prev_saldo + v_importe then
        return format('El saldo no cuadra al céntimo en la posición %s', v_i);
      end if;
      v_anterior := v_prev_saldo;
    end if;

    update tmp_punteo_entrada
      set saldo_anterior_centimos = v_anterior
    where posicion = v_i;

    v_prev_saldo := v_saldo;
  end loop;

  if exists (
    select 1
    from tmp_punteo_entrada actual
    join tmp_punteo_entrada siguiente on siguiente.posicion = actual.posicion + 1
    where siguiente.fecha_operacion < actual.fecha_operacion
  ) then
    return 'La cadena retrocede de fecha. El orden recibido no es el orden bancario.';
  end if;

  return null;
end;
$$;

create or replace function punteo_interno.registrar_intento(
  p_banco text,
  p_tipo text,
  p_estado text,
  p_continuidad text,
  p_nombre text,
  p_huella text,
  p_periodo_desde date,
  p_periodo_hasta date,
  p_motivo text,
  p_lineas jsonb,
  p_leidas integer,
  p_omitidas integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id bigint;
  v_apertura bigint;
  v_final bigint;
  v_primera date;
  v_ultima date;
begin
  select min(saldo_anterior_centimos), max(saldo_centimos) filter (where posicion = (select max(posicion) from tmp_punteo_entrada)),
         min(fecha_operacion), max(fecha_operacion)
    into v_apertura, v_final, v_primera, v_ultima
  from tmp_punteo_entrada;

  if p_tipo = 'historica' then
    perform set_config('punteo.accion', 'carga-historica', true);
    perform set_config('punteo.origen', 'carga-historica', true);
    perform set_config('punteo.proceso', 'punteo_confirmar_carga_historica', true);
  else
    perform set_config('punteo.accion', 'importacion', true);
    perform set_config('punteo.origen', 'importacion', true);
    perform set_config('punteo.proceso', 'punteo_confirmar_importacion', true);
  end if;

  perform set_config('punteo.motivo', p_motivo, true);

  insert into public.punteo_importaciones (
    banco, tipo, estado, continuidad, nombre_archivo, huella_sha256,
    periodo_desde, periodo_hasta, primera_fecha_real, ultima_fecha_real,
    saldo_apertura_centimos, saldo_final_centimos,
    filas_leidas, filas_nuevas, filas_omitidas,
    motivo, lineas_json, importada_por
  ) values (
    p_banco, p_tipo, p_estado, p_continuidad, p_nombre, p_huella,
    p_periodo_desde, p_periodo_hasta, v_primera, v_ultima,
    v_apertura, v_final,
    p_leidas, 0, p_omitidas,
    p_motivo, p_lineas, auth.uid()
  )
  returning id into v_id;

  return jsonb_build_object(
    'ok', false,
    'estado', p_estado,
    'continuidad', p_continuidad,
    'motivo', p_motivo,
    'importacion_id', v_id,
    'filas_leidas', p_leidas,
    'filas_nuevas', 0,
    'filas_omitidas', p_omitidas
  );
end;
$$;

create or replace function punteo_interno.refrescar_ultimo(p_banco text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id bigint;
begin
  select id
    into v_id
  from public.punteo_movimientos
  where banco = p_banco
    and vigente
  order by orden_banco desc
  limit 1;

  update public.punteo_anclas
    set movimiento_ultimo_id = v_id,
        actualizada_en = now(),
        actualizada_por = auth.uid()
  where banco = p_banco
    and movimiento_ultimo_id is distinct from v_id;
end;
$$;

create or replace function punteo_interno.insertar_lineas(
  p_importacion_id bigint,
  p_banco text,
  p_orden_base bigint,
  p_posicion_desde integer
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_nuevas integer;
begin
  insert into public.punteo_movimientos (
    importacion_id, banco, fecha_operacion, fecha_valor,
    importe_centimos, saldo_anterior_centimos, saldo_centimos,
    concepto, concepto_original, detalles_originales, concepto_normalizado,
    clase, referencias, fila_excel, posicion_archivo, orden_extracto,
    orden_banco, estado, motivo_estado, origen_estado, decision_protegida, observaciones, vigente
  )
  select
    p_importacion_id, p_banco, fecha_operacion, fecha_valor,
    importe_centimos, saldo_anterior_centimos, saldo_centimos,
    concepto, concepto_original, detalles_originales, concepto_normalizado,
    clase, referencias, fila_excel, posicion, orden_extracto,
    p_orden_base + posicion - p_posicion_desde + 1,
    'pendiente',
    'Importado. Pendiente de revisión.',
    'importacion',
    false,
    '',
    true
  from tmp_punteo_entrada
  where posicion >= p_posicion_desde
  order by posicion;

  get diagnostics v_nuevas = row_count;
  return v_nuevas;
end;
$$;

-- ---------------------------------------------------------------------------
-- Carga histórica. Una confirmación por banco. No se ejecuta desde este archivo.
-- CaixaBank: desde el 01/02/2026 hasta el movimiento real del 30/09/2026.
-- Ibercaja: desde el 27/04/2026 hasta el movimiento real del 30/09/2026.
-- El ancla no se inserta como fila ficticia: la última línea real tiene que coincidir con ella.
-- ---------------------------------------------------------------------------

create or replace function public.punteo_confirmar_carga_historica(
  p_banco text,
  p_nombre_archivo text,
  p_huella_sha256 text,
  p_lineas jsonb,
  p_periodo_desde date default null,
  p_periodo_hasta date default null,
  p_huella_archivo text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor uuid;
  v_error text;
  v_ancla public.punteo_anclas%rowtype;
  v_leidas integer;
  v_apertura bigint;
  v_min_fecha date;
  v_max_fecha date;
  v_ultima_fecha date;
  v_ultima_importe bigint;
  v_ultima_saldo bigint;
  v_ultima_concepto text;
  v_id bigint;
  v_movimiento_ancla bigint;
  v_posteriores integer;
  v_primero_saldo bigint;
  v_motivo text;
begin
  perform punteo_interno.exigir_admin();
  v_actor := auth.uid();

  if v_actor is null then
    return jsonb_build_object('ok', false, 'estado', 'rechazada', 'motivo', 'No hay una sesión de administrador');
  end if;

  if p_banco not in ('caixabank', 'ibercaja') then
    return jsonb_build_object('ok', false, 'estado', 'rechazada', 'motivo', 'Banco no reconocido');
  end if;

  if p_huella_sha256 is null or p_huella_sha256 !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'estado', 'rechazada', 'motivo', 'La huella del archivo no es un SHA-256');
  end if;

  if p_huella_archivo is not null and p_huella_archivo !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'estado', 'rechazada', 'motivo', 'La huella del archivo original no es un SHA-256');
  end if;

  perform set_config('punteo.huella_archivo', coalesce(p_huella_archivo, ''), true);

  if p_nombre_archivo is null or length(btrim(p_nombre_archivo)) = 0 then
    return jsonb_build_object('ok', false, 'estado', 'rechazada', 'motivo', 'Falta el nombre del archivo');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('punteo-banco:' || p_banco, 0));

  select * into v_ancla from public.punteo_anclas where banco = p_banco;

  if not found then
    return jsonb_build_object('ok', false, 'estado', 'rechazada', 'motivo', 'No está el ancla de este banco');
  end if;

  if exists (
    select 1 from public.punteo_importaciones
    where banco = p_banco and tipo = 'historica' and estado = 'confirmada'
  ) then
    v_error := punteo_interno.preparar_lineas(p_lineas);
    return punteo_interno.registrar_intento(
      p_banco, 'historica', 'rechazada', 'ya-ejecutada', p_nombre_archivo, p_huella_sha256,
      p_periodo_desde, p_periodo_hasta,
      'La carga histórica de este banco ya está confirmada. No se repite.',
      p_lineas, coalesce(jsonb_array_length(p_lineas), 0), 0
    );
  end if;

  if exists (
    select 1 from public.punteo_importaciones
    where banco = p_banco and huella_sha256 = p_huella_sha256 and estado = 'confirmada'
  ) then
    perform punteo_interno.preparar_lineas(p_lineas);
    return punteo_interno.registrar_intento(
      p_banco, 'historica', 'rechazada', 'duplicada', p_nombre_archivo, p_huella_sha256,
      p_periodo_desde, p_periodo_hasta,
      'Este archivo ya fue confirmado. No se duplican sus movimientos.',
      p_lineas, coalesce(jsonb_array_length(p_lineas), 0), 0
    );
  end if;

  v_error := punteo_interno.preparar_lineas(p_lineas);
  select count(*) into v_leidas from tmp_punteo_entrada;

  if v_error is not null then
    return punteo_interno.registrar_intento(
      p_banco, 'historica', 'pendiente_comprobacion', 'no-cuadra', p_nombre_archivo, p_huella_sha256,
      p_periodo_desde, p_periodo_hasta, v_error, p_lineas, coalesce(v_leidas, 0), 0
    );
  end if;

  select min(fecha_operacion), max(fecha_operacion)
    into v_min_fecha, v_max_fecha
  from tmp_punteo_entrada;

  select saldo_anterior_centimos
    into v_apertura
  from tmp_punteo_entrada
  where posicion = 1;

  select fecha_operacion, importe_centimos, saldo_centimos, concepto_normalizado
    into v_ultima_fecha, v_ultima_importe, v_ultima_saldo, v_ultima_concepto
  from tmp_punteo_entrada
  where posicion = v_leidas;

  if v_min_fecha < v_ancla.fecha_historico_desde or v_max_fecha > v_ancla.fecha_ancla then
    return punteo_interno.registrar_intento(
      p_banco, 'historica', 'pendiente_comprobacion', 'fuera-de-rango', p_nombre_archivo, p_huella_sha256,
      p_periodo_desde, p_periodo_hasta,
      'Hay fechas fuera del histórico autorizado para este banco.',
      p_lineas, v_leidas, 0
    );
  end if;

  if v_min_fecha <> v_ancla.fecha_historico_desde then
    return punteo_interno.registrar_intento(
      p_banco, 'historica', 'pendiente_comprobacion', 'fuera-de-rango', p_nombre_archivo, p_huella_sha256,
      p_periodo_desde, p_periodo_hasta,
      'La cadena no empieza en la primera fecha autorizada. No se da por completo un histórico parcial.',
      p_lineas, v_leidas, 0
    );
  end if;

  if v_apertura = v_ancla.saldo_centimos then
    return punteo_interno.registrar_intento(
      p_banco, 'historica', 'pendiente_comprobacion', 'ancla-no-coincide', p_nombre_archivo, p_huella_sha256,
      p_periodo_desde, p_periodo_hasta,
      'El saldo anterior al primer movimiento coincide con el saldo del 30/09. Ese saldo no es el inicial de febrero ni el de abril.',
      p_lineas, v_leidas, 0
    );
  end if;

  if v_ultima_fecha <> v_ancla.fecha_ancla
    or v_ultima_importe <> v_ancla.importe_centimos
    or v_ultima_saldo <> v_ancla.saldo_centimos
    or strpos(v_ultima_concepto, punteo_interno.normalizar_texto(v_ancla.concepto)) = 0
  then
    return punteo_interno.registrar_intento(
      p_banco, 'historica', 'pendiente_comprobacion', 'ancla-no-coincide', p_nombre_archivo, p_huella_sha256,
      p_periodo_desde, p_periodo_hasta,
      'La última línea no es el movimiento real del 30/09 asociado al ancla. No se confirma y no se inventa ese apunte.',
      p_lineas, v_leidas, 0
    );
  end if;

  select count(*) into v_posteriores
  from public.punteo_movimientos
  where banco = p_banco and vigente;

  if v_posteriores > 0 then
    if exists (
      select 1 from public.punteo_movimientos
      where banco = p_banco and vigente and fecha_operacion <= v_ancla.fecha_ancla
    ) then
      return punteo_interno.registrar_intento(
        p_banco, 'historica', 'pendiente_comprobacion', 'secuencia-incierta', p_nombre_archivo, p_huella_sha256,
        p_periodo_desde, p_periodo_hasta,
        'Ya hay movimientos vigentes en la fecha del ancla o anteriores. No se mezclan con el histórico.',
        p_lineas, v_leidas, 0
      );
    end if;

    select saldo_anterior_centimos into v_primero_saldo
    from public.punteo_movimientos
    where banco = p_banco and vigente
    order by orden_banco
    limit 1;

    if v_primero_saldo is distinct from v_ancla.saldo_centimos then
      return punteo_interno.registrar_intento(
        p_banco, 'historica', 'pendiente_comprobacion', 'no-cuadra', p_nombre_archivo, p_huella_sha256,
        p_periodo_desde, p_periodo_hasta,
        'Los movimientos posteriores ya guardados no arrancan en el saldo del ancla.',
        p_lineas, v_leidas, 0
      );
    end if;

    perform set_config('punteo.accion', 'reordenacion', true);
    perform set_config('punteo.origen', 'reordenacion', true);
    perform set_config('punteo.proceso', 'punteo_confirmar_carga_historica', true);
    perform set_config('punteo.motivo', 'Se adelanta el orden para colocar el histórico delante, sin cambiar estados ni observaciones', true);

    update public.punteo_movimientos
      set orden_banco = orden_banco + v_leidas
    where banco = p_banco
      and vigente;
  end if;

  v_motivo := 'Carga histórica inicial confirmada. El ancla permanece como referencia y el 30/09 es el último movimiento real de la cadena.';

  perform set_config('punteo.accion', 'carga-historica', true);
  perform set_config('punteo.origen', 'carga-historica', true);
  perform set_config('punteo.proceso', 'punteo_confirmar_carga_historica', true);
  perform set_config('punteo.motivo', v_motivo, true);

  insert into public.punteo_importaciones (
    banco, tipo, estado, continuidad, nombre_archivo, huella_sha256,
    periodo_desde, periodo_hasta, primera_fecha_real, ultima_fecha_real,
    saldo_apertura_centimos, saldo_final_centimos,
    filas_leidas, filas_nuevas, filas_omitidas,
    motivo, lineas_json, importada_por
  ) values (
    p_banco, 'historica', 'confirmada', 'cuadra', p_nombre_archivo, p_huella_sha256,
    p_periodo_desde, p_periodo_hasta, v_min_fecha, v_max_fecha,
    v_apertura, v_ultima_saldo,
    v_leidas, v_leidas, 0,
    v_motivo, null, v_actor
  )
  returning id into v_id;

  perform punteo_interno.insertar_lineas(v_id, p_banco, 0, 1);

  select id into v_movimiento_ancla
  from public.punteo_movimientos
  where importacion_id = v_id
    and posicion_archivo = v_leidas;

  update public.punteo_anclas
    set movimiento_ancla_id = v_movimiento_ancla,
        actualizada_en = now(),
        actualizada_por = v_actor
  where banco = p_banco;

  perform punteo_interno.refrescar_ultimo(p_banco);

  return jsonb_build_object(
    'ok', true,
    'estado', 'confirmada',
    'continuidad', 'cuadra',
    'motivo', v_motivo,
    'importacion_id', v_id,
    'movimiento_ancla_id', v_movimiento_ancla,
    'filas_leidas', v_leidas,
    'filas_nuevas', v_leidas,
    'filas_omitidas', 0,
    'saldo_apertura_centimos', v_apertura,
    'saldo_final_centimos', v_ultima_saldo
  );
end;
$$;

comment on function public.punteo_confirmar_carga_historica(text, text, text, jsonb, date, date, text) is
  'Incorpora una sola vez el histórico anterior al 30/09/2026. Comprueba la cadena al céntimo y exige que el último apunte real coincida con el ancla. No inserta un movimiento ficticio.';

-- ---------------------------------------------------------------------------
-- Importaciones posteriores. Enganchan con el último movimiento vivo o, si
-- todavía no hay filas, con el saldo del ancla. No reescriben decisiones.
-- ---------------------------------------------------------------------------

create or replace function public.punteo_confirmar_importacion(
  p_banco text,
  p_nombre_archivo text,
  p_huella_sha256 text,
  p_lineas jsonb,
  p_periodo_desde date default null,
  p_periodo_hasta date default null,
  p_huella_archivo text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_actor uuid;
  v_error text;
  v_ancla public.punteo_anclas%rowtype;
  v_leidas integer;
  v_last public.punteo_movimientos%rowtype;
  v_hay_last boolean := false;
  v_coincidencias integer;
  v_h integer;
  v_pos integer;
  v_orden bigint;
  v_existente public.punteo_movimientos%rowtype;
  v_entrada record;
  v_id bigint;
  v_nuevas integer := 0;
  v_omitidas integer := 0;
  v_motivo text;
  v_ancla_en_fichero integer;
begin
  perform punteo_interno.exigir_admin();
  v_actor := auth.uid();

  if v_actor is null then
    return jsonb_build_object('ok', false, 'estado', 'rechazada', 'motivo', 'No hay una sesión de administrador');
  end if;

  if p_banco not in ('caixabank', 'ibercaja') then
    return jsonb_build_object('ok', false, 'estado', 'rechazada', 'motivo', 'Banco no reconocido');
  end if;

  if p_huella_sha256 is null or p_huella_sha256 !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'estado', 'rechazada', 'motivo', 'La huella del archivo no es un SHA-256');
  end if;

  if p_huella_archivo is not null and p_huella_archivo !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'estado', 'rechazada', 'motivo', 'La huella del archivo original no es un SHA-256');
  end if;

  perform set_config('punteo.huella_archivo', coalesce(p_huella_archivo, ''), true);

  if p_nombre_archivo is null or length(btrim(p_nombre_archivo)) = 0 then
    return jsonb_build_object('ok', false, 'estado', 'rechazada', 'motivo', 'Falta el nombre del archivo');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('punteo-banco:' || p_banco, 0));

  select * into v_ancla from public.punteo_anclas where banco = p_banco;

  if exists (
    select 1 from public.punteo_importaciones
    where banco = p_banco and huella_sha256 = p_huella_sha256 and estado = 'confirmada'
  ) then
    perform punteo_interno.preparar_lineas(p_lineas);
    return punteo_interno.registrar_intento(
      p_banco, 'ordinaria', 'rechazada', 'duplicada', p_nombre_archivo, p_huella_sha256,
      p_periodo_desde, p_periodo_hasta,
      'Este archivo ya fue confirmado. No se duplican sus movimientos.',
      p_lineas, coalesce(jsonb_array_length(p_lineas), 0), 0
    );
  end if;

  v_error := punteo_interno.preparar_lineas(p_lineas);
  select count(*) into v_leidas from tmp_punteo_entrada;

  if v_error is not null then
    return punteo_interno.registrar_intento(
      p_banco, 'ordinaria', 'pendiente_comprobacion', 'no-cuadra', p_nombre_archivo, p_huella_sha256,
      p_periodo_desde, p_periodo_hasta, v_error, p_lineas, coalesce(v_leidas, 0), 0
    );
  end if;

  select * into v_last
  from public.punteo_movimientos
  where banco = p_banco and vigente
  order by orden_banco desc
  limit 1;

  v_hay_last := found;

  if not v_hay_last then
    if exists (select 1 from tmp_punteo_entrada where fecha_operacion < v_ancla.fecha_ancla) then
      return punteo_interno.registrar_intento(
        p_banco, 'ordinaria', 'pendiente_comprobacion', 'fuera-de-rango', p_nombre_archivo, p_huella_sha256,
        p_periodo_desde, p_periodo_hasta,
        'El extracto contiene fechas anteriores al ancla. Esas líneas pertenecen a la carga histórica y no se descartan ni se importan por esta vía.',
        p_lineas, v_leidas, 0
      );
    end if;

    select count(*) into v_ancla_en_fichero
    from tmp_punteo_entrada
    where fecha_operacion = v_ancla.fecha_ancla
      and importe_centimos = v_ancla.importe_centimos
      and saldo_centimos = v_ancla.saldo_centimos
      and strpos(concepto_normalizado, punteo_interno.normalizar_texto(v_ancla.concepto)) > 0;

    if v_ancla_en_fichero > 1 then
      return punteo_interno.registrar_intento(
        p_banco, 'ordinaria', 'pendiente_comprobacion', 'secuencia-incierta', p_nombre_archivo, p_huella_sha256,
        p_periodo_desde, p_periodo_hasta,
        'Hay más de una línea que podría ser el ancla. No se omite ninguna.',
        p_lineas, v_leidas, 0
      );
    end if;

    if v_ancla_en_fichero = 1 then
      select posicion into v_h
      from tmp_punteo_entrada
      where fecha_operacion = v_ancla.fecha_ancla
        and importe_centimos = v_ancla.importe_centimos
        and saldo_centimos = v_ancla.saldo_centimos
        and strpos(concepto_normalizado, punteo_interno.normalizar_texto(v_ancla.concepto)) > 0;

      if v_h <> 1 then
        return punteo_interno.registrar_intento(
          p_banco, 'ordinaria', 'pendiente_comprobacion', 'fuera-de-rango', p_nombre_archivo, p_huella_sha256,
          p_periodo_desde, p_periodo_hasta,
          'Delante del ancla hay líneas que corresponden a la carga histórica. No se descartan.',
          p_lineas, v_leidas, 0
        );
      end if;

      if v_leidas = 1 then
        return punteo_interno.registrar_intento(
          p_banco, 'ordinaria', 'rechazada', 'sin-nuevos', p_nombre_archivo, p_huella_sha256,
          p_periodo_desde, p_periodo_hasta,
          'El archivo solo contiene el movimiento del ancla. No se crea un apunte nuevo.',
          p_lineas, v_leidas, 1
        );
      end if;

      v_omitidas := 1;
      v_orden := 0;
      v_h := 2;
    else
      select * into v_entrada from tmp_punteo_entrada where posicion = 1;

      if v_entrada.saldo_anterior_centimos <> v_ancla.saldo_centimos or v_entrada.fecha_operacion <= v_ancla.fecha_ancla then
        return punteo_interno.registrar_intento(
          p_banco, 'ordinaria', 'pendiente_comprobacion', 'no-cuadra', p_nombre_archivo, p_huella_sha256,
          p_periodo_desde, p_periodo_hasta,
          'El extracto no continúa a partir del saldo del ancla.',
          p_lineas, v_leidas, 0
        );
      end if;

      v_h := 1;
      v_orden := 0;
      v_omitidas := 0;
    end if;
  else
    select count(*) into v_coincidencias
    from tmp_punteo_entrada
    where fecha_operacion = v_last.fecha_operacion
      and importe_centimos = v_last.importe_centimos
      and saldo_centimos = v_last.saldo_centimos
      and saldo_anterior_centimos = v_last.saldo_anterior_centimos
      and concepto_normalizado = v_last.concepto_normalizado;

    if v_coincidencias > 1 then
      return punteo_interno.registrar_intento(
        p_banco, 'ordinaria', 'pendiente_comprobacion', 'secuencia-incierta', p_nombre_archivo, p_huella_sha256,
        p_periodo_desde, p_periodo_hasta,
        'El último movimiento guardado coincide con varias líneas del archivo. No se omite ninguna.',
        p_lineas, v_leidas, 0
      );
    end if;

    if v_coincidencias = 0 then
      select * into v_entrada from tmp_punteo_entrada where posicion = 1;

      if v_entrada.saldo_anterior_centimos <> v_last.saldo_centimos or v_entrada.fecha_operacion < v_last.fecha_operacion then
        return punteo_interno.registrar_intento(
          p_banco, 'ordinaria', 'pendiente_comprobacion', 'secuencia-incierta', p_nombre_archivo, p_huella_sha256,
          p_periodo_desde, p_periodo_hasta,
          'El extracto no enlaza con el último movimiento guardado. No se descarta ninguna línea.',
          p_lineas, v_leidas, 0
        );
      end if;

      v_h := 1;
      v_orden := v_last.orden_banco;
      v_omitidas := 0;
    else
      select posicion into v_h
      from tmp_punteo_entrada
      where fecha_operacion = v_last.fecha_operacion
        and importe_centimos = v_last.importe_centimos
        and saldo_centimos = v_last.saldo_centimos
        and saldo_anterior_centimos = v_last.saldo_anterior_centimos
        and concepto_normalizado = v_last.concepto_normalizado;

      v_orden := v_last.orden_banco;

      for v_pos in reverse v_h .. 1 loop
        select * into v_entrada from tmp_punteo_entrada where posicion = v_pos;
        select * into v_existente
        from public.punteo_movimientos
        where banco = p_banco and vigente and orden_banco = v_orden;

        if not found
          or v_existente.fecha_operacion <> v_entrada.fecha_operacion
          or v_existente.importe_centimos <> v_entrada.importe_centimos
          or v_existente.saldo_centimos <> v_entrada.saldo_centimos
          or v_existente.saldo_anterior_centimos <> v_entrada.saldo_anterior_centimos
          or v_existente.concepto_normalizado <> v_entrada.concepto_normalizado
        then
          return punteo_interno.registrar_intento(
            p_banco, 'ordinaria', 'pendiente_comprobacion', 'secuencia-incierta', p_nombre_archivo, p_huella_sha256,
            p_periodo_desde, p_periodo_hasta,
            format('La posición %s no coincide de forma inequívoca con la cadena ya guardada. No se omite ninguna línea.', v_pos),
            p_lineas, v_leidas, 0
          );
        end if;

        v_orden := v_orden - 1;
      end loop;

      v_omitidas := v_h;
      v_orden := v_last.orden_banco;
      v_h := v_h + 1;
    end if;
  end if;

  if v_h > v_leidas then
    return punteo_interno.registrar_intento(
      p_banco, 'ordinaria', 'rechazada', 'sin-nuevos', p_nombre_archivo, p_huella_sha256,
      p_periodo_desde, p_periodo_hasta,
      'Todos los movimientos ya estaban guardados. No se ha duplicado ninguno ni se ha cambiado su estado.',
      p_lineas, v_leidas, v_omitidas
    );
  end if;

  v_motivo := 'Importación ordinaria confirmada. Los movimientos ya guardados conservan su estado y sus observaciones.';

  perform set_config('punteo.accion', 'importacion', true);
  perform set_config('punteo.origen', 'importacion', true);
  perform set_config('punteo.proceso', 'punteo_confirmar_importacion', true);
  perform set_config('punteo.motivo', v_motivo, true);

  insert into public.punteo_importaciones (
    banco, tipo, estado, continuidad, nombre_archivo, huella_sha256,
    periodo_desde, periodo_hasta, primera_fecha_real, ultima_fecha_real,
    saldo_apertura_centimos, saldo_final_centimos,
    filas_leidas, filas_nuevas, filas_omitidas,
    motivo, lineas_json, importada_por
  )
  select
    p_banco, 'ordinaria', 'confirmada', 'cuadra', p_nombre_archivo, p_huella_sha256,
    p_periodo_desde, p_periodo_hasta, min(fecha_operacion), max(fecha_operacion),
    min(saldo_anterior_centimos) filter (where posicion = 1),
    max(saldo_centimos) filter (where posicion = (select max(posicion) from tmp_punteo_entrada)),
    v_leidas, v_leidas - v_h + 1, v_omitidas,
    v_motivo, null, v_actor
  from tmp_punteo_entrada
  returning id into v_id;

  v_nuevas := punteo_interno.insertar_lineas(v_id, p_banco, v_orden, v_h);

  perform punteo_interno.refrescar_ultimo(p_banco);

  return jsonb_build_object(
    'ok', true,
    'estado', 'confirmada',
    'continuidad', 'cuadra',
    'motivo', v_motivo,
    'importacion_id', v_id,
    'filas_leidas', v_leidas,
    'filas_nuevas', v_nuevas,
    'filas_omitidas', v_omitidas
  );
end;
$$;

comment on function public.punteo_confirmar_importacion(text, text, text, jsonb, date, date, text) is
  'Confirma un extracto posterior. Solo inserta el tramo nuevo que enlaza al céntimo. Si la identificación no es inequívoca, guarda el intento como pendiente y no omite líneas.';

create or replace function public.punteo_deshacer_importacion(
  p_importacion_id bigint,
  p_motivo text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_imp public.punteo_importaciones%rowtype;
  v_n integer;
  v_max_orden bigint;
begin
  perform punteo_interno.exigir_admin();

  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'motivo', 'No hay una sesión de administrador');
  end if;

  if p_motivo is null or length(btrim(p_motivo)) = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'Hace falta un motivo para deshacer');
  end if;

  select * into v_imp
  from public.punteo_importaciones
  where id = p_importacion_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'No existe esa importación');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('punteo-banco:' || v_imp.banco, 0));

  if v_imp.estado <> 'confirmada' then
    return jsonb_build_object('ok', false, 'motivo', 'Solo se deshace una importación confirmada');
  end if;

  if exists (
    select 1 from public.punteo_movimientos
    where importacion_id = v_imp.id
      and (
        decision_protegida
        or estado <> 'pendiente'
        or observaciones <> ''
        or origen_estado <> 'importacion'
      )
  ) then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Hay decisiones, estados u observaciones en esta importación. No se deshace y no se pierde esa información.'
    );
  end if;

  if v_imp.tipo = 'ordinaria' and exists (
    select 1
    from public.punteo_movimientos posterior
    join public.punteo_movimientos propio
      on propio.importacion_id = v_imp.id
    where posterior.banco = v_imp.banco
      and posterior.vigente
      and posterior.importacion_id <> v_imp.id
      and posterior.orden_banco > propio.orden_banco
  ) then
    return jsonb_build_object(
      'ok', false,
      'motivo', 'Hay una importación posterior. Deshaz primero la más reciente.'
    );
  end if;

  perform set_config('punteo.accion', 'deshacer-autorizado', true);
  perform set_config('punteo.origen', 'deshacer', true);
  perform set_config('punteo.proceso', 'punteo_deshacer_importacion', true);
  perform set_config('punteo.motivo', p_motivo, true);

  update public.punteo_movimientos
    set vigente = false
  where importacion_id = v_imp.id
    and vigente;

  get diagnostics v_n = row_count;

  if v_imp.tipo = 'historica' then
    select coalesce(max(posicion_archivo), 0) into v_max_orden
    from public.punteo_movimientos
    where importacion_id = v_imp.id;

    perform set_config('punteo.accion', 'reordenacion', true);
    perform set_config('punteo.origen', 'reordenacion', true);
    perform set_config('punteo.motivo', 'Se recupera el orden anterior al deshacer la carga histórica', true);

    update public.punteo_movimientos
      set orden_banco = orden_banco - v_max_orden
    where banco = v_imp.banco
      and vigente
      and orden_banco > v_max_orden;

    perform set_config('punteo.accion', 'deshacer-autorizado', true);
    perform set_config('punteo.origen', 'deshacer', true);
    perform set_config('punteo.motivo', p_motivo, true);

    update public.punteo_anclas
      set movimiento_ancla_id = null,
          actualizada_en = now(),
          actualizada_por = auth.uid()
    where banco = v_imp.banco;
  end if;

  update public.punteo_importaciones
    set estado = 'deshecha',
        motivo = p_motivo,
        deshecha_en = now(),
        deshecha_por = auth.uid()
  where id = v_imp.id;

  perform set_config('punteo.accion', 'deshacer-autorizado', true);
  perform punteo_interno.refrescar_ultimo(v_imp.banco);

  return jsonb_build_object(
    'ok', true,
    'estado', 'deshecha',
    'importacion_id', v_imp.id,
    'filas_ocultas', v_n,
    'motivo', p_motivo
  );
end;
$$;

comment on function public.punteo_deshacer_importacion(bigint, text) is
  'Oculta los movimientos de una importación equivocada si nadie los ha revisado. No los borra y no toca las decisiones ya guardadas.';

create or replace function public.punteo_cambiar_estado(
  p_movimiento_id bigint,
  p_estado text,
  p_motivo text,
  p_observaciones text default null,
  p_clase text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_mov public.punteo_movimientos%rowtype;
begin
  perform punteo_interno.exigir_admin();

  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'motivo', 'No hay una sesión de administrador');
  end if;

  if p_estado not in ('pendiente', 'comprobar', 'ok') then
    return jsonb_build_object('ok', false, 'motivo', 'El estado tiene que ser pendiente, comprobar u ok');
  end if;

  if p_motivo is null or length(btrim(p_motivo)) = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'Hace falta el motivo del cambio');
  end if;

  if p_clase is not null and p_clase not in (
    'normal', 'credito-cuota', 'tpv-ingreso', 'tpv-comision',
    'tpv-mantenimiento', 'tpv-devolucion', 'pendiente-clasificacion'
  ) then
    return jsonb_build_object('ok', false, 'motivo', 'La clase indicada no es válida');
  end if;

  select * into v_mov
  from public.punteo_movimientos
  where id = p_movimiento_id
    and vigente
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'No existe ese movimiento vigente');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('punteo-banco:' || v_mov.banco, 0));

  perform set_config('punteo.accion', 'decision-usuario', true);
  perform set_config('punteo.origen', 'usuario', true);
  perform set_config('punteo.proceso', 'punteo_cambiar_estado', true);
  perform set_config('punteo.motivo', p_motivo, true);

  update public.punteo_movimientos
    set estado = p_estado,
        motivo_estado = p_motivo,
        observaciones = coalesce(p_observaciones, observaciones),
        clase = coalesce(p_clase, clase),
        decision_protegida = true,
        origen_estado = 'usuario',
        analizado_en = now(),
        estado_actualizado_en = now(),
        estado_actualizado_por = auth.uid()
  where id = v_mov.id;

  return jsonb_build_object(
    'ok', true,
    'movimiento_id', v_mov.id,
    'estado', p_estado,
    'decision_protegida', true
  );
end;
$$;

comment on function public.punteo_cambiar_estado(bigint, text, text, text, text) is
  'Registra una decisión del administrador y la protege. Una importación o una revisión futura no puede pisarla.';

create or replace function public.punteo_guardar_observacion(
  p_movimiento_id bigint,
  p_observaciones text,
  p_observacion_esperada text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_mov public.punteo_movimientos%rowtype;
  v_texto text := coalesce(p_observaciones, '');
  v_esperado text := coalesce(p_observacion_esperada, '');
begin
  perform punteo_interno.exigir_admin();

  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'motivo', 'No hay una sesión de administrador');
  end if;

  select * into v_mov
  from public.punteo_movimientos
  where id = p_movimiento_id
    and vigente
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'No existe ese movimiento vigente');
  end if;

  if v_mov.observaciones is distinct from v_esperado then
    return jsonb_build_object(
      'ok', false,
      'conflicto', true,
      'cambio', false,
      'motivo', 'La observación ha cambiado en otro dispositivo. No se ha sobrescrito.',
      'movimiento_id', v_mov.id,
      'estado', v_mov.estado,
      'decision_protegida', v_mov.decision_protegida,
      'observaciones', v_mov.observaciones
    );
  end if;

  if v_mov.observaciones is not distinct from v_texto then
    return jsonb_build_object(
      'ok', true,
      'conflicto', false,
      'cambio', false,
      'movimiento_id', v_mov.id,
      'estado', v_mov.estado,
      'decision_protegida', v_mov.decision_protegida,
      'observaciones', v_mov.observaciones
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('punteo-banco:' || v_mov.banco, 0));
  perform set_config('punteo.accion', 'observacion', true);
  perform set_config('punteo.origen', 'usuario', true);
  perform set_config('punteo.proceso', 'punteo_guardar_observacion', true);
  perform set_config('punteo.motivo', 'Observación del administrador. No cambia el estado ni la protección.', true);

  update public.punteo_movimientos
    set observaciones = v_texto
  where id = v_mov.id;

  return jsonb_build_object(
    'ok', true,
    'conflicto', false,
    'cambio', true,
    'movimiento_id', v_mov.id,
    'estado', v_mov.estado,
    'decision_protegida', v_mov.decision_protegida,
    'observaciones', v_texto
  );
end;
$$;

comment on function public.punteo_guardar_observacion(bigint, text, text) is
  'Guarda la observación solo si sigue siendo el texto que el dispositivo había leído. El estado y la protección no cambian. Un conflicto no escribe ni anota el historial.';

create or replace function public.punteo_confirmar_hueco(
  p_banco text,
  p_desde date,
  p_hasta date,
  p_motivo text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id bigint;
begin
  perform punteo_interno.exigir_admin();

  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'motivo', 'No hay una sesión de administrador');
  end if;

  if p_banco not in ('caixabank', 'ibercaja') then
    return jsonb_build_object('ok', false, 'motivo', 'Banco no reconocido');
  end if;

  if p_desde is null or p_hasta is null or p_desde > p_hasta then
    return jsonb_build_object('ok', false, 'motivo', 'El periodo del hueco no es válido');
  end if;

  if p_motivo is null or length(btrim(p_motivo)) = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'Hace falta el motivo del hueco');
  end if;

  perform set_config('punteo.accion', 'hueco', true);
  perform set_config('punteo.origen', 'hueco', true);
  perform set_config('punteo.proceso', 'punteo_confirmar_hueco', true);
  perform set_config('punteo.motivo', p_motivo, true);

  insert into public.punteo_huecos (banco, desde, hasta, motivo, confirmado_por)
  values (p_banco, p_desde, p_hasta, p_motivo, auth.uid())
  returning id into v_id;

  return jsonb_build_object('ok', true, 'hueco_id', v_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'motivo', 'Ese hueco ya está confirmado');
end;
$$;

create or replace function public.punteo_anular_hueco(
  p_hueco_id bigint,
  p_motivo text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform punteo_interno.exigir_admin();

  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'motivo', 'No hay una sesión de administrador');
  end if;

  if p_motivo is null or length(btrim(p_motivo)) = 0 then
    return jsonb_build_object('ok', false, 'motivo', 'Hace falta el motivo de la anulación');
  end if;

  perform set_config('punteo.accion', 'hueco', true);
  perform set_config('punteo.origen', 'hueco', true);
  perform set_config('punteo.proceso', 'punteo_anular_hueco', true);
  perform set_config('punteo.motivo', p_motivo, true);

  update public.punteo_huecos
    set vigente = false,
        motivo = p_motivo,
        anulado_en = now(),
        anulado_por = auth.uid()
  where id = p_hueco_id
    and vigente;

  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'No existe ese hueco vigente');
  end if;

  return jsonb_build_object('ok', true, 'hueco_id', p_hueco_id, 'vigente', false);
end;
$$;

-- ---------------------------------------------------------------------------
-- Permisos. Gestoría: ninguna política. Anónimo: ningún permiso.
-- El historial solo se inserta cuando el disparador enciende la marca interna.
-- ---------------------------------------------------------------------------

alter table public.punteo_importaciones enable row level security;
alter table public.punteo_movimientos enable row level security;
alter table public.punteo_anclas enable row level security;
alter table public.punteo_huecos enable row level security;
alter table public.punteo_historial enable row level security;

alter table public.punteo_importaciones force row level security;
alter table public.punteo_movimientos force row level security;
alter table public.punteo_anclas force row level security;
alter table public.punteo_huecos force row level security;
alter table public.punteo_historial force row level security;

revoke all on public.punteo_importaciones from public, anon, authenticated;
revoke all on public.punteo_movimientos from public, anon, authenticated;
revoke all on public.punteo_anclas from public, anon, authenticated;
revoke all on public.punteo_huecos from public, anon, authenticated;
revoke all on public.punteo_historial from public, anon, authenticated;

grant select, insert, update on public.punteo_importaciones to authenticated;
grant select, insert, update on public.punteo_movimientos to authenticated;
grant select, update on public.punteo_anclas to authenticated;
grant select, insert, update on public.punteo_huecos to authenticated;
grant select, insert on public.punteo_historial to authenticated;

grant usage, select on sequence public.punteo_importaciones_id_seq to authenticated;
grant usage, select on sequence public.punteo_movimientos_id_seq to authenticated;
grant usage, select on sequence public.punteo_huecos_id_seq to authenticated;
grant usage, select on sequence public.punteo_historial_id_seq to authenticated;

do $roles$
begin
  if exists (select 1 from pg_catalog.pg_roles where rolname = 'service_role') then
    execute 'revoke all on public.punteo_importaciones from service_role';
    execute 'revoke all on public.punteo_movimientos from service_role';
    execute 'revoke all on public.punteo_anclas from service_role';
    execute 'revoke all on public.punteo_huecos from service_role';
    execute 'revoke all on public.punteo_historial from service_role';
    execute 'revoke all on sequence public.punteo_importaciones_id_seq from service_role';
    execute 'revoke all on sequence public.punteo_movimientos_id_seq from service_role';
    execute 'revoke all on sequence public.punteo_huecos_id_seq from service_role';
    execute 'revoke all on sequence public.punteo_historial_id_seq from service_role';
    execute 'revoke all on schema punteo_interno from service_role';
  end if;
end
$roles$;

create policy punteo_importaciones_admin_select
  on public.punteo_importaciones for select to authenticated
  using (public.es_admin());

create policy punteo_importaciones_admin_insert
  on public.punteo_importaciones for insert to authenticated
  with check (public.es_admin());

create policy punteo_importaciones_admin_update
  on public.punteo_importaciones for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy punteo_movimientos_admin_select
  on public.punteo_movimientos for select to authenticated
  using (public.es_admin());

create policy punteo_movimientos_admin_insert
  on public.punteo_movimientos for insert to authenticated
  with check (public.es_admin());

create policy punteo_movimientos_admin_update
  on public.punteo_movimientos for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy punteo_anclas_admin_select
  on public.punteo_anclas for select to authenticated
  using (public.es_admin());

create policy punteo_anclas_admin_update
  on public.punteo_anclas for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy punteo_huecos_admin_select
  on public.punteo_huecos for select to authenticated
  using (public.es_admin());

create policy punteo_huecos_admin_insert
  on public.punteo_huecos for insert to authenticated
  with check (public.es_admin());

create policy punteo_huecos_admin_update
  on public.punteo_huecos for update to authenticated
  using (public.es_admin()) with check (public.es_admin());

create policy punteo_historial_admin_select
  on public.punteo_historial for select to authenticated
  using (public.es_admin());

create policy punteo_historial_insert_disparador
  on public.punteo_historial for insert to authenticated
  with check (
    public.es_admin()
    and current_setting('punteo.historial_interno', true) = '1'
  );

-- Anclas iniciales. No son movimientos.
select set_config('punteo.accion', 'sistema', true);
select set_config('punteo.origen', 'sistema', true);
select set_config('punteo.motivo', 'Ancla inicial del 30/09/2026. No es un movimiento bancario.', true);
select set_config('punteo.proceso', 'migracion-fase-1', true);

insert into public.punteo_anclas (
  banco, fecha_ancla, concepto, importe_centimos, saldo_centimos, fecha_historico_desde
) values
  ('caixabank', date '2026-09-30', 'Pagaré', -46554, -912852, date '2026-02-01'),
  ('ibercaja', date '2026-09-30', 'Operación en cajero automático', -50000, 753464, date '2026-04-27');

revoke all on all functions in schema punteo_interno from public;

grant execute on function punteo_interno.normalizar_texto(text) to authenticated;
grant execute on function punteo_interno.exigir_admin() to authenticated;
grant execute on function punteo_interno.accion_actual() to authenticated;
grant execute on function punteo_interno.borrar_bloqueado() to authenticated;
grant execute on function punteo_interno.historial_bloquear() to authenticated;
grant execute on function punteo_interno.historial_insertar(text, bigint, bigint, bigint, text, text, text) to authenticated;
grant execute on function punteo_interno.historial_aplicar() to authenticated;
grant execute on function punteo_interno.escritura_controlar() to authenticated;
grant execute on function punteo_interno.preparar_lineas(jsonb) to authenticated;
grant execute on function punteo_interno.registrar_intento(text, text, text, text, text, text, date, date, text, jsonb, integer, integer) to authenticated;
grant execute on function punteo_interno.refrescar_ultimo(text) to authenticated;
grant execute on function punteo_interno.insertar_lineas(bigint, text, bigint, integer) to authenticated;
grant execute on function punteo_interno.copiar_huella_archivo() to authenticated;

revoke all on function public.punteo_confirmar_carga_historica(text, text, text, jsonb, date, date, text) from public, anon;
revoke all on function public.punteo_confirmar_importacion(text, text, text, jsonb, date, date, text) from public, anon;
revoke all on function public.punteo_deshacer_importacion(bigint, text) from public, anon;
revoke all on function public.punteo_cambiar_estado(bigint, text, text, text, text) from public, anon;
revoke all on function public.punteo_confirmar_hueco(text, date, date, text) from public, anon;
revoke all on function public.punteo_anular_hueco(bigint, text) from public, anon;
revoke all on function public.punteo_guardar_observacion(bigint, text, text) from public, anon;

grant execute on function public.punteo_confirmar_carga_historica(text, text, text, jsonb, date, date, text) to authenticated;
grant execute on function public.punteo_confirmar_importacion(text, text, text, jsonb, date, date, text) to authenticated;
grant execute on function public.punteo_deshacer_importacion(bigint, text) to authenticated;
grant execute on function public.punteo_cambiar_estado(bigint, text, text, text, text) to authenticated;
grant execute on function public.punteo_confirmar_hueco(text, date, date, text) to authenticated;
grant execute on function public.punteo_anular_hueco(bigint, text) to authenticated;
grant execute on function public.punteo_guardar_observacion(bigint, text, text) to authenticated;

commit;
