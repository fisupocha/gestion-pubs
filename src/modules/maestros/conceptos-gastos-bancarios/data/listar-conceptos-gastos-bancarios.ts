import { supabase } from "@/lib/supabase";

export async function listarConceptosGastosBancarios() {
  const { data, error } = await supabase
    .from("conceptos_gastos_bancarios")
    .select("id, nombre")
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar los conceptos de gastos bancarios");
  }

  return data ?? [];
}
