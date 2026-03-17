"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function actualizarProveedor(formData: FormData) {
  const id = Number(formData.get("id"));
  const nombre = formData.get("nombre")?.toString().trim() ?? "";
  const cif = formData.get("cif")?.toString().trim().toUpperCase() ?? "";

  if (!id || !nombre || !cif) {
    redirect("/maestros/proveedores?tipo=error&mensaje=Completa%20nombre%2C%20CIF%20y%20selecciona%20un%20proveedor");
  }

  const { error } = await supabase
    .from("proveedores")
    .update({
      nombre,
      cif,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/proveedores?tipo=error&mensaje=Ya%20existe%20un%20proveedor%20con%20ese%20CIF");
    }

    redirect("/maestros/proveedores?tipo=error&mensaje=No%20se%20pudo%20actualizar%20el%20proveedor");
  }

  revalidatePath("/maestros/proveedores");
  redirect("/maestros/proveedores?tipo=ok&mensaje=Proveedor%20actualizado%20correctamente");
}
