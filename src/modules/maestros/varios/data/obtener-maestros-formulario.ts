import { listarBancos } from "@/modules/maestros/bancos/data/listar-bancos";
import { listarConceptosGastosBancarios } from "@/modules/maestros/conceptos-gastos-bancarios/data/listar-conceptos-gastos-bancarios";
import { listarEmpresas } from "@/modules/maestros/empresas/data/listar-empresas";
import { listarFormasPago } from "@/modules/maestros/formas-pago/data/listar-formas-pago";
import { listarTiposIva } from "@/modules/maestros/tipos-iva/data/listar-tipos-iva";

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

export async function obtenerMaestrosFormulario(): Promise<MaestrosFormulario> {
  const [localesData, bancosData, formasPagoData, tiposIvaData, conceptosData] =
    await Promise.all([
      listarEmpresas(),
      listarBancos(),
      listarFormasPago(),
      listarTiposIva(),
      listarConceptosGastosBancarios(),
    ]);

  const locales = normalizarNombres(localesData);
  const bancos = normalizarNombres(bancosData);
  const formasPago = normalizarNombres(formasPagoData);
  const tiposIva = normalizarPorcentajes(tiposIvaData);
  const conceptosGastosBancarios = normalizarNombres(conceptosData);

  return {
    locales,
    bancos,
    formasPago,
    tiposIva,
    conceptosGastosBancarios,
  };
}
