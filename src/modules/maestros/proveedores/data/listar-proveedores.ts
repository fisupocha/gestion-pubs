import { supabase } from "@/lib/supabase";

export async function listarProveedores() {
  const { data, error } = await supabase
    .from("proveedores")
    .select("id, nombre, cif")
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los proveedores");
  }

  return data ?? [];
}
