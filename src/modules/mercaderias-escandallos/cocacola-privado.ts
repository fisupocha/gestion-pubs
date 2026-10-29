import type { SupabaseClient } from "@supabase/supabase-js";
import type { CompraCoca, ReferenciaCoca } from "./cocacola";

// Archivos separados: retirar compras-prueba.json no borra las condiciones.
// Bucket privado existente, con lectura de administradores por RLS. Sin service_role.
export async function leerCocaPrivada(cliente: SupabaseClient) {
  const leer = async (nombre:string):Promise<unknown> => {
    const {data,error}=await cliente.storage.from("operativa-adjuntos").download(`mercaderias-escandallos/cocacola/${nombre}`);
    if (error || !data) throw new Error("No se pudo leer la configuración privada de Coca-Cola.");
    return JSON.parse(await data.text());
  };
  const referencias=await leer("condiciones-2026.json");
  const compras=await leer("compras-prueba.json");
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
        typeof c.factura!=="string"||typeof c.local!=="string"||!Number.isSafeInteger(c.cajas)||c.cajas<=0||
        !Number.isSafeInteger(c.brutoCentimos)||c.brutoCentimos<=0||!Number.isSafeInteger(c.netoCentimos)||c.netoCentimos<0||
        typeof c.iva!=="number"||!Number.isFinite(c.iva)||c.iva<0||c.iva>100) throw new Error("Compras de prueba de Coca-Cola no válidas.");
  }
  return {referencias:referencias as ReferenciaCoca[],compras:compras as CompraCoca[]};
}
