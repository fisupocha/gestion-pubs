type Subfamilia = {
  id: number;
  nombre: string;
  familia: string;
  tipo: string;
};

type Familia = {
  id: number;
  nombre: string;
  tipo: string;
};

type PantallaSubfamiliasProps = {
  subfamilias: Subfamilia[];
  familias: Familia[];
  mensaje?: string;
  tipoMensaje?: string;
  accionCrear: (formData: FormData) => void;
};

export function PantallaSubfamilias({
  subfamilias,
  familias,
  mensaje,
  tipoMensaje,
  accionCrear,
}: PantallaSubfamiliasProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Subfamilias</h1>
        <p className="mt-2 text-sm text-gray-600">
          Alta rápida y listado.
        </p>
      </div>

      {mensaje ? (
        <div
          className={
            tipoMensaje === "ok"
              ? "mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
              : "mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          }
        >
          {mensaje}
        </div>
      ) : null}

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Nueva subfamilia
        </h2>

        <form action={accionCrear} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-gray-700">Nombre</span>
              <input
                name="nombre"
                type="text"
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-400"
                placeholder="Nombre de la subfamilia"
              />
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-gray-700">Familia</span>
              <select
                name="familia_id"
                className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-400"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecciona una familia
                </option>
                {familias.map((familia) => (
                  <option key={familia.id} value={familia.id}>
                    {familia.tipo} / {familia.nombre}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Guardar subfamilia
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] border-b border-gray-200 px-6 py-4 font-semibold text-gray-900">
          <span>Subfamilia</span>
          <span>Familia</span>
          <span>Tipo</span>
          <span>ID</span>
        </div>

        {subfamilias.length === 0 ? (
          <div className="px-6 py-6 text-sm text-gray-500">
            No hay subfamilias todavía.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {subfamilias.map((subfamilia) => (
              <div
                key={subfamilia.id}
                className="grid grid-cols-[1fr_1fr_1fr_auto] items-center px-6 py-4 text-gray-900"
              >
                <span>{subfamilia.nombre}</span>
                <span>{subfamilia.familia}</span>
                <span>{subfamilia.tipo}</span>
                <span className="text-sm text-gray-500">ID {subfamilia.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
