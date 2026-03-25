import { PantallaEmpleados } from "@/modules/maestros/empleados/components/pantalla-empleados";
import { actualizarEmpleado } from "@/modules/maestros/empleados/data/actualizar-empleado";
import { crearEmpleado } from "@/modules/maestros/empleados/data/crear-empleado";
import { eliminarEmpleado } from "@/modules/maestros/empleados/data/eliminar-empleado";
import { listarEmpleados } from "@/modules/maestros/empleados/data/listar-empleados";
import { listarFamilias } from "@/modules/maestros/familias/data/listar-familias";
import { listarTipos } from "@/modules/maestros/tipos/data/listar-tipos";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type EmpleadosPageProps = {
  searchParams: Promise<{
    tipo?: string;
    mensaje?: string;
  }>;
};

export default async function EmpleadosPage({ searchParams }: EmpleadosPageProps) {
  const [familias, tipos, params] = await Promise.all([
    listarFamilias(),
    listarTipos(),
    searchParams,
  ]);

  let empleados = [] as Awaited<ReturnType<typeof listarEmpleados>>;
  let mensaje = params.mensaje;
  let tipoMensaje = params.tipo;

  try {
    empleados = await listarEmpleados();
  } catch {
    if (!mensaje) {
      tipoMensaje = "error";
      mensaje = "Falta ejecutar sql/crear-empleados-horas.sql en Supabase.";
    }
  }

  const tipoPersonal = (tipos ?? []).find((item) => item.nombre === "Personal");
  const tiposEmpleado = familias
    .filter((item) => item.tipoId === tipoPersonal?.id)
    .map((item) => ({
      id: item.id,
      label: item.nombre,
    }));

  return (
    <PantallaEmpleados
      empleados={empleados}
      tiposEmpleado={tiposEmpleado}
      mensaje={mensaje}
      tipo={tipoMensaje}
      cuadranteDemoHref="/gestion-diaria/empleados/cuadrante-demo"
      accionCrear={crearEmpleado}
      accionActualizar={actualizarEmpleado}
      accionEliminar={eliminarEmpleado}
    />
  );
}
