import { listarBancos } from "@/modules/maestros/bancos/data/listar-bancos";
import { listarConceptosGastosBancarios } from "@/modules/maestros/conceptos-gastos-bancarios/data/listar-conceptos-gastos-bancarios";
import { listarEmpresas } from "@/modules/maestros/empresas/data/listar-empresas";
import { listarFormasPago } from "@/modules/maestros/formas-pago/data/listar-formas-pago";
import { listarTiposIva } from "@/modules/maestros/tipos-iva/data/listar-tipos-iva";
import {
  construirMaestrosFormulario,
  type MaestrosFormulario,
} from "@/modules/maestros/varios/data/construir-maestros-formulario";

export { construirMaestrosFormulario, type MaestrosFormulario };

export async function obtenerMaestrosFormulario(): Promise<MaestrosFormulario> {
  const [localesData, bancosData, formasPagoData, tiposIvaData, conceptosData] =
    await Promise.all([
      listarEmpresas(),
      listarBancos(),
      listarFormasPago(),
      listarTiposIva(),
      listarConceptosGastosBancarios(),
    ]);

  return construirMaestrosFormulario({
    locales: localesData,
    bancos: bancosData,
    formasPago: formasPagoData,
    tiposIva: tiposIvaData,
    conceptosGastosBancarios: conceptosData,
  });
}
