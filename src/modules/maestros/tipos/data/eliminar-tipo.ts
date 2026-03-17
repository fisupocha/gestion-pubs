"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function eliminarTipo(formData: FormData) {
  const id = Number(formData.get("id"));

  if (!id) {
    redirect("/maestros/clasificacion?tipo=error&mensaje=Selecciona%20un%20tipo%20antes%20de%20eliminar");
  }

  const { error } = await supabase.from("tipos").delete().eq("id", id);

  if (error) {
    redirect("/maestros/clasificacion?tipo=error&mensaje=No%20se%20pudo%20eliminar%20el%20tipo");
  }

  revalidatePath("/maestros/clasificacion");
  redirect("/maestros/clasificacion?tipo=ok&mensaje=Tipo%20eliminado%20correctamente");
}
