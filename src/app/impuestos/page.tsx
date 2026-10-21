import { PantallaImpuestos } from "@/modules/impuestos/components/pantalla-impuestos";
import { prepararPantallaOperativa } from "@/modules/operativa/utils/preparar-pantalla-operativa";

export const dynamic = "force-dynamic";

export default async function ImpuestosPage() {
  const datos = await prepararPantallaOperativa();

  return (
    <PantallaImpuestos
      proveedores={datos.proveedores}
      clasificacion={datos.clasificacion}
      maestros={datos.maestros}
      maestrosPersistencia={datos.maestrosPersistencia}
    />
  );
}
