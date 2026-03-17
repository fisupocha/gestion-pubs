import { PantallaGastosBancarios } from "@/modules/gastos-bancarios/components/pantalla-gastos-bancarios";
import { obtenerClasificacion } from "@/modules/maestros/clasificacion/data/obtener-clasificacion";
import { obtenerMaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";

export default async function GastosBancariosPage() {
  const [clasificacion, maestros] = await Promise.all([
    obtenerClasificacion(),
    obtenerMaestrosFormulario(),
  ]);

  return <PantallaGastosBancarios clasificacion={clasificacion} maestros={maestros} />;
}
