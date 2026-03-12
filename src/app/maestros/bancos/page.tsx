import { PantallaBancos } from "@/modules/maestros/bancos/components/pantalla-bancos";
import { crearBanco } from "@/modules/maestros/bancos/data/crear-banco";
import { listarBancos } from "@/modules/maestros/bancos/data/listar-bancos";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type BancosPageProps = {
  searchParams: Promise<{
    tipo?: string;
    mensaje?: string;
  }>;
};

export default async function BancosPage({
  searchParams,
}: BancosPageProps) {
  const bancos = await listarBancos();
  const params = await searchParams;

  return (
    <PantallaBancos
      bancos={bancos}
      mensaje={params.mensaje}
      tipo={params.tipo}
      accionCrear={crearBanco}
    />
  );
}
