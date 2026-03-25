import { supabase } from "@/lib/supabase";

type FamiliaRelacionada = {
  id?: number;
  nombre: string;
  tipo_id?: number | null;
};

type EmpleadoRow = {
  id: number;
  nombre: string;
  precio_sueldo: number | string;
  familia_id?: number | null;
  familias: FamiliaRelacionada | FamiliaRelacionada[] | null;
};

export async function listarEmpleados() {
  const [{ data, error }, { data: horasData, error: horasError }] = await Promise.all([
    supabase
      .from("empleados")
      .select("id, nombre, precio_sueldo, familia_id, familias(id, nombre, tipo_id)")
      .order("nombre", { ascending: true }),
    supabase.from("operativa_horas").select("empleado_id"),
  ]);

  if (error || horasError) {
    throw new Error("No se pudieron cargar los empleados");
  }

  const empleadosConHoras = new Set(
    ((horasData ?? []) as Array<{ empleado_id: number | null }>).flatMap((item) =>
      item.empleado_id ? [item.empleado_id] : []
    )
  );

  return ((data ?? []) as EmpleadoRow[]).map((item) => {
    const familiaRelacionada = Array.isArray(item.familias) ? item.familias[0] : item.familias;

    return {
      id: item.id,
      nombre: item.nombre,
      precioSueldo: Number(item.precio_sueldo ?? 0),
      familiaId: item.familia_id ?? familiaRelacionada?.id ?? 0,
      familia: familiaRelacionada?.nombre ?? "",
      tipoId: familiaRelacionada?.tipo_id ?? 0,
      tieneHoras: empleadosConHoras.has(item.id),
    };
  });
}
