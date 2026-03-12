"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function crearTipoIva(formData: FormData) {
  const porcentajeTexto = formData.get("porcentaje")?.toString().trim() ?? "";
  const porcentaje = Number(porcentajeTexto.replace(",", "."));

  if (!porcentajeTexto || Number.isNaN(porcentaje)) {
    redirect("/maestros/tipos-iva?tipo=error&mensaje=Completa%20un%20porcentaje%20válido");
  }

  const { error } = await supabase.from("tipos_iva").insert({
    porcentaje,
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/tipos-iva?tipo=error&mensaje=Ya%20existe%20ese%20tipo%20de%20IVA");
    }

    redirect("/maestros/tipos-iva?tipo=error&mensaje=No%20se%20pudo%20guardar%20el%20tipo%20de%20IVA");
  }

  revalidatePath("/maestros/tipos-iva");
  redirect("/maestros/tipos-iva?tipo=ok&mensaje=Tipo%20de%20IVA%20guardado%20correctamente");
}
