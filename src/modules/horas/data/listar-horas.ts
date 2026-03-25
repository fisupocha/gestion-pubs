import { supabase } from "@/lib/supabase";

type RelNombre = {
  id?: number;
  nombre: string;
};

type HoraRow = {
  id: number;
  fecha_horas: string;
  horas: number | string;
  precio_sueldo: number | string;
  total_sueldo: number | string;
  observaciones: string;
  empleado_id: number;
  empresa_id: number;
  tipo_id: number;
  familia_id: number;
  empleados: RelNombre | RelNombre[] | null;
  empresas: RelNombre | RelNombre[] | null;
  familias: RelNombre | RelNombre[] | null;
};

export async function listarHoras() {
  const { data, error } = await supabase
    .from("operativa_horas")
    .select(
      "id, fecha_horas, horas, precio_sueldo, total_sueldo, observaciones, empleado_id, empresa_id, tipo_id, familia_id, empleados(id, nombre), empresas(id, nombre), familias(id, nombre)"
    )
    .order("fecha_horas", { ascending: false })
    .order("id", { ascending: false });

  if (error) {
    throw new Error("No se pudieron cargar las horas");
  }

  return ((data ?? []) as HoraRow[]).map((item) => {
    const empleado = Array.isArray(item.empleados) ? item.empleados[0] : item.empleados;
    const local = Array.isArray(item.empresas) ? item.empresas[0] : item.empresas;
    const familia = Array.isArray(item.familias) ? item.familias[0] : item.familias;

    return {
      id: item.id,
      fecha: item.fecha_horas,
      horas: Number(item.horas ?? 0),
      precioSueldo: Number(item.precio_sueldo ?? 0),
      totalSueldo: Number(item.total_sueldo ?? 0),
      observaciones: item.observaciones ?? "",
      empleadoId: item.empleado_id,
      empleado: empleado?.nombre ?? "",
      empresaId: item.empresa_id,
      local: local?.nombre ?? "",
      tipoId: item.tipo_id,
      familiaId: item.familia_id,
      tipoEmpleado: familia?.nombre ?? "",
    };
  });
}
