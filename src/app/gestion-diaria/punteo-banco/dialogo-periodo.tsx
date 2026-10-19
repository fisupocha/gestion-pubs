"use client";

import { useEffect, useRef, useState } from "react";
import { botonPrimario, botonSecundario } from "./clases";

type DialogoPeriodoProps = {
  onConfirmar: (desde: string, hasta: string) => void;
  onSinCobertura: () => void;
  onCancelar: () => void;
};

export function DialogoPeriodo({ onConfirmar, onSinCobertura, onCancelar }: DialogoPeriodoProps) {
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cancelarRef.current?.focus();

    function alTeclado(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancelar();
      }
    }

    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [onCancelar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,22,17,0.42)] p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-periodo-extracto"
        aria-describedby="detalle-periodo-extracto"
        className="w-full max-w-lg rounded-[22px] border border-[#d6c4b8] bg-[#fffaf7] p-5 text-[#3f2b24] shadow-[0_24px_60px_rgba(36,22,17,0.28)]"
      >
        <h2 id="titulo-periodo-extracto" className="text-xl font-black">
          Confirmar periodo del extracto
        </h2>
        <p id="detalle-periodo-extracto" className="mt-2 text-sm leading-6 text-[#5d433a]">
          El archivo no demuestra su fecha final de cobertura. El último movimiento no se usa como
          último día cubierto. Indica el periodo real o importa los movimientos sin dar por
          cubierto ningún día.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-bold text-[#5d433a]">
            Desde
            <input
              type="date"
              value={desde}
              onChange={(event) => setDesde(event.target.value)}
              className="mt-1 w-full rounded-[10px] border border-[#d9c3b7] bg-white px-2 py-1 text-sm font-bold text-[#4b2f27] outline-none"
            />
          </label>
          <label className="text-sm font-bold text-[#5d433a]">
            Hasta
            <input
              type="date"
              value={hasta}
              onChange={(event) => setHasta(event.target.value)}
              className="mt-1 w-full rounded-[10px] border border-[#d9c3b7] bg-white px-2 py-1 text-sm font-bold text-[#4b2f27] outline-none"
            />
          </label>
        </div>
        {error ? <p className="mt-2 text-sm font-semibold text-[#7a3d2c]">{error}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={botonPrimario}
            onClick={() => {
              if (!desde || !hasta || desde > hasta) {
                setError("Indica un periodo válido, con el inicio anterior o igual al final.");
                return;
              }

              onConfirmar(desde, hasta);
            }}
          >
            Confirmar periodo
          </button>
          <button type="button" className={botonSecundario} onClick={onSinCobertura}>
            Importar sin cubrir el periodo
          </button>
          <button type="button" ref={cancelarRef} className={botonSecundario} onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
