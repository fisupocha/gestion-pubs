import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "edge";

type EmpleadosPageProps = {
  searchParams: Promise<{
    tipo?: string;
    mensaje?: string;
  }>;
};

export default async function EmpleadosPage({ searchParams }: EmpleadosPageProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  if (params.tipo) {
    query.set("tipo", params.tipo);
  }

  if (params.mensaje) {
    query.set("mensaje", params.mensaje);
  }

  redirect(
    query.toString()
      ? `/gestion-diaria/empleados?${query.toString()}`
      : "/gestion-diaria/empleados"
  );
}
