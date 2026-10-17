import { crearSupabaseServidor } from "@/lib/supabase-servidor";

export async function listarFormasPago() {
  const supabase = await crearSupabaseServidor();
  const { data, error } = await supabase
    .from("formas_pago")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar las formas de pago");
  }

  return data ?? [];
}
