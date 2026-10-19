import { tarjetaPunteo } from "./clases";

const BLOQUES = [
  {
    titulo: "Movimientos históricos de los dos bancos",
    texto: "Sin datos. En esta fase no se cargan los extractos de CaixaBank ni de Ibercaja.",
  },
  {
    titulo: "Registros económicos de Gestión Pubs",
    texto: "Sin datos. No se leen ni se modifican facturas, gastos, créditos ni caja.",
  },
  {
    titulo: "Conciliación",
    texto: "Sin desarrollar. Esta fase no cruza movimientos ni propone coincidencias.",
  },
];

export function RevisionConjunta() {
  return (
    <section className={`${tarjetaPunteo} min-h-0 flex-1 overflow-auto p-4`}>
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8b695d]">
        Sección reservada
      </div>
      <h2 className="mt-1 text-2xl font-black">Revisión conjunta</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5d433a]">
        Aquí se compararán más adelante los movimientos históricos de CaixaBank e Ibercaja con los
        registros económicos de Gestión Pubs. La conciliación no está hecha.
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {BLOQUES.map((bloque) => (
          <article key={bloque.titulo} className="rounded-[16px] border border-[#e1cec4] bg-white/70 p-4">
            <h3 className="text-sm font-black text-[#3f2b24]">{bloque.titulo}</h3>
            <p className="mt-2 text-sm leading-6 text-[#6a4f45]">{bloque.texto}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
