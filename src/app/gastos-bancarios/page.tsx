import { PantallaGastosBancarios } from "@/modules/gastos-bancarios/components/pantalla-gastos-bancarios";
import { obtenerClasificacion } from "@/modules/maestros/clasificacion/data/obtener-clasificacion";
import { listarProveedores } from "@/modules/maestros/proveedores/data/listar-proveedores";
import { obtenerMaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";

export default async function GastosBancariosPage() {
  const [proveedoresData, clasificacion, maestros] = await Promise.all([
    listarProveedores(),
    obtenerClasificacion(),
    obtenerMaestrosFormulario(),
  ]);

  const proveedores = [...new Set(proveedoresData.map((proveedor) => proveedor.nombre.trim()))].filter(
    Boolean
  );

  return (
    <PantallaGastosBancarios
      proveedores={proveedores}
      clasificacion={clasificacion}
      maestros={maestros}
    />
  );
}
