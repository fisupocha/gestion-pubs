/**
 * Interruptor único de Punteo banco.
 * Encendido por autorización expresa. No lee variables de entorno.
 */
export const CONEXION_PUNTEO_SUPABASE = true;

export function conexionPunteoActiva() {
  return CONEXION_PUNTEO_SUPABASE;
}

export function exigirConexionPunteo() {
  if (!CONEXION_PUNTEO_SUPABASE) {
    throw new Error("La conexión de Punteo banco con Supabase está desactivada.");
  }
}
