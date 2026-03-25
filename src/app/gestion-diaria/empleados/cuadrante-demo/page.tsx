import { PantallaCuadranteDemo } from "@/modules/maestros/empleados/components/pantalla-cuadrante-demo";
import { listarEmpleados } from "@/modules/maestros/empleados/data/listar-empleados";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function CuadranteDemoPage() {
  let empleadosBase: Array<{ nombre: string; familia: string }> = [];

  try {
    const empleados = await listarEmpleados();
    empleadosBase = empleados.map((empleado) => ({
      nombre: empleado.nombre,
      familia: empleado.familia,
    }));
  } catch {
    empleadosBase = [];
  }

  return <PantallaCuadranteDemo empleadosBase={empleadosBase} />;
}
