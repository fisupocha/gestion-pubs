import { PantallaConsultasDetalle } from "@/modules/consultas/components/pantalla-consultas-detalle";
import { obtenerClasificacion } from "@/modules/maestros/clasificacion/data/obtener-clasificacion";
import { obtenerMaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";
import { consultaStateFromSearchParams } from "@/modules/consultas/utils/estado-consultas";

type DetallePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ConsultasDetallePage({ searchParams }: DetallePageProps) {
  const [clasificacion, maestros, resolvedSearchParams] = await Promise.all([
    obtenerClasificacion(),
    obtenerMaestrosFormulario(),
    searchParams,
  ]);

  const initialState = consultaStateFromSearchParams(resolvedSearchParams);

  return (
    <PantallaConsultasDetalle
      clasificacion={clasificacion}
      maestros={maestros}
      initialState={initialState}
    />
  );
}
