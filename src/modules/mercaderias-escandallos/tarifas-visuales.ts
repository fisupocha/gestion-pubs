import type { CosteCompra } from "./escandallo";

// Referencia visual de botella/unidad: jamás divide por servicio ni usa regalos o netos.
export function tarifasVisuales(compras:CosteCompra[]) {
  const grupos=new Map<string,CosteCompra[]>();
  for(const c of compras) grupos.set(c.clave,[...(grupos.get(c.clave)??[]),c]);
  return new Map([...grupos].map(([clave,lineas])=>{
    const completas=lineas.every(c=>c.tarifa!==null&&Number.isFinite(c.tarifa)&&c.tarifa>=0&&c.pagadas!==null&&Number.isFinite(c.pagadas)&&c.pagadas>0);
    const pagadas=lineas.reduce((s,c)=>s+(c.pagadas??0),0);
    return [clave,{precio:completas&&pagadas>0?lineas.reduce((s,c)=>s+c.tarifa!,0)/pagadas:null,prueba:lineas.some(c=>c.prueba)}] as const;
  }));
}
