type Empresa = {
  id: number;
  nombre: string;
};

type PantallaEmpresasProps = {
  empresas: Empresa[];
};

export function PantallaEmpresas({
  empresas,
}: PantallaEmpresasProps) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Empresas</h1>
        <p className="mt-2 text-sm text-gray-600">
          Datos cargados desde Supabase.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4 font-semibold text-gray-900">
          Lista de empresas
        </div>

        <div className="divide-y divide-gray-200">
          {empresas.map((empresa) => (
            <div
              key={empresa.id}
              className="flex items-center justify-between px-6 py-4 text-gray-900"
            >
              <span>{empresa.nombre}</span>
              <span className="text-sm text-gray-500">ID {empresa.id}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
