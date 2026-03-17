"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function actualizarTipo(formData: FormData) {
  const id = Number(formData.get("id"));
  const nombre = formData.get("nombre")?.toString().trim() ?? "";

  if (!id || !nombre) {
    redirect("/maestros/clasificacion?tipo=error&mensaje=Completa%20nombre%20y%20selecciona%20un%20tipo");
  }

  const { error } = await supabase
    .from("tipos")
    .update({
      nombre,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/clasificacion?tipo=error&mensaje=Ya%20existe%20ese%20tipo");
    }

    redirect("/maestros/clasificacion?tipo=error&mensaje=No%20se%20pudo%20actualizar%20el%20tipo");
  }

  revalidatePath("/maestros/clasificacion");
  redirect("/maestros/clasificacion?tipo=ok&mensaje=Tipo%20actualizado%20correctamente");
}
