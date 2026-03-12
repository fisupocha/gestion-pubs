type FormaPago = {
  id: number;
  nombre: string;
};

type PantallaFormasPagoProps = {
  formasPago: FormaPago[];
  mensaje?: string;
  tipo?: string;
  accionCrear: (formData: FormData) => void;
};

export function PantallaFormasPago({
  formasPago,
  mensaje,
  tipo,
  accionCrear,
}: PantallaFormasPagoProps) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Formas de pago</h1>
        <p className="mt-2 text-sm text-gray-600">
          Alta rápida y listado.
        </p>
      </div>

      {mensaje ? (
        <div
          className={
            tipo === "ok"
              ? "mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
              : "mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          }
        >
          {mensaje}
        </div>
      ) : null}

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Nueva forma de pago
        </h2>

        <form action={accionCrear} className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-gray-700">Nombre</span>
            <input
              name="nombre"
              type="text"
              className="rounded-lg border border-gray-300 px-3 py-2 text-gray-900 outline-none focus:border-gray-400"
              placeholder="Nombre de la forma de pago"
            />
          </label>

          <div>
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Guardar forma de pago
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4 font-semibold text-gray-900">
          Lista de formas de pago
        </div>

        <div className="divide-y divide-gray-200">
          {formasPago.map((formaPago) => (
            <div
              key={formaPago.id}
              className="flex items-center justify-between px-6 py-4 text-gray-900"
            >
              <span>{formaPago.nombre}</span>
              <span className="text-sm text-gray-500">ID {formaPago.id}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
