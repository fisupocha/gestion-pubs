"use client";

import { supabase } from "@/lib/supabase";
import type { RolAcceso } from "@/modules/auth/permisos-acceso";

let rolRecordado: RolAcceso | null = null;

export function recordarRolSesion(rol: RolAcceso | null) {
  rolRecordado = rol;
}

export function rolSesionActual() {
  return rolRecordado;
}

export async function exigirAdministrador() {
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user || rolRecordado !== "admin") {
    throw new Error("La sesión no permite guardar. No se ha cambiado ningún dato.");
  }
}
