"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function crearTipo(formData: FormData) {
  const nombre = formData.get("nombre")?.toString().trim() ?? "";

  if (!nombre) {
    redirect("/maestros/tipos?tipo=error&mensaje=Completa%20el%20nombre%20del%20tipo");
  }

  const { error } = await supabase.from("tipos").insert({
    nombre,
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/tipos?tipo=error&mensaje=Ya%20existe%20ese%20tipo");
    }

    redirect("/maestros/tipos?tipo=error&mensaje=No%20se%20pudo%20guardar%20el%20tipo");
  }

  revalidatePath("/maestros/tipos");
  redirect("/maestros/tipos?tipo=ok&mensaje=Tipo%20guardado%20correctamente");
}
