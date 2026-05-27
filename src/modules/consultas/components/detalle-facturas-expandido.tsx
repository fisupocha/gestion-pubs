"use client";

import type { FacturaDetalleLinea } from "@/modules/consultas/utils/motor-consultas";

type DetalleFacturasExpandidoProps = {
  bruto: number;
  emitidas: number;
  porcentajeBruto: number;
  porcentajeEmitidas: number;
  recibidas: FacturaDetalleLinea[];
  alquileres: FacturaDetalleLinea[];
  emitidasDetalle: FacturaDetalleLinea[];
  notasVarias: FacturaDetalleLinea[];
  fmtMoney: (value: number) => string;
  fmtNegativeMoney: (value: number) => string;
  fmtPercent: (value: number) => string;
  fmtNegativePercent: (value: number) => string;
  fmtDate: (value: string) => string;
};

function FilaFactura({
  prefijo,
  linea,
  fmtMoney,
  fmtDate,
}: {
  prefijo: string;
  linea: FacturaDetalleLinea;
  fmtMoney: (value: number) => string;
  fmtDate: (value: string) => string;
}) {
  return (
    <div className="px-2 py-1 text-[9px] font-medium leading-relaxed text-[#7d645c]">
      <span className="text-[#9b847c]">{prefijo}</span> {fmtDate(linea.fecha)} | {linea.contraparte} |{" "}
      {fmtMoney(linea.total)}
    </div>
  );
}

export function DetalleFacturasExpandido({
  bruto,
  emitidas,
  porcentajeBruto,
  porcentajeEmitidas,
  recibidas,
  alquileres,
  emitidasDetalle,
  notasVarias,
  fmtMoney,
  fmtNegativeMoney,
  fmtPercent,
  fmtNegativePercent,
  fmtDate,
}: DetalleFacturasExpandidoProps) {
  const compensatorias = emitidasDetalle.filter((item) => item.esCompensatoria);
  const otrasEmitidas = emitidasDetalle.filter((item) => !item.esCompensatoria);
  const muestraTotales = bruto > 0 || emitidas > 0;

  return (
    <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pl-10 pr-1">
      {muestraTotales ? (
        <div className="space-y-1">
          {bruto > 0 ? (
            <div className="grid grid-cols-[minmax(0,1fr)_150px_100px] gap-3 px-2 py-1 text-[10px]">
              <div className="font-semibold text-[#8a7067]">Total fras</div>
              <div className="text-right font-semibold text-[#6b544d]">{fmtMoney(bruto)}</div>
              <div className="text-right font-semibold text-[#8a7067]">{fmtPercent(porcentajeBruto)}</div>
            </div>
          ) : null}
          {emitidas > 0 ? (
            <div className="grid grid-cols-[minmax(0,1fr)_150px_100px] gap-3 px-2 py-1 text-[10px]">
              <div className="font-semibold text-[#9b6d60]">Total abonos</div>
              <div className="text-right font-semibold text-[#8b4334]">{fmtNegativeMoney(emitidas)}</div>
              <div className="text-right font-semibold text-[#9b6d60]">
                {fmtNegativePercent(porcentajeEmitidas)}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {recibidas.length > 0 ? (
        <div className="space-y-1 pl-2">
          <div className="px-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#8a7067]">
            Facturas recibidas
          </div>
          <div className="space-y-0.5 border-l-2 border-[#e5d2cb] pl-3">
            {recibidas.map((linea) => (
              <FilaFactura
                key={linea.movimientoId}
                prefijo="└─"
                linea={linea}
                fmtMoney={fmtMoney}
                fmtDate={fmtDate}
              />
            ))}
          </div>
        </div>
      ) : null}

      {alquileres.length > 0 ? (
        <div className="space-y-1 pl-2">
          <div className="px-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#8a7067]">
            Alquileres
          </div>
          <div className="space-y-0.5 border-l-2 border-[#e5d2cb] pl-3">
            {alquileres.map((linea) => (
              <FilaFactura
                key={linea.movimientoId}
                prefijo="└─"
                linea={linea}
                fmtMoney={fmtMoney}
                fmtDate={fmtDate}
              />
            ))}
          </div>
        </div>
      ) : null}

      {otrasEmitidas.length > 0 ? (
        <div className="space-y-1 pl-2">
          <div className="px-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#9b6d60]">
            Facturas emitidas
          </div>
          <div className="space-y-0.5 border-l-2 border-[#e8cfc8] pl-3">
            {otrasEmitidas.map((linea) => (
              <FilaFactura
                key={linea.movimientoId}
                prefijo="└─"
                linea={linea}
                fmtMoney={fmtMoney}
                fmtDate={fmtDate}
              />
            ))}
          </div>
        </div>
      ) : null}

      {compensatorias.length > 0 ? (
        <div className="space-y-1 pl-2">
          <div className="px-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#9b6d60]">
            Facturas emitidas compensatorias
          </div>
          <div className="space-y-0.5 border-l-2 border-[#e8cfc8] pl-3">
            {compensatorias.map((linea) => (
              <FilaFactura
                key={linea.movimientoId}
                prefijo="└─"
                linea={linea}
                fmtMoney={fmtMoney}
                fmtDate={fmtDate}
              />
            ))}
          </div>
        </div>
      ) : null}

      {notasVarias.length > 0 ? (
        <div className="space-y-1 pl-2">
          <div className="px-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#8a7067]">
            Notas varias
          </div>
          <div className="space-y-0.5 border-l-2 border-[#e5d2cb] pl-3">
            {notasVarias.map((linea) => (
              <FilaFactura
                key={linea.movimientoId}
                prefijo="└─"
                linea={linea}
                fmtMoney={fmtMoney}
                fmtDate={fmtDate}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
