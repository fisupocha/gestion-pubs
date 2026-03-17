import { PantallaProveedores } from "@/modules/maestros/proveedores/components/pantalla-proveedores";
import { actualizarProveedor } from "@/modules/maestros/proveedores/data/actualizar-proveedor";
import { crearProveedor } from "@/modules/maestros/proveedores/data/crear-proveedor";
import { eliminarProveedor } from "@/modules/maestros/proveedores/data/eliminar-proveedor";
import { listarProveedores } from "@/modules/maestros/proveedores/data/listar-proveedores";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type ProveedoresPageProps = {
  searchParams: Promise<{
    tipo?: string;
    mensaje?: string;
  }>;
};

export default async function ProveedoresPage({
  searchParams,
}: ProveedoresPageProps) {
  const proveedores = await listarProveedores();
  const params = await searchParams;

  return (
    <PantallaProveedores
      proveedores={proveedores}
      mensaje={params.mensaje}
      tipo={params.tipo}
      accionCrear={crearProveedor}
      accionActualizar={actualizarProveedor}
      accionEliminar={eliminarProveedor}
    />
  );
}
