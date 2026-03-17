"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function eliminarCliente(formData: FormData) {
  const id = Number(formData.get("id"));

  if (!id) {
    redirect("/maestros/clientes?tipo=error&mensaje=Selecciona%20un%20cliente%20antes%20de%20eliminar");
  }

  const { error } = await supabase.from("clientes").delete().eq("id", id);

  if (error) {
    redirect("/maestros/clientes?tipo=error&mensaje=No%20se%20pudo%20eliminar%20el%20cliente");
  }

  revalidatePath("/maestros/clientes");
  redirect("/maestros/clientes?tipo=ok&mensaje=Cliente%20eliminado%20correctamente");
}
