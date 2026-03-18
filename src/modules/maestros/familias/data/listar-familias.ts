import { supabase } from "@/lib/supabase";

type TipoRelacionado = {
  id?: number;
  nombre: string;
};

type FamiliaRow = {
  id: number;
  nombre: string;
  tipo_id?: number | null;
  tipos: TipoRelacionado | TipoRelacionado[] | null;
};

export async function listarFamilias() {
  const { data, error } = await supabase
    .from("familias")
    .select("id, nombre, tipo_id, tipos(id, nombre)")
    .order("nombre", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar las familias");
  }

  return ((data ?? []) as FamiliaRow[]).map((item) => {
    const tipoRelacionado = Array.isArray(item.tipos) ? item.tipos[0] : item.tipos;

    return {
      id: item.id,
      nombre: item.nombre,
      tipoId: item.tipo_id ?? tipoRelacionado?.id ?? 0,
      tipo: tipoRelacionado?.nombre ?? "",
    };
  });
}
