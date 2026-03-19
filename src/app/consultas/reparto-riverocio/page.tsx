import { PantallaRepartoRiverocio } from "@/modules/consultas/components/pantalla-reparto-riverocio";
import { obtenerClasificacion } from "@/modules/maestros/clasificacion/data/obtener-clasificacion";
import { obtenerMaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";
import { consultaStateFromSearchParams } from "@/modules/consultas/utils/estado-consultas";

type RepartoRiverocioPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RepartoRiverocioPage({
  searchParams,
}: RepartoRiverocioPageProps) {
  const [clasificacion, maestros, resolvedSearchParams] = await Promise.all([
    obtenerClasificacion(),
    obtenerMaestrosFormulario(),
    searchParams,
  ]);

  const initialState = consultaStateFromSearchParams(resolvedSearchParams);

  return (
    <PantallaRepartoRiverocio
      clasificacion={clasificacion}
      maestros={maestros}
      initialState={initialState}
    />
  );
}
