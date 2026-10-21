export const LOCALES_MIGRACION = ["Tarantino", "Hangar", "Cue", "Riverocio", "Fisu", "Soho"] as const;

export const MAXIMO_NUESTRO_CONCEPTO = 500;

export type MovimientoFicticio = {
  id: number;
  banco: "caixabank" | "ibercaja";
  fecha: string;
  fechaValor: string;
  importe: number;
  saldo: number;
  conceptoBancario: string;
  detalles: string;
  observaciones: string;
  local: string | null;
  estado: "pendiente" | "comprobar" | "ok";
  clase: string;
  nuestroConcepto: string;
};

export function filaTrasAnadirColumna(fila: Omit<MovimientoFicticio, "nuestroConcepto">): MovimientoFicticio {
  return { ...fila, nuestroConcepto: "" };
}

export function guardarNuestroConcepto(
  fila: MovimientoFicticio,
  texto: string,
  esAdmin: boolean
): { ok: true; fila: MovimientoFicticio } | { ok: false; motivo: string; fila: MovimientoFicticio } {
  if (!esAdmin) {
    return { ok: false, motivo: "Punteo banco solo está disponible para el administrador", fila };
  }

  const limpio = texto.trim();

  if (limpio.length > MAXIMO_NUESTRO_CONCEPTO) {
    return { ok: false, motivo: "Nuestro concepto supera el máximo previsto", fila };
  }

  return { ok: true, fila: { ...fila, nuestroConcepto: limpio } };
}

export function asignarLocal(
  fila: MovimientoFicticio,
  local: string | null,
  esAdmin: boolean
): { ok: true; fila: MovimientoFicticio } | { ok: false; motivo: string; fila: MovimientoFicticio } {
  if (!esAdmin) {
    return { ok: false, motivo: "Punteo banco solo está disponible para el administrador", fila };
  }

  if (local !== null && !LOCALES_MIGRACION.includes(local as (typeof LOCALES_MIGRACION)[number])) {
    return { ok: false, motivo: "El local no está autorizado", fila };
  }

  return { ok: true, fila: { ...fila, local } };
}

export function coincideBusqueda(fila: MovimientoFicticio, texto: string) {
  const consulta = texto.trim().toLowerCase();

  if (!consulta) {
    return true;
  }

  return [fila.conceptoBancario, fila.detalles, fila.observaciones, fila.nuestroConcepto, fila.local ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(consulta);
}

export function filtrarLocal(filas: MovimientoFicticio[], filtro: "todos" | "sin-asignar" | string) {
  if (filtro === "todos") {
    return filas;
  }

  if (filtro === "sin-asignar") {
    return filas.filter((fila) => fila.local === null);
  }

  return filas.filter((fila) => fila.local === filtro);
}

export function paginar<T>(filas: T[], desde: number, limite: number) {
  return filas.slice(desde, desde + limite);
}
