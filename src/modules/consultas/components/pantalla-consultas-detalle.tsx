"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClasificacionMapa } from "@/lib/clasificacion";
import type { MaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";
import {
  calcularConsulta,
  OPERATIVA_CONSULTA_VACIA,
} from "@/modules/consultas/utils/motor-consultas";
import { DetalleFacturasExpandido } from "@/modules/consultas/components/detalle-facturas-expandido";
import { InformeConsultaImpresion } from "@/modules/consultas/components/informe-consulta-impresion";
import {
  construirDetalleMensual,
  familiaTieneMovimientos,
  formatearFechaInforme,
  type FamiliaMensual,
} from "@/modules/consultas/utils/detalle-mensual";
import {
  descargarCsvInforme,
  descargarExcelInforme,
  descargarPdfInforme,
} from "@/modules/consultas/utils/exportar-informe-consulta";
import { construirInformeConsulta } from "@/modules/consultas/utils/informe-consulta";
import { cargarOperativaConsultas } from "@/modules/consultas/utils/cargar-operativa-consultas";
import type { ConsultaState } from "@/modules/consultas/utils/estado-consultas";
import { consultaStateToQueryString } from "@/modules/consultas/utils/estado-consultas";
import {
  listarRepartosRiverocioManuales,
  type RepartoRiverocioManual,
} from "@/modules/consultas/utils/reparto-riverocio";
import {
  listarRepartosEspeciales,
  type RepartoEspecial,
} from "@/modules/consultas/utils/reparto-especial";

type PantallaConsultasDetalleProps = {
  clasificacion: ClasificacionMapa;
  maestros: MaestrosFormulario;
  initialState: ConsultaState;
};

function claveMes(tipo: string, mes: string) {
  return `mes|||${tipo}|||${mes}`;
}

function claveFamilia(tipo: string, mes: string, familia: string) {
  return `fam|||${tipo}|||${mes}|||${familia}`;
}

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
  return formatearFechaInforme(value);
}

function FilaFamiliaMensual({
  tipo,
  mes,
  familia,
  abierta,
  onAlternar,
}: {
  tipo: string;
  mes: string;
  familia: FamiliaMensual;
  abierta: boolean;
  onAlternar: (clave: string) => void;
}) {
  const clave = claveFamilia(tipo, mes, familia.familia);
  const puedeAmpliar = familiaTieneMovimientos(familia);

  return (
    <div className="px-5 py-4 text-sm text-[#4b332d]">
      <div className="grid grid-cols-[minmax(0,1fr)_160px_100px_auto] items-center gap-3">
        <div className="pl-10 font-medium text-[#60453d]">{familia.familia}</div>
        <div className="text-right font-black text-[#432c26]">{fmtMoney(familia.neto)}</div>
        <div className="text-right font-black text-[#8a6458]">{fmtPercent(familia.porcentajeNeto)}</div>
        {puedeAmpliar ? (
          <button
            type="button"
            onClick={() => onAlternar(clave)}
            className="rounded-xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-1 text-[10px] font-bold text-[#765650]"
          >
            {abierta ? "Ocultar" : "Ampliar"}
          </button>
        ) : (
          <div className="w-[72px]" />
        )}
      </div>

      {abierta && puedeAmpliar ? (
        <DetalleFacturasExpandido
          bruto={familia.bruto}
          emitidas={familia.emitidas}
          porcentajeBruto={familia.porcentajeBruto}
          porcentajeEmitidas={familia.porcentajeEmitidas}
          recibidas={familia.recibidasDetalle}
          alquileres={familia.alquileresDetalle}
          emitidasDetalle={familia.emitidasDetalle}
          notasVarias={familia.notasVariasDetalle}
          personal={familia.personalDetalle}
          impuestos={familia.impuestosDetalle}
          gastosBancarios={familia.gastosBancariosDetalle}
          creditos={familia.creditosDetalle}
          otros={familia.otrosDetalle}
          cajas={familia.cajasDetalle}
          fmtMoney={fmtMoney}
          fmtNegativeMoney={fmtNegativeMoney}
          fmtPercent={fmtPercent}
          fmtNegativePercent={fmtNegativePercent}
          fmtDate={fmtDate}
        />
      ) : null}
    </div>
  );
}

export function PantallaConsultasDetalle({
  clasificacion,
  maestros,
  initialState,
}: PantallaConsultasDetalleProps) {
  const router = useRouter();
  const [operativa, setOperativa] = useState(OPERATIVA_CONSULTA_VACIA);
  const [repartosRiverocio, setRepartosRiverocio] = useState<RepartoRiverocioManual[]>([]);
  const [repartosEspeciales, setRepartosEspeciales] = useState<RepartoEspecial[]>([]);
  const [avisoRepartosEspeciales, setAvisoRepartosEspeciales] = useState<string | null>(null);
  const [mesesAbiertos, setMesesAbiertos] = useState<Set<string>>(() => new Set());
  const [familiasAbiertas, setFamiliasAbiertas] = useState<Set<string>>(() => new Set());
  const reportRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelado = false;

    const cargar = async () => {
      try {
        const [data, repartos, especiales] = await Promise.all([
          cargarOperativaConsultas(clasificacion),
          listarRepartosRiverocioManuales(),
          listarRepartosEspeciales(),
        ]);
        if (!cancelado) {
          setOperativa(data);
          setRepartosRiverocio(repartos);
          setRepartosEspeciales(especiales.repartos);
          setAvisoRepartosEspeciales(especiales.disponible ? null : especiales.mensaje);
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
        repartosEspeciales,
      }),
    [clasificacion, maestros, operativa, initialState, repartosEspeciales, repartosRiverocio]
  );

  const consultasHref = useMemo(() => {
    const query = consultaStateToQueryString(initialState);
    return query ? `/consultas?${query}` : "/consultas";
  }, [initialState]);

  const cerrarDetalle = useCallback(() => {
    window.close();
    window.setTimeout(() => {
      router.push(consultasHref);
    }, 200);
  }, [consultasHref, router]);

  const localesCabecera = useMemo(() => {
    const disponibles = [...new Set(resultado.localesDisponibles)].filter(Boolean);
    const seleccionados = initialState.localesSeleccionados;
    if (seleccionados.length === 0 || seleccionados.length === disponibles.length) {
      return "Todos";
    }
    return seleccionados.join(" + ");
  }, [initialState.localesSeleccionados, resultado.localesDisponibles]);

  const detalleMensual = useMemo(
    () =>
      construirDetalleMensual({
        clasificacion,
        detalleClasificacion: resultado.datos.detalleClasificacion,
        cajasDetalle: resultado.datos.cajasDetalle,
        cajaUsada: resultado.datos.cajaUsada,
        tiposSeleccionados: initialState.tiposSeleccionados,
        familiasSeleccionadas: initialState.familiasSeleccionadas,
      }),
    [
      clasificacion,
      initialState.familiasSeleccionadas,
      initialState.tiposSeleccionados,
      resultado,
    ]
  );

  const detalleTipos = detalleMensual.tipos;

  const informe = useMemo(
    () =>
      construirInformeConsulta({
        state: initialState,
        locales: localesCabecera,
        caja: resultado.datos.cajaUsada,
        gasto: resultado.datos.gastoNeto,
        porcentaje: resultado.datos.porcentaje,
        avisosCalculo: resultado.datos.avisosReparto,
        avisosDetalle: [
          ...detalleMensual.avisos,
          ...detalleMensual.tipos.flatMap((tipo) => tipo.avisos),
        ],
        avisoPersistencia: avisoRepartosEspeciales,
        detalle: detalleMensual,
        detalleClasificacion: resultado.datos.detalleClasificacion,
        cajasDetalle: resultado.datos.cajasDetalle,
      }),
    [avisoRepartosEspeciales, detalleMensual, initialState, localesCabecera, resultado]
  );

  const clavesMes = useMemo(
    () => detalleTipos.flatMap((bloque) => bloque.meses.map((mes) => claveMes(bloque.tipo, mes.clave))),
    [detalleTipos]
  );

  const clavesFamilia = useMemo(
    () =>
      detalleTipos.flatMap((bloque) =>
        bloque.meses.flatMap((mes) =>
          mes.familias
            .filter(familiaTieneMovimientos)
            .map((familia) => claveFamilia(bloque.tipo, mes.clave, familia.familia))
        )
      ),
    [detalleTipos]
  );

  const todasExpandidas =
    clavesFamilia.length > 0 &&
    clavesMes.every((clave) => mesesAbiertos.has(clave)) &&
    clavesFamilia.every((clave) => familiasAbiertas.has(clave));

  const alternarTodas = () => {
    if (todasExpandidas) {
      setMesesAbiertos(new Set());
      setFamiliasAbiertas(new Set());
      return;
    }
    setMesesAbiertos(new Set(clavesMes));
    setFamiliasAbiertas(new Set(clavesFamilia));
  };

  const alternarMes = (clave: string) => {
    setMesesAbiertos((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  };

  const alternarFamilia = (clave: string) => {
    setFamiliasAbiertas((prev) => {
      const next = new Set(prev);
      if (next.has(clave)) next.delete(clave);
      else next.add(clave);
      return next;
    });
  };

  const exportarCsv = () => {
    descargarCsvInforme(informe, detalleMensual, {
      mesAbierto: (tipo, mes) => mesesAbiertos.has(claveMes(tipo, mes)),
      familiaAbierta: (tipo, mes, familia) => familiasAbiertas.has(claveFamilia(tipo, mes, familia)),
    });
  };

  const exportarExcel = async () => {
    try {
      await descargarExcelInforme(informe, detalleMensual, {
        mesAbierto: (tipo, mes) => mesesAbiertos.has(claveMes(tipo, mes)),
        familiaAbierta: (tipo, mes, familia) => familiasAbiertas.has(claveFamilia(tipo, mes, familia)),
      });
    } catch (error) {
      console.error("No se pudo crear el Excel de la consulta", error);
      window.alert("No se pudo crear el Excel.");
    }
  };

  const exportarPdf = async () => {
    try {
      await descargarPdfInforme(informe, detalleMensual, {
        mesAbierto: (tipo, mes) => mesesAbiertos.has(claveMes(tipo, mes)),
        familiaAbierta: (tipo, mes, familia) => familiasAbiertas.has(claveFamilia(tipo, mes, familia)),
      });
    } catch (error) {
      console.error("No se pudo crear el PDF de la consulta", error);
      window.alert("No se pudo crear el PDF.");
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 p-3">
      <InformeConsultaImpresion
        informe={informe}
        detalle={detalleMensual}
        vista={{
          mesAbierto: (tipo, mes) => mesesAbiertos.has(claveMes(tipo, mes)),
          familiaAbierta: (tipo, mes, familia) => familiasAbiertas.has(claveFamilia(tipo, mes, familia)),
        }}
      />
      <div className="consulta-no-imprimir flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={cerrarDetalle}
          className="rounded-2xl border border-[#d7c0b9] bg-[linear-gradient(180deg,#fffaf8_0%,#f4ebe7_100%)] px-4 py-2 text-sm font-bold text-[#6f534b]"
        >
          Cerrar
        </button>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-2xl border border-[#d0b1a4] bg-[linear-gradient(180deg,#fbf3ef_0%,#efe1da_100%)] px-4 py-2 text-sm font-bold text-[#6a4b43]"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={() => void exportarPdf()}
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
          <button
            type="button"
            onClick={() => void exportarExcel()}
            className="rounded-2xl border border-[#b9796d] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-4 py-2 text-sm font-black text-[#5a3025]"
          >
            Exportar Excel
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6458]">
                Tipos, meses y familias
              </div>
              {clavesFamilia.length > 0 ? (
                <button
                  type="button"
                  onClick={alternarTodas}
                  className="rounded-2xl border border-[#d0b1a4] bg-[linear-gradient(180deg,#fbf3ef_0%,#efe1da_100%)] px-4 py-1.5 text-xs font-bold text-[#6a4b43]"
                >
                  {todasExpandidas ? "Ocultar todo" : "Ampliar todo"}
                </button>
              ) : null}
            </div>

            {avisoRepartosEspeciales || detalleMensual.avisos.length > 0 || resultado.datos.avisosReparto.length > 0 ? (
              <div className="mt-3 space-y-1">
                {avisoRepartosEspeciales ? (
                  <p className="text-xs font-semibold text-[#8a5144]">{avisoRepartosEspeciales}</p>
                ) : null}
                {resultado.datos.avisosReparto.map((aviso) => (
                  <p key={aviso} className="text-xs font-semibold text-[#8a5144]">
                    {aviso}
                  </p>
                ))}
                {detalleMensual.avisos.map((aviso) => (
                  <p key={aviso} className="text-xs font-semibold text-[#8a5144]">
                    {aviso}
                  </p>
                ))}
              </div>
            ) : null}

            <div className="mt-4 overflow-hidden rounded-[22px] border border-[#e2cfc8] bg-[rgba(255,251,248,0.9)]">
              {detalleTipos.map((bloque, index) => (
                <section
                  key={bloque.tipo}
                  className={index === 0 ? "" : "border-t border-[#ead9d3]"}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_160px_100px_auto] items-center gap-3 bg-[rgba(243,231,224,0.9)] px-5 py-4">
                    <div className="text-base font-black uppercase tracking-[0.16em] text-[#6e4a40]">
                      {bloque.tipo}
                    </div>
                    <div className="text-right text-base font-black text-[#432c26]">
                      {fmtMoney(bloque.total)}
                    </div>
                    <div className="text-right text-sm font-black text-[#8a5144]">
                      {fmtPercent(bloque.porcentaje)}
                    </div>
                    <div className="w-[72px]" />
                  </div>

                  {bloque.avisos.map((aviso) => (
                    <p
                      key={aviso}
                      className="border-t border-[#ead9d3] px-5 py-2 text-xs font-semibold text-[#8a5144]"
                    >
                      {aviso}
                    </p>
                  ))}

                  <div className="divide-y divide-[#f0e3de]">
                    {bloque.meses.map((mes) => {
                      const claveDelMes = claveMes(bloque.tipo, mes.clave);
                      const mesAbierto = mesesAbiertos.has(claveDelMes);

                      return (
                        <div key={claveDelMes}>
                          <div className="grid grid-cols-[minmax(0,1fr)_160px_100px_auto] items-center gap-3 bg-[rgba(252,246,243,0.96)] px-5 py-3">
                            <div className="pl-4 text-[13px] font-black uppercase tracking-[0.14em] text-[#7a564c]">
                              {mes.etiqueta}
                            </div>
                            <div className="text-right text-sm font-black text-[#432c26]">
                              {fmtMoney(mes.total)}
                            </div>
                            <div className="text-right text-sm font-black text-[#8a6458]">
                              {fmtPercent(mes.porcentaje)}
                            </div>
                            <button
                              type="button"
                              onClick={() => alternarMes(claveDelMes)}
                              className="rounded-xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-1 text-[10px] font-bold text-[#765650]"
                            >
                              {mesAbierto ? "Ocultar" : "Ampliar"}
                            </button>
                          </div>

                          {mesAbierto
                            ? mes.familias.map((familia) => (
                                <FilaFamiliaMensual
                                  key={claveFamilia(bloque.tipo, mes.clave, familia.familia)}
                                  tipo={bloque.tipo}
                                  mes={mes.clave}
                                  familia={familia}
                                  abierta={familiasAbiertas.has(
                                    claveFamilia(bloque.tipo, mes.clave, familia.familia)
                                  )}
                                  onAlternar={alternarFamilia}
                                />
                              ))
                            : null}
                        </div>
                      );
                    })}
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
      </div>
    </section>
  );
}
