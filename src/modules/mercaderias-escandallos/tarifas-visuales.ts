import type { CosteCompra, TarifaReferencia } from "./escandallo";

// Referencia visual de botella/unidad: jamás divide por servicio ni usa regalos o netos.
export function tarifasVisuales(compras:CosteCompra[],documentadas:TarifaReferencia[]=[]) {
  const grupos=new Map<string,CosteCompra[]>();
  for(const c of compras.filter(c=>!c.prueba)) grupos.set(c.clave,[...(grupos.get(c.clave)??[]),c]);
  const resultado=new Map([...grupos].map(([clave,lineas])=>{
    const completas=lineas.every(c=>c.tarifa!==null&&Number.isFinite(c.tarifa)&&c.tarifa>=0&&c.pagadas!==null&&Number.isFinite(c.pagadas)&&c.pagadas>=0&&(c.pagadas>0||c.tarifa===0));
    const pagadas=lineas.reduce((s,c)=>s+(c.pagadas??0),0);
    return [clave,{precio:completas&&pagadas>0?lineas.reduce((s,c)=>s+c.tarifa!,0)/pagadas:null,prueba:lineas.some(c=>c.prueba)}] as const;
  }));
  const fuentes=new Map<string,TarifaReferencia[]>();
  for(const t of documentadas) fuentes.set(t.clave,[...(fuentes.get(t.clave)??[]),t]);
  for(const [clave,lineas] of fuentes) {
    if(resultado.get(clave)?.precio!=null) continue;
    const unidades=lineas.reduce((s,t)=>s+t.unidades,0);
    resultado.set(clave,{precio:lineas.reduce((s,t)=>s+t.baseCentimos/100*(1+t.iva/100),0)/unidades,prueba:false});
  }
  return resultado;
}
