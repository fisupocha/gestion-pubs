import { normalizarTexto } from "./celdas";
import type { ClaseMovimiento } from "./movimiento-interno";

const TOKEN_TPV = /\btpv\b|\bdatafono\b|terminal punto de venta/;
const PATRON_ON = /(?<![A-Za-z0-9])ON(?![A-Za-z])[\s./:-]*\d{4,}/i;
const PATRON_C = /(?<![A-Za-z0-9.])C\.(?!\s*C\.)\s*(?:ON(?![A-Za-z])[\s./:-]*)?\d{4,}/i;
const PATRON_COMISION_CAIXA = /^C\. 124129933 \d{4}$/;
const PATRON_FACT = /fact\s*\.\s*tpv\s+\S+/i;
const PATRON_COMI = /comi\s*\.\s*tpv\s+\S+/i;

export function clasificarMovimiento(concepto: string, detalles: string, importe?: number): ClaseMovimiento {
  const crudo = `${concepto} ${detalles}`;
  const texto = normalizarTexto(crudo);
  const ingresoOn = PATRON_ON.test(crudo);
  const comisionCaixa = [concepto, detalles].some((campo) => PATRON_COMISION_CAIXA.test(campo.trim()));
  const comisionEstructurada = PATRON_C.test(crudo);
  const factTpv = PATRON_FACT.test(crudo);
  const comiTpv = PATRON_COMI.test(crudo);

  if (
    /devoluc|retroces|chargeback|contracargo/.test(texto) &&
    (TOKEN_TPV.test(texto) || ingresoOn || factTpv || comiTpv)
  ) {
    return "tpv-devolucion";
  }

  if (texto.includes("abono parcial liquidaciones tpv")) {
    return importe !== undefined && importe > 0 ? "tpv-devolucion" : "pendiente-clasificacion";
  }

  if (comisionCaixa) {
    return importe !== undefined && importe < 0 ? "tpv-comision" : "pendiente-clasificacion";
  }

  if (texto.includes("serv.tpv.mant")) {
    return "tpv-mantenimiento";
  }

  if (comiTpv) {
    return importe !== undefined && importe < 0 ? "tpv-comision" : "pendiente-clasificacion";
  }

  if (factTpv) {
    return importe !== undefined && importe <= 0 ? "pendiente-clasificacion" : "tpv-ingreso";
  }

  if (
    /mantenimiento|alquiler de terminal|cuota de terminal|cuota terminal/.test(texto) &&
    TOKEN_TPV.test(texto) &&
    !ingresoOn &&
    !comisionEstructurada
  ) {
    return "tpv-mantenimiento";
  }

  if (comisionEstructurada) {
    return "pendiente-clasificacion";
  }

  if (ingresoOn) {
    return "tpv-ingreso";
  }

  if (TOKEN_TPV.test(texto)) {
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
  fechaValor?: string;
  importe?: number;
  clase: ClaseMovimiento;
};

export function terminalFactTpv(concepto: string, detalles: string) {
  const encontrado = `${concepto} ${detalles}`.match(/FACT\s*\.\s*TPV\s+(\S+)/i);
  return encontrado?.[1] ?? "";
}

export function esFactTpv(concepto: string, detalles: string) {
  return PATRON_FACT.test(`${concepto} ${detalles}`);
}

/**
 * Un FACT.TPV negativo solo pasa a comisión si hay una liquidación positiva
 * del mismo terminal y la misma fecha valor. Si no hay esa pareja, sigue pendiente.
 * No usa el porcentaje. No promociona una C. genérica por ir detrás de un ON.
 * No crea apuntes ni cambia importes.
 */
export function clasificarSecuenciaTpv<T extends MovimientoClasificable>(movimientos: T[]): T[] {
  const liquidacionesPositivas = new Set<string>();

  for (const movimiento of movimientos) {
    const terminal = terminalFactTpv(movimiento.conceptoOriginal, movimiento.detallesOriginales);
    if (!terminal || !movimiento.fechaValor || (movimiento.importe ?? 0) <= 0) {
      continue;
    }
    if (!esFactTpv(movimiento.conceptoOriginal, movimiento.detallesOriginales)) {
      continue;
    }
    liquidacionesPositivas.add(`${movimiento.fechaValor}|${terminal}`);
  }

  return movimientos.map((movimiento) => {
    const terminal = terminalFactTpv(movimiento.conceptoOriginal, movimiento.detallesOriginales);
    const pareja = `${movimiento.fechaValor ?? ""}|${terminal}`;
    if (
      terminal &&
      movimiento.fechaValor &&
      (movimiento.importe ?? 0) < 0 &&
      esFactTpv(movimiento.conceptoOriginal, movimiento.detallesOriginales) &&
      liquidacionesPositivas.has(pareja)
    ) {
      return { ...movimiento, clase: "tpv-comision" as const };
    }

    return { ...movimiento };
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
