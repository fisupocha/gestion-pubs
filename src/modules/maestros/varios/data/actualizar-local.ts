"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function actualizarLocal(formData: FormData) {
  const id = Number(formData.get("id"));
  const nombre = formData.get("nombre")?.toString().trim() ?? "";

  if (!id || !nombre) {
    redirect("/maestros/varios?tipo=error&mensaje=Completa%20nombre%20y%20selecciona%20un%20local");
  }

  const { error } = await supabase.from("empresas").update({ nombre }).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/varios?tipo=error&mensaje=Ya%20existe%20ese%20local");
    }

    redirect("/maestros/varios?tipo=error&mensaje=No%20se%20pudo%20actualizar%20el%20local");
  }

  revalidatePath("/maestros/varios");
  redirect("/maestros/varios?tipo=ok&mensaje=Local%20actualizado%20correctamente");
}
