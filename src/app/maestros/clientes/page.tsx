import { PantallaClientes } from "@/modules/maestros/clientes/components/pantalla-clientes";
import { crearCliente } from "@/modules/maestros/clientes/data/crear-cliente";
import { listarClientes } from "@/modules/maestros/clientes/data/listar-clientes";

export const dynamic = "force-dynamic";

type ClientesPageProps = {
  searchParams: Promise<{
    tipo?: string;
    mensaje?: string;
  }>;
};

export default async function ClientesPage({
  searchParams,
}: ClientesPageProps) {
  const clientes = await listarClientes();
  const params = await searchParams;

  return (
    <PantallaClientes
      clientes={clientes}
      mensaje={params.mensaje}
      tipo={params.tipo}
      accionCrear={crearCliente}
    />
  );
}
