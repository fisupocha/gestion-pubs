"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function crearSubfamilia(formData: FormData) {
  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const familiaIdTexto = formData.get("familia_id")?.toString().trim() ?? "";
  const familiaId = Number(familiaIdTexto);

  if (!nombre || !familiaIdTexto || Number.isNaN(familiaId)) {
    redirect("/maestros/subfamilias?tipo=error&mensaje=Completa%20nombre%20y%20familia");
  }

  const { error } = await supabase.from("subfamilias").insert({
    nombre,
    familia_id: familiaId,
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/subfamilias?tipo=error&mensaje=Ya%20existe%20una%20subfamilia%20con%20ese%20nombre%20en%20esa%20familia");
    }

    redirect("/maestros/subfamilias?tipo=error&mensaje=No%20se%20pudo%20guardar%20la%20subfamilia");
  }

  revalidatePath("/maestros/subfamilias");
  redirect("/maestros/subfamilias?tipo=ok&mensaje=Subfamilia%20guardada%20correctamente");
}
