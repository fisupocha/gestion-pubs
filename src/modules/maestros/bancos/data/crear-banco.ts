"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function crearBanco(formData: FormData) {
  const nombre = formData.get("nombre")?.toString().trim() ?? "";

  if (!nombre) {
    redirect("/maestros/bancos?tipo=error&mensaje=Completa%20el%20nombre%20del%20banco");
  }

  const { error } = await supabase.from("bancos").insert({
    nombre,
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/bancos?tipo=error&mensaje=Ya%20existe%20un%20banco%20con%20ese%20nombre");
    }

    redirect("/maestros/bancos?tipo=error&mensaje=No%20se%20pudo%20guardar%20el%20banco");
  }

  revalidatePath("/maestros/bancos");
  redirect("/maestros/bancos?tipo=ok&mensaje=Banco%20guardado%20correctamente");
}
