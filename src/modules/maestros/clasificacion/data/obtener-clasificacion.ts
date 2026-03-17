import { construirClasificacion } from "@/lib/clasificacion";
import { listarFamilias } from "@/modules/maestros/familias/data/listar-familias";
import { listarSubfamilias } from "@/modules/maestros/subfamilias/data/listar-subfamilias";
import { listarTipos } from "@/modules/maestros/tipos/data/listar-tipos";

export async function obtenerClasificacion() {
  const [tipos, familias, subfamilias] = await Promise.all([
    listarTipos(),
    listarFamilias(),
    listarSubfamilias(),
  ]);

  return construirClasificacion(tipos, familias, subfamilias);
}
