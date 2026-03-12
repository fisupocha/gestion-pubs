import { supabase } from "@/lib/supabase";

type TipoRelacionado = {
  nombre: string;
};

type FamiliaRow = {
  id: number;
  nombre: string;
  tipos: TipoRelacionado | TipoRelacionado[] | null;
};

export async function listarFamilias() {
  const { data, error } = await supabase
    .from("familias")
    .select("id, nombre, tipos(nombre)")
    .order("id", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar las familias");
  }

  return ((data ?? []) as FamiliaRow[]).map((item) => ({
    id: item.id,
    nombre: item.nombre,
    tipo: Array.isArray(item.tipos) ? item.tipos[0]?.nombre ?? "" : item.tipos?.nombre ?? "",
  }));
}
