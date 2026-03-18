"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ClasificacionMapa } from "@/lib/clasificacion";
import type { MaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";
import {
  calcularConsulta,
  OPERATIVA_CONSULTA_VACIA,
} from "@/modules/consultas/utils/motor-consultas";
import { cargarOperativaConsultas } from "@/modules/consultas/utils/cargar-operativa-consultas";
import type { ConsultaState } from "@/modules/consultas/utils/estado-consultas";
import { consultaStateToQueryString } from "@/modules/consultas/utils/estado-consultas";

type PantallaConsultasDetalleProps = {
  clasificacion: ClasificacionMapa;
  maestros: MaestrosFormulario;
  initialState: ConsultaState;
};

const panel =
  "rounded-[24px] border border-[#d2b7aa] bg-[linear-gradient(180deg,rgba(250,244,241,0.98)_0%,rgba(238,226,221,0.98)_100%)] p-4 shadow-[0_16px_28px_rgba(85,52,46,0.08)]";

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

function csvEscape(value: string | number) {
  const text = String(value);
  if (/[;"\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

export function PantallaConsultasDetalle({
  clasificacion,
  maestros,
  initialState,
}: PantallaConsultasDetalleProps) {
  const [operativa, setOperativa] = useState(OPERATIVA_CONSULTA_VACIA);

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

  const filtrosTexto = [
    resultado.textoLocales,
    initialState.desde ? `Desde ${initialState.desde}` : null,
    initialState.hasta ? `Hasta ${initialState.hasta}` : null,
    initialState.modoIva === "con" ? "Con IVA" : "Sin IVA",
  ]
    .filter(Boolean)
    .join(" · ");

  const exportarCsv = () => {
    const lineas = [
      ["Resumen", "Valor"],
      ["Locales", resultado.textoLocales],
      ["Modo", resultado.datos.aplicarReparto ? "Locales repercutidos" : "Total grupo"],
      ["Caja usada", resultado.datos.cajaUsada],
      ["Emitidas caja", resultado.datos.emitidasCajaIgnoradas],
      ["Emitidas compensan", resultado.datos.emitidasCompensacionTotal],
      ["Gasto bruto", resultado.datos.bruto],
      ["Gasto neto", resultado.datos.gastoNeto],
      ["Beneficio", resultado.datos.beneficio],
      [""],
      ["Por local"],
      ["Local", "Caja", "Directo", "Emitidas", "Empresa", "Neto", "%"],
      ...resultado.datos.porLocal.map((row) => [
        row.local,
        row.caja,
        row.directo,
        row.emitidas,
        row.empresa,
        row.neto,
        row.porcentaje,
      ]),
      [""],
      ["Por tipo/fam/sub"],
      ["Tipo", "Familia", "Subfamilia", "Gasto bruto", "Emitidas", "Gasto neto", "IVA"],
      ...resultado.datos.detalleClasificacion.map((row) => [
        row.tipo,
        row.familia,
        row.subfamilia,
        row.gastoBruto,
        row.emitidas,
        row.gastoNeto,
        row.iva,
      ]),
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

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 p-3">
      <section className={`${panel} flex items-start justify-between gap-4`}>
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6458]">
            Detalle
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#402a24]">
            Consulta completa
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#7b635b]">{filtrosTexto}</p>
        </div>
        <div className="grid shrink-0 gap-2 xl:grid-cols-3">
          <Link
            href={volverHref}
            className="rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-4 py-2 text-center text-sm font-bold text-[#765650]"
          >
            Volver
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-2xl border border-[#d0b1a4] bg-[linear-gradient(180deg,#fbf3ef_0%,#efe1da_100%)] px-4 py-2 text-sm font-bold text-[#6a4b43]"
          >
            Imprimir
          </button>
          <button
            type="button"
            onClick={exportarCsv}
            className="rounded-2xl border border-[#b9796d] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-4 py-2 text-sm font-black text-[#5a3025]"
          >
            Exportar CSV
          </button>
        </div>
      </section>

      <div className="grid gap-3 xl:grid-cols-5">
        <section className={`${panel} p-3`}>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">Caja</div>
          <div className="mt-1 text-2xl font-black text-[#432c26]">{fmtMoney(resultado.datos.cajaUsada)}</div>
        </section>
        <section className={`${panel} p-3`}>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">Emitidas caja</div>
          <div className="mt-1 text-2xl font-black text-[#432c26]">{fmtMoney(resultado.datos.emitidasCajaIgnoradas)}</div>
        </section>
        <section className={`${panel} p-3`}>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">Compensan</div>
          <div className="mt-1 text-2xl font-black text-[#432c26]">{fmtMoney(resultado.datos.emitidasCompensacionTotal)}</div>
        </section>
        <section className={`${panel} p-3`}>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">Gasto neto</div>
          <div className="mt-1 text-2xl font-black text-[#432c26]">{fmtMoney(resultado.datos.gastoNeto)}</div>
        </section>
        <section className="rounded-[24px] border border-[#b9796d] bg-[linear-gradient(180deg,#f2d8cf_0%,#e8c0b3_100%)] p-3 shadow-[0_12px_20px_rgba(85,52,46,0.12)]">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#884b3d]">% sobre caja</div>
          <div className="mt-1 text-2xl font-black text-[#6b3022]">{fmtPercent(resultado.datos.porcentaje)}</div>
        </section>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1fr_1.05fr]">
        <section className={`${panel} flex min-h-0 flex-col gap-3`}>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6458]">Por local</div>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-[20px] border border-[#d8c0b9] bg-[rgba(255,250,248,0.72)]">
            <div className="divide-y divide-[#ead7d1]">
              {resultado.datos.porLocal.map((row) => (
                <div
                  key={row.local}
                  className="grid gap-2 px-4 py-3 text-sm text-[#4b332d] xl:grid-cols-[1fr_0.85fr_0.9fr_0.9fr_0.9fr_0.9fr_0.7fr]"
                >
                  <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7f77]">Local</div><div className="mt-1 font-black">{row.local}</div></div>
                  <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7f77]">Caja</div><div className="mt-1">{fmtMoney(row.caja)}</div></div>
                  <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7f77]">Directo</div><div className="mt-1">{fmtMoney(row.directo)}</div></div>
                  <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7f77]">Emitidas</div><div className="mt-1">{fmtMoney(row.emitidas)}</div></div>
                  <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7f77]">Empresa</div><div className="mt-1">{fmtMoney(row.empresa)}</div></div>
                  <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7f77]">Neto</div><div className="mt-1 font-black">{fmtMoney(row.neto)}</div></div>
                  <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7f77]">% / Caja</div><div className="mt-1 font-black">{fmtPercent(row.porcentaje)}</div></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${panel} flex min-h-0 flex-col gap-3`}>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a6458]">Por tipo/fam/sub</div>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-[20px] border border-[#d8c0b9] bg-[rgba(255,250,248,0.72)]">
            <div className="divide-y divide-[#ead7d1]">
              {resultado.datos.detalleClasificacion.map((row) => (
                <div
                  key={row.key}
                  className="grid gap-2 px-4 py-3 text-sm text-[#4b332d] xl:grid-cols-[0.9fr_1fr_0.9fr_0.8fr_0.8fr_0.8fr_0.65fr]"
                >
                  <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7f77]">Tipo</div><div className="mt-1 font-black">{row.tipo}</div></div>
                  <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7f77]">Familia</div><div className="mt-1">{row.familia}</div></div>
                  <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7f77]">Sub</div><div className="mt-1">{row.subfamilia || "-"}</div></div>
                  <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7f77]">Bruto</div><div className="mt-1">{fmtMoney(row.gastoBruto)}</div></div>
                  <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7f77]">Emitidas</div><div className="mt-1">{fmtMoney(row.emitidas)}</div></div>
                  <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7f77]">Neto</div><div className="mt-1 font-black">{fmtMoney(row.gastoNeto)}</div></div>
                  <div><div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b7f77]">IVA</div><div className="mt-1">{fmtMoney(row.iva)}</div></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
