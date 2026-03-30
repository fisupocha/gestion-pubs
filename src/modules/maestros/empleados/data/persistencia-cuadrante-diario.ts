import { supabase } from "@/lib/supabase";

export type RegistroCuadranteDiario = {
  id?: number;
  fecha: string;
  hora: string;
  empleadoId: number;
  nombreEmpleado: string;
  familia: string;
  empresaId: number | null;
  local: string;
  precio: number;
};

export type FiltrosResumenCuadrante = {
  fechaDesde: string;
  fechaHasta: string;
  local?: string;
  familia?: string;
  empleadoId?: number | null;
};

export type RegistroCajaResumen = {
  fecha: string;
  empresaId: number | null;
  totalCaja: number;
};

type RegistroCuadranteRow = {
  id: number;
  fecha: string;
  hora: string;
  empleado_id: number;
  nombre_empleado: string;
  familia: string;
  empresa_id: number | null;
  local: string;
  precio: number | string;
};

type RegistroCajaRow = {
  fecha_caja: string;
  empresa_id: number | null;
  total_caja: number | string;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function claveRegistro(registro: Pick<RegistroCuadranteDiario, "empleadoId" | "hora">) {
  return `${registro.empleadoId}__${registro.hora}`;
}

export async function listarCuadranteDiarioPersistido(fecha: string) {
  const { data, error } = await supabase
    .from("cuadrante_diario_empleados")
    .select(
      "id, fecha, hora, empleado_id, nombre_empleado, familia, empresa_id, local, precio"
    )
    .eq("fecha", fecha)
    .order("hora", { ascending: true })
    .order("nombre_empleado", { ascending: true });

  if (error) {
    throw new Error("No se pudo cargar el cuadrante diario");
  }

  return ((data ?? []) as RegistroCuadranteRow[]).map((item) => ({
    id: item.id,
    fecha: item.fecha,
    hora: item.hora,
    empleadoId: item.empleado_id,
    nombreEmpleado: item.nombre_empleado,
    familia: item.familia ?? "",
    empresaId: item.empresa_id ?? null,
    local: item.local,
    precio: round2(Number(item.precio ?? 0)),
  }));
}

export async function listarResumenCuadrantePersistido({
  fechaDesde,
  fechaHasta,
  local,
  familia,
  empleadoId,
}: FiltrosResumenCuadrante) {
  let query = supabase
    .from("cuadrante_diario_empleados")
    .select(
      "id, fecha, hora, empleado_id, nombre_empleado, familia, empresa_id, local, precio"
    )
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta)
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true })
    .order("nombre_empleado", { ascending: true });

  if (local) {
    query = query.eq("local", local);
  }

  if (familia) {
    query = query.eq("familia", familia);
  }

  if (typeof empleadoId === "number") {
    query = query.eq("empleado_id", empleadoId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("No se pudo cargar el resumen del cuadrante");
  }

  return ((data ?? []) as RegistroCuadranteRow[]).map((item) => ({
    id: item.id,
    fecha: item.fecha,
    hora: item.hora,
    empleadoId: item.empleado_id,
    nombreEmpleado: item.nombre_empleado,
    familia: item.familia ?? "",
    empresaId: item.empresa_id ?? null,
    local: item.local,
    precio: round2(Number(item.precio ?? 0)),
  }));
}

export async function listarCajaResumenPersistido({
  fechaDesde,
  fechaHasta,
  local,
}: Pick<FiltrosResumenCuadrante, "fechaDesde" | "fechaHasta" | "local">) {
  let query = supabase
    .from("operativa_caja")
    .select("fecha_caja, empresa_id, total_caja")
    .gte("fecha_caja", fechaDesde)
    .lte("fecha_caja", fechaHasta)
    .order("fecha_caja", { ascending: true });

  if (local) {
    const { data: empresas, error: errorEmpresas } = await supabase
      .from("empresas")
      .select("id")
      .eq("nombre", local);

    if (errorEmpresas) {
      throw new Error("No se pudo resolver el local de caja");
    }

    const empresaIds = (empresas ?? []).map((item) => Number(item.id)).filter(Number.isFinite);

    if (empresaIds.length === 0) {
      return [];
    }

    query = query.in("empresa_id", empresaIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error("No se pudo cargar la caja para el resumen");
  }

  return ((data ?? []) as RegistroCajaRow[]).map((item) => ({
    fecha: item.fecha_caja,
    empresaId: item.empresa_id ?? null,
    totalCaja: round2(Number(item.total_caja ?? 0)),
  }));
}

export async function guardarCuadranteDiarioPersistido(
  fecha: string,
  registros: RegistroCuadranteDiario[]
) {
  const { data: existentes, error: errorExistentes } = await supabase
    .from("cuadrante_diario_empleados")
    .select("id, empleado_id, hora")
    .eq("fecha", fecha);

  if (errorExistentes) {
    throw new Error("No se pudo preparar el guardado del cuadrante diario");
  }

  const registrosNormalizados = registros.map((registro) => ({
    fecha,
    hora: registro.hora,
    empleado_id: registro.empleadoId,
    nombre_empleado: registro.nombreEmpleado,
    familia: registro.familia,
    empresa_id: registro.empresaId,
    local: registro.local,
    precio: round2(registro.precio),
  }));

  if (registrosNormalizados.length > 0) {
    const { error: errorUpsert } = await supabase
      .from("cuadrante_diario_empleados")
      .upsert(registrosNormalizados, {
        onConflict: "fecha,empleado_id,hora",
      });

    if (errorUpsert) {
      throw new Error("No se pudo guardar el cuadrante diario");
    }
  }

  const clavesActuales = new Set(registros.map((registro) => claveRegistro(registro)));
  const idsBorrar = ((existentes ?? []) as Array<{ id: number; empleado_id: number; hora: string }>)
    .filter(
      (item) => !clavesActuales.has(claveRegistro({ empleadoId: item.empleado_id, hora: item.hora }))
    )
    .map((item) => item.id);

  if (idsBorrar.length > 0) {
    const { error: errorDelete } = await supabase
      .from("cuadrante_diario_empleados")
      .delete()
      .in("id", idsBorrar);

    if (errorDelete) {
      throw new Error("No se pudo limpiar el cuadrante diario anterior");
    }
  }
}
