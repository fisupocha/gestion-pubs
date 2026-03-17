import { supabase } from "@/lib/supabase";

export async function listarSubfamilias() {
  const { data, error } = await supabase
    .from("subfamilias")
    .select("id, nombre, familia_id, familias(id, nombre, tipo_id, tipos(id, nombre))")
    .order("id", { ascending: true });

  if (error) {
    throw new Error("No se pudieron cargar las subfamilias");
  }

  return (data ?? []).map((item) => {
    const familiaData = Array.isArray(item.familias)
      ? item.familias[0]
      : item.familias;

    const tipoData = Array.isArray(familiaData?.tipos)
      ? familiaData?.tipos[0]
      : familiaData?.tipos;

    return {
      id: item.id,
      nombre: item.nombre,
      familiaId: familiaData?.id ?? 0,
      familia: familiaData?.nombre ?? "",
      tipoId: tipoData?.id ?? 0,
      tipo: tipoData?.nombre ?? "",
    };
  });
}
