import { crearSupabaseServidor } from "@/lib/supabase-servidor";

export async function listarClientes() {
  const supabase = await crearSupabaseServidor();
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nombre, cif")
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los clientes");
  }

  return data ?? [];
}
