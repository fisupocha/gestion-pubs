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
  personal?: FacturaDetalleLinea[];
  impuestos?: FacturaDetalleLinea[];
  gastosBancarios?: FacturaDetalleLinea[];
  creditos?: FacturaDetalleLinea[];
  otros?: FacturaDetalleLinea[];
  cajas?: FacturaDetalleLinea[];
  fmtMoney: (value: number) => string;
  fmtNegativeMoney: (value: number) => string;
  fmtPercent: (value: number) => string;
  fmtNegativePercent: (value: number) => string;
  fmtDate: (value: string) => string;
};

const NOMBRES_MES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function claveLinea(linea: FacturaDetalleLinea) {
  return linea.imputacionId || `${linea.movimientoId}|${linea.fecha}|${linea.total}`;
}

function textoFecha(linea: FacturaDetalleLinea, fmtDate: (value: string) => string) {
  const fecha = fmtDate(linea.fecha);
  if (!linea.mesImputacion || linea.fecha.startsWith(linea.mesImputacion)) return fecha;
  const month = Number(linea.mesImputacion.slice(5, 7));
  const nombre = NOMBRES_MES[month - 1];
  if (!nombre) return fecha;
  return `${fecha} · imputada a ${nombre} ${linea.mesImputacion.slice(0, 4)}`;
}

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
      <span className="text-[#9b847c]">{prefijo}</span> {textoFecha(linea, fmtDate)} | {linea.contraparte} |{" "}
      {fmtMoney(linea.total)}
    </div>
  );
}

function SeccionLineas({
  titulo,
  lineas,
  fmtMoney,
  fmtDate,
}: {
  titulo: string;
  lineas: FacturaDetalleLinea[];
  fmtMoney: (value: number) => string;
  fmtDate: (value: string) => string;
}) {
  return (
    <div className="space-y-1 pl-2">
      <div className="px-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#8a7067]">
        {titulo}
      </div>
      <div className="space-y-0.5 border-l-2 border-[#e5d2cb] pl-3">
        {lineas.map((linea) => (
          <FilaFactura
            key={claveLinea(linea)}
            prefijo="└─"
            linea={linea}
            fmtMoney={fmtMoney}
            fmtDate={fmtDate}
          />
        ))}
      </div>
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
  personal = [],
  impuestos = [],
  gastosBancarios = [],
  creditos = [],
  otros = [],
  cajas = [],
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
                key={claveLinea(linea)}
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
        <SeccionLineas titulo="Alquileres" lineas={alquileres} fmtMoney={fmtMoney} fmtDate={fmtDate} />
      ) : null}

      {personal.length > 0 ? (
        <SeccionLineas titulo="Personal" lineas={personal} fmtMoney={fmtMoney} fmtDate={fmtDate} />
      ) : null}

      {impuestos.length > 0 ? (
        <SeccionLineas titulo="Impuestos" lineas={impuestos} fmtMoney={fmtMoney} fmtDate={fmtDate} />
      ) : null}

      {gastosBancarios.length > 0 ? (
        <SeccionLineas
          titulo="Gastos bancarios"
          lineas={gastosBancarios}
          fmtMoney={fmtMoney}
          fmtDate={fmtDate}
        />
      ) : null}

      {creditos.length > 0 ? (
        <SeccionLineas titulo="Creditos" lineas={creditos} fmtMoney={fmtMoney} fmtDate={fmtDate} />
      ) : null}

      {otros.length > 0 ? (
        <SeccionLineas titulo="Otros movimientos" lineas={otros} fmtMoney={fmtMoney} fmtDate={fmtDate} />
      ) : null}

      {cajas.length > 0 ? (
        <SeccionLineas titulo="Caja" lineas={cajas} fmtMoney={fmtMoney} fmtDate={fmtDate} />
      ) : null}

      {otrasEmitidas.length > 0 ? (
        <div className="space-y-1 pl-2">
          <div className="px-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#9b6d60]">
            Facturas emitidas
          </div>
          <div className="space-y-0.5 border-l-2 border-[#e8cfc8] pl-3">
            {otrasEmitidas.map((linea) => (
              <FilaFactura
                key={claveLinea(linea)}
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
                key={claveLinea(linea)}
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
                key={claveLinea(linea)}
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
