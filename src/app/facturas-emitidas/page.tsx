import { PantallaFacturasEmitidas } from "@/modules/facturas-emitidas/components/pantalla-facturas-emitidas";
import { obtenerClasificacion } from "@/modules/maestros/clasificacion/data/obtener-clasificacion";
import { listarClientes } from "@/modules/maestros/clientes/data/listar-clientes";
import { obtenerMaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";

export default async function FacturasEmitidasPage() {
  const [clientesData, clasificacion, maestros] = await Promise.all([
    listarClientes(),
    obtenerClasificacion(),
    obtenerMaestrosFormulario(),
  ]);

  const clientes = [...new Set(clientesData.map((cliente) => cliente.nombre.trim()))]
    .filter(Boolean);

  return (
    <PantallaFacturasEmitidas
      clientes={clientes}
      clasificacion={clasificacion}
      maestros={maestros}
    />
  );
}
