import { PantallaCreditos } from "@/modules/creditos/components/pantalla-creditos";
import { obtenerClasificacion } from "@/modules/maestros/clasificacion/data/obtener-clasificacion";
import { obtenerMaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";

export default async function CreditosPage() {
  const [clasificacion, maestros] = await Promise.all([
    obtenerClasificacion(),
    obtenerMaestrosFormulario(),
  ]);

  return <PantallaCreditos clasificacion={clasificacion} maestros={maestros} />;
}
