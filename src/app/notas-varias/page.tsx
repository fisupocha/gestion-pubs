import { PantallaNotasVarias } from "@/modules/notas-varias/components/pantalla-notas-varias";
import { obtenerClasificacion } from "@/modules/maestros/clasificacion/data/obtener-clasificacion";
import { listarClientes } from "@/modules/maestros/clientes/data/listar-clientes";
import { obtenerMaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";

export default async function NotasVariasPage() {
  const [clientesData, clasificacion, maestros] = await Promise.all([
    listarClientes(),
    obtenerClasificacion(),
    obtenerMaestrosFormulario(),
  ]);

  const clientes = [...new Set(clientesData.map((cliente) => cliente.nombre.trim()))].filter(Boolean);

  return (
    <PantallaNotasVarias clientes={clientes} clasificacion={clasificacion} maestros={maestros} />
  );
}
