import type { SupabaseClient } from "@supabase/supabase-js";
import { configuracionVacia, validarConfiguracion, type ConfiguracionEscandallo } from "./escandallo";

// Misma sesión y bucket privado que el módulo. Nunca claves administrativas.
export async function leerEscandalloPrivado(cliente:SupabaseClient) {
  const {data,error}=await cliente.storage.from("operativa-adjuntos").download("mercaderias-escandallos/escandallos/configuracion-v1.json");
  if(error) {
    if(error.message==="Object not found"||error.message==="The resource was not found") return {datos:configuracionVacia,configurada:false};
    throw new Error("No se pudieron verificar las condiciones de escandallos. No se calculan márgenes incompletos.");
  }
  if(!data) throw new Error("Configuración de escandallos no confirmada.");
  const datos=JSON.parse(await data.text()) as ConfiguracionEscandallo;
  validarConfiguracion(datos);
  return {datos,configurada:true};
}
