import { supabase } from "@/lib/supabase";

export async function listarBancos() {
  const { data, error } = await supabase
    .from("bancos")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los bancos");
  }

  return data ?? [];
}
