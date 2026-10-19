import { huellaSha256 } from "./linea-oficial";
import { mensajeImportacion, type ResultadoOficial } from "./mensajes-importacion";

export const LIMITE_HUELLA_DOBLE =
  "La base solo admite una importación confirmada por huella y banco. Por eso cada parte del mismo Excel usa una huella distinta, calculada a partir de la huella del archivo. No se puede repetir la misma huella en las dos confirmaciones sin cambiar el SQL.";

export type ParteCarga = "historica" | "ordinaria";

export type FilaComprobacion = {
  tipo: string;
  estado: string;
  continuidad: string;
  huella: string;
  motivo: string;
};

export type ClaseRespuesta = "confirmada" | "ya-consta" | "no-confirmada";

export type InformeCarga = {
  tono: "ok" | "info" | "error";
  texto: string;
  completa: boolean;
  parcial: boolean;
  historicoGuardado: boolean;
  octubreGuardado: boolean;
  puedeRepetir: boolean;
  requiereComprobacion: boolean;
  parteDesconocida: ParteCarga | null;
  deshacer: false;
  llamadas: ParteCarga[];
};

type Confirmador = () => Promise<ResultadoOficial>;
type Comprobador = (parte: ParteCarga) => Promise<FilaComprobacion[] | null>;

export function bytesDeParte(huellaArchivo: string, parte: ParteCarga) {
  const vista = new TextEncoder().encode(`${huellaArchivo}:${parte}`);
  return vista.buffer.slice(vista.byteOffset, vista.byteOffset + vista.byteLength);
}

export function huellaDeParte(huellaArchivo: string, parte: ParteCarga) {
  return huellaSha256(bytesDeParte(huellaArchivo, parte));
}

export async function identificarExcel(contenido: ArrayBuffer) {
  const archivo = await huellaSha256(contenido);
  const historica = await huellaDeParte(archivo, "historica");
  const ordinaria = await huellaDeParte(archivo, "ordinaria");

  return { archivo, historica, ordinaria };
}

export function clasificarRespuesta(resultado: ResultadoOficial): ClaseRespuesta {
  if (resultado.ok === true && resultado.estado === "confirmada") {
    return "confirmada";
  }

  if (
    resultado.continuidad === "ya-ejecutada" ||
    resultado.continuidad === "duplicada" ||
    resultado.continuidad === "sin-nuevos"
  ) {
    return "ya-consta";
  }

  return "no-confirmada";
}

export function clasificarConsulta(filas: FilaComprobacion[], huella: string, parte: ParteCarga) {
  const coincidencias = filas.filter((fila) => fila.huella === huella && fila.tipo === parte);

  if (coincidencias.some((fila) => fila.estado === "confirmada")) {
    return { clase: "confirmada" as const, motivo: coincidencias.find((fila) => fila.estado === "confirmada")?.motivo ?? "" };
  }

  const registrada = coincidencias[0];

  if (registrada) {
    return { clase: "registrada" as const, motivo: registrada.motivo, estado: registrada.estado };
  }

  return { clase: "no-consta" as const, motivo: "" };
}

export async function ejecutarCargaEnDosPartes(opciones: {
  hayHistorico: boolean;
  hayOrdinario: boolean;
  huellaHistorica: string;
  huellaOrdinaria: string;
  confirmarHistorica: Confirmador;
  confirmarOrdinaria: Confirmador;
  comprobar: Comprobador;
}): Promise<InformeCarga> {
  const llamadas: ParteCarga[] = [];
  let historico: ClaseRespuesta | "desconocida" | "omitida" = opciones.hayHistorico ? "desconocida" : "omitida";
  let octubre: ClaseRespuesta | "desconocida" | "omitida" = "omitida";
  let motivoHistorico = "";
  let motivoOctubre = "";
  let desconocida: ParteCarga | null = null;
  let puedeRepetir = false;
  let requiereComprobacion = false;

  if (opciones.hayHistorico) {
    const envio = await enviarParte(
      "historica",
      opciones.huellaHistorica,
      opciones.confirmarHistorica,
      opciones.comprobar
    );
    llamadas.push(...envio.llamadas);
    historico = envio.clase;
    motivoHistorico = envio.motivo;
    desconocida = envio.desconocida;
    puedeRepetir = envio.puedeRepetir;
    requiereComprobacion = envio.requiereComprobacion;

    if (envio.detener) {
      return cerrar({
        llamadas,
        historico,
        octubre,
        motivoHistorico,
        motivoOctubre,
        desconocida,
        puedeRepetir,
        requiereComprobacion,
      });
    }
  }

  if (opciones.hayOrdinario) {
    const envio = await enviarParte(
      "ordinaria",
      opciones.huellaOrdinaria,
      opciones.confirmarOrdinaria,
      opciones.comprobar
    );
    llamadas.push(...envio.llamadas);
    octubre = envio.clase;
    motivoOctubre = envio.motivo;
    desconocida = envio.desconocida ?? desconocida;
    puedeRepetir = envio.puedeRepetir;
    requiereComprobacion = envio.requiereComprobacion || requiereComprobacion;
  }

  return cerrar({
    llamadas,
    historico,
    octubre,
    motivoHistorico,
    motivoOctubre,
    desconocida,
    puedeRepetir,
    requiereComprobacion,
  });
}

export function decidirConsulta(opciones: {
  parte: ParteCarga;
  huella: string;
  filas: FilaComprobacion[] | null;
  faltaOrdinaria: boolean;
}) {
  if (opciones.filas === null) {
    return {
      accion: "seguir-desconocido" as const,
      tono: "error" as const,
      texto: "No se ha podido consultar el historial de importaciones. El resultado sigue siendo desconocido. No se repite ni se deshace.",
      historicoGuardado: false,
      octubreGuardado: false,
      deshacer: false as const,
    };
  }

  const hallazgo = clasificarConsulta(opciones.filas, opciones.huella, opciones.parte);

  if (hallazgo.clase === "confirmada" && opciones.parte === "historica" && opciones.faltaOrdinaria) {
    return {
      accion: "continuar-ordinaria" as const,
      tono: "info" as const,
      texto: "La comprobación encuentra el histórico confirmado. No se crea otra vez ni se deshace. Se puede continuar con los movimientos posteriores al 30/09/2026.",
      historicoGuardado: true,
      octubreGuardado: false,
      deshacer: false as const,
    };
  }

  if (hallazgo.clase === "confirmada") {
    const parte = opciones.parte === "historica" ? "el histórico" : "los movimientos posteriores al 30/09/2026";
    return {
      accion: "cerrada" as const,
      tono: "info" as const,
      texto: `La comprobación encuentra ${parte} confirmado. No se repite ni se deshace.`,
      historicoGuardado: opciones.parte === "historica",
      octubreGuardado: opciones.parte === "ordinaria",
      deshacer: false as const,
    };
  }

  if (hallazgo.clase === "registrada") {
    return {
      accion: "cerrada" as const,
      tono: "error" as const,
      texto: `La base registró el intento sin confirmarlo. ${hallazgo.motivo} No se deshace nada.`,
      historicoGuardado: false,
      octubreGuardado: false,
      deshacer: false as const,
    };
  }

  return {
    accion: "reintentar" as const,
    tono: "info" as const,
    texto: "No consta una importación con esta huella. No se anuncia que la función haya fallado. Ya se puede volver a enviar. No se ha deshecho nada.",
    historicoGuardado: false,
    octubreGuardado: false,
    deshacer: false as const,
  };
}

async function enviarParte(
  parte: ParteCarga,
  huella: string,
  confirmar: Confirmador,
  comprobar: Comprobador
) {
  try {
    const resultado = await confirmar();
    const clase = clasificarRespuesta(resultado);
    return {
      llamadas: [parte] as ParteCarga[],
      clase,
      motivo: resultado.motivo?.trim() || mensajeImportacion(resultado).texto,
      detener: clase === "no-confirmada",
      desconocida: null,
      puedeRepetir: false,
      requiereComprobacion: false,
    };
  } catch {
    let filas: FilaComprobacion[] | null;

    try {
      filas = await comprobar(parte);
    } catch {
      filas = null;
    }

    if (filas === null) {
      return {
        llamadas: [parte] as ParteCarga[],
        clase: "desconocida" as const,
        motivo: "",
        detener: true,
        desconocida: parte,
        puedeRepetir: false,
        requiereComprobacion: true,
      };
    }

    const hallazgo = clasificarConsulta(filas, huella, parte);

    if (hallazgo.clase === "confirmada") {
      return {
        llamadas: [parte] as ParteCarga[],
        clase: "confirmada" as const,
        motivo: hallazgo.motivo,
        detener: false,
        desconocida: null,
        puedeRepetir: false,
        requiereComprobacion: false,
      };
    }

    if (hallazgo.clase === "registrada") {
      return {
        llamadas: [parte] as ParteCarga[],
        clase: "no-confirmada" as const,
        motivo: hallazgo.motivo,
        detener: true,
        desconocida: null,
        puedeRepetir: false,
        requiereComprobacion: false,
      };
    }

    return {
      llamadas: [parte] as ParteCarga[],
      clase: "desconocida" as const,
      motivo: "",
      detener: true,
      desconocida: parte,
      puedeRepetir: true,
      requiereComprobacion: true,
    };
  }
}

function cerrar(entrada: {
  llamadas: ParteCarga[];
  historico: ClaseRespuesta | "desconocida" | "omitida";
  octubre: ClaseRespuesta | "desconocida" | "omitida";
  motivoHistorico: string;
  motivoOctubre: string;
  desconocida: ParteCarga | null;
  puedeRepetir: boolean;
  requiereComprobacion: boolean;
}): InformeCarga {
  const historicoGuardado = entrada.historico === "confirmada" || entrada.historico === "ya-consta";
  const octubreGuardado = entrada.octubre === "confirmada" || entrada.octubre === "ya-consta";
  const base = {
    historicoGuardado,
    octubreGuardado,
    puedeRepetir: entrada.puedeRepetir,
    requiereComprobacion: entrada.requiereComprobacion,
    parteDesconocida: entrada.desconocida,
    deshacer: false as const,
    llamadas: entrada.llamadas,
    completa: false,
    parcial: false,
  };

  if (entrada.desconocida) {
    const cual = entrada.desconocida === "historica" ? "la carga histórica" : "los movimientos posteriores al 30/09/2026";
    const previo = historicoGuardado ? "El histórico está guardado y no se deshace. " : "";
    const repeticion = entrada.puedeRepetir
      ? "No consta guardada. No se anuncia que la función haya fallado. Se puede volver a enviar después de esta comprobación."
      : "El resultado es desconocido. No se anuncia éxito ni fracaso. Hay que comprobar el historial antes de repetirla. No se deshace nada.";

    return {
      ...base,
      tono: "error",
      texto: `${previo}No se conoce el resultado de ${cual}. ${repeticion}`,
    };
  }

  if (entrada.historico === "no-confirmada") {
    return {
      ...base,
      tono: "error",
      texto: `El histórico no se ha confirmado. No se continúa con los movimientos posteriores. ${entrada.motivoHistorico}`,
    };
  }

  if (entrada.octubre === "no-confirmada") {
    return {
      ...base,
      tono: "error",
      parcial: historicoGuardado,
      texto: `Importación parcial. El histórico está guardado y no se borra. Los movimientos posteriores al 30/09/2026 no se han guardado. ${entrada.motivoOctubre}`,
    };
  }

  if (entrada.historico === "confirmada" && entrada.octubre === "confirmada") {
    return {
      ...base,
      tono: "ok",
      completa: true,
      texto: "Importación completa. El histórico hasta el 30/09/2026 y los movimientos posteriores quedan confirmados.",
    };
  }

  if (entrada.historico === "ya-consta" && entrada.octubre === "confirmada") {
    return {
      ...base,
      tono: "ok",
      texto: "El histórico ya estaba confirmado. Los movimientos posteriores al 30/09/2026 quedan confirmados. No se ha repetido el histórico.",
    };
  }

  if (entrada.historico === "confirmada" && entrada.octubre === "ya-consta") {
    return {
      ...base,
      tono: "info",
      texto: "El histórico queda guardado. Los movimientos posteriores ya estaban guardados. No se han duplicado ni se han cambiado estados u observaciones.",
    };
  }

  if (
    (entrada.historico === "ya-consta" && (entrada.octubre === "ya-consta" || entrada.octubre === "omitida")) ||
    (entrada.historico === "omitida" && entrada.octubre === "ya-consta")
  ) {
    return {
      ...base,
      tono: "info",
      texto: "Este archivo ya estaba importado. No se han duplicado movimientos ni se han cambiado estados u observaciones.",
    };
  }

  if (entrada.historico === "confirmada" && entrada.octubre === "omitida") {
    return {
      ...base,
      tono: "ok",
      completa: true,
      texto: `Importación confirmada. ${entrada.motivoHistorico}`,
    };
  }

  if (entrada.octubre === "confirmada") {
    return {
      ...base,
      tono: "ok",
      completa: true,
      texto: `Importación confirmada. ${entrada.motivoOctubre}`,
    };
  }

  return {
    ...base,
    tono: "info",
    texto: entrada.motivoOctubre || entrada.motivoHistorico || "No se ha confirmado la importación.",
  };
}
