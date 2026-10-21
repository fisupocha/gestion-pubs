import { PantallaConsultasDetalle } from "@/modules/consultas/components/pantalla-consultas-detalle";
import { consultaStateFromSearchParams } from "@/modules/consultas/utils/estado-consultas";
import { prepararPantallaOperativa } from "@/modules/operativa/utils/preparar-pantalla-operativa";

export const dynamic = "force-dynamic";

type DetallePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConsultasDetallePage({ searchParams }: DetallePageProps) {
  const [datos, resolvedSearchParams] = await Promise.all([
    prepararPantallaOperativa(),
    searchParams,
  ]);

  const initialState = consultaStateFromSearchParams(resolvedSearchParams);

  return (
    <PantallaConsultasDetalle
      clasificacion={datos.clasificacion}
      maestros={datos.maestros}
      maestrosPersistencia={datos.maestrosPersistencia}
      initialState={initialState}
    />
  );
}
