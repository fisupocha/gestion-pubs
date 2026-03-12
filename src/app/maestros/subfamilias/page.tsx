import { PantallaSubfamilias } from "@/modules/maestros/subfamilias/components/pantalla-subfamilias";
import { crearSubfamilia } from "@/modules/maestros/subfamilias/data/crear-subfamilia";
import { listarSubfamilias } from "@/modules/maestros/subfamilias/data/listar-subfamilias";
import { listarFamilias } from "@/modules/maestros/familias/data/listar-familias";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type SubfamiliasPageProps = {
  searchParams: Promise<{
    tipo?: string;
    mensaje?: string;
  }>;
};

export default async function SubfamiliasPage({
  searchParams,
}: SubfamiliasPageProps) {
  const [subfamilias, familias] = await Promise.all([
    listarSubfamilias(),
    listarFamilias(),
  ]);

  const params = await searchParams;

  return (
    <PantallaSubfamilias
      subfamilias={subfamilias}
      familias={familias}
      mensaje={params.mensaje}
      tipoMensaje={params.tipo}
      accionCrear={crearSubfamilia}
    />
  );
}
