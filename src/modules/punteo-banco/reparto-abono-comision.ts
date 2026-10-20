import { aCentimos } from "./centimos";
import { normalizarTexto } from "./celdas";
import { esFactTpv, terminalFactTpv } from "./clasificar-movimiento";

export const VALOR_COMISION_INICIAL_DESDE = "2026-04-25";
export const VALOR_COMISION_INICIAL_HASTA = "2026-05-04";

export type LineaReparto = {
  id: string;
  fecha: string;
  fechaValor: string;
  centimos: number;
  clase: string;
  conceptoOriginal: string;
  detallesOriginales: string;
};

export function esAbonoCompensacionTpv(concepto: string, detalles: string, centimos: number) {
  const texto = normalizarTexto(`${concepto} ${detalles}`);
  return centimos > 0 && texto.includes("abono parcial liquidaciones tpv");
}

export function esCargoInicialIbercaja(linea: LineaReparto) {
  const terminal = terminalFactTpv(linea.conceptoOriginal, linea.detallesOriginales);
  return (
    linea.clase === "tpv-comision" &&
    linea.centimos < 0 &&
    terminal.length > 0 &&
    esFactTpv(linea.conceptoOriginal, linea.detallesOriginales) &&
    linea.fechaValor >= VALOR_COMISION_INICIAL_DESDE &&
    linea.fechaValor <= VALOR_COMISION_INICIAL_HASTA
  );
}

/**
 * Reparte el abono en céntimos enteros según el cargo original.
 * El resto va al mayor decimal. A igualdad mandan la fecha valor, el terminal y el id.
 * No modifica los movimientos.
 */
export function asignarDevolucionCentimos(lineas: LineaReparto[]) {
  const asignacion = new Map<string, number>();
  const cargos = lineas.filter(esCargoInicialIbercaja);
  const pool = lineas
    .filter((linea) => esAbonoCompensacionTpv(linea.conceptoOriginal, linea.detallesOriginales, linea.centimos))
    .reduce((total, linea) => total + linea.centimos, 0);
  const peso = cargos.reduce((total, linea) => total + Math.abs(linea.centimos), 0);

  if (pool <= 0 || peso <= 0) {
    return asignacion;
  }

  const partes = cargos.map((linea) => {
    const exacto = (pool * Math.abs(linea.centimos)) / peso;
    const base = Math.floor(exacto);
    return {
      id: linea.id,
      base,
      fraccion: exacto - base,
      orden: `${linea.fechaValor}|${terminalFactTpv(linea.conceptoOriginal, linea.detallesOriginales)}|${linea.fecha}|${linea.id}`,
    };
  });
  let resto = pool - partes.reduce((total, parte) => total + parte.base, 0);
  partes.sort((a, b) => b.fraccion - a.fraccion || a.orden.localeCompare(b.orden));

  for (const parte of partes) {
    const centimos = parte.base + (resto > 0 ? 1 : 0);
    if (resto > 0) {
      resto -= 1;
    }
    asignacion.set(parte.id, centimos);
  }

  return asignacion;
}

export function lineasRepartoDesdeImportes(
  movimientos: {
    id: string;
    fecha: string;
    fechaValor: string;
    importe: number;
    clase: string;
    conceptoOriginal: string;
    detallesOriginales: string;
  }[]
): LineaReparto[] {
  return movimientos.map((movimiento) => ({
    id: movimiento.id,
    fecha: movimiento.fecha,
    fechaValor: movimiento.fechaValor,
    centimos: aCentimos(movimiento.importe),
    clase: movimiento.clase,
    conceptoOriginal: movimiento.conceptoOriginal,
    detallesOriginales: movimiento.detallesOriginales,
  }));
}
