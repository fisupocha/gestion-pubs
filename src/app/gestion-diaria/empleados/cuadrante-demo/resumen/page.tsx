import { PantallaCuadranteDemo } from "@/modules/maestros/empleados/components/pantalla-cuadrante-demo";
import { listarEmpleados } from "@/modules/maestros/empleados/data/listar-empleados";
import { listarEmpresas } from "@/modules/maestros/empresas/data/listar-empresas";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function CuadranteResumenPage() {
  let empleadosBase: Array<{ id: number; nombre: string; familia: string }> = [];
  let localesBbdd: Array<{ id: number; nombre: string }> = [];

  try {
    const [empleados, empresas] = await Promise.all([listarEmpleados(), listarEmpresas()]);
    empleadosBase = empleados.map((empleado) => ({
      id: empleado.id,
      nombre: empleado.nombre,
      familia: empleado.familia,
    }));
    localesBbdd = (empresas ?? []).map((empresa) => ({
      id: Number(empresa.id),
      nombre: empresa.nombre,
    }));
  } catch {
    empleadosBase = [];
    localesBbdd = [];
  }

  return (
    <PantallaCuadranteDemo
      empleadosBase={empleadosBase}
      localesBbdd={localesBbdd}
      modoPantalla="resumen"
    />
  );
}
