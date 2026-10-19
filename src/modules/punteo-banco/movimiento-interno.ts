import type { BancoPunteoId } from "./modelo";
import type { EstadoOk } from "./modelo";

export type IncidenciaSenalada = {
  id: string;
  motivo: string;
  firma: string;
};

export type ClaseMovimiento =
  | "normal"
  | "credito-cuota"
  | "tpv-ingreso"
  | "tpv-comision"
  | "tpv-mantenimiento"
  | "tpv-devolucion"
  | "pendiente-clasificacion";

export type MovimientoInterno = {
  id: string;
  banco: BancoPunteoId;
  /** Fecha de operación: CaixaBank "Fecha", Ibercaja "Fecha operación". Es la que manda. */
  fecha: string;
  /** Fecha valor. Solo informativa. Vacía si el extracto no la trae. */
  fechaValor: string;
  importe: number;
  concepto: string;
  conceptoOriginal: string;
  detallesOriginales: string;
  saldo: number | null;
  referencias: string[];
  clase: ClaseMovimiento;
  observaciones: string;
  ok: EstadoOk;
  /** Incidencia abierta por el programa. Vacía en una comprobación normal del usuario. */
  incidenciaAbierta?: IncidenciaSenalada | null;
  /** Incidencias que el usuario ya resolvió. La misma firma no vuelve a marcar Comprobar. */
  incidenciasResueltas?: IncidenciaSenalada[];
  /** Verdadero solo cuando el usuario corrigió una señal automática. */
  decisionManual?: boolean;
  archivo: string;
  fila: number;
  orden: number;
};

export type PeriodoBanco = {
  banco: BancoPunteoId;
  desde: string;
  hasta: string;
};

export const CLASES_VISIBLES_TABLA = ["normal", "credito-cuota", "pendiente-clasificacion"] as const;

export function esVisibleEnTabla(clase: ClaseMovimiento) {
  return (CLASES_VISIBLES_TABLA as readonly string[]).includes(clase);
}

export function esTpvCalculable(clase: ClaseMovimiento) {
  return clase === "tpv-ingreso" || clase === "tpv-comision";
}
