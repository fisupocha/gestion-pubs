import { PantallaCaja } from "@/modules/caja/components/pantalla-caja";
import { prepararPantallaOperativa } from "@/modules/operativa/utils/preparar-pantalla-operativa";

export const dynamic = "force-dynamic";

export default async function CajaPage() {
  const datos = await prepararPantallaOperativa();

  return (
    <PantallaCaja
      proveedores={datos.proveedores}
      clasificacion={datos.clasificacion}
      maestros={datos.maestros}
      maestrosPersistencia={datos.maestrosPersistencia}
    />
  );
}
