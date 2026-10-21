export type FaseCargaConsulta = "cargando" | "correcta" | "error";

export const MENSAJE_ERROR_CONSULTAS =
  "No se han podido cargar los datos de consultas. Los importes no están disponibles.";
export const MENSAJE_ERROR_DETALLE =
  "No se han podido cargar los datos del detalle de consultas. Los importes no están disponibles.";
export const MENSAJE_ERROR_RIVEROCIO =
  "No se han podido cargar los datos del reparto de Riverocio. Los importes no están disponibles.";
export const MENSAJE_ERROR_REPARTOS =
  "No se han podido cargar los datos de los repartos especiales. Los importes no están disponibles.";

export type LecturaConsulta<T> = { fase: "correcta"; datos: T } | { fase: "error" };

export async function leerConsultaProtegida<T>(leer: () => Promise<T>): Promise<LecturaConsulta<T>> {
  try {
    return { fase: "correcta", datos: await leer() };
  } catch {
    return { fase: "error" };
  }
}

export function puedeMostrarImportes(fase: FaseCargaConsulta): boolean {
  return fase === "correcta";
}

export function resultadoEconomico(
  fase: FaseCargaConsulta,
  importe: number
): { mostrar: false } | { mostrar: true; importe: number } {
  if (!puedeMostrarImportes(fase)) {
    return { mostrar: false };
  }

  return { mostrar: true, importe };
}
