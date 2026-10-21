import { PantallaFacturasEmitidas } from "@/modules/facturas-emitidas/components/pantalla-facturas-emitidas";
import { prepararPantallaOperativa } from "@/modules/operativa/utils/preparar-pantalla-operativa";

export const dynamic = "force-dynamic";

export default async function FacturasEmitidasPage() {
  const datos = await prepararPantallaOperativa();

  return (
    <PantallaFacturasEmitidas
      clientes={datos.clientes}
      clasificacion={datos.clasificacion}
      maestros={datos.maestros}
      maestrosPersistencia={datos.maestrosPersistencia}
    />
  );
}
