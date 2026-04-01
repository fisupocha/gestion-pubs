import { supabase } from "@/lib/supabase";

export type RegistroCajaDiaria = {
  fecha: string;
  tarantinoTaquilla: string;
  tarantinoTaran: string;
  tarantinoSmoking: string;
  cueTaquilla: string;
  cueTaquillaParte1: string;
  cueTaquillaParte2: string;
  cueBarraGrande: string;
  cueBarraGrandeParte1: string;
  cueBarraGrandeParte2: string;
  cueBarraPequena: string;
  cueBarraPequenaParte1: string;
  cueBarraPequenaParte2: string;
  hangar: string;
};

type RegistroCajaDiariaRow = {
  fecha: string;
  tarantino_taquilla: number | string | null;
  tarantino_taran: number | string | null;
  tarantino_smoking: number | string | null;
  cue_taquilla: number | string | null;
  cue_taquilla_parte_1?: number | string | null;
  cue_taquilla_parte_2?: number | string | null;
  cue_barra_grande: number | string | null;
  cue_barra_grande_parte_1?: number | string | null;
  cue_barra_grande_parte_2?: number | string | null;
  cue_barra_pequena: number | string | null;
  cue_barra_pequena_parte_1?: number | string | null;
  cue_barra_pequena_parte_2?: number | string | null;
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
    .select("*")
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
    cueTaquillaParte1: toFormValue(item.cue_taquilla_parte_1),
    cueTaquillaParte2: toFormValue(item.cue_taquilla_parte_2),
    cueBarraGrande: toFormValue(item.cue_barra_grande),
    cueBarraGrandeParte1: toFormValue(item.cue_barra_grande_parte_1),
    cueBarraGrandeParte2: toFormValue(item.cue_barra_grande_parte_2),
    cueBarraPequena: toFormValue(item.cue_barra_pequena),
    cueBarraPequenaParte1: toFormValue(item.cue_barra_pequena_parte_1),
    cueBarraPequenaParte2: toFormValue(item.cue_barra_pequena_parte_2),
    hangar: toFormValue(item.hangar),
  }));
}

export async function guardarCajaDiariaPersistida(registros: RegistroCajaDiaria[]) {
  const hayDesgloseCue = registros.some(
    (item) =>
      item.cueTaquillaParte1.trim() ||
      item.cueTaquillaParte2.trim() ||
      item.cueBarraGrandeParte1.trim() ||
      item.cueBarraGrandeParte2.trim() ||
      item.cueBarraPequenaParte1.trim() ||
      item.cueBarraPequenaParte2.trim()
  );
  const filasBase = registros.map((item) => ({
    fecha: item.fecha,
    tarantino_taquilla: toNumberOrNull(item.tarantinoTaquilla),
    tarantino_taran: toNumberOrNull(item.tarantinoTaran),
    tarantino_smoking: toNumberOrNull(item.tarantinoSmoking),
    cue_taquilla: toNumberOrNull(item.cueTaquilla),
    cue_barra_grande: toNumberOrNull(item.cueBarraGrande),
    cue_barra_pequena: toNumberOrNull(item.cueBarraPequena),
    hangar: toNumberOrNull(item.hangar),
  }));
  const filas = hayDesgloseCue
    ? registros.map((item, index) => ({
        ...filasBase[index],
        cue_taquilla_parte_1: toNumberOrNull(item.cueTaquillaParte1),
        cue_taquilla_parte_2: toNumberOrNull(item.cueTaquillaParte2),
        cue_barra_grande_parte_1: toNumberOrNull(item.cueBarraGrandeParte1),
        cue_barra_grande_parte_2: toNumberOrNull(item.cueBarraGrandeParte2),
        cue_barra_pequena_parte_1: toNumberOrNull(item.cueBarraPequenaParte1),
        cue_barra_pequena_parte_2: toNumberOrNull(item.cueBarraPequenaParte2),
      }))
    : filasBase;

  const { error } = await supabase.from("gestion_diaria_caja").upsert(filas, {
    onConflict: "fecha",
  });

  if (error) {
    if (
      hayDesgloseCue &&
      /cue_taquilla_parte_1|cue_taquilla_parte_2|cue_barra_grande_parte_1|cue_barra_grande_parte_2|cue_barra_pequena_parte_1|cue_barra_pequena_parte_2|schema cache/i.test(
        error.message
      )
    ) {
      throw new Error(
        "No se pudo guardar el desglose de Cue. Ejecuta antes sql/alter-gestion-diaria-caja-desglose-cue.sql en Supabase."
      );
    }

    throw new Error("No se pudo guardar la caja diaria");
  }
}
