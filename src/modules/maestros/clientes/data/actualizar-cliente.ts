"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function actualizarCliente(formData: FormData) {
  const id = Number(formData.get("id"));
  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const cif = formData.get("cif")?.toString().trim().toUpperCase() ?? "";

  if (!id || !nombre || !cif) {
    redirect("/maestros/clientes?tipo=error&mensaje=Completa%20nombre%2C%20CIF%20y%20selecciona%20un%20cliente");
  }

  const { error } = await supabase
    .from("clientes")
    .update({
      nombre,
      cif,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/clientes?tipo=error&mensaje=Ya%20existe%20un%20cliente%20con%20ese%20CIF");
    }

    redirect("/maestros/clientes?tipo=error&mensaje=No%20se%20pudo%20actualizar%20el%20cliente");
  }

  revalidatePath("/maestros/clientes");
  redirect("/maestros/clientes?tipo=ok&mensaje=Cliente%20actualizado%20correctamente");
}
