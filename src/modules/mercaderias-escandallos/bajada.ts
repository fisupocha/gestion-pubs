import type { FiltrosMercaderia } from "./modelo";

export type ReferenciaBajada = { codigo:string; producto:string; formato:string; unidadesCaja:number|null; iva:number; anual:number|null };
export type CompraBajada = {id:string;codigo:string;fecha:string;factura:string;albaran:string;local:string;cajas:number;regaladas:number;brutoCentimos:number;netoCentimos:number;descuentoFactura:number};
export type DatosBajada = {referencias:ReferenciaBajada[];compras:CompraBajada[]};

export function validarDatosBajada(datos:DatosBajada) {
  if (!Array.isArray(datos.referencias)||!Array.isArray(datos.compras)) throw new Error("Datos de La Bajada no válidos.");
  const porcentaje=(n:number)=>Number.isFinite(n)&&n>=0&&n<=100;
  const codigos=new Set<string>();
  for (const r of datos.referencias) {
    if (!r||!r.codigo||typeof r.producto!=="string"||typeof r.formato!=="string"||codigos.has(r.codigo)||
        (r.unidadesCaja!==null&&(!Number.isSafeInteger(r.unidadesCaja)||r.unidadesCaja<=0))||!porcentaje(r.iva)||
        (r.anual!==null&&!porcentaje(r.anual))) throw new Error("Referencia de La Bajada no válida.");
    codigos.add(r.codigo);
  }
  const ids=new Set<string>();
  for (const c of datos.compras) {
    if (!c||typeof c.id!=="string"||!c.id||ids.has(c.id)||!codigos.has(c.codigo)||typeof c.fecha!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(c.fecha)||
        typeof c.factura!=="string"||typeof c.albaran!=="string"||typeof c.local!=="string"||
        !Number.isSafeInteger(c.cajas)||c.cajas<0||!Number.isSafeInteger(c.regaladas)||c.regaladas<0||
        !Number.isSafeInteger(c.cajas+c.regaladas)||c.cajas+c.regaladas<=0||!Number.isSafeInteger(c.brutoCentimos)||c.brutoCentimos<0||
        !Number.isSafeInteger(c.netoCentimos)||c.netoCentimos<0||!porcentaje(c.descuentoFactura)||
        (c.cajas===0&&(c.netoCentimos!==0||c.brutoCentimos!==0))||(c.cajas>0&&c.brutoCentimos===0)) throw new Error("Compra de La Bajada no válida o duplicada.");
    ids.add(c.id);
  }
}

export function resumirBajada(datos:DatosBajada,filtros:FiltrosMercaderia) {
  validarDatosBajada(datos);
  if (filtros.desde>filtros.hasta) throw new Error("La fecha inicial debe ser anterior a la final.");
  const seleccion=datos.compras.filter(l=>l.fecha>=filtros.desde&&l.fecha<=filtros.hasta&&(!filtros.local||l.local===filtros.local));
  return datos.referencias.filter(r=>`${r.producto} ${r.formato}`.toLocaleLowerCase("es").includes(filtros.busqueda.toLocaleLowerCase("es").trim())).map(r=>{
    const lineas=seleccion.filter(l=>l.codigo===r.codigo);
    const compradas=lineas.reduce((s,l)=>s+l.cajas,0),regaladas=lineas.reduce((s,l)=>s+l.regaladas,0),recibidas=compradas+regaladas;
    const bruto=lineas.reduce((s,l)=>s+l.brutoCentimos,0);
    const neto=lineas.reduce((s,l)=>s+l.netoCentimos,0);
    if (![compradas,regaladas,recibidas,bruto,neto].every(Number.isSafeInteger)) throw new Error("Importes o cajas fuera del cálculo exacto disponible.");
    // El descuento de la factura mensual ya está incluido en neto. Nunca volver a restarlo.
    // Excluir las líneas sin cargo del porcentaje económico: son regalos, no un descuento pactado del 100%.
    const mensual=bruto ? lineas.reduce((s,l)=>s+l.brutoCentimos*l.descuentoFactura,0)/bruto : null;
    // Anual desconocido no es 0: se muestra coste conocido y estado provisional.
    const coste=neto-(r.anual===null?0:bruto*r.anual/100);
    if(coste<0) throw new Error("El descuento anual supera el coste conocido.");
    return {...r,lineas,compradas:lineas.length?compradas:null,regaladas:lineas.length?regaladas:null,recibidas:lineas.length?recibidas:null,
      mensual,total:mensual===null?null:mensual+(r.anual??0),
      precio:recibidas&&r.unidadesCaja!==null?coste*(1+r.iva/100)/100/(recibidas*r.unidadesCaja):null};
  });
}
export const COLUMNAS_BAJADA=[{campo:"producto",titulo:"Producto / formato"},{campo:"compradas",titulo:"Cajas compradas"},{campo:"regaladas",titulo:"Cajas regaladas"},{campo:"recibidas",titulo:"Cajas recibidas"},{campo:"mensual",titulo:"Descuento factura mensual"},{campo:"anual",titulo:"Descuento anual"},{campo:"total",titulo:"Descuento total conocido"},{campo:"precio",titulo:"Precio unidad con IVA"}] as const;
export type CampoBajada=typeof COLUMNAS_BAJADA[number]["campo"];
export function ordenarBajada(filas:ReturnType<typeof resumirBajada>,campo:CampoBajada,descendente:boolean) {
  return [...filas].sort((a,b)=>{
    const x=a[campo],y=b[campo];
    if(x===null||y===null) return x===y?a.producto.localeCompare(b.producto,"es"):x===null?1:-1;
    const d=typeof x==="string"&&typeof y==="string"?x.localeCompare(y,"es"):Number(x)-Number(y);
    return d?d*(descendente?-1:1):a.producto.localeCompare(b.producto,"es");
  });
}
