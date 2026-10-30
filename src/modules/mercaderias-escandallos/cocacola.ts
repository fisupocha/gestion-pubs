import type { FiltrosMercaderia } from "./modelo";

export type ReferenciaCoca = {
  codigo: string; producto: string; formato: string; unidadesCaja: number;
  directo: number | null; mensual: number | null; semestral: number;
};
export type CompraCoca = {
  id: string; codigo: string; fecha: string; factura: string; local: string; cajas: number;
  /** Opcional para mantener las compras anteriores compatibles; ausencia = 0. */
  cajasRegaladas?: number;
  documentada?: {ivaVerificado?:boolean;pagina:number;linea:number;precioCajaCentimos:number;descuentoCentimos:number;puntoVerdeCentimos:number;fuente:string};
  /** Céntimos SIN IVA documentales. Neto ya contiene descuento directo y punto verde. */
  brutoCentimos: number; netoCentimos: number; iva: number;
};

export function calcularCoca(ref: ReferenciaCoca, compras: CompraCoca[]) {
  const ids = new Map<string,string>();
  const lineas = compras.filter(l => l.codigo === ref.codigo).filter(l => {
    if (ids.has(l.id)) {if(ids.get(l.id)!==JSON.stringify(l))throw new Error("Compra duplicada con datos distintos.");return false;}
    ids.set(l.id,JSON.stringify(l)); return true;
  });
  for (const l of lineas) {
    const regaladas = l.cajasRegaladas ?? 0;
    const d=l.documentada;
    if(d&&(!Number.isSafeInteger(d.pagina)||d.pagina<1||!Number.isSafeInteger(d.linea)||d.linea<1||!d.fuente?.trim()||![d.precioCajaCentimos,d.descuentoCentimos,d.puntoVerdeCentimos].every(n=>Number.isSafeInteger(n)&&n>=0)||d.precioCajaCentimos*l.cajas!==l.brutoCentimos||l.brutoCentimos-d.descuentoCentimos+d.puntoVerdeCentimos!==l.netoCentimos)) throw new Error("Origen o importes documentales de Coca-Cola no válidos.");
    if (!Number.isSafeInteger(l.cajas) || l.cajas < 0 || !Number.isSafeInteger(regaladas) || regaladas < 0 ||
        !Number.isSafeInteger(l.cajas + regaladas) || l.cajas + regaladas === 0 ||
        !Number.isSafeInteger(l.brutoCentimos) || !Number.isSafeInteger(l.netoCentimos) ||
        l.brutoCentimos < 0 || (l.cajas > 0 && l.brutoCentimos === 0) || l.netoCentimos < 0 ||
        (l.cajas === 0 && (l.brutoCentimos !== 0 || l.netoCentimos !== 0)) || !Number.isFinite(l.iva) || l.iva < 0) {
      throw new Error("Compra de prueba no válida: no se presentan resultados parciales.");
    }
  }
  const cajas = lineas.reduce((s,l) => s+l.cajas,0);
  const regaladas = lineas.reduce((s,l) => s+(l.cajasRegaladas ?? 0),0);
  const recibidas = cajas + regaladas;
  if (![cajas, regaladas, recibidas, recibidas * ref.unidadesCaja].every(Number.isSafeInteger)) throw new Error("Cantidad de cajas fuera del cálculo exacto disponible.");
  const documental=lineas.length>0&&lineas.every(l=>!!l.documentada);
  const bruto=lineas.reduce((s,l)=>s+l.brutoCentimos,0);
  const directo=documental&&bruto>0?lineas.reduce((s,l)=>s+l.documentada!.descuentoCentimos,0)/bruto*100:ref.directo;
  const completo = directo !== null && ref.mensual !== null;
  // Bases de abonos de la prueba: tarifa bruta del producto. No aplicar al neto,
  // no volver a restar el directo. Los abonos reales se contrastarán al cargar.
  const costeCentimos = completo || documental ? lineas.reduce((s,l) => s +
    (l.netoCentimos - l.brutoCentimos * (((ref.mensual??0) + ref.semestral) / 100)) * (1 + l.iva / 100),0) : (recibidas > 0 && cajas === 0 ? 0 : null);
  if (costeCentimos !== null && costeCentimos < 0) throw new Error("Los descuentos superan el coste de compra.");
  return { ...ref, directo, provisional:documental&&!completo, cajas: lineas.length ? cajas : null, regaladas: lineas.length ? regaladas : null, recibidas: lineas.length ? recibidas : null, lineas,
    // Equivalente sobre una base común para esta simulación, no suma universal.
    total: completo ? directo! + ref.mensual! + ref.semestral : null,
    precio: recibidas && costeCentimos !== null ? costeCentimos / 100 / (recibidas * ref.unidadesCaja) : null };
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
  { campo: "producto", titulo: "Producto / formato" }, { campo: "cajas", titulo: "Cajas compradas" },
  { campo: "regaladas", titulo: "Cajas regaladas" }, { campo: "recibidas", titulo: "Cajas recibidas" },
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

export function fusionarComprasCoca(pruebas:CompraCoca[],documentadas:CompraCoca[]) {
 const normal=(f:string)=>f.replace(/ · PRUEBA$/," ").trim();
 const identidades=new Set<string>(),ids=new Map<string,string>();
 for(const c of documentadas) {
  if(!c.documentada) throw new Error("Falta procedencia documental.");
  const k=JSON.stringify([c.factura,c.documentada.pagina,c.documentada.linea]);
  if(identidades.has(k)||ids.has(c.id))throw new Error("Línea documental duplicada.");
  identidades.add(k);ids.set(c.id,JSON.stringify(c));
 }
 return [...documentadas,...pruebas.filter(p=>!documentadas.some(d=>normal(d.factura)===normal(p.factura)&&d.codigo===p.codigo))];
}
