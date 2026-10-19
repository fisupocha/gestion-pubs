import { mensajeImportacion, type ResultadoOficial } from "./mensajes-importacion";
import type { EstadoOk } from "./modelo";

export function planObservacion(estado: EstadoOk, decisionProtegida: boolean) {
  return {
    funcion: "punteo_guardar_observacion" as const,
    estado,
    decisionProtegida,
  };
}

export function planCambioEstado(estado: EstadoOk, motivo: string) {
  const texto = motivo.trim();

  if (!texto) {
    throw new Error("El cambio de estado necesita un motivo.");
  }

  return {
    funcion: "punteo_cambiar_estado" as const,
    estado,
    motivo: texto,
    observaciones: null,
  };
}

export function anunciaExito(resultado: ResultadoOficial) {
  return mensajeImportacion(resultado).tono === "ok";
}
