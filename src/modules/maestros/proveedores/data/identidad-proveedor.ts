import type { SupabaseClient } from "@supabase/supabase-js";

export function normalizarNombreProveedor(nombre: string) {
  return nombre.trim().replace(/[ \t\r\n]+/g, " ").toLowerCase();
}

export function datosIdentidadProveedor(nombreBruto: string, cifBruto: string) {
  const nombre = nombreBruto.trim();
  if (!nombre) return null;
  return { nombre, cif: cifBruto.trim().toUpperCase() || null };
}

// Sin CIF no se asigna automáticamente una coincidencia: debe revisarse.
export async function comprobarNombreSinCif(cliente: SupabaseClient, nombre: string, excluirId?: number) {
  const { data, error } = await cliente.from("proveedores").select("id,nombre");
  if (error || !data) throw new Error("No se pudieron comprobar proveedores coincidentes. No se guarda el alta.");
  return data.some(fila => Number(fila.id) !== excluirId && normalizarNombreProveedor(String(fila.nombre)) === normalizarNombreProveedor(nombre));
}
