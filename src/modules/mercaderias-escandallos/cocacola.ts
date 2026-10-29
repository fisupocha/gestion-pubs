import type { FiltrosMercaderia } from "./modelo";

export type ReferenciaCoca = {
  codigo: string; producto: string; formato: string; unidadesCaja: number;
  directo: number | null; mensual: number | null; semestral: number;
};
export type CompraCoca = {
  id: string; codigo: string; fecha: string; factura: string; local: string; cajas: number;
  /** Céntimos SIN IVA documentales. Neto ya contiene descuento directo y punto verde. */
  brutoCentimos: number; netoCentimos: number; iva: number;
};

export function calcularCoca(ref: ReferenciaCoca, compras: CompraCoca[]) {
  const ids = new Set<string>();
  const lineas = compras.filter(l => l.codigo === ref.codigo).filter(l => {
    if (ids.has(l.id)) return false;
    ids.add(l.id); return true;
  });
  for (const l of lineas) {
    if (!Number.isSafeInteger(l.cajas) || l.cajas <= 0 ||
        !Number.isSafeInteger(l.brutoCentimos) || !Number.isSafeInteger(l.netoCentimos) ||
        l.brutoCentimos <= 0 || l.netoCentimos < 0 || !Number.isFinite(l.iva) || l.iva < 0) {
      throw new Error("Compra de prueba no válida: no se presentan resultados parciales.");
    }
  }
  const cajas = lineas.reduce((s,l) => s+l.cajas,0);
  const completo = ref.directo !== null && ref.mensual !== null;
  // Bases de abonos de la prueba: tarifa bruta del producto. No aplicar al neto,
  // no volver a restar el directo. Los abonos reales se contrastarán al cargar.
  const costeCentimos = completo ? lineas.reduce((s,l) => s +
    (l.netoCentimos - l.brutoCentimos * ((ref.mensual! + ref.semestral) / 100)) * (1 + l.iva / 100),0) : null;
  if (costeCentimos !== null && costeCentimos < 0) throw new Error("Los descuentos superan el coste de compra.");
  return { ...ref, cajas: cajas || null, lineas,
    // Equivalente sobre una base común para esta simulación, no suma universal.
    total: completo ? ref.directo! + ref.mensual! + ref.semestral : null,
    precio: cajas && costeCentimos !== null ? costeCentimos / 100 / (cajas * ref.unidadesCaja) : null };
}

export function resumirCoca(compras: CompraCoca[], filtros: FiltrosMercaderia, referencias: ReferenciaCoca[]) {
  if (filtros.desde > filtros.hasta) throw new Error("La fecha inicial debe ser anterior a la final.");
  const seleccion = compras.filter(l => l.fecha >= filtros.desde && l.fecha <= filtros.hasta && (!filtros.local || l.local === filtros.local));
  const buscar = filtros.busqueda.toLocaleLowerCase("es").trim();
  // Catálogo fijo aunque se retiren todas las compras de prueba.
  return referencias.filter(r => `${r.producto} ${r.formato}`.toLocaleLowerCase("es").includes(buscar))
    .map(r => calcularCoca(r, seleccion));
}

export type FilaCoca = ReturnType<typeof calcularCoca>;
export const COLUMNAS_COCA = [
  { campo: "producto", titulo: "Producto / formato" }, { campo: "cajas", titulo: "Cajas" },
  { campo: "directo", titulo: "Descuento Directo" }, { campo: "mensual", titulo: "Descuento factura mensual" },
  { campo: "semestral", titulo: "Descuento factura semestral" }, { campo: "total", titulo: "Descuento total" },
  { campo: "precio", titulo: "Precio unidad con IVA" },
] as const;
export type CampoCoca = typeof COLUMNAS_COCA[number]["campo"];
export function ordenarCoca(filas: FilaCoca[], campo: CampoCoca, descendente: boolean) {
  return [...filas].sort((a,b) => {
    const x=a[campo], y=b[campo];
    if (x === null || y === null) return x === y ? a.producto.localeCompare(b.producto,"es") : x === null ? 1 : -1;
    const d = typeof x === "string" && typeof y === "string" ? x.localeCompare(y,"es") : Number(x)-Number(y);
    return d ? d*(descendente ? -1 : 1) : a.producto.localeCompare(b.producto,"es");
  });
}
