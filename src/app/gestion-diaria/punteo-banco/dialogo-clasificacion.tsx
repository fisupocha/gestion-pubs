"use client";

import { useEffect, useRef, useState } from "react";
import type { ClaseMovimiento, MovimientoInterno } from "@/modules/punteo-banco/movimiento-interno";
import { formatearImporte } from "@/modules/punteo-banco/celdas";
import { formatearFechaIso } from "@/modules/punteo-banco/modelo";
import { botonPrimario, botonSecundario } from "./clases";

const OPCIONES: { id: ClaseMovimiento; nombre: string }[] = [
  { id: "tpv-ingreso", nombre: "Ingreso TPV" },
  { id: "tpv-comision", nombre: "Comisión TPV" },
  { id: "tpv-mantenimiento", nombre: "Mantenimiento TPV" },
  { id: "tpv-devolucion", nombre: "Devolución TPV" },
  { id: "credito-cuota", nombre: "Cuota de crédito" },
  { id: "normal", nombre: "Movimiento normal" },
  { id: "pendiente-clasificacion", nombre: "Dejar pendiente" },
];

type DialogoClasificacionProps = {
  movimientos: MovimientoInterno[];
  onConfirmar: (clases: Record<string, ClaseMovimiento>) => void;
  onCancelar: () => void;
};

export function DialogoClasificacion({
  movimientos,
  onConfirmar,
  onCancelar,
}: DialogoClasificacionProps) {
  const cancelarRef = useRef<HTMLButtonElement>(null);
  const [clases, setClases] = useState<Record<string, ClaseMovimiento>>(() =>
    Object.fromEntries(movimientos.map((movimiento) => [movimiento.id, movimiento.clase]))
  );

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
        aria-labelledby="titulo-clasificacion-extracto"
        aria-describedby="detalle-clasificacion-extracto"
        className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-[22px] border border-[#d6c4b8] bg-[#fffaf7] p-5 text-[#3f2b24] shadow-[0_24px_60px_rgba(36,22,17,0.28)]"
      >
        <h2 id="titulo-clasificacion-extracto" className="text-xl font-black">
          Clasificar movimientos dudosos
        </h2>
        <p id="detalle-clasificacion-extracto" className="mt-2 text-sm leading-6 text-[#5d433a]">
          Estos apuntes mencionan un TPV, pero no queda claro si son ingreso, comisión, mantenimiento
          o devolución. No se inventa la clase. Lo que dejes pendiente sigue en la tabla, en rojo, y
          no entra en el resumen TPV.
        </p>
        <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-auto pr-1">
          {movimientos.map((movimiento) => (
            <li
              key={movimiento.id}
              className="grid gap-2 rounded-[12px] border border-[#eadcd4] bg-white/70 p-2 sm:grid-cols-[8rem_6rem_minmax(0,1fr)]"
            >
              <span className="text-sm font-bold">{formatearFechaIso(movimiento.fecha)}</span>
              <span className="text-sm font-bold tabular-nums">{formatearImporte(movimiento.importe)}</span>
              <label className="text-sm text-[#5d433a]">
                {movimiento.concepto || "Sin concepto"}
                <select
                  aria-label={`Clase de ${movimiento.concepto || movimiento.fecha}`}
                  value={clases[movimiento.id] ?? movimiento.clase}
                  onChange={(event) =>
                    setClases((actual) => ({
                      ...actual,
                      [movimiento.id]: event.target.value as ClaseMovimiento,
                    }))
                  }
                  className="mt-1 w-full rounded-[10px] border border-[#d9c3b7] bg-white px-2 py-1 text-sm font-bold text-[#4b2f27] outline-none"
                >
                  {OPCIONES.map((opcion) => (
                    <option key={opcion.id} value={opcion.id}>
                      {opcion.nombre}
                    </option>
                  ))}
                </select>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className={botonPrimario} onClick={() => onConfirmar(clases)}>
            Confirmar clasificación
          </button>
          <button type="button" ref={cancelarRef} className={botonSecundario} onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
