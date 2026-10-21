import { PantallaNotasVarias } from "@/modules/notas-varias/components/pantalla-notas-varias";
import { prepararPantallaOperativa } from "@/modules/operativa/utils/preparar-pantalla-operativa";

export const dynamic = "force-dynamic";

export default async function NotasVariasPage() {
  const datos = await prepararPantallaOperativa();

  return (
    <PantallaNotasVarias
      clientes={datos.clientes}
      clasificacion={datos.clasificacion}
      maestros={datos.maestros}
      maestrosPersistencia={datos.maestrosPersistencia}
    />
  );
}
