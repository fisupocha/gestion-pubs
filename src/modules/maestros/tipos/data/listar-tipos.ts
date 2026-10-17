import { crearSupabaseServidor } from "@/lib/supabase-servidor";

export async function listarTipos() {
  const supabase = await crearSupabaseServidor();
  const { data, error } = await supabase
    .from("tipos")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los tipos");
  }

  return data;
}
