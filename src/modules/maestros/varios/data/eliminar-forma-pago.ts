"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function eliminarFormaPago(formData: FormData) {
  const id = Number(formData.get("id"));

  if (!id) {
    redirect("/maestros/varios?tipo=error&mensaje=Selecciona%20una%20forma%20de%20pago%20antes%20de%20eliminar");
  }

  const { error } = await supabase.from("formas_pago").delete().eq("id", id);

  if (error) {
    redirect("/maestros/varios?tipo=error&mensaje=No%20se%20pudo%20eliminar%20la%20forma%20de%20pago");
  }

  revalidatePath("/maestros/varios");
  redirect("/maestros/varios?tipo=ok&mensaje=Forma%20de%20pago%20eliminada%20correctamente");
}
