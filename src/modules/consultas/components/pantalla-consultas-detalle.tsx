"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ClasificacionMapa } from "@/lib/clasificacion";
import type { MaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";
import {
  calcularConsulta,
  FAMILIA_CAJA,
  obtenerFamiliasPorTipoConsulta,
  obtenerFamiliaIngresosEmitidasVisible,
  obtenerTiposDisponibles,
  OPERATIVA_CONSULTA_VACIA,
  TIPO_INGRESOS,
} from "@/modules/consultas/utils/motor-consultas";
import { cargarOperativaConsultas } from "@/modules/consultas/utils/cargar-operativa-consultas";
import type { ConsultaState } from "@/modules/consultas/utils/estado-consultas";
import { consultaStateToQueryString } from "@/modules/consultas/utils/estado-consultas";
import {
  listarRepartosRiverocioManuales,
  type RepartoRiverocioManual,
} from "@/modules/consultas/utils/reparto-riverocio";

type PantallaConsultasDetalleProps = {
  clasificacion: ClasificacionMapa;
  maestros: MaestrosFormulario;
  initialState: ConsultaState;
};

type FamiliaDetalle = {
  familia: string;
  bruto: number;
  emitidas: number;
  neto: number;
  porcentajeBruto: number;
  porcentajeEmitidas: number;
  porcentajeNeto: number;
  emitidasDetalle: {
    movimientoId: string;
    fecha: string;
    local: string;
    importe: number;
    porcentaje: number;
  }[];
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

function fmtNegativeMoney(value: number) {
  return `-${fmtMoney(value)}`;
}

function fmtNegativePercent(value: number) {
  return `-${fmtPercent(value)}`;
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
  const [repartosRiverocio, setRepartosRiverocio] = useState<RepartoRiverocioManual[]>([]);
  const reportRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        const [data, repartos] = await Promise.all([
          cargarOperativaConsultas(clasificacion),
          listarRepartosRiverocioManuales(),
        ]);
        if (!cancelado) {
          setOperativa(data);
          setRepartosRiverocio(repartos);
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
        repartosRiverocio,
      }),
    [clasificacion, maestros, operativa, initialState, repartosRiverocio]
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
    const familiaIngresosEmitidasVisible = obtenerFamiliaIngresosEmitidasVisible(clasificacion);
    const porcentajeSobreCaja = (importe: number) =>
      cajaBase > 0 ? round2((importe / cajaBase) * 100) : 0;

    const familiaMap = new Map<
      string,
      {
        bruto: number;
        emitidas: number;
        neto: number;
        emitidasDetalle: FamiliaDetalle["emitidasDetalle"];
      }
    >();
    resultado.datos.detalleClasificacion.forEach((row) => {
      const key = `${row.tipo}|||${row.familia}`;
      const actual = familiaMap.get(key) ?? {
        bruto: 0,
        emitidas: 0,
        neto: 0,
        emitidasDetalle: [],
      };
      familiaMap.set(key, {
        bruto: round2(actual.bruto + row.gastoBruto),
        emitidas: round2(actual.emitidas + row.emitidas),
        neto: round2(actual.neto + row.gastoNeto),
        emitidasDetalle: [...actual.emitidasDetalle, ...row.emitidasDetalle],
      });
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
        familiasBase = [...new Set([...familiasBase, FAMILIA_CAJA])];
        if (familiaIngresosEmitidasVisible) {
          familiasBase = [...new Set([...familiasBase, familiaIngresosEmitidasVisible])];
        }
      }

      const familias = [...new Set(familiasBase)]
        .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }))
        .map((familia) => {
          const resumen = familiaMap.get(`${tipo}|||${familia}`) ?? {
            bruto: 0,
            emitidas: 0,
            neto: 0,
            emitidasDetalle: [],
          };

          if (tipo === TIPO_INGRESOS && familia === FAMILIA_CAJA) {
            resumen.bruto = resultado.datos.cajaUsada;
            resumen.neto = resultado.datos.cajaUsada;
          }

          return {
            familia,
            bruto: resumen.bruto,
            emitidas: resumen.emitidas,
            neto: resumen.neto,
            porcentajeBruto: porcentajeSobreCaja(resumen.bruto),
            porcentajeEmitidas: porcentajeSobreCaja(resumen.emitidas),
            porcentajeNeto: porcentajeSobreCaja(resumen.neto),
            emitidasDetalle: [...resumen.emitidasDetalle].sort((a, b) => {
              if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
              return b.movimientoId.localeCompare(a.movimientoId);
            }),
          };
        });

      const total = round2(familias.reduce((acc, item) => acc + item.neto, 0));

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
      ["Tipo/Familia", "Bruto", "Emitidas", "Neto", "% Neto"],
      ...detalleTipos.flatMap((bloque) => [
        [bloque.tipo, "", "", bloque.total, bloque.porcentaje],
        ...bloque.familias.flatMap((familia) => [
          [
            `    ${familia.familia}`,
            familia.bruto,
            -familia.emitidas,
            familia.neto,
            familia.porcentajeNeto,
          ],
          ...familia.emitidasDetalle.map((emitida) => [
            `      Emitida ${fmtDate(emitida.fecha)} ${emitida.local}`,
            "",
            -emitida.importe,
            "",
            -emitida.porcentaje,
          ]),
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

  const abrirVentanaImpresion = async (title: string) => {
    const reportNode = reportRef.current;
    if (!reportNode) return;

    const popup = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
    if (!popup) {
      window.alert("No se pudo abrir la ventana de impresion. Revisa si el navegador bloqueo el popup.");
      return;
    }

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
      .print-report {
        width: 100%;
        max-width: 210mm;
        margin: 0 auto;
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
        .print-report {
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }
      }
    </style>
  </head>
  <body>
    ${reportNode.outerHTML}
    <script>
      const imprimir = async () => {
        try {
          if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
          }
        } catch {}
        setTimeout(() => {
          window.focus();
          window.print();
        }, 200);
      };
      window.addEventListener('load', () => {
        void imprimir();
      });
      window.addEventListener('afterprint', () => {
        window.close();
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
            onClick={() => void abrirVentanaImpresion("consulta-detalle")}
            className="rounded-2xl border border-[#d0b1a4] bg-[linear-gradient(180deg,#fbf3ef_0%,#efe1da_100%)] px-4 py-2 text-sm font-bold text-[#6a4b43]"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={() => void abrirVentanaImpresion("consulta-detalle-pdf")}
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
                      <div key={`${bloque.tipo}-${familia.familia}`} className="px-5 py-4 text-sm text-[#4b332d]">
                        <div className="grid grid-cols-[minmax(0,1fr)_160px_100px] items-center gap-3">
                          <div className="pl-6 font-medium text-[#60453d]">{familia.familia}</div>
                          <div className="text-right font-black text-[#432c26]">
                            {fmtMoney(familia.neto)}
                          </div>
                          <div className="text-right font-black text-[#8a6458]">
                            {fmtPercent(familia.porcentajeNeto)}
                          </div>
                        </div>

                        {familia.emitidasDetalle.length > 0 ? (
                          <div className="mt-2 space-y-1 pl-10">
                            <div className="grid grid-cols-[minmax(0,1fr)_150px_100px] gap-3 px-2 py-1 text-[10px]">
                              <div className="font-semibold text-[#8a7067]">
                                Total fras
                              </div>
                              <div className="text-right font-semibold text-[#6b544d]">
                                {fmtMoney(familia.bruto)}
                              </div>
                              <div className="text-right font-semibold text-[#8a7067]">
                                {fmtPercent(familia.porcentajeBruto)}
                              </div>
                            </div>

                            <div className="grid grid-cols-[minmax(0,1fr)_150px_100px] gap-3 px-2 py-1 text-[10px]">
                              <div className="font-semibold text-[#9b6d60]">
                                Total abonos
                              </div>
                              <div className="text-right font-semibold text-[#8b4334]">
                                {fmtNegativeMoney(familia.emitidas)}
                              </div>
                              <div className="text-right font-semibold text-[#9b6d60]">
                                {fmtNegativePercent(familia.porcentajeEmitidas)}
                              </div>
                            </div>

                            <div className="space-y-1 pl-6">
                              {familia.emitidasDetalle.map((emitida) => (
                                <div
                                  key={emitida.movimientoId}
                                  className="grid grid-cols-[minmax(0,1fr)_150px_100px] gap-3 px-2 py-1 text-[9px]"
                                >
                                  <div className="font-medium text-[#7d645c]">
                                    {fmtDate(emitida.fecha)} - {emitida.local}
                                  </div>
                                  <div className="text-right font-semibold text-[#8b4334]">
                                    {fmtNegativeMoney(emitida.importe)}
                                  </div>
                                  <div className="text-right font-semibold text-[#9b6d60]">
                                    {fmtNegativePercent(emitida.porcentaje)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
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
