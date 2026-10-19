import { normalizarTexto } from "./celdas";
import type { ClaseMovimiento } from "./movimiento-interno";

const TOKEN_TPV = /\btpv\b|\bdatafono\b|terminal punto de venta/;
const PATRON_ON = /(?<![A-Za-z0-9])ON(?![A-Za-z])[\s./:-]*\d{4,}/i;
const PATRON_C = /(?<![A-Za-z0-9.])C\.(?!\s*C\.)\s*(?:ON(?![A-Za-z])[\s./:-]*)?\d{4,}/i;
const PATRON_FACT = /fact\s*\.\s*tpv/;
const PATRON_COMI = /comi\s*\.\s*tpv/;

export function clasificarMovimiento(concepto: string, detalles: string): ClaseMovimiento {
  const crudo = `${concepto} ${detalles}`;
  const texto = normalizarTexto(crudo);
  const ingresoOn = PATRON_ON.test(crudo);
  const comisionEstructurada = PATRON_C.test(crudo);
  const factTpv = PATRON_FACT.test(texto);
  const comiTpv = PATRON_COMI.test(texto);

  if (
    /devoluc|retroces|chargeback|contracargo/.test(texto) &&
    (TOKEN_TPV.test(texto) || ingresoOn || factTpv || comiTpv)
  ) {
    return "tpv-devolucion";
  }

  if (comiTpv) {
    return "tpv-comision";
  }

  if (factTpv) {
    return "tpv-ingreso";
  }

  if (
    /mantenimiento|alquiler de terminal|cuota de terminal|cuota terminal/.test(texto) &&
    TOKEN_TPV.test(texto) &&
    !ingresoOn &&
    !comisionEstructurada
  ) {
    return "tpv-mantenimiento";
  }

  if (comisionEstructurada && ingresoOn) {
    return "tpv-comision";
  }

  if (ingresoOn) {
    return "tpv-ingreso";
  }

  if (comisionEstructurada) {
    return "pendiente-clasificacion";
  }

  if (TOKEN_TPV.test(texto)) {
    if (/comision|comisiones|descuento tpv/.test(texto)) {
      return "tpv-comision";
    }

    if (/abono|liquidacion|venta tpv|ingreso tpv/.test(texto)) {
      return "tpv-ingreso";
    }

    return "pendiente-clasificacion";
  }

  if (
    /cuota de credito|cuota credito|cuota de prestamo|cuota prestamo|prestamo|amortizacion de credito|recibo de credito|recibo de prestamo/.test(
      texto
    )
  ) {
    return "credito-cuota";
  }

  return "normal";
}

type MovimientoClasificable = {
  conceptoOriginal: string;
  detallesOriginales: string;
  clase: ClaseMovimiento;
};

/**
 * Un mismo datáfono puede dejar varios ingresos ON seguidos y, después,
 * varias comisiones C. de esos cierres. No hace falta que cada C. tenga
 * un ingreso justo delante ni emparejar cada comisión con un cierre.
 * Una C. estructurada se acepta mientras el bloque TPV siga abierto.
 * Un movimiento que no sea ingreso ni comisión lo cierra.
 * No crea apuntes.
 */
export function clasificarSecuenciaTpv<T extends MovimientoClasificable>(movimientos: T[]): T[] {
  let bloqueTpv = false;

  return movimientos.map((movimiento) => {
    const crudo = `${movimiento.conceptoOriginal} ${movimiento.detallesOriginales}`;
    const comisionEstructurada =
      PATRON_C.test(crudo) && !PATRON_ON.test(crudo) && movimiento.clase === "pendiente-clasificacion";

    if (movimiento.clase === "tpv-ingreso" || movimiento.clase === "tpv-comision") {
      bloqueTpv = true;
      return movimiento;
    }

    if (comisionEstructurada && bloqueTpv) {
      bloqueTpv = true;
      return { ...movimiento, clase: "tpv-comision" };
    }

    bloqueTpv = false;
    return movimiento;
  });
}

export function codigosTpvEnTexto(concepto: string, detalles: string) {
  const texto = `${concepto}\n${detalles}`;
  const encontrados: string[] = [];

  for (const patron of [PATRON_ON, PATRON_C]) {
    const global = new RegExp(patron.source, `${patron.flags}g`);

    for (const coincidencia of texto.matchAll(global)) {
      const codigo = coincidencia[0].trim();

      if (codigo && !encontrados.includes(codigo)) {
        encontrados.push(codigo);
      }
    }
  }

  return encontrados;
}
