import { PantallaHoras } from "@/modules/horas/components/pantalla-horas";
import { actualizarHora } from "@/modules/horas/data/actualizar-hora";
import { crearHora } from "@/modules/horas/data/crear-hora";
import { eliminarHora } from "@/modules/horas/data/eliminar-hora";
import { listarHoras } from "@/modules/horas/data/listar-horas";
import { listarEmpresas } from "@/modules/maestros/empresas/data/listar-empresas";
import { listarEmpleados } from "@/modules/maestros/empleados/data/listar-empleados";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type HorasPageProps = {
  searchParams: Promise<{
    tipo?: string;
    mensaje?: string;
  }>;
};

export default async function HorasPage({ searchParams }: HorasPageProps) {
  const [locales, params] = await Promise.all([listarEmpresas(), searchParams]);

  let horas = [] as Awaited<ReturnType<typeof listarHoras>>;
  let empleados = [] as Awaited<ReturnType<typeof listarEmpleados>>;
  let mensaje = params.mensaje;
  let tipoMensaje = params.tipo;

  try {
    [horas, empleados] = await Promise.all([listarHoras(), listarEmpleados()]);
  } catch {
    if (!mensaje) {
      tipoMensaje = "error";
      mensaje = "Falta ejecutar sql/crear-empleados-horas.sql en Supabase.";
    }
  }

  return (
    <PantallaHoras
      horas={horas}
      empleados={empleados}
      locales={locales.map((item) => ({ id: item.id, nombre: item.nombre }))}
      mensaje={mensaje}
      tipo={tipoMensaje}
      accionCrear={crearHora}
      accionActualizar={actualizarHora}
      accionEliminar={eliminarHora}
    />
  );
}
