import { PantallaRepartosEspeciales } from "@/modules/consultas/components/pantalla-repartos-especiales";
import { obtenerClasificacion } from "@/modules/maestros/clasificacion/data/obtener-clasificacion";
import { consultaStateFromSearchParams } from "@/modules/consultas/utils/estado-consultas";

export const dynamic = "force-dynamic";

type RepartosEspecialesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RepartosEspecialesPage({
  searchParams,
}: RepartosEspecialesPageProps) {
  const [clasificacion, resolvedSearchParams] = await Promise.all([
    obtenerClasificacion(),
    searchParams,
  ]);

  return (
    <PantallaRepartosEspeciales
      clasificacion={clasificacion}
      initialState={consultaStateFromSearchParams(resolvedSearchParams)}
    />
  );
}
