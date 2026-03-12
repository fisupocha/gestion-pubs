import { PantallaTipos } from "@/modules/maestros/tipos/components/pantalla-tipos";
import { crearTipo } from "@/modules/maestros/tipos/data/crear-tipo";
import { listarTipos } from "@/modules/maestros/tipos/data/listar-tipos";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type TiposPageProps = {
  searchParams: Promise<{
    tipo?: string;
    mensaje?: string;
  }>;
};

export default async function TiposPage({
  searchParams,
}: TiposPageProps) {
  const tipos = await listarTipos();
  const params = await searchParams;

  return (
    <PantallaTipos
      tipos={tipos}
      mensaje={params.mensaje}
      tipo={params.tipo}
      accionCrear={crearTipo}
    />
  );
}
