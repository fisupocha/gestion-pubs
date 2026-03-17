import { PantallaNotasVarias } from "@/modules/notas-varias/components/pantalla-notas-varias";
import { obtenerClasificacion } from "@/modules/maestros/clasificacion/data/obtener-clasificacion";
import { obtenerMaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";

export default async function NotasVariasPage() {
  const [clasificacion, maestros] = await Promise.all([
    obtenerClasificacion(),
    obtenerMaestrosFormulario(),
  ]);

  return <PantallaNotasVarias clasificacion={clasificacion} maestros={maestros} />;
}
