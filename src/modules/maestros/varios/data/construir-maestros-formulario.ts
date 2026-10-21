export type MaestrosFormulario = {
  locales: string[];
  bancos: string[];
  formasPago: string[];
  tiposIva: number[];
  conceptosGastosBancarios: string[];
};

function normalizarNombres(items: Array<{ nombre: string }> | null | undefined) {
  return [...new Set((items ?? []).map((item) => item.nombre.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );
}

function normalizarPorcentajes(items: Array<{ porcentaje: number }> | null | undefined) {
  return [...new Set((items ?? []).map((item) => Number(item.porcentaje)).filter((item) => !Number.isNaN(item)))].sort(
    (a, b) => a - b
  );
}

export function construirMaestrosFormulario(datos: {
  locales: Array<{ nombre: string }> | null | undefined;
  bancos: Array<{ nombre: string }> | null | undefined;
  formasPago: Array<{ nombre: string }> | null | undefined;
  tiposIva: Array<{ porcentaje: number }> | null | undefined;
  conceptosGastosBancarios: Array<{ nombre: string }> | null | undefined;
}): MaestrosFormulario {
  return {
    locales: normalizarNombres(datos.locales),
    bancos: normalizarNombres(datos.bancos),
    formasPago: normalizarNombres(datos.formasPago),
    tiposIva: normalizarPorcentajes(datos.tiposIva),
    conceptosGastosBancarios: normalizarNombres(datos.conceptosGastosBancarios),
  };
}
