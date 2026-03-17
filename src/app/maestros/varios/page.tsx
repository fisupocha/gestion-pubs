import { PantallaMaestrosVarios } from "@/modules/maestros/varios/components/pantalla-maestros-varios";
import { actualizarBanco } from "@/modules/maestros/varios/data/actualizar-banco";
import { actualizarConceptoGastoBancario } from "@/modules/maestros/varios/data/actualizar-concepto-gasto-bancario";
import { actualizarFormaPago } from "@/modules/maestros/varios/data/actualizar-forma-pago";
import { actualizarLocal } from "@/modules/maestros/varios/data/actualizar-local";
import { actualizarTipoIva } from "@/modules/maestros/varios/data/actualizar-tipo-iva";
import { crearLocal } from "@/modules/maestros/varios/data/crear-local";
import { eliminarBanco } from "@/modules/maestros/varios/data/eliminar-banco";
import { eliminarConceptoGastoBancario } from "@/modules/maestros/varios/data/eliminar-concepto-gasto-bancario";
import { eliminarFormaPago } from "@/modules/maestros/varios/data/eliminar-forma-pago";
import { eliminarLocal } from "@/modules/maestros/varios/data/eliminar-local";
import { eliminarTipoIva } from "@/modules/maestros/varios/data/eliminar-tipo-iva";
import { listarBancos } from "@/modules/maestros/bancos/data/listar-bancos";
import { crearBanco } from "@/modules/maestros/bancos/data/crear-banco";
import { listarConceptosGastosBancarios } from "@/modules/maestros/conceptos-gastos-bancarios/data/listar-conceptos-gastos-bancarios";
import { crearConceptoGastoBancario } from "@/modules/maestros/conceptos-gastos-bancarios/data/crear-concepto-gasto-bancario";
import { listarEmpresas } from "@/modules/maestros/empresas/data/listar-empresas";
import { crearFormaPago } from "@/modules/maestros/formas-pago/data/crear-forma-pago";
import { listarFormasPago } from "@/modules/maestros/formas-pago/data/listar-formas-pago";
import { crearTipoIva } from "@/modules/maestros/tipos-iva/data/crear-tipo-iva";
import { listarTiposIva } from "@/modules/maestros/tipos-iva/data/listar-tipos-iva";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type VariosPageProps = {
  searchParams: Promise<{
    tipo?: string;
    mensaje?: string;
  }>;
};

export default async function MaestrosVariosPage({
  searchParams,
}: VariosPageProps) {
  const [locales, bancos, formasPago, tiposIva, conceptosGastosBancarios, params] =
    await Promise.all([
      listarEmpresas(),
      listarBancos(),
      listarFormasPago(),
      listarTiposIva(),
      listarConceptosGastosBancarios(),
      searchParams,
    ]);

  return (
    <PantallaMaestrosVarios
      locales={locales}
      bancos={bancos}
      formasPago={formasPago}
      tiposIva={tiposIva}
      conceptosGastosBancarios={conceptosGastosBancarios}
      mensaje={params.mensaje}
      tipoMensaje={params.tipo}
      accionCrearLocal={crearLocal}
      accionActualizarLocal={actualizarLocal}
      accionEliminarLocal={eliminarLocal}
      accionCrearBanco={crearBanco}
      accionActualizarBanco={actualizarBanco}
      accionEliminarBanco={eliminarBanco}
      accionCrearFormaPago={crearFormaPago}
      accionActualizarFormaPago={actualizarFormaPago}
      accionEliminarFormaPago={eliminarFormaPago}
      accionCrearTipoIva={crearTipoIva}
      accionActualizarTipoIva={actualizarTipoIva}
      accionEliminarTipoIva={eliminarTipoIva}
      accionCrearConcepto={crearConceptoGastoBancario}
      accionActualizarConcepto={actualizarConceptoGastoBancario}
      accionEliminarConcepto={eliminarConceptoGastoBancario}
    />
  );
}
