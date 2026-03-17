"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function crearFamilia(formData: FormData) {
  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const tipoIdTexto = formData.get("tipo_id")?.toString().trim() ?? "";
  const tipoId = Number(tipoIdTexto);

  if (!nombre || !tipoIdTexto || Number.isNaN(tipoId)) {
    redirect("/maestros/clasificacion?tipo=error&mensaje=Completa%20nombre%20y%20tipo");
  }

  const { error } = await supabase.from("familias").insert({
    nombre,
    tipo_id: tipoId,
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/clasificacion?tipo=error&mensaje=Ya%20existe%20una%20familia%20con%20ese%20nombre");
    }

    redirect("/maestros/clasificacion?tipo=error&mensaje=No%20se%20pudo%20guardar%20la%20familia");
  }

  revalidatePath("/maestros/clasificacion");
  redirect("/maestros/clasificacion?tipo=ok&mensaje=Familia%20guardada%20correctamente");
}
