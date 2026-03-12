import { PantallaEmpresas } from "@/modules/maestros/empresas/components/pantalla-empresas";
import { listarEmpresas } from "@/modules/maestros/empresas/data/listar-empresas";

export default async function EmpresasPage() {
  const empresas = await listarEmpresas();

  return <PantallaEmpresas empresas={empresas} />;
}
