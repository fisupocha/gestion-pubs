"use client";

import { useEffect, useRef } from "react";
import { aCentimos, formatearCentimos } from "@/modules/punteo-banco/centimos";
import type { PlanContinuidad } from "@/modules/punteo-banco/continuidad-saldo";
import { formatearFechaIso } from "@/modules/punteo-banco/modelo";
import type { MovimientoInterno } from "@/modules/punteo-banco/movimiento-interno";
import type { ReferenciaMovimiento } from "@/modules/punteo-banco/referencias-iniciales";
import { botonPrimario, botonSecundario } from "./clases";

type DialogoConfirmarImportacionProps = {
  banco: string;
  referencia: ReferenciaMovimiento;
  plan: PlanContinuidad;
  onConfirmar: () => void;
  onCancelar: () => void;
};

export function DialogoConfirmarImportacion({
  banco,
  referencia,
  plan,
  onConfirmar,
  onCancelar,
}: DialogoConfirmarImportacionProps) {
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

  const resultado =
    plan.estado === "cuadra" ? "CUADRA" : plan.estado === "no-cuadra" ? "NO CUADRA" : "NO COMPROBADO";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(36,22,17,0.42)] p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="titulo-confirmar-importacion"
        className="w-full max-w-xl rounded-[22px] border border-[#d6c4b8] bg-[#fffaf7] p-5 text-[#3f2b24] shadow-[0_24px_60px_rgba(36,22,17,0.28)]"
      >
        <h2 id="titulo-confirmar-importacion" className="text-xl font-black">
          CONFIRMAR IMPORTACIÓN
        </h2>
        <dl className="mt-3 space-y-2 text-sm leading-5 text-[#5d433a]">
          <div>
            <dt className="font-black text-[#3f2b24]">Banco</dt>
            <dd>{banco}</dd>
          </div>
          <div>
            <dt className="font-black text-[#3f2b24]">Último movimiento registrado</dt>
            <dd>{textoMovimientoReferencia(referencia)}</dd>
          </div>
          <div>
            <dt className="font-black text-[#3f2b24]">Primer movimiento nuevo</dt>
            <dd>{plan.primeroNuevo ? textoMovimiento(plan.primeroNuevo) : "Ninguno"}</dd>
          </div>
          <div>
            <dt className="font-black text-[#3f2b24]">Último movimiento nuevo</dt>
            <dd>{plan.ultimoNuevo ? textoMovimiento(plan.ultimoNuevo) : "Ninguno"}</dd>
          </div>
          <div>
            <dt className="font-black text-[#3f2b24]">Movimientos nuevos</dt>
            <dd>
              {plan.normales} normales · {plan.tpv} TPV
              {plan.pendientes > 0 ? ` · ${plan.pendientes} pendientes de revisión` : ""}
            </dd>
          </div>
          <div>
            <dt className="font-black text-[#3f2b24]">Saldos</dt>
            <dd className={resultado === "CUADRA" ? "font-black text-[#2f6a39]" : "font-black text-[#7a3d2c]"}>
              {resultado}
            </dd>
          </div>
        </dl>
        {plan.pendientes > 0 ? (
          <div className="mt-3 text-sm leading-5 text-[#7a3d2c]">
            <p className="font-semibold">
              Hay {plan.pendientes} movimientos con clasificación dudosa. Siguen en la comprobación de saldos y quedan
              pendientes de revisión. No se ha inventado ningún importe.
            </p>
            <ul className="mt-2 space-y-1">
              {plan.nuevos
                .filter((movimiento) => movimiento.clase === "pendiente-clasificacion")
                .slice(0, 6)
                .map((movimiento) => (
                  <li key={movimiento.id}>
                    {formatearFechaIso(movimiento.fecha)} · {movimiento.concepto}
                  </li>
                ))}
            </ul>
            {plan.pendientes > 6 ? <p className="mt-1">Y {plan.pendientes - 6} más.</p> : null}
          </div>
        ) : null}
        {plan.mensaje && plan.estado !== "cuadra" ? (
          <p className="mt-3 text-sm font-semibold leading-5 text-[#7a3d2c]">{plan.mensaje}</p>
        ) : null}
        {plan.fallo ? (
          <dl className="mt-3 space-y-1 text-sm leading-5 text-[#5d433a]">
            <div>
              <dt className="inline font-black text-[#3f2b24]">Movimiento: </dt>
              <dd className="inline">
                {formatearFechaIso(plan.fallo.fecha)} · {plan.fallo.concepto}
              </dd>
            </div>
            <Fila etiqueta="Saldo anterior" valor={plan.fallo.saldoAnterior} />
            <Fila etiqueta="Importe aplicado" valor={plan.fallo.importe} />
            <Fila etiqueta="Saldo esperado" valor={plan.fallo.saldoEsperado} />
            <Fila etiqueta="Saldo encontrado" valor={plan.fallo.saldoEncontrado} />
            <Fila etiqueta="Diferencia" valor={plan.fallo.diferencia} />
          </dl>
        ) : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className={botonPrimario}
            disabled={!plan.puedeConfirmar}
            onClick={onConfirmar}
          >
            Confirmar importación
          </button>
          <button type="button" ref={cancelarRef} className={botonSecundario} onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div>
      <dt className="inline font-black text-[#3f2b24]">{etiqueta}: </dt>
      <dd className="inline">{formatearCentimos(aCentimos(valor))} €</dd>
    </div>
  );
}

function textoMovimiento(movimiento: MovimientoInterno) {
  return `${formatearFechaIso(movimiento.fecha)} · ${movimiento.conceptoOriginal || movimiento.concepto || "Sin concepto"} · ${formatearCentimos(aCentimos(movimiento.importe))} € · Saldo ${formatearCentimos(aCentimos(movimiento.saldo ?? 0))} €`;
}

function textoMovimientoReferencia(referencia: ReferenciaMovimiento) {
  return `${formatearFechaIso(referencia.fecha)} · ${referencia.concepto} · ${formatearCentimos(aCentimos(referencia.importe))} € · Saldo ${formatearCentimos(aCentimos(referencia.saldo))} €`;
}
