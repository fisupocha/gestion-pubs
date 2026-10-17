import { crearSupabaseServidor } from "@/lib/supabase-servidor";

export async function listarTiposIva() {
  const supabase = await crearSupabaseServidor();
  const { data, error } = await supabase
    .from("tipos_iva")
    .select("id, porcentaje")
    .order("porcentaje", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los tipos de IVA");
  }

  return data ?? [];
}
