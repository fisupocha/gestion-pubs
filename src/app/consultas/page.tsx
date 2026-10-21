import { PantallaConsultas } from "@/modules/consultas/components/pantalla-consultas";
import { consultaStateFromSearchParams } from "@/modules/consultas/utils/estado-consultas";
import { prepararPantallaOperativa } from "@/modules/operativa/utils/preparar-pantalla-operativa";

export const dynamic = "force-dynamic";

type ConsultasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConsultasPage({ searchParams }: ConsultasPageProps) {
  const [datos, resolvedSearchParams] = await Promise.all([
    prepararPantallaOperativa(),
    searchParams,
  ]);

  const initialState = consultaStateFromSearchParams(resolvedSearchParams);

  return (
    <PantallaConsultas
      clasificacion={datos.clasificacion}
      maestros={datos.maestros}
      maestrosPersistencia={datos.maestrosPersistencia}
      initialState={initialState}
    />
  );
}
