import { formatearCentimos } from "./centimos";
import { terminalFactTpv } from "./clasificar-movimiento";
import { asignarDevolucionCentimos, esAbonoCompensacionTpv, type LineaReparto } from "./reparto-abono-comision";

export type LineaTpvDetalle = {
  id: string;
  fecha: string;
  fechaValor: string;
  importeCentimos: number;
  clase: string;
  conceptoOriginal: string;
  detallesOriginales: string;
  ordenBanco: number;
  referencias: string[];
};

export type FilaDetalleTpv = {
  id: string;
  fecha: string;
  fechaValor: string;
  conceptoOriginal: string;
  detallesOriginales: string;
  terminal: string;
  referencias: string[];
  importeCentimos: number;
  clase: string;
  etiquetaClase: string;
  imputacionCentimos: number;
  esAbonoBancario: boolean;
  ordenBanco: number;
};

export type AbonoBancarioTpv = {
  id: string;
  fecha: string;
  fechaValor: string;
  importeCentimos: number;
};

export type DetalleMesTpv = {
  anio: number;
  mes: number;
  filas: FilaDetalleTpv[];
  ingresosCentimos: number;
  comisionesOriginalesCentimos: number;
  devolucionAsignadaCentimos: number;
  comisionNetaCentimos: number;
  porcentajeEfectivo: string | null;
  mantenimientoCentimos: number;
  abonos: AbonoBancarioTpv[];
};

export function etiquetaClaseTpv(clase: string) {
  switch (clase) {
    case "tpv-ingreso":
      return "Ingreso";
    case "tpv-comision":
      return "Comisión";
    case "tpv-devolucion":
      return "Devolución";
    case "tpv-mantenimiento":
      return "Mantenimiento";
    default:
      return clase;
  }
}

/**
 * Detalle de solo lectura. La imputación sale del mismo reparto que el resumen.
 * El abono bancario se muestra una vez, en su fecha de operación, y no se suma
 * otra vez a la comisión. El mantenimiento no entra en las comisiones de ventas.
 */
export function detallarMesTpv(anio: number, mes: number, lineas: LineaTpvDetalle[]): DetalleMesTpv {
  const reparto: LineaReparto[] = lineas.map((linea) => ({
    id: linea.id,
    fecha: linea.fecha,
    fechaValor: linea.fechaValor,
    centimos: linea.importeCentimos,
    clase: linea.clase,
    conceptoOriginal: linea.conceptoOriginal,
    detallesOriginales: linea.detallesOriginales,
  }));
  const asignacion = asignarDevolucionCentimos(reparto);
  const prefijo = `${anio}-${String(mes).padStart(2, "0")}`;
  const delMes = lineas.filter((linea) => linea.fecha.startsWith(prefijo));
  const filas = delMes
    .map((linea) => filaDetalle(linea, asignacion))
    .sort((a, b) => b.ordenBanco - a.ordenBanco || b.id.localeCompare(a.id));
  const ingresosCentimos = sumar(filas, "tpv-ingreso");
  const comisionesOriginalesCentimos = sumar(filas, "tpv-comision");
  const devolucionAsignadaCentimos = filas
    .filter((fila) => fila.clase === "tpv-comision")
    .reduce((total, fila) => total + fila.imputacionCentimos, 0);
  const mantenimientoCentimos = sumar(filas, "tpv-mantenimiento");

  return {
    anio,
    mes,
    filas,
    ingresosCentimos,
    comisionesOriginalesCentimos,
    devolucionAsignadaCentimos,
    comisionNetaCentimos: comisionesOriginalesCentimos + devolucionAsignadaCentimos,
    porcentajeEfectivo: porcentaje(ingresosCentimos, comisionesOriginalesCentimos + devolucionAsignadaCentimos),
    mantenimientoCentimos,
    abonos: lineas
      .filter((linea) => esAbonoCompensacionTpv(linea.conceptoOriginal, linea.detallesOriginales, linea.importeCentimos))
      .map((linea) => ({
        id: linea.id,
        fecha: linea.fecha,
        fechaValor: linea.fechaValor,
        importeCentimos: linea.importeCentimos,
      })),
  };
}

export function abonosFueraDelMes(detalle: DetalleMesTpv) {
  const prefijo = `${detalle.anio}-${String(detalle.mes).padStart(2, "0")}`;
  return detalle.abonos.filter((abono) => !abono.fecha.startsWith(prefijo));
}

function filaDetalle(linea: LineaTpvDetalle, asignacion: Map<string, number>): FilaDetalleTpv {
  const terminal = terminalFactTpv(linea.conceptoOriginal, linea.detallesOriginales);
  const esAbono = esAbonoCompensacionTpv(linea.conceptoOriginal, linea.detallesOriginales, linea.importeCentimos);

  return {
    id: linea.id,
    fecha: linea.fecha,
    fechaValor: linea.fechaValor,
    conceptoOriginal: linea.conceptoOriginal,
    detallesOriginales: linea.detallesOriginales,
    terminal,
    referencias: linea.referencias,
    importeCentimos: linea.importeCentimos,
    clase: linea.clase,
    etiquetaClase: etiquetaClaseTpv(linea.clase),
    imputacionCentimos: linea.clase === "tpv-comision" ? (asignacion.get(linea.id) ?? 0) : 0,
    esAbonoBancario: esAbono,
    ordenBanco: linea.ordenBanco,
  };
}

function sumar(filas: FilaDetalleTpv[], clase: string) {
  return filas.filter((fila) => fila.clase === clase).reduce((total, fila) => total + fila.importeCentimos, 0);
}

function porcentaje(ingresosCentimos: number, comisionesCentimos: number) {
  if (ingresosCentimos <= 0) {
    return null;
  }

  const centesimas = Math.round((Math.abs(comisionesCentimos) * 10000) / ingresosCentimos);
  return `${formatearCentimos(centesimas)} %`;
}
