import { crearSupabaseServidor } from "@/lib/supabase-servidor";

export async function listarConceptosGastosBancarios() {
  const supabase = await crearSupabaseServidor();
  const { data, error } = await supabase
    .from("conceptos_gastos_bancarios")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los conceptos de gastos bancarios");
  }

  return data ?? [];
}
