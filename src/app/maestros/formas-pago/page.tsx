import { PantallaFormasPago } from "@/modules/maestros/formas-pago/components/pantalla-formas-pago";
import { crearFormaPago } from "@/modules/maestros/formas-pago/data/crear-forma-pago";
import { listarFormasPago } from "@/modules/maestros/formas-pago/data/listar-formas-pago";

export const dynamic = "force-dynamic";

type FormasPagoPageProps = {
  searchParams: Promise<{
    tipo?: string;
    mensaje?: string;
  }>;
};

export default async function FormasPagoPage({
  searchParams,
}: FormasPagoPageProps) {
  const formasPago = await listarFormasPago();
  const params = await searchParams;

  return (
    <PantallaFormasPago
      formasPago={formasPago}
      mensaje={params.mensaje}
      tipo={params.tipo}
      accionCrear={crearFormaPago}
    />
  );
}
