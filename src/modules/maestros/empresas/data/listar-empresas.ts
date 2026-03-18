import { supabase } from "@/lib/supabase";

export async function listarEmpresas() {
  const { data, error } = await supabase
    .from("empresas")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los locales");
  }

  return data;
}
