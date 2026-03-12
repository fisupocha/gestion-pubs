import { PantallaFamilias } from "@/modules/maestros/familias/components/pantalla-familias";
import { crearFamilia } from "@/modules/maestros/familias/data/crear-familia";
import { listarFamilias } from "@/modules/maestros/familias/data/listar-familias";
import { listarTipos } from "@/modules/maestros/tipos/data/listar-tipos";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type FamiliasPageProps = {
  searchParams: Promise<{
    tipo?: string;
    mensaje?: string;
  }>;
};

export default async function FamiliasPage({
  searchParams,
}: FamiliasPageProps) {
  const [familias, tipos] = await Promise.all([
    listarFamilias(),
    listarTipos(),
  ]);

  const params = await searchParams;

  return (
    <PantallaFamilias
      familias={familias}
      tipos={tipos}
      mensaje={params.mensaje}
      tipoMensaje={params.tipo}
      accionCrear={crearFamilia}
    />
  );
}
