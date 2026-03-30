import { supabase } from "@/lib/supabase";

export type RegistroCajaDiaria = {
  fecha: string;
  tarantinoTaquilla: string;
  tarantinoTaran: string;
  tarantinoSmoking: string;
  cueTaquilla: string;
  cueBarraGrande: string;
  cueBarraPequena: string;
  hangar: string;
};

type RegistroCajaDiariaRow = {
  fecha: string;
  tarantino_taquilla: number | string | null;
  tarantino_taran: number | string | null;
  tarantino_smoking: number | string | null;
  cue_taquilla: number | string | null;
  cue_barra_grande: number | string | null;
  cue_barra_pequena: number | string | null;
  hangar: number | string | null;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function toNumberOrNull(value: string) {
  const limpio = value.trim();

  if (!limpio) {
    return null;
  }

  const numero = Number(limpio.replace(",", "."));
  return Number.isFinite(numero) ? round2(numero) : null;
}

function toFormValue(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numero = Number(value);

  if (!Number.isFinite(numero)) {
    return "";
  }

  const redondeado = round2(numero);
  return Number.isInteger(redondeado)
    ? String(redondeado)
    : String(redondeado).replace(".", ",");
}

export async function listarCajaDiariaPersistida(fechaDesde: string, fechaHasta: string) {
  const { data, error } = await supabase
    .from("gestion_diaria_caja")
    .select(
      "fecha, tarantino_taquilla, tarantino_taran, tarantino_smoking, cue_taquilla, cue_barra_grande, cue_barra_pequena, hangar"
    )
    .gte("fecha", fechaDesde)
    .lte("fecha", fechaHasta)
    .order("fecha", { ascending: true });

  if (error) {
    throw new Error("No se pudo cargar la caja diaria");
  }

  return ((data ?? []) as RegistroCajaDiariaRow[]).map((item) => ({
    fecha: item.fecha,
    tarantinoTaquilla: toFormValue(item.tarantino_taquilla),
    tarantinoTaran: toFormValue(item.tarantino_taran),
    tarantinoSmoking: toFormValue(item.tarantino_smoking),
    cueTaquilla: toFormValue(item.cue_taquilla),
    cueBarraGrande: toFormValue(item.cue_barra_grande),
    cueBarraPequena: toFormValue(item.cue_barra_pequena),
    hangar: toFormValue(item.hangar),
  }));
}

export async function guardarCajaDiariaPersistida(registros: RegistroCajaDiaria[]) {
  const filas = registros.map((item) => ({
    fecha: item.fecha,
    tarantino_taquilla: toNumberOrNull(item.tarantinoTaquilla),
    tarantino_taran: toNumberOrNull(item.tarantinoTaran),
    tarantino_smoking: toNumberOrNull(item.tarantinoSmoking),
    cue_taquilla: toNumberOrNull(item.cueTaquilla),
    cue_barra_grande: toNumberOrNull(item.cueBarraGrande),
    cue_barra_pequena: toNumberOrNull(item.cueBarraPequena),
    hangar: toNumberOrNull(item.hangar),
  }));

  const { error } = await supabase.from("gestion_diaria_caja").upsert(filas, {
    onConflict: "fecha",
  });

  if (error) {
    throw new Error("No se pudo guardar la caja diaria");
  }
}
