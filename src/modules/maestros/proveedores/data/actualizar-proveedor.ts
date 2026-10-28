"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { crearSupabaseServidor } from "@/lib/supabase-servidor";
import { comprobarNombreSinCif, datosIdentidadProveedor } from "./identidad-proveedor";

export async function actualizarProveedor(formData: FormData) {
  const supabase = await crearSupabaseServidor();
  const id = Number(formData.get("id"));
  const datos = datosIdentidadProveedor(formData.get("nombre")?.toString() ?? "", formData.get("cif")?.toString() ?? "");

  if (!Number.isInteger(id) || id <= 0 || !datos) {
    redirect("/maestros/proveedores?tipo=error&mensaje=Completa%20nombre%20y%20selecciona%20un%20proveedor");
  }
  if (!datos.cif) {
    let duplicado: boolean;
    try { duplicado = await comprobarNombreSinCif(supabase, datos.nombre, id); }
    catch { redirect("/maestros/proveedores?tipo=error&mensaje=No%20se%20pudieron%20comprobar%20coincidencias"); }
    if (duplicado) redirect("/maestros/proveedores?tipo=error&mensaje=Ya%20existe%20otro%20proveedor%20con%20ese%20nombre");
  }

  const { error } = await supabase
    .from("proveedores")
    .update(datos)
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      redirect("/maestros/proveedores?tipo=error&mensaje=Ya%20existe%20un%20proveedor%20con%20ese%20CIF%20o%20nombre%20sin%20CIF");
    }

    redirect("/maestros/proveedores?tipo=error&mensaje=No%20se%20pudo%20actualizar%20el%20proveedor");
  }

  revalidatePath("/maestros/proveedores");
  redirect("/maestros/proveedores?tipo=ok&mensaje=Proveedor%20actualizado%20correctamente");
}
