import { crearSupabaseServidor } from "@/lib/supabase-servidor";

export async function listarBancos() {
  const supabase = await crearSupabaseServidor();
  const { data, error } = await supabase
    .from("bancos")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los bancos");
  }

  return data ?? [];
}
