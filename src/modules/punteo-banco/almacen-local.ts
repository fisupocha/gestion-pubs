import type { ClaveGastoTpv } from "./resumen-tpv-calculo";
import { normalizarEstadoOk } from "./decision-estado";
import type { ReferenciaMovimiento } from "./referencias-iniciales";
import type { IncidenciaSenalada, MovimientoInterno, PeriodoBanco } from "./movimiento-interno";

const CLAVE = "gestion-pubs.punteo-banco.v1";

export type ArchivadorPunteo = {
  version: 1;
  movimientos: MovimientoInterno[];
  periodos: PeriodoBanco[];
  huecos: PeriodoBanco[];
  gastosRegistrados: ClaveGastoTpv[];
  referenciasConfirmadas: ReferenciaMovimiento[];
};

export function archivadorVacio(): ArchivadorPunteo {
  return {
    version: 1,
    movimientos: [],
    periodos: [],
    huecos: [],
    gastosRegistrados: [],
    referenciasConfirmadas: [],
  };
}

export function leerArchivador(): ArchivadorPunteo {
  if (typeof window === "undefined") {
    return archivadorVacio();
  }

  try {
    const texto = window.localStorage.getItem(CLAVE);

    if (!texto) {
      return archivadorVacio();
    }

    const valor = JSON.parse(texto) as Partial<ArchivadorPunteo>;

    if (valor.version !== 1 || !Array.isArray(valor.movimientos)) {
      return archivadorVacio();
    }

    return {
      version: 1,
      movimientos: valor.movimientos.map((movimiento) => normalizarMovimientoGuardado(movimiento)),
      periodos: Array.isArray(valor.periodos) ? valor.periodos : [],
      huecos: Array.isArray(valor.huecos) ? valor.huecos : [],
      gastosRegistrados: Array.isArray(valor.gastosRegistrados) ? valor.gastosRegistrados : [],
      referenciasConfirmadas: Array.isArray(valor.referenciasConfirmadas)
        ? valor.referenciasConfirmadas
        : [],
    };
  } catch {
    return archivadorVacio();
  }
}

export function guardarArchivador(archivador: ArchivadorPunteo) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CLAVE, JSON.stringify(archivador));
}

export function serieEditable(archivador: ArchivadorPunteo) {
  return JSON.stringify({
    filas: archivador.movimientos.map((movimiento) => ({
      id: movimiento.id,
      observaciones: movimiento.observaciones,
      ok: normalizarEstadoOk(movimiento.ok),
      clase: movimiento.clase,
      incidenciaAbierta: movimiento.incidenciaAbierta ?? null,
      incidenciasResueltas: movimiento.incidenciasResueltas ?? [],
      decisionManual: movimiento.decisionManual === true,
    })),
    huecos: archivador.huecos,
  });
}

export function normalizarMovimientoGuardado(movimiento: MovimientoInterno): MovimientoInterno {
  return {
    ...movimiento,
    ok: normalizarEstadoOk(movimiento.ok),
    observaciones: typeof movimiento.observaciones === "string" ? movimiento.observaciones : "",
    incidenciaAbierta: incidenciaGuardada(movimiento.incidenciaAbierta),
    incidenciasResueltas: Array.isArray(movimiento.incidenciasResueltas)
      ? movimiento.incidenciasResueltas.filter((incidencia) => incidenciaValida(incidencia))
      : [],
    decisionManual: movimiento.decisionManual === true,
  };
}

function incidenciaGuardada(valor: IncidenciaSenalada | null | undefined) {
  return incidenciaValida(valor) ? valor : null;
}

function incidenciaValida(valor: IncidenciaSenalada | null | undefined): valor is IncidenciaSenalada {
  return Boolean(valor && valor.id && valor.motivo && valor.firma);
}
