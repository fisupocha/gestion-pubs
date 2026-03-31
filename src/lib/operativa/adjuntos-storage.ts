"use client";

import { supabase } from "@/lib/supabase";

const BUCKET_ADJUNTOS_OPERATIVA = "operativa-adjuntos";

export type AdjuntoOperativa = {
  file: File;
  url: string;
} | null;

function slugifyNombreArchivo(nombre: string) {
  return nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function esUrlBlob(url: string) {
  return url.startsWith("blob:");
}

function extraerRutaDesdeUrl(url: string) {
  const marker = `/storage/v1/object/public/${BUCKET_ADJUNTOS_OPERATIVA}/`;
  const index = url.indexOf(marker);

  if (index < 0) {
    return null;
  }

  return decodeURIComponent(url.slice(index + marker.length));
}

async function borrarRutaStorage(ruta: string | null) {
  if (!ruta) {
    return;
  }

  await supabase.storage.from(BUCKET_ADJUNTOS_OPERATIVA).remove([ruta]);
}

export function crearAdjuntoPersistido(nombre: string, url: string): AdjuntoOperativa {
  return {
    file: new File([""], nombre, {
      type: "application/octet-stream",
      lastModified: 0,
    }),
    url,
  };
}

export function extraerMetaAdjunto(adjunto: unknown) {
  if (!adjunto || typeof adjunto !== "object") {
    return { nombre: null, url: null };
  }

  const maybeUrl = "url" in adjunto ? adjunto.url : null;
  const maybeFile = "file" in adjunto ? adjunto.file : null;
  const url = typeof maybeUrl === "string" && maybeUrl.trim() ? maybeUrl.trim() : null;
  const nombre = maybeFile instanceof File && maybeFile.name.trim() ? maybeFile.name.trim() : null;

  return { nombre, url };
}

export async function prepararGuardadoAdjuntoOperativa({
  modulo,
  actual,
  anterior,
}: {
  modulo: string;
  actual: AdjuntoOperativa;
  anterior: AdjuntoOperativa;
}) {
  const urlAnterior = anterior?.url ?? null;
  const rutaAnterior = urlAnterior && !esUrlBlob(urlAnterior) ? extraerRutaDesdeUrl(urlAnterior) : null;

  if (!actual) {
    return {
      adjuntoPersistido: null as AdjuntoOperativa,
      confirmar: async () => {
        await borrarRutaStorage(rutaAnterior);
      },
      cancelar: async () => {},
    };
  }

  if (!esUrlBlob(actual.url)) {
    return {
      adjuntoPersistido: actual,
      confirmar: async () => {},
      cancelar: async () => {},
    };
  }

  const ahora = new Date();
  const ano = String(ahora.getFullYear());
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const ruta = `${modulo}/${ano}/${mes}/${Date.now()}-${slugifyNombreArchivo(actual.file.name)}`;
  const { error: errorUpload } = await supabase.storage
    .from(BUCKET_ADJUNTOS_OPERATIVA)
    .upload(ruta, actual.file, { upsert: false });

  if (errorUpload) {
    throw new Error("No se pudo subir el adjunto a Supabase Storage");
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_ADJUNTOS_OPERATIVA).getPublicUrl(ruta);

  return {
    adjuntoPersistido: crearAdjuntoPersistido(actual.file.name, publicUrl),
    confirmar: async () => {
      await borrarRutaStorage(rutaAnterior);
    },
    cancelar: async () => {
      await borrarRutaStorage(ruta);
    },
  };
}
