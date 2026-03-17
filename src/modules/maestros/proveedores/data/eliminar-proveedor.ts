"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function eliminarProveedor(formData: FormData) {
  const id = Number(formData.get("id"));

  if (!id) {
    redirect("/maestros/proveedores?tipo=error&mensaje=Selecciona%20un%20proveedor%20antes%20de%20eliminar");
  }

  const { error } = await supabase.from("proveedores").delete().eq("id", id);

  if (error) {
    redirect("/maestros/proveedores?tipo=error&mensaje=No%20se%20pudo%20eliminar%20el%20proveedor");
  }

  revalidatePath("/maestros/proveedores");
  redirect("/maestros/proveedores?tipo=ok&mensaje=Proveedor%20eliminado%20correctamente");
}
