import type { SupabaseClient } from "@supabase/supabase-js";
import { comprobarNombreSinCif, datosIdentidadProveedor } from "./identidad-proveedor";

export function datosProveedorOficial(nombreBruto: string, cifBruto: string) {
  return datosIdentidadProveedor(nombreBruto, cifBruto);
}

export async function guardarProveedorOficial(cliente: SupabaseClient, nombreBruto: string, cifBruto: string) {
  const datos = datosProveedorOficial(nombreBruto, cifBruto);
  if (!datos) return { ok: false as const, codigo: "incompleto" as const, mensaje: "Completa el nombre del proveedor" };
  if (!datos.cif) {
    try {
      if (await comprobarNombreSinCif(cliente, datos.nombre)) return {ok:false as const,codigo:"duplicado" as const,mensaje:"Ya existe un proveedor con ese nombre; revisa la coincidencia antes de crear otro."};
    } catch { return {ok:false as const,codigo:"no_guardado" as const,mensaje:"No se pudo comprobar si el proveedor ya existe. No se ha guardado."}; }
  }
  const { error } = await cliente.from("proveedores").insert(datos);
  if (error?.code === "23505") return { ok: false as const, codigo: "duplicado" as const, mensaje: datos.cif ? "Ya existe un proveedor con ese CIF" : "Ya existe un proveedor sin CIF con ese nombre", ...datos };
  if (error) return { ok: false as const, codigo: "no_guardado" as const, mensaje: "No se pudo guardar el proveedor" };
  return { ok: true as const, codigo: "guardado" as const, ...datos };
}

export async function releerProveedorOficial(cliente: SupabaseClient, cif: string) {
  const clave = cif.trim().toUpperCase();
  if (!clave) return {ok:false as const,codigo:"relectura" as const,mensaje:"Un proveedor sin CIF debe recuperarse por su ID, nunca por un CIF vacío."};
  const { data, error } = await cliente.from("proveedores").select("id,nombre,cif").eq("cif", clave);
  if (error || !data) return { ok: false as const, codigo: "relectura" as const, mensaje: "No he podido releer el proveedor. No lo asigno y no repito el alta." };
  if (data.length !== 1) return { ok: false as const, codigo: "relectura" as const, mensaje: data.length === 0 ? "No he podido releer el proveedor. No lo asigno y no repito el alta." : "Hay más de un proveedor con esa identificación. No asigno ninguno." };
  const fila = data[0] as { id: number; nombre: string; cif: string };
  if (String(fila.cif) !== clave || !Number.isInteger(Number(fila.id))) return { ok: false as const, codigo: "relectura" as const, mensaje: "La relectura del proveedor no coincide. No lo asigno." };
  return { ok: true as const, fila: { id: Number(fila.id), nombre: String(fila.nombre), cif: String(fila.cif) } };
}
