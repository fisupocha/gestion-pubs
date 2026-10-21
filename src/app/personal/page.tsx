import { PantallaPersonal } from "@/modules/personal/components/pantalla-personal";
import { prepararPantallaOperativa } from "@/modules/operativa/utils/preparar-pantalla-operativa";

export const dynamic = "force-dynamic";

export default async function PersonalPage() {
  const datos = await prepararPantallaOperativa();

  return (
    <PantallaPersonal
      proveedores={datos.proveedores}
      clasificacion={datos.clasificacion}
      maestros={datos.maestros}
      maestrosPersistencia={datos.maestrosPersistencia}
    />
  );
}
