import type { EstadoOk } from "./modelo";
import type { IncidenciaSenalada, MovimientoInterno } from "./movimiento-interno";

const MENSAJE_OK =
  "El programa había señalado este movimiento para comprobar. ¿Confirmas que quieres dejarlo en OK?";

const MENSAJE_PENDIENTE =
  "El programa había señalado este movimiento para comprobar. ¿Confirmas que quieres dejarlo en Pendiente?";

export function normalizarEstadoOk(valor: string): EstadoOk {
  if (valor === "ok" || valor === "comprobado") {
    return "ok";
  }

  if (valor === "comprobar") {
    return "comprobar";
  }

  return "pendiente";
}

export function incidenciaAbiertaDe(movimiento: Pick<MovimientoInterno, "incidenciaAbierta">) {
  return movimiento.incidenciaAbierta ?? null;
}

export function requiereConfirmacionManual(
  movimiento: Pick<MovimientoInterno, "ok" | "incidenciaAbierta">,
  estadoNuevo: EstadoOk
) {
  if (estadoNuevo === movimiento.ok) {
    return false;
  }

  return movimiento.ok === "comprobar" && incidenciaAbiertaDe(movimiento) !== null;
}

export function textoConfirmacionManual(estadoNuevo: EstadoOk) {
  return estadoNuevo === "ok" ? MENSAJE_OK : MENSAJE_PENDIENTE;
}

export function confirmarCorreccionManual<T extends MovimientoInterno>(movimiento: T, estadoNuevo: EstadoOk): T {
  const abierta = incidenciaAbiertaDe(movimiento);

  if (!abierta) {
    return { ...movimiento, ok: estadoNuevo };
  }

  const resueltas = movimiento.incidenciasResueltas ?? [];
  const ya = resueltas.some((incidencia) => incidencia.id === abierta.id && incidencia.firma === abierta.firma);

  return {
    ...movimiento,
    ok: estadoNuevo,
    decisionManual: true,
    incidenciaAbierta: null,
    incidenciasResueltas: ya ? resueltas : [...resueltas, abierta],
  };
}

/**
 * La revisión conjunta futura llama aquí solo con una incidencia ya autorizada.
 * La misma firma resuelta no vuelve a poner el movimiento en Comprobar.
 * Una firma distinta es información nueva y sí puede señalarlo otra vez.
 * No crea movimientos ni reglas.
 */
export function señalarIncidenciaPrograma<T extends MovimientoInterno>(movimiento: T, incidencia: IncidenciaSenalada): T {
  const resueltas = movimiento.incidenciasResueltas ?? [];
  const misma = (actual: IncidenciaSenalada) => actual.id === incidencia.id && actual.firma === incidencia.firma;

  if (resueltas.some(misma) || (movimiento.incidenciaAbierta && misma(movimiento.incidenciaAbierta))) {
    return movimiento;
  }

  return {
    ...movimiento,
    ok: "comprobar",
    decisionManual: false,
    incidenciaAbierta: incidencia,
  };
}
