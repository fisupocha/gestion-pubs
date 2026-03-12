import { PantallaConceptosGastosBancarios } from "@/modules/maestros/conceptos-gastos-bancarios/components/pantalla-conceptos-gastos-bancarios";
import { crearConceptoGastoBancario } from "@/modules/maestros/conceptos-gastos-bancarios/data/crear-concepto-gasto-bancario";
import { listarConceptosGastosBancarios } from "@/modules/maestros/conceptos-gastos-bancarios/data/listar-conceptos-gastos-bancarios";

export const dynamic = "force-dynamic";

type ConceptosGastosBancariosPageProps = {
  searchParams: Promise<{
    tipo?: string;
    mensaje?: string;
  }>;
};

export default async function ConceptosGastosBancariosPage({
  searchParams,
}: ConceptosGastosBancariosPageProps) {
  const conceptos = await listarConceptosGastosBancarios();
  const params = await searchParams;

  return (
    <PantallaConceptosGastosBancarios
      conceptos={conceptos}
      mensaje={params.mensaje}
      tipo={params.tipo}
      accionCrear={crearConceptoGastoBancario}
    />
  );
}
