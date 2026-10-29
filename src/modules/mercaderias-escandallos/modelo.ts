export type LineaMercaderia = {
  id: string;
  proveedor: string;
  factura: string;
  fecha: string;
  albaran: string;
  pagina: number;
  linea: number;
  producto: string;
  formato: string;
  local: string | null;
  compradas: number;
  bonificadas: number;
  /** Importe documental neto de descuentos, IVA incluido. Nunca precio redondeado × unidades. */
  importe_iva_centimos: number;
  estado_validacion: "pendiente" | "validada";
};

export type FiltrosMercaderia = { desde: string; hasta: string; local: string; busqueda: string };
export type ReferenciaMercaderia = {
  clave: string; producto: string; formato: string;
  compradas: number; bonificadas: number; recibidas: number;
  importeCentimos: number; precioCompra: number | null; costeReal: number;
  lineas: LineaMercaderia[];
};

export function normalizarReferencia(texto: string) {
  // No quitar cifras, formatos ni variantes: 0,0, 12 años y 70 cl no son intercambiables.
  return texto.trim().replace(/\s+/g, " ").toLocaleUpperCase("es");
}

export function validarLinea(linea: LineaMercaderia) {
  if (!linea.id || !linea.producto.trim() || !linea.formato.trim() || !linea.factura.trim() ||
      !linea.proveedor.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(linea.fecha) ||
      !Number.isInteger(linea.pagina) || linea.pagina < 1 || !Number.isInteger(linea.linea) || linea.linea < 1 ||
      !Number.isSafeInteger(linea.compradas) || linea.compradas < 0 ||
      !Number.isSafeInteger(linea.bonificadas) || linea.bonificadas < 0 ||
      linea.compradas + linea.bonificadas === 0 ||
      !Number.isSafeInteger(linea.importe_iva_centimos) || linea.importe_iva_centimos < 0 ||
      (linea.compradas === 0 && linea.importe_iva_centimos !== 0)) {
    throw new Error("Hay una línea con datos incompletos o importes no válidos. No se calculan totales parciales.");
  }
}

export function resumirMercaderias(lineas: LineaMercaderia[], filtros: FiltrosMercaderia) {
  if (filtros.desde > filtros.hasta) throw new Error("La fecha inicial debe ser anterior a la final.");
  const grupos = new Map<string, ReferenciaMercaderia>();
  const vistas = new Set<string>();
  const origenes = new Set<string>();
  const busqueda = normalizarReferencia(filtros.busqueda);
  for (const linea of lineas) {
    if (linea.estado_validacion !== "validada") continue;
    validarLinea(linea);
    if (vistas.has(linea.id)) continue;
    vistas.add(linea.id);
    const origen = JSON.stringify([linea.proveedor, linea.factura, linea.pagina, linea.linea]);
    if (origenes.has(origen)) throw new Error("Hay líneas de origen duplicadas. Revisa la carga antes de calcular.");
    origenes.add(origen);
    if (linea.fecha < filtros.desde || linea.fecha > filtros.hasta ||
        (filtros.local && linea.local !== filtros.local) ||
        (busqueda && !normalizarReferencia(`${linea.producto} ${linea.formato}`).includes(busqueda))) continue;
    const clave = JSON.stringify([normalizarReferencia(linea.producto), normalizarReferencia(linea.formato)]);
    const grupo = grupos.get(clave) ?? {
      clave, producto: linea.producto, formato: linea.formato, compradas: 0, bonificadas: 0,
      recibidas: 0, importeCentimos: 0, precioCompra: null, costeReal: 0, lineas: [],
    };
    grupo.compradas += linea.compradas;
    grupo.bonificadas += linea.bonificadas;
    grupo.recibidas = grupo.compradas + grupo.bonificadas;
    grupo.importeCentimos += linea.importe_iva_centimos;
    if (![grupo.compradas, grupo.bonificadas, grupo.recibidas, grupo.importeCentimos].every(Number.isSafeInteger)) {
      throw new Error("Las cantidades superan el cálculo exacto disponible.");
    }
    grupo.precioCompra = grupo.compradas ? grupo.importeCentimos / 100 / grupo.compradas : null;
    grupo.costeReal = grupo.importeCentimos / 100 / grupo.recibidas;
    grupo.lineas.push(linea);
    grupos.set(clave, grupo);
  }
  return [...grupos.values()].sort((a, b) => b.compradas - a.compradas || a.producto.localeCompare(b.producto, "es") || a.formato.localeCompare(b.formato, "es"));
}
