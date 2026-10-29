import type { SupabaseClient } from "@supabase/supabase-js";
import type { LineaMercaderia } from "./modelo";

export async function leerMercaderias(cliente: SupabaseClient): Promise<LineaMercaderia[]> {
  const resultado: LineaMercaderia[] = [];
  // Evitar el límite por defecto de Supabase: nunca presentar las primeras mil como el total.
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await cliente.from("mercaderias_lineas")
      .select("id,proveedor,factura,fecha,albaran,pagina,linea,producto,formato,local,compradas,bonificadas,importe_iva_centimos,estado_validacion")
      .order("id").range(desde, desde + 999);
    if (error) {
      if (error.code === "PGRST205" || error.code === "42P01") {
        throw new Error("La pantalla está preparada. Falta instalar el almacenamiento independiente y cargar las líneas revisadas de Reyes Magos.");
      }
      throw new Error("No se han podido leer todas las compras. No se muestra un acumulado incompleto.");
    }
    if (!data) throw new Error("No se ha confirmado la lectura de mercaderías.");
    resultado.push(...data as LineaMercaderia[]);
    if (data.length < 1000) return resultado;
  }
}
