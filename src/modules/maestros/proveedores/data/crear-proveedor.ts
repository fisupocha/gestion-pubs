"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { crearSupabaseServidor } from "@/lib/supabase-servidor";
import { guardarProveedorOficial } from "./guardar-proveedor";

export async function crearProveedor(formData: FormData) {
  const supabase = await crearSupabaseServidor();
  const resultado = await guardarProveedorOficial(supabase, formData.get("nombre")?.toString() ?? "", formData.get("cif")?.toString() ?? "");

  if (!resultado.ok) {
    const mensaje = encodeURIComponent(resultado.mensaje);
    redirect(`/maestros/proveedores?tipo=error&mensaje=${mensaje}`);
  }

  revalidatePath("/maestros/proveedores");
  redirect("/maestros/proveedores?tipo=ok&mensaje=Proveedor%20guardado%20correctamente");
}
