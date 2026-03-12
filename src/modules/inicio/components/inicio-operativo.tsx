import Link from "next/link";

const tarjetas = [
  {
    titulo: "Operativa",
    texto: "Entrada diaria de datos para fiscalidad y control del negocio.",
    href: "/facturas-recibidas",
    cta: "Entrar en operativa",
  },
  {
    titulo: "Maestros",
    texto: "Listas base para mantener empresas, clasificaciones y relaciones.",
    href: "/maestros/empresas",
    cta: "Abrir maestros",
  },
  {
    titulo: "Consultas",
    texto: "Analisis interno del funcionamiento real de cada local y de la empresa.",
    href: "/consultas",
    cta: "Ir a consultas",
  },
];

export function InicioOperativo() {
  return (
    <section className="flex h-full min-h-0 items-stretch justify-center bg-[radial-gradient(circle_at_top,rgba(41,37,36,0.08),transparent_35%),linear-gradient(180deg,#fafaf9_0%,#f5f5f4_100%)] px-6 py-6">
      <div className="flex h-full w-full max-w-6xl min-h-0 items-center">
        <div className="w-full rounded-[32px] border border-stone-200 bg-white/92 p-8 shadow-[0_24px_80px_rgba(28,25,23,0.12)] backdrop-blur md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-[28px] border border-stone-200 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-800 p-8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-2xl font-black tracking-tight">
                GP
              </div>

              <div className="mt-8 text-[11px] font-black uppercase tracking-[0.22em] text-stone-300">
                Gestion interna
              </div>

              <h1 className="mt-3 max-w-xl text-4xl font-black tracking-tight md:text-5xl">
                Gestion Pubs
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-300">
                Aplicacion de trabajo para introducir datos fiscales y sacar
                consultas internas utiles de cada local y de la empresa.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-400">
                    Bloque 1
                  </div>
                  <div className="mt-2 text-lg font-black">Operativa</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-400">
                    Bloque 2
                  </div>
                  <div className="mt-2 text-lg font-black">Maestros</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-400">
                    Bloque 3
                  </div>
                  <div className="mt-2 text-lg font-black">Consultas</div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 content-center">
              {tarjetas.map((tarjeta) => (
                <Link
                  key={tarjeta.titulo}
                  href={tarjeta.href}
                  className="group rounded-[28px] border border-stone-200 bg-stone-50/90 p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-stone-300 hover:bg-white"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">
                    Acceso
                  </div>
                  <div className="mt-2 text-2xl font-black tracking-tight text-stone-950">
                    {tarjeta.titulo}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    {tarjeta.texto}
                  </p>
                  <div className="mt-5 text-sm font-black text-stone-900">
                    {tarjeta.cta}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
