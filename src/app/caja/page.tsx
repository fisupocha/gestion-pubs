import { PantallaCaja } from "@/modules/caja/components/pantalla-caja";
import { obtenerClasificacion } from "@/modules/maestros/clasificacion/data/obtener-clasificacion";
import { obtenerMaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";

export default async function CajaPage() {
  const [clasificacion, maestros] = await Promise.all([
    obtenerClasificacion(),
    obtenerMaestrosFormulario(),
  ]);

  return <PantallaCaja clasificacion={clasificacion} maestros={maestros} />;
}
