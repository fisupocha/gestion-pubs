import { PantallaCreditos } from "@/modules/creditos/components/pantalla-creditos";
import { obtenerClasificacion } from "@/modules/maestros/clasificacion/data/obtener-clasificacion";
import { listarProveedores } from "@/modules/maestros/proveedores/data/listar-proveedores";
import { obtenerMaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";

export default async function CreditosPage() {
  const [proveedoresData, clasificacion, maestros] = await Promise.all([
    listarProveedores(),
    obtenerClasificacion(),
    obtenerMaestrosFormulario(),
  ]);

  const proveedores = [...new Set(proveedoresData.map((proveedor) => proveedor.nombre.trim()))].filter(
    Boolean
  );

  return (
    <PantallaCreditos proveedores={proveedores} clasificacion={clasificacion} maestros={maestros} />
  );
}
