"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

export async function crearFormaPago(formData: FormData) {
  const nombre = formData.get("nombre")?.toString().trim() ?? "";

  if (!nombre) {
    redirect("/maestros/formas-pago?tipo=error&mensaje=Completa%20el%20nombre%20de%20la%20forma%20de%20pago");
  }

  const { error } = await supabase.from("formas_pago").insert({
    nombre,
  });

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/formas-pago?tipo=error&mensaje=Ya%20existe%20esa%20forma%20de%20pago");
    }

    redirect("/maestros/formas-pago?tipo=error&mensaje=No%20se%20pudo%20guardar%20la%20forma%20de%20pago");
  }

  revalidatePath("/maestros/formas-pago");
  redirect("/maestros/formas-pago?tipo=ok&mensaje=Forma%20de%20pago%20guardada%20correctamente");
}
