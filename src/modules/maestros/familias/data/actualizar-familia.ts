"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function actualizarFamilia(formData: FormData) {
  const id = Number(formData.get("id"));
  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const tipoIdTexto = formData.get("tipo_id")?.toString().trim() ?? "";
  const tipoId = Number(tipoIdTexto);

  if (!id || !nombre || !tipoIdTexto || Number.isNaN(tipoId)) {
    redirect("/maestros/clasificacion?tipo=error&mensaje=Completa%20nombre%2C%20tipo%20y%20selecciona%20una%20familia");
  }

  const { error } = await supabase
    .from("familias")
    .update({
      nombre,
      tipo_id: tipoId,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/clasificacion?tipo=error&mensaje=Ya%20existe%20una%20familia%20con%20ese%20nombre");
    }

    redirect("/maestros/clasificacion?tipo=error&mensaje=No%20se%20pudo%20actualizar%20la%20familia");
  }

  revalidatePath("/maestros/clasificacion");
  redirect("/maestros/clasificacion?tipo=ok&mensaje=Familia%20actualizada%20correctamente");
}
