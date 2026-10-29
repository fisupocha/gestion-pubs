import type { SupabaseClient } from "@supabase/supabase-js";
import { validarDatosBajada, type DatosBajada } from "./bajada";
export async function leerBajadaPrivada(cliente:SupabaseClient,proveedor:"bajada"|"rojas"="bajada"):Promise<DatosBajada> {
  const leer=async(nombre:string)=>{
    const {data,error}=await cliente.storage.from("operativa-adjuntos").download(`mercaderias-escandallos/${proveedor}/${nombre}`);
    if(error||!data) throw new Error("No se pudo leer el proveedor del almacenamiento privado.");
    return JSON.parse(await data.text());
  };
  const datos={referencias:await leer("condiciones-2026.json"),compras:await leer("compras-prueba.json")};
  validarDatosBajada(datos);
  return datos;
}
