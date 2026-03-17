import { PantallaFacturasRecibidas } from "@/modules/facturas-recibidas/components/pantalla-facturas-recibidas";
import { obtenerClasificacion } from "@/modules/maestros/clasificacion/data/obtener-clasificacion";
import { listarProveedores } from "@/modules/maestros/proveedores/data/listar-proveedores";
import { obtenerMaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";

export default async function FacturasRecibidasPage() {
  const [proveedoresData, clasificacion, maestros] = await Promise.all([
    listarProveedores(),
    obtenerClasificacion(),
    obtenerMaestrosFormulario(),
  ]);

  const proveedores = [...new Set(proveedoresData.map((proveedor) => proveedor.nombre.trim()))]
    .filter(Boolean);

  return (
    <PantallaFacturasRecibidas
      proveedores={proveedores}
      clasificacion={clasificacion}
      maestros={maestros}
    />
  );
}
