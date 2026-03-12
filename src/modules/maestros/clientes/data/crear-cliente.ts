"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function crearCliente(formData: FormData) {
  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const cif = formData.get("cif")?.toString().trim().toUpperCase() ?? "";

  if (!nombre || !cif) {
    redirect("/maestros/clientes?tipo=error&mensaje=Completa%20nombre%20y%20CIF");
  }

  const { error } = await supabase.from("clientes").insert({
    nombre,
    cif,
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/clientes?tipo=error&mensaje=Ya%20existe%20un%20cliente%20con%20ese%20CIF");
    }

    redirect("/maestros/clientes?tipo=error&mensaje=No%20se%20pudo%20guardar%20el%20cliente");
  }

  revalidatePath("/maestros/clientes");
  redirect("/maestros/clientes?tipo=ok&mensaje=Cliente%20guardado%20correctamente");
}
