import { supabase } from "@/lib/supabase";
import { exigirConexionPunteo } from "./conexion-punteo";
import { lineasOficiales } from "./linea-oficial";
import { mensajeErrorSeguro, type ResultadoOficial } from "./mensajes-importacion";
import { identificarExcel } from "./importacion-doble";
import { decisionPaginaTpv, sumarImportesTpv, TAMANO_PAGINA_TPV } from "./paginacion-tpv";
import type { BancoPunteoId, EstadoOk } from "./modelo";
import { CLASES_VISIBLES_TABLA, type ClaseMovimiento, type MovimientoInterno } from "./movimiento-interno";

const CLASES_VISIBLES = CLASES_VISIBLES_TABLA;
const CLASES_RESUMEN_TPV = ["tpv-ingreso", "tpv-comision"] as const;
const LIMITE_PAGINA = 200;

export type MovimientoOficial = {
  id: number;
  fecha: string;
  fechaValor: string;
  importeCentimos: number;
  saldoCentimos: number;
  conceptoOriginal: string;
  detallesOriginales: string;
  clase: ClaseMovimiento;
  observaciones: string;
  estado: EstadoOk;
  decisionProtegida: boolean;
  ordenBanco: number;
  motivoEstado: string;
  origenEstado: string;
};

export type PaginaOficial = {
  filas: MovimientoOficial[];
  desde: number;
  limite: number;
  hayMas: boolean;
};

export type UltimoMovimientoOficial = {
  fecha: string;
  concepto: string;
  importeCentimos: number;
  saldoCentimos: number;
};

export type ImportacionOficial = {
  id: number;
  banco: BancoPunteoId;
  tipo: string;
  estado: string;
  continuidad: string;
  nombreArchivo: string;
  importadaEn: string;
  filasLeidas: number;
  filasNuevas: number;
  filasOmitidas: number;
  motivo: string;
  huella: string;
  huellaArchivo: string | null;
  primeraFecha: string | null;
  ultimaFecha: string | null;
};

export type ResumenTpvMesOficial = {
  ingresosCentimos: number;
  comisionesCentimos: number;
  incompleto: boolean;
};

type FilaMovimiento = {
  id: number;
  fecha_operacion: string;
  fecha_valor: string | null;
  importe_centimos: number;
  saldo_centimos: number;
  concepto_original: string;
  detalles_originales: string;
  clase: ClaseMovimiento;
  observaciones: string;
  estado: EstadoOk;
  decision_protegida: boolean;
  orden_banco: number;
  motivo_estado: string;
  origen_estado: string;
};

const COLUMNAS_MOVIMIENTO =
  "id, fecha_operacion, fecha_valor, importe_centimos, saldo_centimos, concepto_original, detalles_originales, clase, observaciones, estado, decision_protegida, orden_banco, motivo_estado, origen_estado";

export async function leerMovimientosAnio(opciones: {
  banco: BancoPunteoId;
  anio: number;
  desde?: number;
  limite?: number;
}): Promise<PaginaOficial> {
  exigirConexionPunteo();
  const desde = Math.max(0, opciones.desde ?? 0);
  const limite = Math.min(LIMITE_PAGINA, Math.max(1, opciones.limite ?? 100));
  const { data, error } = await supabase
    .from("punteo_movimientos")
    .select(COLUMNAS_MOVIMIENTO)
    .eq("banco", opciones.banco)
    .eq("vigente", true)
    .in("clase", [...CLASES_VISIBLES])
    .gte("fecha_operacion", `${opciones.anio}-01-01`)
    .lte("fecha_operacion", `${opciones.anio}-12-31`)
    .order("orden_banco", { ascending: false })
    .range(desde, desde + limite);

  if (error) {
    throw new Error(mensajeErrorSeguro(error));
  }

  const filas = ((data ?? []) as FilaMovimiento[]).map(mapearMovimiento);
  const hayMas = filas.length > limite;

  return {
    filas: hayMas ? filas.slice(0, limite) : filas,
    desde,
    limite,
    hayMas,
  };
}

export async function leerUltimoMovimiento(banco: BancoPunteoId): Promise<UltimoMovimientoOficial | null> {
  exigirConexionPunteo();
  const ancla = await supabase
    .from("punteo_anclas")
    .select("movimiento_ultimo_id")
    .eq("banco", banco)
    .maybeSingle();

  if (ancla.error) {
    throw new Error(mensajeErrorSeguro(ancla.error));
  }

  const id = ancla.data?.movimiento_ultimo_id as number | null | undefined;

  if (!id) {
    return null;
  }

  const movimiento = await supabase
    .from("punteo_movimientos")
    .select("fecha_operacion, concepto_original, importe_centimos, saldo_centimos")
    .eq("id", id)
    .maybeSingle();

  if (movimiento.error) {
    throw new Error(mensajeErrorSeguro(movimiento.error));
  }

  if (!movimiento.data) {
    return null;
  }

  const fila = movimiento.data as {
    fecha_operacion: string;
    concepto_original: string;
    importe_centimos: number;
    saldo_centimos: number;
  };

  return {
    fecha: fila.fecha_operacion,
    concepto: fila.concepto_original,
    importeCentimos: fila.importe_centimos,
    saldoCentimos: fila.saldo_centimos,
  };
}

export async function leerObservacionOficial(movimientoId: number) {
  exigirConexionPunteo();
  const { data, error } = await supabase
    .from("punteo_movimientos")
    .select("observaciones, estado, decision_protegida")
    .eq("id", movimientoId)
    .eq("vigente", true)
    .maybeSingle();

  if (error) {
    throw new Error(mensajeErrorSeguro(error));
  }

  if (!data) {
    return null;
  }

  const fila = data as { observaciones: string | null; estado: EstadoOk; decision_protegida: boolean };

  return {
    observaciones: fila.observaciones ?? "",
    estado: fila.estado,
    decisionProtegida: fila.decision_protegida,
  };
}

export async function leerImportaciones(banco: BancoPunteoId): Promise<ImportacionOficial[]> {
  exigirConexionPunteo();
  const { data, error } = await supabase
    .from("punteo_importaciones")
    .select(
      "id, banco, tipo, estado, continuidad, nombre_archivo, huella_sha256, huella_archivo, importada_en, filas_leidas, filas_nuevas, filas_omitidas, motivo, primera_fecha_real, ultima_fecha_real"
    )
    .eq("banco", banco)
    .order("importada_en", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(mensajeErrorSeguro(error));
  }

  return ((data ?? []) as Record<string, unknown>[]).map((fila) => ({
    id: Number(fila.id),
    banco: fila.banco as BancoPunteoId,
    tipo: String(fila.tipo),
    estado: String(fila.estado),
    continuidad: String(fila.continuidad),
    nombreArchivo: String(fila.nombre_archivo),
    importadaEn: String(fila.importada_en),
    filasLeidas: Number(fila.filas_leidas),
    filasNuevas: Number(fila.filas_nuevas),
    filasOmitidas: Number(fila.filas_omitidas),
    motivo: String(fila.motivo),
    huella: String(fila.huella_sha256),
    huellaArchivo: fila.huella_archivo ? String(fila.huella_archivo) : null,
    primeraFecha: (fila.primera_fecha_real as string | null) ?? null,
    ultimaFecha: (fila.ultima_fecha_real as string | null) ?? null,
  }));
}

export async function leerResumenTpvMes(
  banco: BancoPunteoId,
  anio: number,
  mes: number
): Promise<ResumenTpvMesOficial> {
  exigirConexionPunteo();
  const desdeFecha = `${anio}-${String(mes).padStart(2, "0")}-01`;
  const hastaFecha = `${anio}-${String(mes).padStart(2, "0")}-${String(diasDelMes(anio, mes)).padStart(2, "0")}`;
  let ingresosCentimos = 0;
  let comisionesCentimos = 0;
  let cursor = 0;

  for (let pagina = 0; pagina < 500; pagina += 1) {
    const { data, error } = await supabase
      .from("punteo_movimientos")
      .select("clase, importe_centimos")
      .eq("banco", banco)
      .eq("vigente", true)
      .in("clase", [...CLASES_RESUMEN_TPV])
      .gte("fecha_operacion", desdeFecha)
      .lte("fecha_operacion", hastaFecha)
      .order("orden_banco", { ascending: true })
      .order("id", { ascending: true })
      .range(cursor, cursor + TAMANO_PAGINA_TPV - 1);

    const recibidas = error ? 0 : (data?.length ?? 0);
    const decision = decisionPaginaTpv(recibidas, TAMANO_PAGINA_TPV, Boolean(error));

    if (decision === "incompleta") {
      return { ingresosCentimos: 0, comisionesCentimos: 0, incompleto: true };
    }

    const suma = sumarImportesTpv((data ?? []) as { clase: string; importe_centimos: number }[]);
    ingresosCentimos += suma.ingresosCentimos;
    comisionesCentimos += suma.comisionesCentimos;

    if (decision === "completa") {
      return { ingresosCentimos, comisionesCentimos, incompleto: false };
    }

    cursor += TAMANO_PAGINA_TPV;
  }

  return { ingresosCentimos: 0, comisionesCentimos: 0, incompleto: true };
}

export async function confirmarCargaHistorica(opciones: {
  banco: BancoPunteoId;
  nombreArchivo: string;
  contenido: ArrayBuffer;
  movimientos: MovimientoInterno[];
  periodoDesde: string;
  periodoHasta: string;
}) {
  return llamarImportacion("punteo_confirmar_carga_historica", opciones);
}

export async function confirmarImportacionOrdinaria(opciones: {
  banco: BancoPunteoId;
  nombreArchivo: string;
  contenido: ArrayBuffer;
  movimientos: MovimientoInterno[];
  periodoDesde: string | null;
  periodoHasta: string | null;
}) {
  return llamarImportacion("punteo_confirmar_importacion", opciones);
}

export async function cambiarEstadoOficial(opciones: {
  movimientoId: number;
  estado: EstadoOk;
  motivo: string;
  observaciones?: string | null;
  clase?: ClaseMovimiento | null;
}) {
  exigirConexionPunteo();
  return ejecutar("punteo_cambiar_estado", {
    p_movimiento_id: opciones.movimientoId,
    p_estado: opciones.estado,
    p_motivo: opciones.motivo,
    p_observaciones: opciones.observaciones === undefined ? null : opciones.observaciones,
    p_clase: opciones.clase ?? null,
  });
}

export async function guardarObservacionOficial(
  movimientoId: number,
  observaciones: string,
  observacionEsperada: string
) {
  exigirConexionPunteo();
  return ejecutar("punteo_guardar_observacion", {
    p_movimiento_id: movimientoId,
    p_observaciones: observaciones,
    p_observacion_esperada: observacionEsperada,
  });
}

export async function deshacerImportacionOficial(importacionId: number, motivo: string) {
  exigirConexionPunteo();
  return ejecutar("punteo_deshacer_importacion", {
    p_importacion_id: importacionId,
    p_motivo: motivo,
  });
}

export async function confirmarHuecoOficial(opciones: {
  banco: BancoPunteoId;
  desde: string;
  hasta: string;
  motivo: string;
}) {
  exigirConexionPunteo();
  return ejecutar("punteo_confirmar_hueco", {
    p_banco: opciones.banco,
    p_desde: opciones.desde,
    p_hasta: opciones.hasta,
    p_motivo: opciones.motivo,
  });
}

export async function anularHuecoOficial(huecoId: number, motivo: string) {
  exigirConexionPunteo();
  return ejecutar("punteo_anular_hueco", {
    p_hueco_id: huecoId,
    p_motivo: motivo,
  });
}

async function llamarImportacion(
  funcion: "punteo_confirmar_carga_historica" | "punteo_confirmar_importacion",
  opciones: {
    banco: BancoPunteoId;
    nombreArchivo: string;
    contenido: ArrayBuffer;
    movimientos: MovimientoInterno[];
    periodoDesde: string | null;
    periodoHasta: string | null;
  }
) {
  exigirConexionPunteo();
  const identidad = await identificarExcel(opciones.contenido);
  const parte = funcion === "punteo_confirmar_carga_historica" ? "historica" : "ordinaria";
  const lineas = lineasOficiales(opciones.banco, opciones.movimientos);

  return ejecutar(funcion, {
    p_banco: opciones.banco,
    p_nombre_archivo: opciones.nombreArchivo,
    p_huella_sha256: parte === "historica" ? identidad.historica : identidad.ordinaria,
    p_huella_archivo: identidad.archivo,
    p_lineas: lineas,
    p_periodo_desde: opciones.periodoDesde,
    p_periodo_hasta: opciones.periodoHasta,
  });
}

async function ejecutar(funcion: string, argumentos: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(funcion, argumentos);

  if (error) {
    throw new Error(mensajeErrorSeguro(error));
  }

  return (data ?? {}) as ResultadoOficial;
}

function mapearMovimiento(fila: FilaMovimiento): MovimientoOficial {
  return {
    id: fila.id,
    fecha: fila.fecha_operacion,
    fechaValor: fila.fecha_valor ?? "",
    importeCentimos: fila.importe_centimos,
    saldoCentimos: fila.saldo_centimos,
    conceptoOriginal: fila.concepto_original,
    detallesOriginales: fila.detalles_originales,
    clase: fila.clase,
    observaciones: fila.observaciones,
    estado: fila.estado,
    decisionProtegida: fila.decision_protegida,
    ordenBanco: fila.orden_banco,
    motivoEstado: fila.motivo_estado,
    origenEstado: fila.origen_estado,
  };
}

function diasDelMes(anio: number, mes: number) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}
