import { PantallaCreditos } from "@/modules/creditos/components/pantalla-creditos";
import { prepararPantallaOperativa } from "@/modules/operativa/utils/preparar-pantalla-operativa";

export const dynamic = "force-dynamic";

export default async function CreditosPage() {
  const datos = await prepararPantallaOperativa();

  return (
    <PantallaCreditos
      proveedores={datos.proveedores}
      clasificacion={datos.clasificacion}
      maestros={datos.maestros}
      maestrosPersistencia={datos.maestrosPersistencia}
    />
  );
}
