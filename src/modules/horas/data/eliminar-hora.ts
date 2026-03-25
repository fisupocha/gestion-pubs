"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function eliminarHora(formData: FormData) {
  const id = Number(formData.get("id"));

  if (!id) {
    redirect("/horas?tipo=error&mensaje=Selecciona%20una%20hora%20antes%20de%20eliminar");
  }

  const { error } = await supabase.from("operativa_horas").delete().eq("id", id);

  if (error) {
    redirect("/horas?tipo=error&mensaje=No%20se%20pudo%20eliminar%20la%20hora");
  }

  revalidatePath("/horas");
  redirect("/horas?tipo=ok&mensaje=Hora%20eliminada%20correctamente");
}
