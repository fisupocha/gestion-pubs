import { PantallaRepartoRiverocio } from "@/modules/consultas/components/pantalla-reparto-riverocio";
import { consultaStateFromSearchParams } from "@/modules/consultas/utils/estado-consultas";
import { prepararPantallaOperativa } from "@/modules/operativa/utils/preparar-pantalla-operativa";

export const dynamic = "force-dynamic";

type RepartoRiverocioPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RepartoRiverocioPage({
  searchParams,
}: RepartoRiverocioPageProps) {
  const [datos, resolvedSearchParams] = await Promise.all([
    prepararPantallaOperativa(),
    searchParams,
  ]);

  const initialState = consultaStateFromSearchParams(resolvedSearchParams);

  return (
    <PantallaRepartoRiverocio
      clasificacion={datos.clasificacion}
      maestros={datos.maestros}
      maestrosPersistencia={datos.maestrosPersistencia}
      initialState={initialState}
    />
  );
}
