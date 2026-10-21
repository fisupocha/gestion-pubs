import { PantallaFacturasRecibidas } from "@/modules/facturas-recibidas/components/pantalla-facturas-recibidas";
import { prepararPantallaOperativa } from "@/modules/operativa/utils/preparar-pantalla-operativa";

export const dynamic = "force-dynamic";

export default async function FacturasRecibidasPage() {
  const datos = await prepararPantallaOperativa();

  return (
    <PantallaFacturasRecibidas
      proveedores={datos.proveedores}
      clasificacion={datos.clasificacion}
      maestros={datos.maestros}
      maestrosPersistencia={datos.maestrosPersistencia}
    />
  );
}
