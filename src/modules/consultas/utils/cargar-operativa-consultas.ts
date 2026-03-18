"use client";

import type { ClasificacionMapa } from "@/lib/clasificacion";
import {
  listarAlquileresPersistidos,
  listarCajaPersistida,
  listarCreditosPersistidos,
  listarFacturasEmitidasPersistidas,
  listarFacturasRecibidasPersistidas,
  listarGastosBancariosPersistidos,
  listarImpuestosPersistidos,
  listarNotasVariasPersistidas,
  listarPersonalPersistido,
} from "@/modules/operativa/utils/persistencia-operativa";
import type { OperativaConsultaData, RegistroBase } from "@/modules/consultas/utils/motor-consultas";

function normalizarRegistro(item: Record<string, unknown>): RegistroBase {
  return {
    id: Number(item.id ?? 0),
    empresa: String(item.empresa ?? ""),
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

export async function cargarOperativaConsultas(
  clasificacion: ClasificacionMapa
): Promise<OperativaConsultaData> {
  const [
    caja,
    facturasEmitidas,
    facturasRecibidas,
    alquileres,
    impuestos,
    personal,
    gastosBancarios,
    creditos,
    notasVarias,
  ] = await Promise.all([
    listarCajaPersistida(clasificacion),
    listarFacturasEmitidasPersistidas(clasificacion),
    listarFacturasRecibidasPersistidas(clasificacion),
    listarAlquileresPersistidos(clasificacion),
    listarImpuestosPersistidos(clasificacion),
    listarPersonalPersistido(clasificacion),
    listarGastosBancariosPersistidos(clasificacion),
    listarCreditosPersistidos(clasificacion),
    listarNotasVariasPersistidas(clasificacion),
  ]);

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
