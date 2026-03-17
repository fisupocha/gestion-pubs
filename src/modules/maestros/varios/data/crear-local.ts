"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function crearLocal(formData: FormData) {
  const nombre = formData.get("nombre")?.toString().trim() ?? "";

  if (!nombre) {
    redirect("/maestros/varios?tipo=error&mensaje=Completa%20el%20nombre%20del%20local");
  }

  const { error } = await supabase.from("empresas").insert({ nombre });

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/varios?tipo=error&mensaje=Ya%20existe%20ese%20local");
    }

    redirect("/maestros/varios?tipo=error&mensaje=No%20se%20pudo%20guardar%20el%20local");
  }

  revalidatePath("/maestros/varios");
  redirect("/maestros/varios?tipo=ok&mensaje=Local%20guardado%20correctamente");
}
