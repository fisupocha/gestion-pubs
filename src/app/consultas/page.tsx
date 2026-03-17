import { PantallaConsultas } from "@/modules/consultas/components/pantalla-consultas";
import { obtenerClasificacion } from "@/modules/maestros/clasificacion/data/obtener-clasificacion";
import { obtenerMaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";

export default async function ConsultasPage() {
  const [clasificacion, maestros] = await Promise.all([
    obtenerClasificacion(),
    obtenerMaestrosFormulario(),
  ]);

  return <PantallaConsultas clasificacion={clasificacion} maestros={maestros} />;
}
