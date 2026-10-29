import { normalizarReferencia, validarLinea, type LineaMercaderia } from "./modelo";
import { calcularCoca, type CompraCoca, type ReferenciaCoca } from "./cocacola";
import { resumirBajada, type DatosBajada } from "./bajada";

export const claveProducto = (producto:string, formato:string) => JSON.stringify([normalizarReferencia(producto),normalizarReferencia(formato)]);
export type CosteCompra = {id:string;documento:string;fecha:string;clave:string;unidades:number|null;pagadas:number|null;neto:number|null;tarifa:number|null;prueba:boolean};
// Cada importe es con IVA. Los abonos son asignaciones documentadas, no porcentajes inventados.
export type AjusteCoste = {id:string;documento:string;recibido:string;desde:string;hasta:string;clave:string;abonoCentimos:number;regaladas:number};
export type PrecioVenta = {id:string;clave:string;formato:string;desde:string;hasta:string;centimos:number};
export type RecetaVenta = {clave:string;capacidadCl:number;mezclador?:{clave:string;unidades:number}};
export type ConfiguracionEscandallo = {version:1;ajustes:AjusteCoste[];precios:PrecioVenta[];recetas:RecetaVenta[]};
export const configuracionVacia:ConfiguracionEscandallo={version:1,ajustes:[],precios:[],recetas:[]};
const fechaValida=(f:string)=>typeof f==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(f)&&!Number.isNaN(Date.parse(f))&&new Date(f).toISOString().slice(0,10)===f;
export function validarConfiguracion(c:ConfiguracionEscandallo) {
  if(!c||c.version!==1||!Array.isArray(c.ajustes)||!Array.isArray(c.precios)||!Array.isArray(c.recetas)) throw new Error("Configuración de escandallos no válida.");
  const ids=new Set<string>();
  const rango=(r:{desde:string;hasta:string})=>fechaValida(r.desde)&&fechaValida(r.hasta)&&r.desde<=r.hasta;
  for(const a of c.ajustes) {
    if(!a||!a.id||ids.has(a.id)||!a.documento?.trim()||!a.clave||!fechaValida(a.recibido)||!rango(a)||!Number.isSafeInteger(a.abonoCentimos)||a.abonoCentimos<0||!Number.isSafeInteger(a.regaladas)||a.regaladas<0||a.abonoCentimos+a.regaladas===0) throw new Error("Abono o regalo no válido o duplicado.");
    ids.add(a.id);
  }
  const documentos=new Set<string>();
  for(const a of c.ajustes) {const k=JSON.stringify([a.documento,a.clave,a.desde,a.hasta]);if(documentos.has(k)) throw new Error("Asignación documental duplicada.");documentos.add(k);}
  for(const p of c.precios) {
    if(!p||!p.id||ids.has(p.id)||!p.clave||!p.formato||!rango(p)||!Number.isSafeInteger(p.centimos)||p.centimos<=0) throw new Error("Precio de venta no válido.");
    ids.add(p.id);
  }
  for(let i=0;i<c.precios.length;i++) for(const p of c.precios.slice(i+1)) {const a=c.precios[i];if(a.clave===p.clave&&a.formato===p.formato&&a.desde<=p.hasta&&p.desde<=a.hasta) throw new Error("Vigencias de precios solapadas.");}
  const recetas=new Set<string>();
  for(const r of c.recetas) {if(!r||!r.clave||recetas.has(r.clave)||!Number.isFinite(r.capacidadCl)||r.capacidadCl<=0||(r.mezclador&&(!r.mezclador.clave||r.mezclador.clave===r.clave||!Number.isFinite(r.mezclador.unidades)||r.mezclador.unidades<=0))) throw new Error("Medida o mezclador no válido.");recetas.add(r.clave);}
}

export function conectarCompras(lineas:LineaMercaderia[],coca:ReferenciaCoca[],compras:CompraCoca[],bajada:DatosBajada,rojas:DatosBajada):CosteCompra[] {
  const resultado:CosteCompra[]=[];
  const ids=new Set<string>(),origenes=new Set<string>();
  for(const l of lineas) {
    if(l.estado_validacion!=="validada"||ids.has(l.id)) continue;
    validarLinea(l);ids.add(l.id);
    const origen=JSON.stringify([l.proveedor,l.factura,l.pagina,l.linea]);
    if(origenes.has(origen)) throw new Error("Líneas documentales duplicadas.");origenes.add(origen);
    resultado.push({id:l.id,documento:l.factura,fecha:l.fecha,clave:claveProducto(l.producto,l.formato),unidades:l.compradas+l.bonificadas,pagadas:l.compradas,neto:l.importe_iva_centimos/100,tarifa:null,prueba:false});
  }
  const vistasCoca=new Map<string,string>();
  for(const c of compras) {
    const firma=JSON.stringify(c),previa=vistasCoca.get(c.id);
    if(previa!==undefined) {if(previa!==firma) throw new Error("Compra de Coca-Cola duplicada con datos distintos.");continue;}vistasCoca.set(c.id,firma);
    const r=coca.find(r=>r.codigo===c.codigo);if(!r) throw new Error("Referencia de Coca-Cola no encontrada.");
    const calculo=calcularCoca(r,[c]);
    const unidades=(c.cajas+(c.cajasRegaladas??0))*r.unidadesCaja;
    resultado.push({id:`coca:${c.id}`,documento:c.factura,fecha:c.fecha,clave:claveProducto(r.producto,r.formato),unidades,pagadas:c.cajas*r.unidadesCaja,neto:calculo.precio===null?null:calculo.precio*unidades,tarifa:c.brutoCentimos/100*(1+c.iva/100),prueba:true});
  }
  for(const [nombre,datos] of [["bajada",bajada],["rojas",rojas]] as const) {
    // Reutilizar las validaciones y el cálculo de descuentos de la pantalla de compras.
    resumirBajada(datos,{desde:"0001-01-01",hasta:"9999-12-31",local:"",busqueda:""});
    for(const c of datos.compras) {
      const r=datos.referencias.find(r=>r.codigo===c.codigo)!;
      const calculo=resumirBajada({referencias:[r],compras:[c]},{desde:c.fecha,hasta:c.fecha,local:"",busqueda:""})[0];
      const unidades=r.unidadesCaja===null?null:(c.cajas+c.regaladas)*r.unidadesCaja;
      resultado.push({id:`${nombre}:${c.id}`,documento:c.factura,fecha:c.fecha,clave:claveProducto(r.producto,r.formato),unidades,pagadas:r.unidadesCaja===null?null:c.cajas*r.unidadesCaja,neto:unidades===null||calculo.precio===null?null:calculo.precio*unidades,tarifa:c.brutoCentimos/100*(1+r.iva/100),prueba:true});
    }
  }
  return resultado;
}

export function costePeriodo(compras:CosteCompra[],ajustes:AjusteCoste[],clave:string,desde:string,hasta:string) {
  if(!fechaValida(desde)||!fechaValida(hasta)||desde>hasta) throw new Error("Periodo no válido.");
  const todas=compras.filter(c=>c.clave===clave);
  const seleccion=todas.filter(c=>c.fecha>=desde&&c.fecha<=hasta);
  const aplicados=ajustes.filter(a=>a.clave===clave&&a.desde<=hasta&&a.hasta>=desde);
  const documentos=new Set(compras.map(c=>c.documento));
  if(aplicados.some(a=>documentos.has(a.documento))) throw new Error("El ajuste ya está representado en las compras: no se puede descontar dos veces.");
  const incompleto=!seleccion.length||seleccion.some(c=>c.unidades===null||c.neto===null);
  let neto=seleccion.reduce((s,c)=>s+(c.neto??0),0),unidades=seleccion.reduce((s,c)=>s+(c.unidades??0),0);
  const incidencias:string[]=[];
  for(const a of aplicados) {
    // Un regalo tiene fecha/periodo de efecto explícito; no se reparte una botella fraccionada entre meses.
    if(a.regaladas&&(a.desde<desde||a.hasta>hasta)) {incidencias.push("Regalo de periodo más amplio: seleccionar su periodo completo.");continue;}
    const base=todas.filter(c=>c.fecha>=a.desde&&c.fecha<=a.hasta);
    if(base.some(c=>c.unidades===null||c.neto===null)) {incidencias.push("Compras incompletas para distribuir el abono.");continue;}
    const total=base.reduce((s,c)=>s+(c.unidades??0),0);
    const parcial=base.filter(c=>c.fecha>=desde&&c.fecha<=hasta).reduce((s,c)=>s+(c.unidades??0),0);
    if(!total) {incidencias.push("Abono sin compras de referencia.");continue;}
    neto-=a.abonoCentimos/100*parcial/total;
    unidades+=a.regaladas;
  }
  if(neto < -0.0000001) throw new Error("Los abonos superan el coste documentado.");
  const pagadas=seleccion.reduce((s,c)=>s+(c.pagadas??0),0);
  const tarifa=seleccion.length&&pagadas>0&&seleccion.every(c=>c.tarifa!==null&&c.pagadas!==null)?seleccion.reduce((s,c)=>s+c.tarifa!,0)/pagadas:null;
  return {efectivo:incompleto||incidencias.length||!unidades?null:Math.max(0,neto)/unidades,tarifa,unidades,documentos:seleccion.map(c=>c.documento),ajustes:aplicados,prueba:seleccion.some(c=>c.prueba),incidencias};
}

export function calcularServicio(costes:{efectivo:number|null;tarifa:number|null},formato:string,receta:RecetaVenta|undefined,mezclador:{efectivo:number|null;tarifa:number|null}|undefined,precio:number|null) {
  const copa=formato.startsWith("Copa"),chupito=formato.startsWith("Chupito"),unidad=formato==="Unidad"||formato==="Botella completa";
  const factor=unidad?1:receta?(copa?7:chupito?5:NaN)/receta.capacidadCl:NaN;
  const calcular=(tipo:"efectivo"|"tarifa")=> {
    const base=costes[tipo],extra=copa?mezclador?.[tipo]:0;
    const coste=base===null||!Number.isFinite(factor)||extra===undefined||extra===null?null:base*factor+extra*(copa?receta?.mezclador?.unidades??0:0);
    const margen=coste===null||precio===null?null:precio-coste;
    return {coste,margen,porcentaje:margen===null||precio===null||precio<=0?null:margen/precio*100};
  };
  return {tarifa:calcular("tarifa"),efectivo:calcular("efectivo")};
}
