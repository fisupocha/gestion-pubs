"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function actualizarFormaPago(formData: FormData) {
  const id = Number(formData.get("id"));
  const nombre = formData.get("nombre")?.toString().trim() ?? "";

  if (!id || !nombre) {
    redirect("/maestros/varios?tipo=error&mensaje=Completa%20nombre%20y%20selecciona%20una%20forma%20de%20pago");
  }

  const { error } = await supabase.from("formas_pago").update({ nombre }).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/varios?tipo=error&mensaje=Ya%20existe%20esa%20forma%20de%20pago");
    }

    redirect("/maestros/varios?tipo=error&mensaje=No%20se%20pudo%20actualizar%20la%20forma%20de%20pago");
  }

  revalidatePath("/maestros/varios");
  redirect("/maestros/varios?tipo=ok&mensaje=Forma%20de%20pago%20actualizada%20correctamente");
}
