"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ClasificacionMapa } from "@/lib/clasificacion";
import type { MaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";
import {
  calcularConsulta,
  FAMILIA_CAJA,
  FAMILIA_FACTURAS_EMITIDAS,
  obtenerFamiliasPorTipoConsulta,
  obtenerTiposDisponibles,
  OPERATIVA_CONSULTA_VACIA,
  TIPO_INGRESOS,
} from "@/modules/consultas/utils/motor-consultas";
import { cargarOperativaConsultas } from "@/modules/consultas/utils/cargar-operativa-consultas";
import type { ConsultaState } from "@/modules/consultas/utils/estado-consultas";
import { consultaStateToQueryString } from "@/modules/consultas/utils/estado-consultas";

type PantallaConsultasDetalleProps = {
  clasificacion: ClasificacionMapa;
  maestros: MaestrosFormulario;
  initialState: ConsultaState;
};

type FamiliaDetalle = {
  familia: string;
  importe: number;
  porcentaje: number;
};

type TipoDetalle = {
  tipo: string;
  total: number;
  porcentaje: number;
  familias: FamiliaDetalle[];
};

function fmtMoney(value: number) {
  return `${value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} EUR`;
}

function fmtPercent(value: number) {
  return `${value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function fmtDate(value: string) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function csvEscape(value: string | number) {
  const text = String(value);
  if (/[;"\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function PantallaConsultasDetalle({
  clasificacion,
  maestros,
  initialState,
}: PantallaConsultasDetalleProps) {
  const [operativa, setOperativa] = useState(OPERATIVA_CONSULTA_VACIA);
  const reportRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        const data = await cargarOperativaConsultas(clasificacion);
        if (!cancelado) {
          setOperativa(data);
        }
      } catch (error) {
        console.error("No se pudo cargar la operativa para el detalle de consultas", error);
      }
    };

    void cargar();

    return () => {
      cancelado = true;
    };
  }, [clasificacion]);

  const resultado = useMemo(
    () =>
      calcularConsulta({
        clasificacion,
        maestros,
        operativa,
        state: initialState,
      }),
    [clasificacion, maestros, operativa, initialState]
  );

  const volverHref = useMemo(() => {
    const query = consultaStateToQueryString(initialState);
    return query ? `/consultas?${query}` : "/consultas";
  }, [initialState]);

  const localesCabecera = useMemo(() => {
    const disponibles = [...new Set(resultado.localesDisponibles)].filter(Boolean);
    const seleccionados = initialState.localesSeleccionados;
    if (seleccionados.length === 0 || seleccionados.length === disponibles.length) {
      return "Todos";
    }
    return seleccionados.join(" + ");
  }, [initialState.localesSeleccionados, resultado.localesDisponibles]);

  const detalleTipos = useMemo(() => {
    const cajaBase = resultado.datos.cajaUsada;
    const porcentajeSobreCaja = (importe: number) =>
      cajaBase > 0 ? round2((importe / cajaBase) * 100) : 0;

    const familiaMap = new Map<string, number>();
    resultado.datos.detalleClasificacion.forEach((row) => {
      const key = `${row.tipo}|||${row.familia}`;
      familiaMap.set(key, round2((familiaMap.get(key) ?? 0) + row.gastoNeto));
    });

    const tiposBase =
      initialState.tiposSeleccionados.length > 0
        ? initialState.tiposSeleccionados
        : obtenerTiposDisponibles(clasificacion);

    const tiposSeleccionados = [...new Set(tiposBase)].sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );

    return tiposSeleccionados.map((tipo) => {
      let familiasBase =
        initialState.familiasSeleccionadas.length > 0
          ? initialState.familiasSeleccionadas.filter((familia) =>
              obtenerFamiliasPorTipoConsulta(clasificacion, tipo).includes(familia)
            )
          : obtenerFamiliasPorTipoConsulta(clasificacion, tipo);

      if (tipo === TIPO_INGRESOS) {
        familiasBase = [
          ...new Set([...familiasBase, FAMILIA_CAJA, FAMILIA_FACTURAS_EMITIDAS]),
        ];
      }

      const familias = [...new Set(familiasBase)]
        .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
        .map((familia) => {
          let importe = familiaMap.get(`${tipo}|||${familia}`) ?? 0;

          if (tipo === TIPO_INGRESOS && familia === FAMILIA_CAJA) {
            importe = resultado.datos.cajaUsada;
          }
          if (tipo === TIPO_INGRESOS && familia === FAMILIA_FACTURAS_EMITIDAS) {
            importe = round2(
              resultado.datos.emitidasCompensacionTotal + resultado.datos.emitidasCajaIgnoradas
            );
          }

          return {
            familia,
            importe,
            porcentaje: porcentajeSobreCaja(importe),
          };
        });

      const total = round2(familias.reduce((acc, item) => acc + item.importe, 0));

      return {
        tipo,
        total,
        porcentaje: porcentajeSobreCaja(total),
        familias,
      } satisfies TipoDetalle;
    });
  }, [
    clasificacion,
    initialState.familiasSeleccionadas,
    initialState.tiposSeleccionados,
    resultado,
  ]);

  const exportarCsv = () => {
    const lineas = [
      ["Consulta detalle"],
      ["Locales", localesCabecera],
      ["Desde", fmtDate(initialState.desde)],
      ["Hasta", fmtDate(initialState.hasta)],
      ["Caja", resultado.datos.cajaUsada],
      [""],
      ["Tipo/Familia", "Importe", "%"],
      ...detalleTipos.flatMap((bloque) => [
        [bloque.tipo, bloque.total, bloque.porcentaje],
        ...bloque.familias.map((familia) => [
          `    ${familia.familia}`,
          familia.importe,
          familia.porcentaje,
        ]),
      ]),
      [""],
      ["Caja total", resultado.datos.cajaUsada],
      ["Gasto total", resultado.datos.gastoNeto],
      ["%", resultado.datos.porcentaje],
    ];

    const csv = `\uFEFF${lineas
      .map((row) => row.map((item) => csvEscape(item ?? "")).join(";"))
      .join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "consulta-detalle.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const abrirVentanaImpresion = (title: string) => {
    const reportNode = reportRef.current;
    if (!reportNode) return;

    const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
    if (!popup) return;

    const estilosHead = Array.from(
      document.head.querySelectorAll('style, link[rel="stylesheet"]')
    )
      .map((node) => node.outerHTML)
      .join("\n");

    popup.document.open();
    popup.document.write(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    ${estilosHead}
    <style>
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
      }
      body {
        padding: 16px;
      }
      @page {
        size: A4;
        margin: 12mm;
      }
      @media print {
        html, body {
          background: #ffffff !important;
        }
        body {
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    ${reportNode.outerHTML}
    <script>
      window.addEventListener('load', () => {
        setTimeout(() => {
          window.focus();
          window.print();
        }, 150);
      });
    </script>
  </body>
</html>`);
    popup.document.close();
  };

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 p-3">
      <div className="print-hide flex items-center justify-between gap-3">
        <Link
          href={volverHref}
          className="rounded-2xl border border-[#d7c0b9] bg-[linear-gradient(180deg,#fffaf8_0%,#f4ebe7_100%)] px-4 py-2 text-sm font-bold text-[#6f534b]"
        >
          Volver
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-2xl border border-[#d0b1a4] bg-[linear-gradient(180deg,#fbf3ef_0%,#efe1da_100%)] px-4 py-2 text-sm font-bold text-[#6a4b43]"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={() => abrirVentanaImpresion("consulta-detalle-pdf")}
            className="rounded-2xl border border-[#b9796d] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-4 py-2 text-sm font-black text-[#5a3025]"
          >
            Exportar PDF
          </button>
          <button
            type="button"
            onClick={exportarCsv}
            className="rounded-2xl border border-[#b9796d] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-4 py-2 text-sm font-black text-[#5a3025]"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <article
          ref={reportRef}
          className="print-report mx-auto w-full max-w-[210mm] rounded-[28px] border border-[#d9c2ba] bg-[linear-gradient(180deg,#fffdfa_0%,#f7efeb_100%)] p-8 text-[#402a24] shadow-[0_20px_50px_rgba(85,52,46,0.10)]"
        >
          <header className="border-b border-[#e5d2cb] pb-6">
            <div className="text-center text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6458]">
              Consulta detalle
            </div>
            <h1 className="mt-2 text-center text-3xl font-black tracking-tight text-[#3d2721]">
              Informe de consulta
            </h1>

            <div className="mt-5 grid gap-3 text-sm xl:grid-cols-4">
              <div className="rounded-2xl border border-[#e7d5ce] bg-[rgba(255,250,247,0.86)] px-4 py-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                  Locales
                </div>
                <div className="mt-1 text-base font-bold text-[#462f28]">{localesCabecera}</div>
              </div>
              <div className="rounded-2xl border border-[#e7d5ce] bg-[rgba(255,250,247,0.86)] px-4 py-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                  Desde
                </div>
                <div className="mt-1 text-base font-bold text-[#462f28]">
                  {fmtDate(initialState.desde)}
                </div>
              </div>
              <div className="rounded-2xl border border-[#e7d5ce] bg-[rgba(255,250,247,0.86)] px-4 py-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                  Hasta
                </div>
                <div className="mt-1 text-base font-bold text-[#462f28]">
                  {fmtDate(initialState.hasta)}
                </div>
              </div>
              <div className="rounded-2xl border border-[#e7d5ce] bg-[rgba(255,250,247,0.86)] px-4 py-3 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                  Caja
                </div>
                <div className="mt-1 text-base font-bold text-[#462f28]">
                  {fmtMoney(resultado.datos.cajaUsada)}
                </div>
              </div>
            </div>
          </header>

          <section className="mt-8">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6458]">
              Tipos y familias
            </div>

            <div className="mt-4 overflow-hidden rounded-[22px] border border-[#e2cfc8] bg-[rgba(255,251,248,0.9)]">
              {detalleTipos.map((bloque, index) => (
                <section
                  key={bloque.tipo}
                  className={index === 0 ? "" : "border-t border-[#ead9d3]"}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_160px_100px] items-center gap-3 bg-[rgba(243,231,224,0.9)] px-5 py-4">
                    <div className="text-base font-black uppercase tracking-[0.16em] text-[#6e4a40]">
                      {bloque.tipo}
                    </div>
                    <div className="text-right text-base font-black text-[#432c26]">
                      {fmtMoney(bloque.total)}
                    </div>
                    <div className="text-right text-sm font-black text-[#8a5144]">
                      {fmtPercent(bloque.porcentaje)}
                    </div>
                  </div>

                  <div className="divide-y divide-[#f0e3de]">
                    {bloque.familias.map((familia) => (
                      <div
                        key={`${bloque.tipo}-${familia.familia}`}
                        className="grid grid-cols-[minmax(0,1fr)_160px_100px] items-center gap-3 px-5 py-3 text-sm text-[#4b332d]"
                      >
                        <div className="pl-6 font-medium text-[#60453d]">{familia.familia}</div>
                        <div className="text-right font-semibold">{fmtMoney(familia.importe)}</div>
                        <div className="text-right font-semibold text-[#8a6458]">
                          {fmtPercent(familia.porcentaje)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </section>

          <footer className="mt-8 border-t border-[#e5d2cb] pt-6">
            <div className="grid gap-3 xl:grid-cols-3">
              <div className="rounded-2xl border border-[#e2cfc8] bg-[rgba(255,250,247,0.88)] px-5 py-4 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                  Caja total
                </div>
                <div className="mt-2 text-2xl font-black text-[#432c26]">
                  {fmtMoney(resultado.datos.cajaUsada)}
                </div>
              </div>
              <div className="rounded-2xl border border-[#e2cfc8] bg-[rgba(255,250,247,0.88)] px-5 py-4 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                  Gasto total
                </div>
                <div className="mt-2 text-2xl font-black text-[#432c26]">
                  {fmtMoney(resultado.datos.gastoNeto)}
                </div>
              </div>
              <div className="rounded-2xl border border-[#b9796d] bg-[linear-gradient(180deg,#f2d8cf_0%,#e8c0b3_100%)] px-5 py-4 text-center">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#884b3d]">
                  %
                </div>
                <div className="mt-2 text-2xl font-black text-[#6b3022]">
                  {fmtPercent(resultado.datos.porcentaje)}
                </div>
              </div>
            </div>
          </footer>
        </article>
      </div>
    </section>
  );
}
