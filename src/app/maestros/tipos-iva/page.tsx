import { PantallaTiposIva } from "@/modules/maestros/tipos-iva/components/pantalla-tipos-iva";
import { crearTipoIva } from "@/modules/maestros/tipos-iva/data/crear-tipo-iva";
import { listarTiposIva } from "@/modules/maestros/tipos-iva/data/listar-tipos-iva";

export const dynamic = "force-dynamic";

type TiposIvaPageProps = {
  searchParams: Promise<{
    tipo?: string;
    mensaje?: string;
  }>;
};

export default async function TiposIvaPage({
  searchParams,
}: TiposIvaPageProps) {
  const tiposIva = await listarTiposIva();
  const params = await searchParams;

  return (
    <PantallaTiposIva
      tiposIva={tiposIva}
      mensaje={params.mensaje}
      tipo={params.tipo}
      accionCrear={crearTipoIva}
    />
  );
}
