import type { EstadoOk } from "./modelo";

export const LIMITE_CONCURRENCIA_OBSERVACION =
  "punteo_guardar_observacion compara el texto esperado y escribe en la misma operación, con la fila bloqueada. Si no coincide, rechaza el guardado, no cambia la nota ni el estado y no anota el historial.";

export type BorradorObservacion = {
  id: number;
  textoOficial: string;
  textoVisible: string;
  estado: EstadoOk;
  decisionProtegida: boolean;
  error: string | null;
  conflicto: string | null;
};

export type RespuestaObservacion = {
  ok?: boolean;
  cambio?: boolean;
  motivo?: string;
  estado?: string;
  decision_protegida?: boolean;
  observaciones?: string;
  conflicto?: boolean;
};

export function notaInicial(
  id: number,
  texto: string,
  estado: EstadoOk,
  decisionProtegida: boolean
): BorradorObservacion {
  return {
    id,
    textoOficial: texto,
    textoVisible: texto,
    estado,
    decisionProtegida,
    error: null,
    conflicto: null,
  };
}

export function escribirObservacion(nota: BorradorObservacion, texto: string): BorradorObservacion {
  return {
    ...nota,
    textoVisible: texto,
    error: null,
    conflicto: null,
    estado: nota.estado,
    decisionProtegida: nota.decisionProtegida,
  };
}

export function estaPendiente(nota: BorradorObservacion) {
  return nota.textoVisible !== nota.textoOficial || nota.error !== null || nota.conflicto !== null;
}

export function marcaDeNota(nota: BorradorObservacion | undefined) {
  if (!nota || !estaPendiente(nota)) {
    return "oficial" as const;
  }

  if (nota.conflicto) {
    return "conflicto" as const;
  }

  if (nota.error) {
    return "error" as const;
  }

  return "pendiente" as const;
}

export function prepararGuardadoObservacion(nota: BorradorObservacion, textoEnBase: string | null) {
  if (textoEnBase !== null && textoEnBase !== nota.textoOficial) {
    return { accion: "conflicto" as const, textoEnBase };
  }

  if (nota.textoVisible === nota.textoOficial) {
    return { accion: "nada" as const };
  }

  return {
    accion: "guardar" as const,
    texto: nota.textoVisible,
    textoEsperado: nota.textoOficial,
    estado: nota.estado,
    decisionProtegida: nota.decisionProtegida,
  };
}

export function esConflictoObservacion(respuesta: RespuestaObservacion) {
  return respuesta.ok !== true && respuesta.conflicto === true;
}

export function aplicarObservacionGuardada(nota: BorradorObservacion, respuesta: RespuestaObservacion) {
  const estadoDistinto = respuesta.estado !== undefined && respuesta.estado !== nota.estado;
  const proteccionDistinta =
    respuesta.decision_protegida !== undefined && respuesta.decision_protegida !== nota.decisionProtegida;

  if (esConflictoObservacion(respuesta)) {
    return aplicarConflicto(nota, respuesta.observaciones ?? "");
  }

  if (respuesta.ok !== true || estadoDistinto || proteccionDistinta) {
    return aplicarObservacionFallida(
      nota,
      estadoDistinto || proteccionDistinta
        ? "La respuesta no conserva el estado. La nota no se da por guardada y el estado no se ha cambiado."
        : respuesta.motivo?.trim() || "No se ha guardado la observación. El texto sigue en pantalla. El estado no ha cambiado."
    );
  }

  const confirmada: BorradorObservacion = {
    ...nota,
    textoOficial: nota.textoVisible,
    textoVisible: nota.textoVisible,
    estado: nota.estado,
    decisionProtegida: nota.decisionProtegida,
    error: null,
    conflicto: null,
  };

  return {
    nota: confirmada,
    aviso: {
      tono: "ok" as const,
      texto: "Observación guardada. El estado no ha cambiado.",
    },
  };
}

export function aplicarObservacionFallida(nota: BorradorObservacion, mensaje: string) {
  const texto = mensaje.trim() || "No se ha guardado la observación. El texto sigue en pantalla. El estado no ha cambiado.";

  return {
    nota: {
      ...nota,
      textoOficial: nota.textoOficial,
      textoVisible: nota.textoVisible,
      estado: nota.estado,
      decisionProtegida: nota.decisionProtegida,
      error: texto,
      conflicto: nota.conflicto,
    },
    aviso: {
      tono: "error" as const,
      texto,
    },
  };
}

export function aplicarConflicto(nota: BorradorObservacion, textoEnBase: string) {
  const texto = `No se ha guardado. La base tiene otra observación: «${textoEnBase}». No se ha sobrescrito. El estado no ha cambiado.`;

  return {
    nota: {
      ...nota,
      textoOficial: nota.textoOficial,
      textoVisible: nota.textoVisible,
      estado: nota.estado,
      decisionProtegida: nota.decisionProtegida,
      error: texto,
      conflicto: textoEnBase,
    },
    aviso: {
      tono: "error" as const,
      texto,
    },
  };
}

export function resultadoNavegacion(decision: "guardar-ok" | "guardar-fallido" | "conservar" | "cancelar") {
  if (decision === "cancelar" || decision === "guardar-fallido") {
    return { cambia: false, conservaBorrador: true };
  }

  if (decision === "conservar") {
    return { cambia: true, conservaBorrador: true };
  }

  return { cambia: true, conservaBorrador: false };
}

export function actualizarOficialDesdeServidor(
  nota: BorradorObservacion,
  textoServidor: string,
  estado: EstadoOk,
  decisionProtegida: boolean
): BorradorObservacion {
  if (textoServidor !== nota.textoOficial) {
    return {
      ...nota,
      estado,
      decisionProtegida,
      conflicto: textoServidor,
      error: `No se ha guardado tu texto. La base tiene otra observación: «${textoServidor}». No se ha sobrescrito.`,
    };
  }

  return {
    ...nota,
    estado,
    decisionProtegida,
  };
}

export function combinarFilasConBorradores<
  T extends { id: number; observaciones: string; estado: EstadoOk; decisionProtegida: boolean },
>(filas: T[], borradores: ReadonlyMap<number, BorradorObservacion>) {
  return filas.map((fila) => {
    const borrador = borradores.get(fila.id);

    if (!borrador) {
      return fila;
    }

    return {
      ...fila,
      observaciones: borrador.textoVisible,
      estado: fila.estado,
      decisionProtegida: fila.decisionProtegida,
    };
  });
}
