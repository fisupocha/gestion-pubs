"use client";

import { useEffect, useRef, useState } from "react";
import type { EstadoOk } from "@/modules/punteo-banco/modelo";
import { botonPrimario, botonSecundario } from "./clases";

const NOMBRE: Record<EstadoOk, string> = {
  pendiente: "Pendiente",
  comprobar: "Comprobar",
  ok: "OK",
};

type DialogoMotivoOficialProps = {
  estado: EstadoOk;
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
};

export function DialogoMotivoOficial({ estado, onConfirmar, onCancelar }: DialogoMotivoOficialProps) {
  const [motivo, setMotivo] = useState("");
  const cancelarRef = useRef<HTMLButtonElement>(null);

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-motivo-oficial"
        className="w-full max-w-lg rounded-[22px] border border-[#d6c4b8] bg-[#fffaf7] p-5 text-[#3f2b24] shadow-[0_24px_60px_rgba(36,22,17,0.28)]"
      >
        <h2 id="titulo-motivo-oficial" className="text-xl font-black">
          Cambiar a {NOMBRE[estado]}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#5d433a]">
          El motivo es obligatorio. Esta acción no modifica la observación. La decisión queda protegida.
        </p>
        <label className="mt-3 block text-sm font-bold text-[#5d433a]">
          Motivo
          <textarea
            value={motivo}
            rows={3}
            onChange={(event) => setMotivo(event.target.value)}
            className="mt-1 block w-full rounded-[10px] border border-[#dac4b8] bg-white px-2 py-1 text-sm leading-5 outline-none"
          />
        </label>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={botonPrimario}
            disabled={motivo.trim() === ""}
            onClick={() => onConfirmar(motivo.trim())}
          >
            Confirmar estado
          </button>
          <button type="button" ref={cancelarRef} className={botonSecundario} onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
