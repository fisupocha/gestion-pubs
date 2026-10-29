import type { ReferenciaMercaderia } from "./modelo";

export const COLUMNAS_MERCADERIAS = [
  { campo: "producto", titulo: "Producto / formato" },
  { campo: "compradas", titulo: "Compradas" },
  { campo: "bonificadas", titulo: "Regaladas" },
  { campo: "recibidas", titulo: "Recibidas" },
  { campo: "importeCentimos", titulo: "Importe con IVA" },
  { campo: "precioCompra", titulo: "Precio medio con IVA" },
  { campo: "acuerdoComercial", titulo: "Acuerdo comercial" },
  { campo: "costeReal", titulo: "Coste real con IVA" },
] as const;
export type CampoOrden = typeof COLUMNAS_MERCADERIAS[number]["campo"];
export type OrdenMercaderias = { campo: CampoOrden; descendente: boolean };

export function cambiarOrden(actual: OrdenMercaderias, campo: CampoOrden): OrdenMercaderias {
  return { campo, descendente: actual.campo === campo ? !actual.descendente : true };
}

export function ordenarReferencias(filas: ReferenciaMercaderia[], orden: OrdenMercaderias) {
  return [...filas].sort((a, b) => {
    const x = a[orden.campo], y = b[orden.campo];
    // El precio no aplicable (solo regalos) queda siempre al final, no se trata como cero.
    if (x === null || y === null) return x === y ? desempatar(a, b) : x === null ? 1 : -1;
    const diferencia = typeof x === "string" && typeof y === "string"
      ? x.localeCompare(y, "es", { numeric: true, sensitivity: "base" })
      : Number(x) - Number(y);
    return diferencia ? diferencia * (orden.descendente ? -1 : 1) : desempatar(a, b);
  });
}

function desempatar(a: ReferenciaMercaderia, b: ReferenciaMercaderia) {
  return a.producto.localeCompare(b.producto, "es") || a.formato.localeCompare(b.formato, "es");
}
