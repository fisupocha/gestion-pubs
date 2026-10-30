import type { SupabaseClient } from "@supabase/supabase-js";
import { fusionarComprasCoca, calcularCoca, type CompraCoca, type ReferenciaCoca } from "./cocacola";

// Archivos separados: vaciar compras-prueba.json a [] conserva las condiciones.
// Bucket privado existente, con lectura de administradores por RLS. Sin service_role.
export async function leerCocaPrivada(cliente: SupabaseClient) {
  const leer = async (nombre:string):Promise<unknown> => {
    const {data,error}=await cliente.storage.from("operativa-adjuntos").download(`mercaderias-escandallos/cocacola/${nombre}`);
    if (error || !data) throw new Error("No se pudo leer la configuración privada de Coca-Cola.");
    return JSON.parse(await data.text());
  };
  const referencias=await leer("condiciones-2026.json");
  const pruebas=await leer("compras-prueba.json");
  const {data:documento,error:errorDocumento}=await cliente.storage.from("operativa-adjuntos").download("mercaderias-escandallos/cocacola/compras-documentadas.json");
  if(errorDocumento&&!["Object not found","The resource was not found"].includes(errorDocumento.message))throw new Error("No se pudieron verificar compras documentadas.");
  const registro=documento?JSON.parse(await documento.text()):{version:1,compras:[]};
  if(registro.version!==1||!Array.isArray(registro.compras)||!Array.isArray(pruebas))throw new Error("Compras documentadas no válidas.");
  const compras=fusionarComprasCoca(pruebas as CompraCoca[],registro.compras);
  if (!Array.isArray(referencias)||!Array.isArray(compras)) throw new Error("Configuración de Coca-Cola no válida.");
  const porcentaje=(n:unknown)=>n===null||(typeof n==="number"&&Number.isFinite(n)&&n>=0&&n<=100);
  const codigos=new Set<string>();
  for (const r of referencias) {
    if (!r||typeof r.codigo!=="string"||codigos.has(r.codigo)||typeof r.producto!=="string"||typeof r.formato!=="string"||
        !Number.isSafeInteger(r.unidadesCaja)||r.unidadesCaja<=0||!porcentaje(r.directo)||!porcentaje(r.mensual)||
        typeof r.semestral!=="number"||!porcentaje(r.semestral)) throw new Error("Condiciones de Coca-Cola no válidas.");
    codigos.add(r.codigo);
  }
  for (const c of compras) {
    if (!c||!codigos.has(c.codigo)||typeof c.id!=="string"||typeof c.fecha!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(c.fecha)||
        typeof c.factura!=="string"||typeof c.local!=="string"||!Number.isSafeInteger(c.cajas)||c.cajas<0||
        !Number.isSafeInteger(c.cajasRegaladas??0)||(c.cajasRegaladas??0)<0||c.cajas+(c.cajasRegaladas??0)<=0||
        !Number.isSafeInteger(c.brutoCentimos)||c.brutoCentimos<0||(c.cajas>0&&c.brutoCentimos===0)||!Number.isSafeInteger(c.netoCentimos)||c.netoCentimos<0||
        (c.cajas===0&&(c.brutoCentimos!==0||c.netoCentimos!==0))||
        typeof c.iva!=="number"||!Number.isFinite(c.iva)||c.iva<0||c.iva>100) throw new Error("Compras de prueba de Coca-Cola no válidas.");
  }
  for(const ref of referencias)calcularCoca(ref,compras);
  return {referencias:referencias as ReferenciaCoca[],compras:compras as CompraCoca[]};
}
