import { aCentimos } from "./centimos";
import type { BancoPunteoId } from "./modelo";
import type { ClaseMovimiento, MovimientoInterno } from "./movimiento-interno";

export type LineaOficial = {
  posicion_archivo: string;
  fecha_operacion: string;
  fecha_valor: string;
  importe_centimos: string;
  saldo_centimos: string;
  clase: ClaseMovimiento;
  concepto: string;
  concepto_original: string;
  detalles_originales: string;
  referencias: string[];
  fila_excel: string;
};

const CLASES: readonly ClaseMovimiento[] = [
  "normal",
  "credito-cuota",
  "tpv-ingreso",
  "tpv-comision",
  "tpv-mantenimiento",
  "tpv-devolucion",
  "pendiente-clasificacion",
];

export function lineasOficiales(banco: BancoPunteoId, movimientos: MovimientoInterno[]): LineaOficial[] {
  return movimientos.map((movimiento, indice) => {
    if (movimiento.banco !== banco) {
      throw new Error("Una línea pertenece a otro banco. No se mezclan los extractos.");
    }

    if (movimiento.saldo === null) {
      throw new Error(`La posición ${indice + 1} no trae saldo. No se envía una carga incompleta.`);
    }

    if (!CLASES.includes(movimiento.clase)) {
      throw new Error(`La clase de la posición ${indice + 1} no es válida.`);
    }

    const anterior = movimientos[indice - 1];

    if (anterior && movimiento.fecha < anterior.fecha) {
      throw new Error("La cadena retrocede de fecha. El orden recibido no es el orden bancario.");
    }

    return {
      posicion_archivo: String(indice + 1),
      fecha_operacion: movimiento.fecha,
      fecha_valor: movimiento.fechaValor,
      importe_centimos: String(aCentimos(movimiento.importe)),
      saldo_centimos: String(aCentimos(movimiento.saldo)),
      clase: movimiento.clase,
      concepto: movimiento.conceptoOriginal,
      concepto_original: movimiento.conceptoOriginal,
      detalles_originales: movimiento.detallesOriginales,
      referencias: movimiento.referencias,
      fila_excel: String(movimiento.fila),
    };
  });
}

export async function huellaSha256(contenido: ArrayBuffer) {
  const resumen = await crypto.subtle.digest("SHA-256", contenido);
  return [...new Uint8Array(resumen)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
