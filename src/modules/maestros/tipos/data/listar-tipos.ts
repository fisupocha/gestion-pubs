import { supabase } from "@/lib/supabase";

export async function listarTipos() {
  const { data, error } = await supabase
    .from("tipos")
    .select("id, nombre")
    .order("id", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los tipos");
  }

  return data;
}
