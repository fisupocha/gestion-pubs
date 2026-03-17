"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function eliminarTipoIva(formData: FormData) {
  const id = Number(formData.get("id"));

  if (!id) {
    redirect("/maestros/varios?tipo=error&mensaje=Selecciona%20un%20tipo%20de%20IVA%20antes%20de%20eliminar");
  }

  const { error } = await supabase.from("tipos_iva").delete().eq("id", id);

  if (error) {
    redirect("/maestros/varios?tipo=error&mensaje=No%20se%20pudo%20eliminar%20el%20tipo%20de%20IVA");
  }

  revalidatePath("/maestros/varios");
  redirect("/maestros/varios?tipo=ok&mensaje=Tipo%20de%20IVA%20eliminado%20correctamente");
}
