"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

function parseDecimal(value: string) {
  return Number(value.replace(",", ".").trim()) || 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function actualizarHora(formData: FormData) {
  const id = Number(formData.get("id"));
  const empleadoId = Number(formData.get("empleadoId"));
  const empresaId = Number(formData.get("empresaId"));
  const fechaHoras = formData.get("fechaHoras")?.toString().trim() ?? "";
  const tipoId = Number(formData.get("tipoId"));
  const familiaId = Number(formData.get("familiaId"));
  const horas = parseDecimal(formData.get("horas")?.toString() ?? "");
  const precioSueldo = parseDecimal(formData.get("precioSueldo")?.toString() ?? "");
  const observaciones = formData.get("observaciones")?.toString().trim() ?? "";
  const totalSueldo = round2(horas * precioSueldo);

  if (!id || !empleadoId || !empresaId || !fechaHoras || !tipoId || !familiaId || horas <= 0) {
    redirect(
      "/horas?tipo=error&mensaje=Completa%20fecha%2C%20local%2C%20empleado%2C%20horas%20y%20selecciona%20registro"
    );
  }

  const { error } = await supabase
    .from("operativa_horas")
    .update({
      empleado_id: empleadoId,
      empresa_id: empresaId,
      fecha_horas: fechaHoras,
      tipo_id: tipoId,
      familia_id: familiaId,
      horas,
      precio_sueldo: precioSueldo,
      total_sueldo: totalSueldo,
      observaciones,
    })
    .eq("id", id);

  if (error) {
    redirect("/horas?tipo=error&mensaje=No%20se%20pudo%20actualizar%20la%20hora");
  }

  revalidatePath("/horas");
  redirect("/horas?tipo=ok&mensaje=Hora%20actualizada%20correctamente");
}
