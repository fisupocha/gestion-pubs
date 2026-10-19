import type { BancoPunteoId } from "./modelo";

/**
 * Regla definitiva de fechas del punteo.
 *
 * La fecha principal es la fecha de operación, identificada por el encabezado
 * del banco, nunca por la posición de la columna.
 * CaixaBank: "Fecha". Ibercaja: "Fecha operación".
 * Ibercaja puede traer antes una numeración de registros. Esa columna no es una fecha.
 * "Fecha valor" solo se conserva y se muestra. No ordena, no asigna mes ni año,
 * no calcula TPV y no decide la cobertura del extracto.
 * La cobertura confirmada del extracto es independiente de estas dos fechas.
 */

const FECHA_OPERACION: Record<BancoPunteoId, string[]> = {
  caixabank: ["fecha"],
  ibercaja: ["fechaoperacion", "fechadeoperacion", "foperacion", "fechaoper"],
};

const FECHA_VALOR = ["fechavalor", "fvalor"];

export function aliasesFechaOperacion(banco: BancoPunteoId) {
  return FECHA_OPERACION[banco];
}

export function aliasesFechaValor() {
  return FECHA_VALOR;
}

export function compararPorFechaOperacion(
  a: { fecha: string; fila?: number; orden?: number; id?: string },
  b: { fecha: string; fila?: number; orden?: number; id?: string }
) {
  return (
    a.fecha.localeCompare(b.fecha) ||
    (a.fila ?? 0) - (b.fila ?? 0) ||
    (a.orden ?? 0) - (b.orden ?? 0) ||
    (a.id ?? "").localeCompare(b.id ?? "")
  );
}
