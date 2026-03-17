import { PantallaClasificacion } from "@/modules/maestros/clasificacion/components/pantalla-clasificacion";
import { actualizarFamilia } from "@/modules/maestros/familias/data/actualizar-familia";
import { crearFamilia } from "@/modules/maestros/familias/data/crear-familia";
import { eliminarFamilia } from "@/modules/maestros/familias/data/eliminar-familia";
import { listarFamilias } from "@/modules/maestros/familias/data/listar-familias";
import { actualizarSubfamilia } from "@/modules/maestros/subfamilias/data/actualizar-subfamilia";
import { crearSubfamilia } from "@/modules/maestros/subfamilias/data/crear-subfamilia";
import { eliminarSubfamilia } from "@/modules/maestros/subfamilias/data/eliminar-subfamilia";
import { listarSubfamilias } from "@/modules/maestros/subfamilias/data/listar-subfamilias";
import { actualizarTipo } from "@/modules/maestros/tipos/data/actualizar-tipo";
import { crearTipo } from "@/modules/maestros/tipos/data/crear-tipo";
import { eliminarTipo } from "@/modules/maestros/tipos/data/eliminar-tipo";
import { listarTipos } from "@/modules/maestros/tipos/data/listar-tipos";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type ClasificacionPageProps = {
  searchParams: Promise<{
    tipo?: string;
    mensaje?: string;
  }>;
};

export default async function ClasificacionPage({
  searchParams,
}: ClasificacionPageProps) {
  const [tipos, familias, subfamilias, params] = await Promise.all([
    listarTipos(),
    listarFamilias(),
    listarSubfamilias(),
    searchParams,
  ]);

  return (
    <PantallaClasificacion
      tipos={tipos}
      familias={familias}
      subfamilias={subfamilias}
      mensaje={params.mensaje}
      tipoMensaje={params.tipo}
      accionCrearTipo={crearTipo}
      accionActualizarTipo={actualizarTipo}
      accionEliminarTipo={eliminarTipo}
      accionCrearFamilia={crearFamilia}
      accionActualizarFamilia={actualizarFamilia}
      accionEliminarFamilia={eliminarFamilia}
      accionCrearSubfamilia={crearSubfamilia}
      accionActualizarSubfamilia={actualizarSubfamilia}
      accionEliminarSubfamilia={eliminarSubfamilia}
    />
  );
}
