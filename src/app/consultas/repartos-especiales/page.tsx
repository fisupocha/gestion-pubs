import { PantallaRepartosEspeciales } from "@/modules/consultas/components/pantalla-repartos-especiales";
import { consultaStateFromSearchParams } from "@/modules/consultas/utils/estado-consultas";
import { prepararPantallaOperativa } from "@/modules/operativa/utils/preparar-pantalla-operativa";

export const dynamic = "force-dynamic";

type RepartosEspecialesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RepartosEspecialesPage({
  searchParams,
}: RepartosEspecialesPageProps) {
  const [datos, resolvedSearchParams] = await Promise.all([
    prepararPantallaOperativa(),
    searchParams,
  ]);

  return (
    <PantallaRepartosEspeciales
      clasificacion={datos.clasificacion}
      maestrosPersistencia={datos.maestrosPersistencia}
      initialState={consultaStateFromSearchParams(resolvedSearchParams)}
    />
  );
}
