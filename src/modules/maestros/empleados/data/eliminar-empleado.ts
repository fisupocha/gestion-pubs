"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function eliminarEmpleado(formData: FormData) {
  const id = Number(formData.get("id"));

  if (!id) {
    redirect("/maestros/empleados?tipo=error&mensaje=Selecciona%20un%20empleado%20antes%20de%20eliminar");
  }

  const { count, error: horasError } = await supabase
    .from("operativa_horas")
    .select("id", { count: "exact", head: true })
    .eq("empleado_id", id);

  if (horasError) {
    redirect(
      "/maestros/empleados?tipo=error&mensaje=No%20se%20pudo%20comprobar%20si%20el%20empleado%20tiene%20horas"
    );
  }

  if ((count ?? 0) > 0) {
    redirect(
      "/maestros/empleados?tipo=error&mensaje=No%20puedes%20eliminar%20este%20empleado%20porque%20ya%20tiene%20horas%20registradas"
    );
  }

  const { error } = await supabase.from("empleados").delete().eq("id", id);

  if (error) {
    redirect(
      "/maestros/empleados?tipo=error&mensaje=No%20se%20pudo%20eliminar%20el%20empleado"
    );
  }

  revalidatePath("/maestros/empleados");
  revalidatePath("/horas");
  redirect("/maestros/empleados?tipo=ok&mensaje=Empleado%20eliminado%20correctamente");
}
