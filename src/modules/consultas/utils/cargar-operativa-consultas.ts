"use client";

import type { ClasificacionMapa } from "@/lib/clasificacion";
import {
  listarOperativaParaConsultas,
  type LecturaOperativaInyectada,
  type MaestrosPersistencia,
} from "@/modules/operativa/utils/persistencia-operativa";
import type { OperativaConsultaData, RegistroBase } from "@/modules/consultas/utils/motor-consultas";

function normalizarRegistro(item: Record<string, unknown>): RegistroBase {
  return {
    id: Number(item.id ?? 0),
    empresa: String(item.empresa ?? ""),
    proveedor: String(item.proveedor ?? ""),
    cliente: String(item.cliente ?? ""),
    numeroFactura: String(item.numeroFactura ?? ""),
    pagado: Boolean(item.pagado),
    fechaFactura: String(item.fechaFactura ?? ""),
    tipo: String(item.tipo ?? ""),
    familia: String(item.familia ?? ""),
    subfamilia: String(item.subfamilia ?? ""),
    base0: String(item.base0 ?? ""),
    base4: String(item.base4 ?? ""),
    base10: String(item.base10 ?? ""),
    base21: String(item.base21 ?? ""),
  };
}

export function lecturaMaestrosYaCargados(
  maestros?: MaestrosPersistencia
): LecturaOperativaInyectada | undefined {
  if (!maestros) {
    return undefined;
  }

  return {
    async cargarMaestros() {
      return maestros;
    },
  };
}

export async function cargarOperativaConsultas(
  clasificacion: ClasificacionMapa,
  inyectada?: LecturaOperativaInyectada
): Promise<OperativaConsultaData> {
  const {
    caja,
    facturasEmitidas,
    facturasRecibidas,
    alquileres,
    impuestos,
    personal,
    gastosBancarios,
    creditos,
    notasVarias,
  } = await listarOperativaParaConsultas(clasificacion, inyectada);

  return {
    caja: caja.map((item) => normalizarRegistro(item as unknown as Record<string, unknown>)),
    facturasEmitidas: facturasEmitidas.map((item) =>
      normalizarRegistro(item as unknown as Record<string, unknown>)
    ),
    facturasRecibidas: facturasRecibidas.map((item) =>
      normalizarRegistro(item as unknown as Record<string, unknown>)
    ),
    alquileres: alquileres.map((item) =>
      normalizarRegistro(item as unknown as Record<string, unknown>)
    ),
    impuestos: impuestos.map((item) =>
      normalizarRegistro(item as unknown as Record<string, unknown>)
    ),
    personal: personal.map((item) =>
      normalizarRegistro(item as unknown as Record<string, unknown>)
    ),
    gastosBancarios: gastosBancarios.map((item) =>
      normalizarRegistro(item as unknown as Record<string, unknown>)
    ),
    creditos: creditos.map((item) =>
      normalizarRegistro(item as unknown as Record<string, unknown>)
    ),
    notasVarias: notasVarias.map((item) =>
      normalizarRegistro(item as unknown as Record<string, unknown>)
    ),
  };
}
