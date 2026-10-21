import { construirClasificacion } from "@/lib/clasificacion";
import { listarBancos } from "@/modules/maestros/bancos/data/listar-bancos";
import { listarClientes } from "@/modules/maestros/clientes/data/listar-clientes";
import { listarConceptosGastosBancarios } from "@/modules/maestros/conceptos-gastos-bancarios/data/listar-conceptos-gastos-bancarios";
import { listarEmpresas } from "@/modules/maestros/empresas/data/listar-empresas";
import { listarFamilias } from "@/modules/maestros/familias/data/listar-familias";
import { listarFormasPago } from "@/modules/maestros/formas-pago/data/listar-formas-pago";
import { listarProveedores } from "@/modules/maestros/proveedores/data/listar-proveedores";
import { listarSubfamilias } from "@/modules/maestros/subfamilias/data/listar-subfamilias";
import { listarTipos } from "@/modules/maestros/tipos/data/listar-tipos";
import { listarTiposIva } from "@/modules/maestros/tipos-iva/data/listar-tipos-iva";
import { construirMaestrosFormulario } from "@/modules/maestros/varios/data/construir-maestros-formulario";
import type { MaestrosPersistencia } from "@/modules/operativa/utils/persistencia-operativa";

function nombresEnOrden(items: Array<{ nombre: string }>) {
  return [...new Set(items.map((item) => item.nombre.trim()))].filter(Boolean);
}

export async function prepararPantallaOperativa() {
  const [
    empresas,
    bancos,
    formasPago,
    tiposIva,
    conceptos,
    proveedores,
    clientes,
    tipos,
    familias,
    subfamilias,
  ] = await Promise.all([
    listarEmpresas(),
    listarBancos(),
    listarFormasPago(),
    listarTiposIva(),
    listarConceptosGastosBancarios(),
    listarProveedores(),
    listarClientes(),
    listarTipos(),
    listarFamilias(),
    listarSubfamilias(),
  ]);

  const maestrosPersistencia: MaestrosPersistencia = {
    empresas: empresas.map((item) => ({ id: item.id, nombre: item.nombre })),
    proveedores: proveedores.map((item) => ({ id: item.id, nombre: item.nombre })),
    clientes: clientes.map((item) => ({ id: item.id, nombre: item.nombre })),
    tipos: tipos.map((item) => ({ id: item.id, nombre: item.nombre })),
    familias: familias.map((item) => ({ id: item.id, nombre: item.nombre, tipo_id: item.tipoId })),
    subfamilias: subfamilias.map((item) => ({
      id: item.id,
      nombre: item.nombre,
      familia_id: item.familiaId,
    })),
    formasPago: formasPago.map((item) => ({ id: item.id, nombre: item.nombre })),
    bancos: bancos.map((item) => ({ id: item.id, nombre: item.nombre })),
  };

  return {
    clasificacion: construirClasificacion(tipos, familias, subfamilias),
    maestros: construirMaestrosFormulario({
      locales: empresas,
      bancos,
      formasPago,
      tiposIva,
      conceptosGastosBancarios: conceptos,
    }),
    proveedores: nombresEnOrden(proveedores),
    clientes: nombresEnOrden(clientes),
    maestrosPersistencia,
  };
}
