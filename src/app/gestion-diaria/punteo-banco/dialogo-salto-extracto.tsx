"use client";

import { useEffect, useRef } from "react";
import type { PeriodoExtracto } from "@/modules/punteo-banco/cobertura-extracto";
import { formatearFechaIso } from "@/modules/punteo-banco/modelo";
import { botonPrimario, botonSecundario } from "./clases";

type DialogoSaltoExtractoProps = {
  salto: PeriodoExtracto | null;
  banco: string;
  onConfirmar: (salto: PeriodoExtracto) => void;
  onAhoraNo: () => void;
};

export function DialogoSaltoExtracto({
  salto,
  banco,
  onConfirmar,
  onAhoraNo,
}: DialogoSaltoExtractoProps) {
  const aplazarRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!salto) {
      return;
    }

    aplazarRef.current?.focus();

    function alTeclado(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onAhoraNo();
      }
    }

    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [onAhoraNo, salto]);

  if (!salto) {
    return null;
  }

  const desde = formatearFechaIso(salto.desde);
  const hasta = formatearFechaIso(salto.hasta);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(36,22,17,0.42)] p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-salto-extracto"
        aria-describedby="detalle-salto-extracto"
        className="w-full max-w-lg rounded-[22px] border border-[#d6c4b8] bg-[#fffaf7] p-5 text-[#3f2b24] shadow-[0_24px_60px_rgba(36,22,17,0.28)]"
      >
        <h2 id="titulo-salto-extracto" className="text-xl font-black">
          Salto en el extracto de {banco}
        </h2>
        <p id="detalle-salto-extracto" className="mt-2 text-sm leading-6 text-[#5d433a]">
          Faltan días entre periodos importados: del {desde} al {hasta}. Esos días no quedan
          cubiertos hasta que los confirmes, aunque sean fin de semana o festivo. Confirma el
          salto solo si el periodo está completo.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className={botonPrimario} onClick={() => onConfirmar(salto)}>
            Confirmar este salto
          </button>
          <button type="button" ref={aplazarRef} className={botonSecundario} onClick={onAhoraNo}>
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
