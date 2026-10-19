"use client";

import { useEffect, useRef } from "react";
import { nombreBanco, type BancoPunteoId } from "@/modules/punteo-banco/modelo";
import type { PlanCargaOficial } from "@/modules/punteo-banco/preparar-carga-oficial";
import { botonPrimario, botonSecundario } from "./clases";

type DialogoImportacionOficialProps = {
  banco: BancoPunteoId;
  nombre: string;
  plan: PlanCargaOficial;
  enviando: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export function DialogoImportacionOficial({
  banco,
  nombre,
  plan,
  enviando,
  onConfirmar,
  onCancelar,
}: DialogoImportacionOficialProps) {
  const cancelarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelarRef.current?.focus();

    function alTeclado(event: KeyboardEvent) {
      if (event.key === "Escape" && !enviando) {
        onCancelar();
      }
    }

    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [enviando, onCancelar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,22,17,0.42)] p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-importacion-oficial"
        className="w-full max-w-lg rounded-[22px] border border-[#d6c4b8] bg-[#fffaf7] p-5 text-[#3f2b24] shadow-[0_24px_60px_rgba(36,22,17,0.28)]"
      >
        <h2 id="titulo-importacion-oficial" className="text-xl font-black">
          Vista previa de {nombreBanco(banco)}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[#5d433a]">{nombre}</p>
        <p className="mt-2 text-sm leading-6 text-[#5d433a]">{plan.aviso}</p>
        {plan.garantizada ? (
          <p className="mt-2 text-sm leading-6 text-[#5d433a]">
            Carga histórica: {plan.historico.length} movimientos. Importación ordinaria: {plan.ordinario.length}{" "}
            movimientos. No se llama a la base hasta confirmar.
          </p>
        ) : (
          <p className="mt-2 text-sm font-semibold leading-6 text-[#7a3028]">
            No se puede confirmar esta vista previa.
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {plan.garantizada ? (
            <button type="button" className={botonPrimario} onClick={onConfirmar} disabled={enviando}>
              {enviando ? "Enviando…" : "Confirmar en la base"}
            </button>
          ) : null}
          <button type="button" ref={cancelarRef} className={botonSecundario} onClick={onCancelar} disabled={enviando}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
