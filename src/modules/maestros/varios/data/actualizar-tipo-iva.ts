"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function actualizarTipoIva(formData: FormData) {
  const id = Number(formData.get("id"));
  const porcentajeTexto = formData.get("porcentaje")?.toString().trim() ?? "";
  const porcentaje = Number(porcentajeTexto.replace(",", "."));

  if (!id || !porcentajeTexto || Number.isNaN(porcentaje)) {
    redirect("/maestros/varios?tipo=error&mensaje=Completa%20el%20porcentaje%20y%20selecciona%20un%20tipo%20de%20IVA");
  }

  const { error } = await supabase.from("tipos_iva").update({ porcentaje }).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/varios?tipo=error&mensaje=Ya%20existe%20ese%20tipo%20de%20IVA");
    }

    redirect("/maestros/varios?tipo=error&mensaje=No%20se%20pudo%20actualizar%20el%20tipo%20de%20IVA");
  }

  revalidatePath("/maestros/varios");
  redirect("/maestros/varios?tipo=ok&mensaje=Tipo%20de%20IVA%20actualizado%20correctamente");
}
