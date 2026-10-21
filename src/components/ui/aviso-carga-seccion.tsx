export function AvisoCargaSeccion({ texto }: { texto: string }) {
  return (
    <section className="flex h-full min-h-[50vh] items-center justify-center p-6" role="status" aria-live="polite">
      <p className="rounded-2xl border border-[#d2b391] bg-[#f6ece0] px-6 py-4 text-center text-sm font-semibold text-[#6d5249]">
        {texto}
      </p>
    </section>
  );
}

export function AvisoErrorCarga({ texto, onReintentar }: { texto: string; onReintentar: () => void }) {
  return (
    <section className="flex h-full min-h-[50vh] items-center justify-center p-6" role="alert">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-[#d2b391] bg-[#f6ece0] px-6 py-5 text-center">
        <p className="text-sm font-semibold text-[#6d5249]">{texto}</p>
        <button
          type="button"
          onClick={onReintentar}
          className="rounded-xl border border-[#b08968] bg-white px-4 py-2 text-sm font-bold text-[#3f2a23]"
        >
          Reintentar
        </button>
      </div>
    </section>
  );
}
