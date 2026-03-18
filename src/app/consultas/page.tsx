import { PantallaConsultas } from "@/modules/consultas/components/pantalla-consultas";
import { obtenerClasificacion } from "@/modules/maestros/clasificacion/data/obtener-clasificacion";
import { obtenerMaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";
import { consultaStateFromSearchParams } from "@/modules/consultas/utils/estado-consultas";

type ConsultasPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConsultasPage({ searchParams }: ConsultasPageProps) {
  const [clasificacion, maestros, resolvedSearchParams] = await Promise.all([
    obtenerClasificacion(),
    obtenerMaestrosFormulario(),
    searchParams,
  ]);

  const initialState = consultaStateFromSearchParams(resolvedSearchParams);

  return (
    <PantallaConsultas
      clasificacion={clasificacion}
      maestros={maestros}
      initialState={initialState}
    />
  );
}
