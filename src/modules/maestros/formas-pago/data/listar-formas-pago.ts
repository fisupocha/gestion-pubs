import { supabase } from "@/lib/supabase";

export async function listarFormasPago() {
  const { data, error } = await supabase
    .from("formas_pago")
    .select("id, nombre")
    .order("id", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar las formas de pago");
  }

  return data ?? [];
}
