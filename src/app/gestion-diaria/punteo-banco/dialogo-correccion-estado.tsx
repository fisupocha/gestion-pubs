"use client";

import { useEffect, useRef } from "react";
import { botonPrimario, botonSecundario } from "./clases";

type DialogoCorreccionEstadoProps = {
  abierto: boolean;
  detalle: string;
  motivo: string;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export function DialogoCorreccionEstado({
  abierto,
  detalle,
  motivo,
  onConfirmar,
  onCancelar,
}: DialogoCorreccionEstadoProps) {
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
        aria-labelledby="titulo-correccion-estado"
        aria-describedby="detalle-correccion-estado"
        className="w-full max-w-lg rounded-[22px] border border-[#d6c4b8] bg-[#fffaf7] p-5 text-[#3f2b24] shadow-[0_24px_60px_rgba(36,22,17,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="titulo-correccion-estado" className="text-xl font-black">
          Confirmar estado
        </h2>
        <p id="detalle-correccion-estado" className="mt-2 text-sm leading-6 text-[#5d433a]">
          {detalle}
        </p>
        {motivo ? <p className="mt-2 text-sm leading-6 text-[#5d433a]">{motivo}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className={botonPrimario} onClick={onConfirmar}>
            Confirmar
          </button>
          <button type="button" ref={cancelarRef} className={botonSecundario} onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
