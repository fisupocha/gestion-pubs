"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function eliminarFamilia(formData: FormData) {
  const id = Number(formData.get("id"));

  if (!id) {
    redirect("/maestros/clasificacion?tipo=error&mensaje=Selecciona%20una%20familia%20antes%20de%20eliminar");
  }

  const { error } = await supabase.from("familias").delete().eq("id", id);

  if (error) {
    redirect("/maestros/clasificacion?tipo=error&mensaje=No%20se%20pudo%20eliminar%20la%20familia");
  }

  revalidatePath("/maestros/clasificacion");
  redirect("/maestros/clasificacion?tipo=ok&mensaje=Familia%20eliminada%20correctamente");
}
