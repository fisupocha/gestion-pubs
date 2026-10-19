"use client";

import { useEffect, useRef } from "react";
import { botonPrimario, botonSecundario } from "./clases";

type DialogoCambiosProps = {
  abierto: boolean;
  titulo: string;
  detalle: string;
  onGuardar: () => void;
  onDescartar: () => void;
  onCancelar: () => void;
  textoDescartar?: string;
};

export function DialogoCambios({
  abierto,
  titulo,
  detalle,
  onGuardar,
  onDescartar,
  onCancelar,
  textoDescartar = "Descartar",
}: DialogoCambiosProps) {
  const cancelarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) {
      return;
    }

    cancelarRef.current?.focus();

    function alTeclado(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancelar();
      }
    }

    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [abierto, onCancelar]);

  if (!abierto) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,22,17,0.42)] p-4"
      onClick={onCancelar}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-cambios-punteo"
        aria-describedby="detalle-cambios-punteo"
        className="w-full max-w-lg rounded-[22px] border border-[#d6c4b8] bg-[#fffaf7] p-5 text-[#3f2b24] shadow-[0_24px_60px_rgba(36,22,17,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="titulo-cambios-punteo" className="text-xl font-black">
          {titulo}
        </h2>
        <p id="detalle-cambios-punteo" className="mt-2 text-sm leading-6 text-[#5d433a]">
          {detalle}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className={botonPrimario} onClick={onGuardar}>
            Guardar
          </button>
          <button type="button" className={botonSecundario} onClick={onDescartar}>
            {textoDescartar}
          </button>
          <button type="button" ref={cancelarRef} className={botonSecundario} onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
