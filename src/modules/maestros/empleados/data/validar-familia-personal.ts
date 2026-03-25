import { listarFamilias } from "@/modules/maestros/familias/data/listar-familias";
import { listarTipos } from "@/modules/maestros/tipos/data/listar-tipos";

function normalizar(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export async function esFamiliaDePersonal(familiaId: number) {
  const [tipos, familias] = await Promise.all([listarTipos(), listarFamilias()]);
  const tipoPersonal = (tipos ?? []).find((item) => normalizar(item.nombre) === "personal");
  const familia = familias.find((item) => item.id === familiaId);

  return Boolean(tipoPersonal && familia && familia.tipoId === tipoPersonal.id);
}
