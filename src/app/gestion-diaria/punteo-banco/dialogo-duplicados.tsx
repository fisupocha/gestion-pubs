"use client";

import { useEffect, useRef } from "react";
import { botonPrimario, botonSecundario } from "./clases";

type DialogoDuplicadosProps = {
  abierto: boolean;
  cantidad: number;
  muestra: string[];
  onImportarNuevos: () => void;
  onOmitir: () => void;
  onCancelar: () => void;
};

export function DialogoDuplicados({
  abierto,
  cantidad,
  muestra,
  onImportarNuevos,
  onOmitir,
  onCancelar,
}: DialogoDuplicadosProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,22,17,0.42)] p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-duplicados-extracto"
        aria-describedby="detalle-duplicados-extracto"
        className="w-full max-w-lg rounded-[22px] border border-[#d6c4b8] bg-[#fffaf7] p-5 text-[#3f2b24] shadow-[0_24px_60px_rgba(36,22,17,0.28)]"
      >
        <h2 id="titulo-duplicados-extracto" className="text-xl font-black">
          Coincidencias sin identificar
        </h2>
        <p id="detalle-duplicados-extracto" className="mt-2 text-sm leading-6 text-[#5d433a]">
          {cantidad} movimientos coinciden con el histórico solo en fecha, importe y concepto. Pueden
          ser apuntes distintos. Las coincidencias seguras, por referencia o por saldo y detalle, se
          omiten. Nada se añade hasta que elijas.
        </p>
        {muestra.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-5 text-[#5d433a]">
            {muestra.map((linea) => (
              <li key={linea}>{linea}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className={botonPrimario} onClick={onImportarNuevos}>
            Importar como nuevos
          </button>
          <button type="button" className={botonSecundario} onClick={onOmitir}>
            Omitir coincidencias
          </button>
          <button type="button" ref={cancelarRef} className={botonSecundario} onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
