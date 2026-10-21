import { PantallaAlquileres } from "@/modules/alquileres/components/pantalla-alquileres";
import { prepararPantallaOperativa } from "@/modules/operativa/utils/preparar-pantalla-operativa";

export const dynamic = "force-dynamic";

export default async function AlquileresPage() {
  const datos = await prepararPantallaOperativa();

  return (
    <PantallaAlquileres
      proveedores={datos.proveedores}
      clasificacion={datos.clasificacion}
      maestros={datos.maestros}
      maestrosPersistencia={datos.maestrosPersistencia}
    />
  );
}
