import { normalizarReferencia, type LineaMercaderia } from "./modelo";

export type ProductoVenta = { producto:string; formato:string; proveedores:string[]; grupo:string; formatos:string[] };
export function catalogoVenta(origenes:{producto:string;formato:string;proveedor:string}[]):ProductoVenta[] {
  const productos=new Map<string,ProductoVenta>();
  for(const origen of origenes) {
    const clave=JSON.stringify([normalizarReferencia(origen.producto),normalizarReferencia(origen.formato)]);
    const existente=productos.get(clave);
    if(existente) { if(!existente.proveedores.includes(origen.proveedor)) existente.proveedores.push(origen.proveedor); continue; }
    const nombre=normalizarReferencia(origen.producto).normalize("NFD").replace(/[\u0300-\u036f]/g,"");
    let grupo="Pendiente de clasificar", formatos=["Pendiente de definir"];
    if(/^GINEBRA TANQUERAY 0[.,]0$/.test(nombre)) {grupo="Sin alcohol";formatos=["Copa · 7 cl + refresco"];}
    else if(nombre==="TANQUERAY RANGPUR") {grupo="Alcohol";formatos=["Copa · 7 cl + refresco"];}
    else if(/CHAMP|MOET|CAVA|CODORN/.test(nombre)) {grupo="Champán y espumosos";formatos=["Botella completa"];}
    else if(/WHISK|RON\b|GINEBRA|GIN\b|VODKA|TEQUILA|LICOR|CREMA|JAGER|JACK DANIEL|BAILEYS|PACHARAN|BRANDY|AMARE|FERNET|PONCHE|MALIBU|APEROL|MARTINI|PATRON/.test(nombre) && !/SIN ALCOHOL|0[.,]0/.test(nombre)) {grupo="Alcohol";formatos=["Copa · 7 cl + refresco","Chupito · 5 cl","Botella completa"];}
    else if(/AGUA|SOLAN|VICHY/.test(nombre)) {grupo="Agua";formatos=["Unidad"];}
    else if(/MAHOU|ALHAMBRA|CORONITA|CERVEZA|MIXTA/.test(nombre)) {grupo="Cerveza";formatos=["Unidad"];}
    else if(/COCA|FANTA|SPRITE|AQUARIUS|NESTEA|FUZE|SCHWEPP|TONICA|RE[B D]*BULL|MONSTER|ROYAL BLISS|GINGER|REFRESCO/.test(nombre)) {grupo="Refresco";formatos=["Unidad"];}
    productos.set(clave,{producto:origen.producto,formato:origen.formato,proveedores:[origen.proveedor],grupo,formatos});
  }
  return [...productos.values()].sort((a,b)=>a.producto.localeCompare(b.producto,"es")||a.formato.localeCompare(b.formato,"es"));
}
export function origenesValidados(lineas:LineaMercaderia[]) {return lineas.filter(l=>l.estado_validacion==="validada");}
