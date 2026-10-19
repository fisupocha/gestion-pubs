export type ResultadoOficial = {
  ok?: boolean;
  estado?: string;
  continuidad?: string;
  motivo?: string;
  cambio?: boolean;
  filas_leidas?: number;
  filas_nuevas?: number;
  filas_omitidas?: number;
  conflicto?: boolean;
  observaciones?: string;
};

export function mensajeErrorSeguro(error: { message?: string } | null | undefined) {
  const texto = error?.message?.trim() ?? "";

  if (
    texto.length > 0 &&
    texto.length <= 400 &&
    !/password|jwt|api[_-]?key|stack|syntax error/i.test(texto)
  ) {
    return texto;
  }

  return "No se ha podido completar la operación. No se muestra el detalle interno.";
}

export function mensajeImportacion(resultado: ResultadoOficial) {
  const motivo = resultado.motivo?.trim() || "La base no ha indicado el motivo.";
  const cifras = cifrasDe(resultado);

  if (resultado.ok && resultado.estado === "confirmada") {
    return {
      tono: "ok" as const,
      texto: `Importación confirmada. ${motivo}${cifras}`,
    };
  }

  if (resultado.estado === "rechazada") {
    return {
      tono: "info" as const,
      texto: `No se han guardado movimientos nuevos. ${motivo}${cifras}`,
    };
  }

  if (resultado.estado === "pendiente_comprobacion") {
    return {
      tono: "error" as const,
      texto: `No se ha confirmado la importación. Hay que revisarla antes de guardar movimientos. ${motivo}${cifras}`,
    };
  }

  if (resultado.ok === false) {
    return {
      tono: "error" as const,
      texto: motivo,
    };
  }

  return {
    tono: "info" as const,
    texto: motivo,
  };
}

function cifrasDe(resultado: ResultadoOficial) {
  if (resultado.filas_leidas === undefined) {
    return "";
  }

  return ` Leídas ${resultado.filas_leidas}, nuevas ${resultado.filas_nuevas ?? 0}, omitidas ${resultado.filas_omitidas ?? 0}.`;
}
