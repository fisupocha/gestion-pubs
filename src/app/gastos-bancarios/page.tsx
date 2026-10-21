import { PantallaGastosBancarios } from "@/modules/gastos-bancarios/components/pantalla-gastos-bancarios";
import { prepararPantallaOperativa } from "@/modules/operativa/utils/preparar-pantalla-operativa";

export const dynamic = "force-dynamic";

export default async function GastosBancariosPage() {
  const datos = await prepararPantallaOperativa();

  return (
    <PantallaGastosBancarios
      proveedores={datos.proveedores}
      clasificacion={datos.clasificacion}
      maestros={datos.maestros}
      maestrosPersistencia={datos.maestrosPersistencia}
    />
  );
}
