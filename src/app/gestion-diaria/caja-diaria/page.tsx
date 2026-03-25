"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type DiaCaja = {
  dia: number;
  tarantinoTaquilla: string;
  tarantinoTaran: string;
  tarantinoSmoking: string;
  cueTaquilla: string;
  cueBarraGrande: string;
  cueBarraPequena: string;
  hangar: string;
};

type CampoEditable =
  | "tarantinoTaquilla"
  | "tarantinoTaran"
  | "tarantinoSmoking"
  | "cueTaquilla"
  | "cueBarraGrande"
  | "cueBarraPequena"
  | "hangar";

type FilaBloque =
  | { id: string; label: string; tipo: "editable"; campo: CampoEditable }
  | { id: string; label: string; tipo: "calculada"; calcular: (dia: DiaCaja) => number };

type BloqueCaja = {
  id: string;
  titulo: string;
  filas: FilaBloque[];
  totalMes: (dia: DiaCaja[]) => number;
};

const ANCHO_REFERENCIA = 1536;
const ANCHO_TABLA_OBJETIVO = ANCHO_REFERENCIA - 46;
const ANCHO_COLUMNA_CAJA = 120;
const ANCHO_COLUMNA_TOTAL = 68;
const ANCHO_COLUMNA_DIA = Math.floor(
  (ANCHO_TABLA_OBJETIVO - ANCHO_COLUMNA_CAJA - ANCHO_COLUMNA_TOTAL) / 31
);

const bloquesCaja: BloqueCaja[] = [
  {
    id: "tarantino",
    titulo: "Tarantino",
    filas: [
      { id: "tt", label: "Taquilla", tipo: "editable", campo: "tarantinoTaquilla" },
      { id: "tr", label: "Taran", tipo: "editable", campo: "tarantinoTaran" },
      { id: "ts", label: "Smoking", tipo: "editable", campo: "tarantinoSmoking" },
      {
        id: "total_tarantino",
        label: "Total Tarantino",
        tipo: "calculada",
        calcular: (dia) =>
          parseImporte(dia.tarantinoTaquilla) +
          parseImporte(dia.tarantinoTaran) +
          parseImporte(dia.tarantinoSmoking),
      },
    ],
    totalMes: (dias) =>
      dias.reduce(
        (sum, dia) =>
          sum +
          parseImporte(dia.tarantinoTaquilla) +
          parseImporte(dia.tarantinoTaran) +
          parseImporte(dia.tarantinoSmoking),
        0
      ),
  },
  {
    id: "cue",
    titulo: "Cue",
    filas: [
      { id: "ct", label: "Taquilla", tipo: "editable", campo: "cueTaquilla" },
      { id: "cbg", label: "Barra grande", tipo: "editable", campo: "cueBarraGrande" },
      { id: "cbp", label: "Barra pequeña", tipo: "editable", campo: "cueBarraPequena" },
      {
        id: "total_cue",
        label: "Total Cue",
        tipo: "calculada",
        calcular: (dia) =>
          parseImporte(dia.cueTaquilla) +
          parseImporte(dia.cueBarraGrande) +
          parseImporte(dia.cueBarraPequena),
      },
    ],
    totalMes: (dias) =>
      dias.reduce(
        (sum, dia) =>
          sum +
          parseImporte(dia.cueTaquilla) +
          parseImporte(dia.cueBarraGrande) +
          parseImporte(dia.cueBarraPequena),
        0
      ),
  },
  {
    id: "hangar",
    titulo: "Hangar",
    filas: [
      { id: "hangar", label: "Hangar", tipo: "editable", campo: "hangar" },
      {
        id: "total_hangar",
        label: "Total Hangar",
        tipo: "calculada",
        calcular: (dia) => parseImporte(dia.hangar),
      },
    ],
    totalMes: (dias) => dias.reduce((sum, dia) => sum + parseImporte(dia.hangar), 0),
  },
];

function fmtImporte(value: number) {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizarImporte(value: string) {
  const limpio = value.replace(/[^\d,.-]/g, "").replace(/\./g, ",");
  const partes = limpio.split(",");

  if (partes.length <= 1) {
    return limpio;
  }

  return `${partes[0]},${partes.slice(1).join("").slice(0, 2)}`;
}

function parseImporte(value: string) {
  const limpio = value.replace(",", ".").trim();
  const numero = Number(limpio);
  return Number.isFinite(numero) ? numero : 0;
}

function etiquetaDia(dia: number) {
  const nombres = ["D", "L", "M", "X", "J", "V", "S"];
  const fecha = new Date(Date.UTC(2026, 0, dia));
  return `${nombres[fecha.getUTCDay()]} ${String(dia).padStart(2, "0")}`;
}

function crearDia(dia: number, valores?: Partial<DiaCaja>): DiaCaja {
  return {
    dia,
    tarantinoTaquilla: "",
    tarantinoTaran: "",
    tarantinoSmoking: "",
    cueTaquilla: "",
    cueBarraGrande: "",
    cueBarraPequena: "",
    hangar: "",
    ...valores,
  };
}

function crearMesDemo() {
  const dias = Array.from({ length: 31 }, (_, index) => crearDia(index + 1));

  dias[0] = crearDia(1, {
    tarantinoTaquilla: "820",
    tarantinoTaran: "1460",
    tarantinoSmoking: "315",
    cueTaquilla: "540",
    cueBarraGrande: "1220",
    cueBarraPequena: "420",
    hangar: "680",
  });

  dias[1] = crearDia(2, {
    tarantinoTaquilla: "760",
    tarantinoTaran: "1180",
    tarantinoSmoking: "280",
    cueTaquilla: "490",
    cueBarraGrande: "1060",
    cueBarraPequena: "360",
    hangar: "610",
  });

  dias[4] = crearDia(5, {
    tarantinoTaquilla: "910",
    tarantinoTaran: "1620",
    tarantinoSmoking: "340",
    cueTaquilla: "610",
    cueBarraGrande: "1480",
    cueBarraPequena: "470",
    hangar: "790",
  });

  dias[9] = crearDia(10, {
    tarantinoTaquilla: "880",
    tarantinoTaran: "1510",
    tarantinoSmoking: "325",
    cueTaquilla: "575",
    cueBarraGrande: "1330",
    cueBarraPequena: "445",
    hangar: "740",
  });

  dias[14] = crearDia(15, {
    tarantinoTaquilla: "640",
    tarantinoTaran: "980",
    tarantinoSmoking: "210",
    cueTaquilla: "430",
    cueBarraGrande: "860",
    cueBarraPequena: "290",
    hangar: "520",
  });

  dias[20] = crearDia(21, {
    tarantinoTaquilla: "970",
    tarantinoTaran: "1740",
    tarantinoSmoking: "360",
    cueTaquilla: "630",
    cueBarraGrande: "1560",
    cueBarraPequena: "490",
    hangar: "840",
  });

  dias[27] = crearDia(28, {
    tarantinoTaquilla: "1040",
    tarantinoTaran: "1890",
    tarantinoSmoking: "410",
    cueTaquilla: "720",
    cueBarraGrande: "1680",
    cueBarraPequena: "530",
    hangar: "910",
  });

  return dias;
}

export default function CajaDiariaPage() {
  const [dias, setDias] = useState<DiaCaja[]>(() => crearMesDemo());
  const [celdaActiva, setCeldaActiva] = useState<{
    dia: number;
    campo: CampoEditable;
  } | null>(null);

  function cambiarCelda(dia: number, campo: CampoEditable, valor: string) {
    setDias((actual) =>
      actual.map((fila) =>
        fila.dia === dia
          ? {
              ...fila,
              [campo]: normalizarImporte(valor),
            }
          : fila
      )
    );
  }

  function formatearEditable(value: string) {
    const limpio = value.trim();
    if (!limpio) {
      return "";
    }

    const numero = parseImporte(limpio);
    const tieneDecimales = limpio.includes(",");

    return numero.toLocaleString("es-ES", {
      minimumFractionDigits: tieneDecimales ? 2 : 0,
      maximumFractionDigits: 2,
    });
  }

  const totalMes = useMemo(() => {
    return dias.reduce(
      (sum, dia) =>
        sum +
        parseImporte(dia.tarantinoTaquilla) +
        parseImporte(dia.tarantinoTaran) +
        parseImporte(dia.tarantinoSmoking) +
        parseImporte(dia.cueTaquilla) +
        parseImporte(dia.cueBarraGrande) +
        parseImporte(dia.cueBarraPequena) +
        parseImporte(dia.hangar),
      0
    );
  }, [dias]);

  const totalesDia = useMemo(() => {
    return dias.map((dia) => ({
      dia: dia.dia,
      total:
        parseImporte(dia.tarantinoTaquilla) +
        parseImporte(dia.tarantinoTaran) +
        parseImporte(dia.tarantinoSmoking) +
        parseImporte(dia.cueTaquilla) +
        parseImporte(dia.cueBarraGrande) +
        parseImporte(dia.cueBarraPequena) +
        parseImporte(dia.hangar),
    }));
  }, [dias]);

  return (
    <section className="flex h-full min-h-0 flex-col gap-1.5 overflow-hidden p-1.5">
      <header className="rounded-[12px] border border-[#d8b4aa] bg-[linear-gradient(180deg,#f8efec_0%,#f2e6e2_100%)] px-2 py-1 shadow-[0_8px_16px_rgba(85,52,46,0.08)]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div>
            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
              Gestión diaria
            </div>
            <h1 className="mt-0.5 text-base font-black text-[#4b312b]">Caja diaria</h1>
          </div>

          <div className="text-center">
            <div className="text-[24px] font-black uppercase tracking-[0.14em] text-[#5a3b34]">
              Enero 2026
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/gestion-diaria/empleados"
              className="rounded-[10px] border border-[#cfafa8] bg-[linear-gradient(180deg,#fffdfc_0%,#eedfda_100%)] px-2.5 py-1 text-[10px] font-semibold text-[#492f29] shadow-[0_6px_12px_rgba(85,52,46,0.08)] transition duration-150 hover:-translate-y-[1px] hover:border-[#c28779]"
            >
              Volver
            </Link>

            <div className="rounded-[10px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fdf9f8_0%,#ede1dd_100%)] px-2 py-1 text-center shadow-[0_6px_12px_rgba(85,52,46,0.08)]">
              <div className="text-[9px] font-semibold text-[#7b635c]">
                Solo prueba ficticia
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-[12px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fefaf9_0%,#efe4df_100%)] px-2 py-1 shadow-[0_8px_16px_rgba(85,52,46,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a6458]">
            Tres módulos independientes · sin guardar en BBDD
          </div>
          <div className="text-[10px] font-semibold text-[#5a433d]">
            Total <span className="font-black">{fmtImporte(totalMes)}</span>
          </div>
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-y-auto rounded-[14px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fefaf9_0%,#efe4df_100%)] p-1 shadow-[0_14px_24px_rgba(85,52,46,0.10)]">
        <div className="grid gap-2">
          {bloquesCaja.map((bloque) => {
            const totalBloqueMes = bloque.totalMes(dias);

            return (
              <section
                key={bloque.id}
                className="rounded-[14px] border border-[#d7b6ad] bg-[linear-gradient(180deg,#fffaf8_0%,#f1e5e0_100%)] shadow-[0_8px_14px_rgba(85,52,46,0.08)]"
              >
                <div className="border-b border-[#dfc2ba] px-2 py-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[9px] font-black uppercase tracking-[0.1em] text-[#7f5b52]">
                      {bloque.titulo}
                    </div>
                    <div className="text-[9px] font-semibold text-[#6e564f]">
                      Total <span className="font-black">{fmtImporte(totalBloqueMes)}</span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table
                    className="border-collapse text-[9px] text-[#4b312b]"
                    style={{
                      width: `${ANCHO_TABLA_OBJETIVO}px`,
                      minWidth: `${ANCHO_TABLA_OBJETIVO}px`,
                      tableLayout: "fixed",
                    }}
                  >
                    <colgroup>
                      <col style={{ width: `${ANCHO_COLUMNA_CAJA}px` }} />
                      {dias.map((dia) => (
                        <col
                          key={`${bloque.id}-col-${dia.dia}`}
                          style={{ width: `${ANCHO_COLUMNA_DIA}px` }}
                        />
                      ))}
                      <col style={{ width: `${ANCHO_COLUMNA_TOTAL}px` }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#f4e7e2] text-[8px] font-black uppercase tracking-[0.04em] text-[#8a6458]">
                        <th className="sticky left-0 z-10 border-r border-[#d8b4aa] bg-[#f4e7e2] px-1.5 py-1.5 text-left">
                          Caja
                        </th>
                        {dias.map((dia) => (
                          <th
                            key={`${bloque.id}-${dia.dia}`}
                            className="border-r border-[#e4ccc4] px-0 py-1.5 text-center"
                          >
                            {etiquetaDia(dia.dia)}
                          </th>
                        ))}
                        <th className="px-1 py-1.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bloque.filas.map((fila) => {
                        const totalFila = dias.reduce((sum, dia) => {
                          if (fila.tipo === "editable") {
                            return sum + parseImporte(dia[fila.campo]);
                          }

                          return sum + fila.calcular(dia);
                        }, 0);

                        return (
                          <tr
                            key={`${bloque.id}-${fila.id}`}
                            className={
                              fila.tipo === "calculada"
                                ? "border-t border-[#d9b8ae] bg-[linear-gradient(180deg,#fffdfc_0%,#f1e4de_100%)]"
                                : "border-t border-[#ead5ce] bg-white/75"
                            }
                          >
                            <td className="sticky left-0 z-10 border-r border-[#d8b4aa] bg-[linear-gradient(180deg,#fbf6f4_0%,#f2e6e2_100%)] px-1.5 py-1.5 font-black leading-tight">
                              {fila.label}
                            </td>

                            {dias.map((dia) => {
                              const valor =
                                fila.tipo === "editable"
                                  ? dia[fila.campo]
                                  : fmtImporte(fila.calcular(dia));

                              return (
                                <td
                                  key={`${bloque.id}-${fila.id}-${dia.dia}`}
                                  className="border-r border-[#f0dfd9] p-[1px]"
                                >
                                  {fila.tipo === "editable" ? (
                                    <input
                                      value={
                                        celdaActiva?.dia === dia.dia &&
                                        celdaActiva?.campo === fila.campo
                                          ? valor
                                          : formatearEditable(valor)
                                      }
                                      onChange={(e) =>
                                        cambiarCelda(dia.dia, fila.campo, e.target.value)
                                      }
                                      onFocus={() =>
                                        setCeldaActiva({
                                          dia: dia.dia,
                                          campo: fila.campo,
                                        })
                                      }
                                      onBlur={() => setCeldaActiva(null)}
                                      className="w-full rounded-[6px] border border-[#d2aca3] bg-white px-0 py-1 text-center text-[9px] font-semibold outline-none"
                                      placeholder="0"
                                    />
                                  ) : (
                                    <div className="rounded-[6px] bg-white/60 px-0 py-1 text-center text-[9px] font-black">
                                      {valor === "0,00" ? "" : valor.replace(",00", "")}
                                    </div>
                                  )}
                                </td>
                              );
                            })}

                            <td className="px-1 py-1.5 text-right text-[8px] font-black">
                              {fmtImporte(totalFila)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}

          <section className="rounded-[14px] border border-[#d7b6ad] bg-[linear-gradient(180deg,#fffaf8_0%,#f1e5e0_100%)] shadow-[0_8px_14px_rgba(85,52,46,0.08)]">
            <div className="border-b border-[#dfc2ba] px-2 py-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[9px] font-black uppercase tracking-[0.1em] text-[#7f5b52]">
                  Total día
                </div>
                <div className="text-[9px] font-semibold text-[#6e564f]">
                  Total <span className="font-black">{fmtImporte(totalMes)}</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table
                className="border-collapse text-[9px] text-[#4b312b]"
                style={{
                  width: `${ANCHO_TABLA_OBJETIVO}px`,
                  minWidth: `${ANCHO_TABLA_OBJETIVO}px`,
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: `${ANCHO_COLUMNA_CAJA}px` }} />
                  {dias.map((dia) => (
                    <col
                      key={`total-dia-col-${dia.dia}`}
                      style={{ width: `${ANCHO_COLUMNA_DIA}px` }}
                    />
                  ))}
                  <col style={{ width: `${ANCHO_COLUMNA_TOTAL}px` }} />
                </colgroup>
                <thead>
                  <tr className="bg-[#f4e7e2] text-[8px] font-black uppercase tracking-[0.04em] text-[#8a6458]">
                    <th className="sticky left-0 z-10 border-r border-[#d8b4aa] bg-[#f4e7e2] px-1.5 py-1.5 text-left">
                      Resumen
                    </th>
                    {dias.map((dia) => (
                      <th
                        key={`total-dia-${dia.dia}`}
                        className="border-r border-[#e4ccc4] px-0 py-1.5 text-center"
                      >
                        {etiquetaDia(dia.dia)}
                      </th>
                    ))}
                    <th className="px-1 py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#d9b8ae] bg-[linear-gradient(180deg,#fffdfc_0%,#f1e4de_100%)]">
                    <td className="sticky left-0 z-10 border-r border-[#d8b4aa] bg-[linear-gradient(180deg,#fbf6f4_0%,#f2e6e2_100%)] px-1.5 py-1.5 font-black">
                      Total día
                    </td>
                    {totalesDia.map((item) => (
                      <td
                        key={`total-dia-valor-${item.dia}`}
                        className="border-r border-[#f0dfd9] p-[1px]"
                      >
                        <div className="rounded-[6px] bg-white/60 px-0 py-1 text-center text-[9px] font-black">
                          {item.total === 0 ? "" : fmtImporte(item.total).replace(",00", "")}
                        </div>
                      </td>
                    ))}
                    <td className="px-1 py-1.5 text-right text-[8px] font-black">
                      {fmtImporte(totalMes)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </section>
  );
}
