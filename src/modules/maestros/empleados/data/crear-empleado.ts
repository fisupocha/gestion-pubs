"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { esFamiliaDePersonal } from "@/modules/maestros/empleados/data/validar-familia-personal";

function parseDecimal(value: string) {
  return Number(value.replace(",", ".").trim()) || 0;
}

export async function crearEmpleado(formData: FormData) {
  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const familiaId = Number(formData.get("familiaId"));
  const precioSueldo = parseDecimal(formData.get("precioSueldo")?.toString() ?? "");

  if (!nombre || !familiaId) {
    redirect("/maestros/empleados?tipo=error&mensaje=Completa%20nombre%20y%20tipo%20de%20empleado");
  }

  if (!(await esFamiliaDePersonal(familiaId))) {
    redirect("/maestros/empleados?tipo=error&mensaje=El%20tipo%20de%20empleado%20no%20es%20valido");
  }

  const { error } = await supabase.from("empleados").insert({
    nombre,
    familia_id: familiaId,
    precio_sueldo: precioSueldo,
  });

  if (error) {
    redirect("/maestros/empleados?tipo=error&mensaje=No%20se%20pudo%20guardar%20el%20empleado");
  }

  revalidatePath("/maestros/empleados");
  revalidatePath("/horas");
  redirect("/maestros/empleados?tipo=ok&mensaje=Empleado%20guardado%20correctamente");
}
