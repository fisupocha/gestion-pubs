"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "gestion-pubs-cuadrante-demo";

const locales = {
  Tarantino: {
    chip: "bg-[#f65f57] text-white",
    celda:
      "border-[#d34f47] bg-[linear-gradient(180deg,#ff736b_0%,#ef5149_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
  },
  Cue: {
    chip: "bg-[#14a94b] text-white",
    celda:
      "border-[#0d8a3b] bg-[linear-gradient(180deg,#1ac557_0%,#0ea143_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
  },
  Hangar: {
    chip: "bg-[#f5cf22] text-[#3d2a00]",
    celda:
      "border-[#d2ad0d] bg-[linear-gradient(180deg,#ffe760_0%,#f0cb15_100%)] text-[#3d2a00] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]",
  },
} as const;

type LocalNombre = keyof typeof locales;

type Tramo = {
  inicio: string;
  local: LocalNombre;
  importe: number;
};

type EmpleadoBase = {
  nombre: string;
  familia: string;
};

type EmpleadoDemo = EmpleadoBase & {
  tramos: Tramo[];
};

type ArrastreActivo =
  | {
      modo: "pintar";
      local: LocalNombre;
      importe: number;
    }
  | {
      modo: "borrar";
    };

type CeldaEditando = {
  empleadoNombre: string;
  hora: string;
  valor: string;
};

const horas = [
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
  "00:00",
  "00:30",
  "01:00",
  "01:30",
  "02:00",
  "02:30",
  "03:00",
  "03:30",
  "04:00",
  "04:30",
  "05:00",
  "05:30",
  "06:00",
  "06:30",
  "07:00",
  "07:30",
] as const;

function fmtImporte(value: number) {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
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

  if (!Number.isFinite(numero) || numero <= 0) {
    return null;
  }

  return Math.round(numero * 100) / 100;
}

function obtenerTramo(empleado: EmpleadoDemo, hora: string) {
  return empleado.tramos.find((tramo) => tramo.inicio === hora) ?? null;
}

function esHoraCompleta(hora: string) {
  return hora.endsWith(":00");
}

function etiquetaCabecera(hora: string) {
  return esHoraCompleta(hora) ? hora.slice(0, 2) : "";
}

function compararPorNombre(a: EmpleadoBase, b: EmpleadoBase) {
  return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
}

function crearEmpleadosVacios(empleadosBase: EmpleadoBase[]) {
  return [...empleadosBase]
    .sort(compararPorNombre)
    .map((empleado) => ({
      ...empleado,
      tramos: [],
    }));
}

function ordenarTramos(tramos: Tramo[]) {
  return [...tramos].sort(
    (a, b) =>
      horas.indexOf(a.inicio as (typeof horas)[number]) -
      horas.indexOf(b.inicio as (typeof horas)[number])
  );
}

function reconstruirDesdeLocal(
  empleadosBase: EmpleadoBase[],
  guardado: unknown
): EmpleadoDemo[] {
  const vacios = crearEmpleadosVacios(empleadosBase);

  if (!Array.isArray(guardado)) {
    return vacios;
  }

  const porNombre = new Map(
    (guardado as Array<Partial<EmpleadoDemo>>)
      .filter((item) => typeof item?.nombre === "string")
      .map((item) => [item.nombre as string, item])
  );

  const mezclados = vacios.map((empleado) => {
    const guardadoEmpleado = porNombre.get(empleado.nombre);
    const tramosGuardados = Array.isArray(guardadoEmpleado?.tramos)
      ? guardadoEmpleado.tramos
          .filter(
            (tramo): tramo is Tramo =>
              typeof tramo?.inicio === "string" &&
              tramo.local !== undefined &&
              Object.hasOwn(locales, tramo.local) &&
              typeof tramo.importe === "number" &&
              tramo.importe > 0
          )
          .map((tramo) => ({
            inicio: tramo.inicio,
            local: tramo.local,
            importe: tramo.importe,
          }))
      : [];

    return {
      ...empleado,
      tramos: ordenarTramos(tramosGuardados),
    };
  });

  const conDatos = mezclados
    .filter((empleado) => empleado.tramos.length > 0)
    .sort(compararPorNombre);
  const sinDatos = mezclados
    .filter((empleado) => empleado.tramos.length === 0)
    .sort(compararPorNombre);

  return [...conDatos, ...sinDatos];
}

export function PantallaCuadranteDemo({
  empleadosBase,
}: {
  empleadosBase: EmpleadoBase[];
}) {
  const [empleados, setEmpleados] = useState<EmpleadoDemo[]>(() => crearEmpleadosVacios(empleadosBase));
  const [localActivo, setLocalActivo] = useState<LocalNombre>("Tarantino");
  const [importeActivo, setImporteActivo] = useState("0");
  const [modo, setModo] = useState<"pintar" | "borrar">("pintar");
  const [arrastreActivo, setArrastreActivo] = useState<ArrastreActivo | null>(null);
  const [celdaEditando, setCeldaEditando] = useState<CeldaEditando | null>(null);
  const [persistenciaLista, setPersistenciaLista] = useState(false);

  useEffect(() => {
    function detenerArrastre() {
      setArrastreActivo(null);
    }

    window.addEventListener("mouseup", detenerArrastre);
    return () => {
      window.removeEventListener("mouseup", detenerArrastre);
    };
  }, []);

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(STORAGE_KEY);
      if (!guardado) {
        setEmpleados(crearEmpleadosVacios(empleadosBase));
        setPersistenciaLista(true);
        return;
      }

      setEmpleados(reconstruirDesdeLocal(empleadosBase, JSON.parse(guardado)));
    } catch {
      setEmpleados(crearEmpleadosVacios(empleadosBase));
    } finally {
      setPersistenciaLista(true);
    }
  }, [empleadosBase]);

  useEffect(() => {
    if (!persistenciaLista) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(empleados));
  }, [empleados, persistenciaLista]);

  const totalDia = useMemo(() => {
    return empleados.reduce(
      (sum, empleado) => sum + empleado.tramos.reduce((subsum, tramo) => subsum + tramo.importe, 0),
      0
    );
  }, [empleados]);

  function actualizarTramo(
    empleadoNombre: string,
    hora: string,
    nuevoTramo: { local: LocalNombre; importe: number } | null
  ) {
    setEmpleados((actual) =>
      actual.map((empleado) => {
        if (empleado.nombre !== empleadoNombre) {
          return empleado;
        }

        const resto = empleado.tramos.filter((tramo) => tramo.inicio !== hora);

        if (!nuevoTramo) {
          return {
            ...empleado,
            tramos: resto,
          };
        }

        return {
          ...empleado,
          tramos: ordenarTramos([
            ...resto,
            {
              inicio: hora,
              local: nuevoTramo.local,
              importe: nuevoTramo.importe,
            },
          ]),
        };
      })
    );
  }

  function aplicarArrastre(
    empleadoNombre: string,
    hora: string,
    accion: ArrastreActivo | null = arrastreActivo
  ) {
    if (!accion) {
      return;
    }

    if (accion.modo === "borrar") {
      actualizarTramo(empleadoNombre, hora, null);
      return;
    }

    actualizarTramo(empleadoNombre, hora, {
      local: accion.local,
      importe: accion.importe,
    });
  }

  function guardarCeldaManual(empleadoNombre: string, hora: string, valor: string) {
    const importe = parseImporte(valor);
    setCeldaEditando(null);

    if (importe === null) {
      actualizarTramo(empleadoNombre, hora, null);
      return;
    }

    actualizarTramo(empleadoNombre, hora, {
      local: localActivo,
      importe,
    });
  }

  function reiniciarDemo() {
    const confirmado = window.confirm(
      "Se va a borrar el cuadrante guardado en esta demo local. ¿Quieres continuar?"
    );

    if (!confirmado) {
      return;
    }

    const vacios = crearEmpleadosVacios(empleadosBase);
    setEmpleados(vacios);
    setImporteActivo("0");
    setCeldaEditando(null);
    setArrastreActivo(null);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(vacios));
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-2 overflow-hidden p-2">
      <header className="rounded-[18px] border border-[#d8b4aa] bg-[linear-gradient(180deg,#f8efec_0%,#f2e6e2_100%)] px-4 py-2.5 shadow-[0_12px_26px_rgba(85,52,46,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
              Demo operativa
            </div>
            <h1 className="mt-1 text-2xl font-black text-[#4b312b]">Cuadrante diario</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/gestion-diaria/empleados"
              className="rounded-[14px] border border-[#cfafa8] bg-[linear-gradient(180deg,#fffdfc_0%,#eedfda_100%)] px-3 py-2 text-sm font-semibold text-[#492f29] shadow-[0_10px_18px_rgba(85,52,46,0.08)] transition duration-150 hover:-translate-y-[1px] hover:border-[#c28779]"
            >
              Volver a empleados
            </Link>

            <div className="rounded-[14px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fdf9f8_0%,#ede1dd_100%)] px-3 py-2 text-center shadow-[0_10px_18px_rgba(85,52,46,0.08)]">
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                10/01/2026
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-[#7b635c]">08:00 a 08:00</div>
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-[18px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fefaf9_0%,#efe4df_100%)] px-3 py-2 shadow-[0_12px_24px_rgba(85,52,46,0.08)]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
              Local activo
            </div>
            {(Object.keys(locales) as LocalNombre[]).map((local) => (
              <button
                key={local}
                type="button"
                onClick={() => setLocalActivo(local)}
                className={
                  localActivo === local && modo === "pintar"
                    ? `rounded-full border border-[#8a6458] px-3 py-1 text-[11px] font-black shadow-sm ${locales[local].chip}`
                    : "rounded-full border border-[#d3b8b0] bg-white/80 px-3 py-1 text-[11px] font-black text-[#5a433d]"
                }
              >
                {local}
              </button>
            ))}
          </div>

          <div className="text-center">
            <div className="text-[24px] font-black uppercase tracking-[0.14em] text-[#5a3b34]">
              Enero 2026
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
              Importe
            </div>
            <input
              value={importeActivo}
              onChange={(e) => setImporteActivo(normalizarImporte(e.target.value))}
              className="w-[72px] rounded-[10px] border border-[#d2aca3] bg-white px-2 py-1 text-center text-sm font-black text-[#4b312b] outline-none"
              placeholder="0"
            />
            <button
              type="button"
              onClick={() => setModo("pintar")}
              className={
                modo === "pintar"
                  ? "rounded-[10px] border border-[#8a6458] bg-[#4b312b] px-3 py-1.5 text-[11px] font-black text-white"
                  : "rounded-[10px] border border-[#d3b8b0] bg-white/80 px-3 py-1.5 text-[11px] font-black text-[#5a433d]"
              }
            >
              Pintar
            </button>
            <button
              type="button"
              onClick={() => setModo("borrar")}
              className={
                modo === "borrar"
                  ? "rounded-[10px] border border-[#8a6458] bg-[#4b312b] px-3 py-1.5 text-[11px] font-black text-white"
                  : "rounded-[10px] border border-[#d3b8b0] bg-white/80 px-3 py-1.5 text-[11px] font-black text-[#5a433d]"
              }
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={reiniciarDemo}
              className="rounded-[10px] border border-[#d3b8b0] bg-white/80 px-3 py-1.5 text-[11px] font-black text-[#5a433d]"
            >
              Reiniciar
            </button>
          </div>
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-hidden rounded-[18px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fefaf9_0%,#efe4df_100%)] shadow-[0_18px_34px_rgba(85,52,46,0.10)]">
        <div className="border-b border-[#dfc2ba] px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
              Ejemplo visual del dia
            </div>
            <div className="text-[11px] font-semibold text-[#7b635c]">
              Total dia {fmtImporte(totalDia)} · Solo prueba local
            </div>
          </div>
        </div>

        <div className="h-full overflow-y-auto overflow-x-hidden">
          <table className="w-full table-fixed border-collapse">
            <thead>
              <tr className="sticky top-0 z-20 bg-[#f4e7e2] text-[9px] font-black uppercase tracking-[0.08em] text-[#8a6458]">
                <th className="sticky left-0 z-30 w-[142px] border-r border-[#d8b4aa] bg-[#f4e7e2] px-2 py-2 text-left">
                  Empleado
                </th>
                {horas.map((hora) => (
                  <th
                    key={hora}
                    className="w-[24px] border-r border-[#e4ccc4] px-0.5 py-2 text-center"
                    title={hora}
                  >
                    {etiquetaCabecera(hora)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {empleados.map((empleado) => (
                <tr key={empleado.nombre} className="border-t border-[#ead5ce] bg-white/75">
                  <td className="sticky left-0 z-10 border-r border-[#d8b4aa] bg-[linear-gradient(180deg,#fbf6f4_0%,#f2e6e2_100%)] px-2 py-1.5 align-top">
                    <div className="text-[12px] font-black leading-tight text-[#4b312b]">
                      {empleado.nombre}
                    </div>
                    <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#8a6458]">
                      {empleado.familia}
                    </div>
                  </td>

                  {horas.map((hora) => {
                    const tramo = obtenerTramo(empleado, hora);
                    const estaEditando =
                      celdaEditando?.empleadoNombre === empleado.nombre &&
                      celdaEditando.hora === hora;

                    return (
                      <td
                        key={`${empleado.nombre}-${hora}`}
                        className="border-r border-[#f0dfd9] p-[2px]"
                        onMouseDown={(e) => {
                          e.preventDefault();

                          if (modo === "borrar") {
                            setCeldaEditando(null);
                            actualizarTramo(empleado.nombre, hora, null);
                            setArrastreActivo(null);
                            return;
                          }

                          const importeSeleccionado = parseImporte(importeActivo);

                          if (importeSeleccionado !== null) {
                            setCeldaEditando(null);
                            const accion: ArrastreActivo = {
                              modo: "pintar",
                              local: localActivo,
                              importe: importeSeleccionado,
                            };
                            aplicarArrastre(empleado.nombre, hora, accion);
                            setArrastreActivo(accion);
                            return;
                          }

                          if (tramo) {
                            setCeldaEditando(null);
                            setArrastreActivo({
                              modo: "pintar",
                              local: tramo.local,
                              importe: tramo.importe,
                            });
                            return;
                          }

                          setArrastreActivo(null);
                          setCeldaEditando({
                            empleadoNombre: empleado.nombre,
                            hora,
                            valor: "",
                          });
                        }}
                        onMouseEnter={() => {
                          if (arrastreActivo) {
                            aplicarArrastre(empleado.nombre, hora);
                          }
                        }}
                        onMouseUp={() => setArrastreActivo(null)}
                      >
                        {estaEditando ? (
                          <input
                            autoFocus
                            value={celdaEditando.valor}
                            onChange={(e) =>
                              setCeldaEditando((actual) =>
                                actual &&
                                actual.empleadoNombre === empleado.nombre &&
                                actual.hora === hora
                                  ? {
                                      ...actual,
                                      valor: normalizarImporte(e.target.value),
                                    }
                                  : actual
                              )
                            }
                            onBlur={(e) =>
                              guardarCeldaManual(empleado.nombre, hora, e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                guardarCeldaManual(
                                  empleado.nombre,
                                  hora,
                                  (e.target as HTMLInputElement).value
                                );
                              }

                              if (e.key === "Escape") {
                                setCeldaEditando(null);
                              }
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="h-8 w-full rounded-[8px] border border-[#8a6458] bg-white px-1 text-center text-[11px] font-black text-[#4b312b] outline-none"
                            placeholder="0"
                          />
                        ) : tramo ? (
                          <div
                            className={`flex h-8 items-center justify-center rounded-[8px] border text-[11px] font-black ${locales[tramo.local].celda}`}
                            title={`${tramo.local} · ${hora} · ${fmtImporte(tramo.importe)}`}
                          >
                            {fmtImporte(tramo.importe)}
                          </div>
                        ) : (
                          <div className="flex h-8 items-center justify-center rounded-[8px] border border-dashed border-[#ead9d3] bg-white/55 text-[8px] font-semibold tracking-[0.02em] text-[#aa938b]">
                            {hora}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
