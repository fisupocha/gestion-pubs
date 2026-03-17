"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function crearTipoIva(formData: FormData) {
  const porcentajeTexto = formData.get("porcentaje")?.toString().trim() ?? "";
  const porcentaje = Number(porcentajeTexto.replace(",", "."));

  if (!porcentajeTexto || Number.isNaN(porcentaje)) {
    redirect("/maestros/varios?tipo=error&mensaje=Completa%20un%20porcentaje%20valido");
  }

  const { error } = await supabase.from("tipos_iva").insert({
    porcentaje,
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/varios?tipo=error&mensaje=Ya%20existe%20ese%20tipo%20de%20IVA");
    }

    redirect("/maestros/varios?tipo=error&mensaje=No%20se%20pudo%20guardar%20el%20tipo%20de%20IVA");
  }

  revalidatePath("/maestros/varios");
  redirect("/maestros/varios?tipo=ok&mensaje=Tipo%20de%20IVA%20guardado%20correctamente");
}
