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
    return "pendiente-clasificacion";
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
  importe?: number;
  clase: ClaseMovimiento;
};

/**
 * No promociona una C. genérica por ir detrás de un ON.
 * La clase ya viene decidida por clasificarMovimiento.
 * No crea apuntes.
 */
export function clasificarSecuenciaTpv<T extends MovimientoClasificable>(movimientos: T[]): T[] {
  return movimientos.map((movimiento) => ({ ...movimiento }));
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
