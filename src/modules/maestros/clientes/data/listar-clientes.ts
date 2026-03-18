import { supabase } from "@/lib/supabase";

export async function listarClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre, cif")
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los clientes");
  }

  return data ?? [];
}
