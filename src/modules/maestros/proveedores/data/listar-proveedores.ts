import { crearSupabaseServidor } from "@/lib/supabase-servidor";

export async function listarProveedores() {
  const supabase = await crearSupabaseServidor();
  const { data, error } = await supabase
    .from("proveedores")
    .select("id, nombre, cif")
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los proveedores");
  }

  return data ?? [];
}
