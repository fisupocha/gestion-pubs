export const MAXIMO_NUESTRO_CONCEPTO = 500;

export type FaseConcepto = "quieto" | "pendiente" | "guardando" | "guardado" | "error";

export type MarcaConcepto = "pendiente" | "guardando" | "guardado" | "error";

export type BorradorConcepto = {
  id: number;
  oficial: string;
  visible: string;
  generacion: number;
  envio: number | null;
  fase: FaseConcepto;
  mensaje: string;
};

export type RespuestaConcepto = {
  ok?: boolean;
  motivo?: string;
  nuestro_concepto?: string;
  estado?: string;
  local?: string | null;
  observaciones?: string;
  concepto_original?: string;
};

export type ContextoConcepto = {
  estado: string;
  local: string | null;
  observaciones: string;
  conceptoOriginal: string;
};

export function borradorInicial(id: number, oficial: string): BorradorConcepto {
  return {
    id,
    oficial,
    visible: oficial,
    generacion: 0,
    envio: null,
    fase: "quieto",
    mensaje: "",
  };
}

export function planGuardarNuestroConcepto(movimientoId: number, texto: string) {
  const limpio = texto.trim();

  if (limpio.length > MAXIMO_NUESTRO_CONCEPTO) {
    return {
      ok: false as const,
      motivo: "Nuestro concepto supera el máximo previsto",
    };
  }

  return {
    ok: true as const,
    texto: limpio,
    llamada: {
      funcion: "punteo_guardar_nuestro_concepto" as const,
      p_movimiento_id: movimientoId,
      p_nuestro_concepto: limpio,
    },
  };
}

export function editarBorradorConcepto(borrador: BorradorConcepto, texto: string): BorradorConcepto {
  const generacion = borrador.generacion + 1;
  const igual = texto.trim() === borrador.oficial && borrador.envio === null;

  return {
    ...borrador,
    visible: texto,
    generacion,
    fase: igual ? "quieto" : "pendiente",
    mensaje: "",
  };
}

export function prepararEnvioConcepto(borrador: BorradorConcepto):
  | { accion: "nada"; borrador: BorradorConcepto }
  | { accion: "rechazado"; borrador: BorradorConcepto }
  | { accion: "enviar"; borrador: BorradorConcepto; texto: string; generacion: number } {
  const texto = borrador.visible.trim();
  const plan = planGuardarNuestroConcepto(borrador.id, texto);

  if (!plan.ok) {
    return {
      accion: "rechazado",
      borrador: {
        ...borrador,
        envio: null,
        fase: "error",
        mensaje: plan.motivo,
      },
    };
  }

  if (borrador.envio !== null) {
    return { accion: "nada", borrador };
  }

  if (texto === borrador.oficial && borrador.fase !== "error") {
    return {
      accion: "nada",
      borrador: {
        ...borrador,
        fase: "quieto",
        mensaje: "",
      },
    };
  }

  return {
    accion: "enviar",
    texto,
    generacion: borrador.generacion,
    borrador: {
      ...borrador,
      fase: "guardando",
      envio: borrador.generacion,
      mensaje: "",
    },
  };
}

export function aplicarRespuestaConcepto(
  borrador: BorradorConcepto,
  envio: number,
  respuesta: RespuestaConcepto,
  contexto: ContextoConcepto
) {
  if (borrador.envio !== envio) {
    return { borrador, aviso: null, reintentar: false };
  }

  const sigueSiendoEste = borrador.generacion === envio;
  const camposIntactos =
    campoIntacto(respuesta, "estado", respuesta.estado, contexto.estado) &&
    campoIntacto(respuesta, "local", respuesta.local, contexto.local) &&
    campoIntacto(respuesta, "observaciones", respuesta.observaciones, contexto.observaciones) &&
    campoIntacto(respuesta, "concepto_original", respuesta.concepto_original, contexto.conceptoOriginal);
  const confirmado = typeof respuesta.nuestro_concepto === "string" ? respuesta.nuestro_concepto : null;

  if (respuesta.ok !== true || confirmado === null || !camposIntactos) {
    const mensaje = !camposIntactos
      ? "La respuesta no conserva el estado, el local o las observaciones. Nuestro concepto no se da por guardado."
      : respuesta.motivo?.trim() || "No se ha guardado nuestro concepto. El texto sigue en pantalla.";

    return {
      borrador: cerrarEnvio(borrador, sigueSiendoEste ? "error" : "pendiente", sigueSiendoEste ? mensaje : ""),
      aviso: sigueSiendoEste ? { tono: "error" as const, texto: mensaje } : null,
      reintentar: !sigueSiendoEste && borrador.visible.trim() !== borrador.oficial,
    };
  }

  const alDia = sigueSiendoEste && borrador.visible.trim() === confirmado;

  return {
    borrador: {
      ...cerrarEnvio(borrador, alDia ? "guardado" : "pendiente", alDia ? "Guardado" : ""),
      oficial: confirmado,
      visible: alDia ? confirmado : borrador.visible,
    },
    aviso: alDia
      ? {
          tono: "ok" as const,
          texto: "Nuestro concepto guardado. El estado, el local y las observaciones no han cambiado.",
        }
      : null,
    reintentar: !alDia,
  };
}

export function aplicarFalloConcepto(borrador: BorradorConcepto, envio: number, mensaje: string) {
  if (borrador.envio !== envio) {
    return { borrador, aviso: null, reintentar: false };
  }

  const sigueSiendoEste = borrador.generacion === envio;
  const texto = mensaje.trim() || "No se ha guardado nuestro concepto. El texto sigue en pantalla.";

  return {
    borrador: cerrarEnvio(borrador, sigueSiendoEste ? "error" : "pendiente", sigueSiendoEste ? texto : ""),
    aviso: sigueSiendoEste ? { tono: "error" as const, texto } : null,
    reintentar: !sigueSiendoEste && borrador.visible.trim() !== borrador.oficial,
  };
}

export function fusionarConceptoServidor(borrador: BorradorConcepto, oficialServidor: string): BorradorConcepto | null {
  const servidor = oficialServidor ?? "";
  const sucio =
    borrador.envio !== null ||
    borrador.fase === "error" ||
    borrador.fase === "pendiente" ||
    borrador.fase === "guardando" ||
    borrador.visible.trim() !== borrador.oficial;

  if (!sucio) {
    return null;
  }

  if (borrador.envio === null && servidor === borrador.visible.trim()) {
    return {
      ...borrador,
      oficial: servidor,
      fase: "guardado",
      mensaje: "Guardado",
    };
  }

  return borrador;
}

export function combinarConceptos<T extends { id: number; nuestroConcepto: string }>(
  filas: T[],
  borradores: ReadonlyMap<number, BorradorConcepto>
) {
  const siguientes = new Map(borradores);
  const combinadas = filas.map((fila) => {
    const previo = siguientes.get(fila.id);

    if (!previo) {
      return fila;
    }

    const fusion = fusionarConceptoServidor(previo, fila.nuestroConcepto);

    if (!fusion) {
      siguientes.delete(fila.id);
      return fila;
    }

    siguientes.set(fila.id, fusion);

    return {
      ...fila,
      nuestroConcepto: fusion.visible,
    };
  });

  return { filas: combinadas, borradores: siguientes };
}

export function marcaDeConcepto(borrador: BorradorConcepto | undefined): MarcaConcepto | null {
  if (!borrador || borrador.fase === "quieto") {
    return null;
  }

  if (borrador.fase === "guardado" && borrador.visible.trim() === borrador.oficial) {
    return "guardado";
  }

  if (borrador.fase === "guardando" && borrador.envio === borrador.generacion) {
    return "guardando";
  }

  if (borrador.fase === "error") {
    return "error";
  }

  if (borrador.fase === "pendiente" || borrador.visible.trim() !== borrador.oficial) {
    return "pendiente";
  }

  return null;
}

export function marcasDeConceptos(borradores: Iterable<BorradorConcepto>) {
  const marcas: Record<string, MarcaConcepto> = {};

  for (const borrador of borradores) {
    const marca = marcaDeConcepto(borrador);

    if (marca) {
      marcas[String(borrador.id)] = marca;
    }
  }

  return marcas;
}

function cerrarEnvio(borrador: BorradorConcepto, fase: FaseConcepto, mensaje: string): BorradorConcepto {
  return {
    ...borrador,
    envio: null,
    fase,
    mensaje,
    oficial: borrador.oficial,
    visible: borrador.visible,
  };
}

function campoIntacto(respuesta: RespuestaConcepto, campo: keyof RespuestaConcepto, valor: unknown, esperado: unknown) {
  if (!(campo in respuesta)) {
    return true;
  }

  return (valor ?? null) === (esperado ?? null);
}
