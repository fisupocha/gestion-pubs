"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function actualizarSubfamilia(formData: FormData) {
  const id = Number(formData.get("id"));
  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const familiaIdTexto = formData.get("familia_id")?.toString().trim() ?? "";
  const familiaId = Number(familiaIdTexto);

  if (!id || !nombre || !familiaIdTexto || Number.isNaN(familiaId)) {
    redirect("/maestros/clasificacion?tipo=error&mensaje=Completa%20nombre%2C%20familia%20y%20selecciona%20una%20subfamilia");
  }

  const { error } = await supabase
    .from("subfamilias")
    .update({
      nombre,
      familia_id: familiaId,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/clasificacion?tipo=error&mensaje=Ya%20existe%20una%20subfamilia%20con%20ese%20nombre%20en%20esa%20familia");
    }

    redirect("/maestros/clasificacion?tipo=error&mensaje=No%20se%20pudo%20actualizar%20la%20subfamilia");
  }

  revalidatePath("/maestros/clasificacion");
  redirect("/maestros/clasificacion?tipo=ok&mensaje=Subfamilia%20actualizada%20correctamente");
}
