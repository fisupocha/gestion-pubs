"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  guardarCajaDiariaPersistida,
  listarCajaDiariaPersistida,
  type RegistroCajaDiaria,
} from "@/modules/caja/data/persistencia-caja-diaria";
import { guardarCajaMensualDesdeGestionDiaria } from "@/modules/operativa/utils/persistencia-operativa";

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

const HOY = new Date();
const FECHA_MINIMA_ANO = 2026;
const FECHA_MINIMA_MES = 4;
const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const ANOS = Array.from({ length: 5 }, (_, index) => String(FECHA_MINIMA_ANO + index));

// Referencia real de oficina: viewport 1920x1080.
// Restamos paddings y bordes del layout y dejamos un margen para la barra vertical.
const VIEWPORT_OFICINA = 1920;
const APP_FRAME_PADDING = 16;
const APP_MAIN_BORDER = 2;
const PAGE_PADDING = 12;
const CONTENEDOR_PADDING = 8;
const BLOQUE_BORDER = 2;
const RESERVA_SCROLL_VERTICAL = 16;
const ANCHO_COLUMNA_CAJA = 122;
const ANCHO_COLUMNA_TOTAL = 74;
const NUM_DIAS = 31;
const ANCHO_TABLA_OBJETIVO =
  VIEWPORT_OFICINA -
  APP_FRAME_PADDING -
  APP_MAIN_BORDER -
  PAGE_PADDING -
  CONTENEDOR_PADDING -
  BLOQUE_BORDER -
  RESERVA_SCROLL_VERTICAL;
const ANCHO_DIAS_DISPONIBLE = ANCHO_TABLA_OBJETIVO - ANCHO_COLUMNA_CAJA - ANCHO_COLUMNA_TOTAL;
const ANCHO_BASE_DIA = Math.floor(ANCHO_DIAS_DISPONIBLE / NUM_DIAS);
const RESTO_DIAS = ANCHO_DIAS_DISPONIBLE - ANCHO_BASE_DIA * NUM_DIAS;
const ANCHOS_DIAS = Array.from({ length: NUM_DIAS }, (_, index) =>
  ANCHO_BASE_DIA + (index < RESTO_DIAS ? 1 : 0)
);
const GRID_ALTURAS_BLOQUES = "5fr 5fr 3fr 2fr";

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
      { id: "cbp", label: "Barra pequena", tipo: "editable", campo: "cueBarraPequena" },
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

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function diasMes(ano: number, mes: number) {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

function resolverPeriodoInicial() {
  const anoActual = HOY.getFullYear();
  const mesActual = HOY.getMonth() + 1;

  if (
    anoActual < FECHA_MINIMA_ANO ||
    (anoActual === FECHA_MINIMA_ANO && mesActual < FECHA_MINIMA_MES)
  ) {
    return { ano: FECHA_MINIMA_ANO, mes: FECHA_MINIMA_MES };
  }

  return { ano: anoActual, mes: mesActual };
}

function mesesDisponibles(ano: number) {
  const mesInicio = ano === FECHA_MINIMA_ANO ? FECHA_MINIMA_MES : 1;
  return MESES.map((mes, index) => ({ mes, value: index + 1 })).filter((item) => item.value >= mesInicio);
}

function fechaIso(ano: number, mes: number, dia: number) {
  return `${ano}-${pad2(mes)}-${pad2(dia)}`;
}

function ultimoDiaMesIso(ano: number, mes: number) {
  return fechaIso(ano, mes, diasMes(ano, mes));
}

function etiquetaDia(dia: number, mes: number, ano: number) {
  const nombres = ["D", "L", "M", "X", "J", "V", "S"];
  const fecha = new Date(Date.UTC(ano, mes - 1, dia));
  return `${nombres[fecha.getUTCDay()]} ${pad2(dia)}`;
}

function crearDia(dia: number, valores?: Partial<Omit<DiaCaja, "dia">>): DiaCaja {
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

function crearMesVacio(ano: number, mes: number) {
  return Array.from({ length: diasMes(ano, mes) }, (_, index) => crearDia(index + 1));
}

export default function CajaDiariaPage() {
  const periodoInicial = resolverPeriodoInicial();
  const [mesSeleccionado, setMesSeleccionado] = useState(() => pad2(periodoInicial.mes));
  const [anoSeleccionado, setAnoSeleccionado] = useState(() => String(periodoInicial.ano));
  const [dias, setDias] = useState(() => crearMesVacio(periodoInicial.ano, periodoInicial.mes));
  const [snapshotGuardado, setSnapshotGuardado] = useState(() =>
    JSON.stringify(crearMesVacio(periodoInicial.ano, periodoInicial.mes))
  );
  const [mensajeEstado, setMensajeEstado] = useState("Mes vacio. Puedes empezar a rellenar.");
  const [cargandoMes, setCargandoMes] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardandoOperativa, setGuardandoOperativa] = useState(false);
  const [celdaActiva, setCeldaActiva] = useState<{
    dia: number;
    campo: CampoEditable;
  } | null>(null);

  const mesNumero = Number(mesSeleccionado);
  const anoNumero = Number(anoSeleccionado);
  const mesesAnoSeleccionado = useMemo(() => mesesDisponibles(anoNumero), [anoNumero]);
  const snapshotActual = useMemo(() => JSON.stringify(dias), [dias]);
  const hayCambiosSinGuardar = snapshotActual !== snapshotGuardado;

  useEffect(() => {
    if (!hayCambiosSinGuardar) {
      return;
    }

    function avisarSalida(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", avisarSalida);

    return () => {
      window.removeEventListener("beforeunload", avisarSalida);
    };
  }, [hayCambiosSinGuardar]);

  useEffect(() => {
    if (!hayCambiosSinGuardar) {
      return;
    }

    window.history.pushState(
      { ...(window.history.state ?? {}), __gestionPubsCajaGuard: true },
      "",
      window.location.href
    );

    function avisarHistorial() {
      const salir = window.confirm(
        "Hay cambios sin guardar en la caja diaria. Si sales ahora se perderan en pantalla.\n\nQuieres continuar?"
      );

      if (salir) {
        window.removeEventListener("popstate", avisarHistorial);
        window.history.back();
        return;
      }

      window.history.pushState(
        { ...(window.history.state ?? {}), __gestionPubsCajaGuard: true },
        "",
        window.location.href
      );
    }

    window.addEventListener("popstate", avisarHistorial);

    return () => {
      window.removeEventListener("popstate", avisarHistorial);
    };
  }, [hayCambiosSinGuardar]);

  const tituloMes = useMemo(() => {
    return `${(MESES[mesNumero - 1] ?? "").toUpperCase()} ${anoSeleccionado}`;
  }, [anoSeleccionado, mesNumero]);

  useEffect(() => {
    let cancelado = false;

    async function cargarMes() {
      setCargandoMes(true);

      try {
        const fechaDesde = fechaIso(anoNumero, mesNumero, 1);
        const fechaHasta = fechaIso(anoNumero, mesNumero, diasMes(anoNumero, mesNumero));
        const guardados = await listarCajaDiariaPersistida(fechaDesde, fechaHasta);

        if (cancelado) {
          return;
        }

        const base = crearMesVacio(anoNumero, mesNumero);
        const porFecha = new Map(guardados.map((item) => [item.fecha, item]));
        const siguientes = base.map((item) => {
          const guardado = porFecha.get(fechaIso(anoNumero, mesNumero, item.dia));

          if (!guardado) {
            return item;
          }

          return {
            dia: item.dia,
            tarantinoTaquilla: guardado.tarantinoTaquilla,
            tarantinoTaran: guardado.tarantinoTaran,
            tarantinoSmoking: guardado.tarantinoSmoking,
            cueTaquilla: guardado.cueTaquilla,
            cueBarraGrande: guardado.cueBarraGrande,
            cueBarraPequena: guardado.cueBarraPequena,
            hangar: guardado.hangar,
          };
        });

        setDias(siguientes);
        setSnapshotGuardado(JSON.stringify(siguientes));
        setMensajeEstado(
          guardados.length > 0
            ? "Mes cargado desde BBDD."
            : "Mes vacio. Puedes empezar a rellenar."
        );
      } catch (error) {
        console.error("No se pudo cargar la caja diaria", error);

        if (cancelado) {
          return;
        }

        const vacio = crearMesVacio(anoNumero, mesNumero);
        setDias(vacio);
        setSnapshotGuardado(JSON.stringify(vacio));
        setMensajeEstado("No se pudo cargar la caja diaria. Revisa el SQL nuevo en Supabase.");
      } finally {
        if (!cancelado) {
          setCargandoMes(false);
        }
      }
    }

    void cargarMes();

    return () => {
      cancelado = true;
    };
  }, [anoNumero, mesNumero]);

  function aplicarPeriodo(nextMes: string, nextAno: string) {
    if (nextMes === mesSeleccionado && nextAno === anoSeleccionado) {
      return;
    }

    if (
      hayCambiosSinGuardar &&
      !window.confirm(
        "Hay cambios sin guardar en la caja diaria. Si cambias de mes o ano se perderan en pantalla.\n\nQuieres continuar?"
      )
    ) {
      return;
    }

    setMesSeleccionado(nextMes);
    setAnoSeleccionado(nextAno);
  }

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

  function confirmarSalidaCaja() {
    if (!hayCambiosSinGuardar) {
      return true;
    }

    return window.confirm(
      "Hay cambios sin guardar en la caja diaria. Si sales ahora se perderan en pantalla.\n\nQuieres continuar?"
    );
  }

  async function guardarMes() {
    try {
      setGuardando(true);

      const registros: RegistroCajaDiaria[] = dias.map((dia) => ({
        fecha: fechaIso(anoNumero, mesNumero, dia.dia),
        tarantinoTaquilla: dia.tarantinoTaquilla,
        tarantinoTaran: dia.tarantinoTaran,
        tarantinoSmoking: dia.tarantinoSmoking,
        cueTaquilla: dia.cueTaquilla,
        cueBarraGrande: dia.cueBarraGrande,
        cueBarraPequena: dia.cueBarraPequena,
        hangar: dia.hangar,
      }));

      await guardarCajaDiariaPersistida(registros);
      setSnapshotGuardado(snapshotActual);
      setMensajeEstado("Caja diaria guardada en BBDD.");
      window.alert("Caja diaria guardada.");
    } catch (error) {
      console.error("No se pudo guardar la caja diaria", error);
      window.alert("No se pudo guardar la caja diaria. Revisa el SQL nuevo en Supabase.");
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEnOperativaCaja() {
    if (hayCambiosSinGuardar) {
      window.alert("Guarda antes la Caja diaria para pasar a Operativa Caja.");
      return;
    }

    if (
      !window.confirm(
        `Se va a actualizar Operativa Caja de ${MESES[mesNumero - 1]} ${anoNumero} con los totales guardados de Tarantino, Cue y Hangar.\n\nQuieres continuar?`
      )
    ) {
      return;
    }

    try {
      setGuardandoOperativa(true);

      await guardarCajaMensualDesdeGestionDiaria(ultimoDiaMesIso(anoNumero, mesNumero), [
        { local: "Tarantino", totalCaja: bloquesCaja[0]?.totalMes(dias) ?? 0 },
        { local: "Cue", totalCaja: bloquesCaja[1]?.totalMes(dias) ?? 0 },
        { local: "Hangar", totalCaja: bloquesCaja[2]?.totalMes(dias) ?? 0 },
      ]);

      window.alert("Operativa Caja actualizada.");
    } catch (error) {
      console.error("No se pudo actualizar Operativa Caja", error);
      window.alert("No se pudo actualizar Operativa Caja.");
    } finally {
      setGuardandoOperativa(false);
    }
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
    <section className="grid h-full min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-1.5 overflow-hidden p-1.5">
      <header className="rounded-[12px] border border-[#d8b4aa] bg-[linear-gradient(180deg,#f8efec_0%,#f2e6e2_100%)] px-2 py-1 shadow-[0_8px_16px_rgba(85,52,46,0.08)]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div>
            <div className="text-[8px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
              Gestion diaria
            </div>
            <h1 className="mt-0.5 text-base font-black text-[#4b312b]">Caja diaria</h1>
          </div>

          <div className="text-center">
            <div className="text-[24px] font-black uppercase tracking-[0.14em] text-[#5a3b34]">
              {tituloMes}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Link
              href="/gestion-diaria/empleados"
              onClick={(event) => {
                if (!confirmarSalidaCaja()) {
                  event.preventDefault();
                }
              }}
              className="rounded-[10px] border border-[#cfafa8] bg-[linear-gradient(180deg,#fffdfc_0%,#eedfda_100%)] px-2.5 py-1 text-[10px] font-semibold text-[#492f29] shadow-[0_6px_12px_rgba(85,52,46,0.08)] transition duration-150 hover:-translate-y-[1px] hover:border-[#c28779]"
            >
              Volver
            </Link>
          </div>
        </div>
      </header>

      <section className="rounded-[12px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fefaf9_0%,#efe4df_100%)] px-2 py-1 shadow-[0_8px_16px_rgba(85,52,46,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[8px] font-black uppercase tracking-[0.12em] text-[#8a6458]">
              Mes
            </label>
            <select
              value={mesSeleccionado}
              onChange={(e) => aplicarPeriodo(e.target.value, anoSeleccionado)}
              className="rounded-[8px] border border-[#d0aba1] bg-white px-2 py-1 text-[10px] font-semibold text-[#4b312b] outline-none"
            >
              {mesesAnoSeleccionado.map((item) => (
                <option key={`${anoNumero}-${item.value}`} value={pad2(item.value)}>
                  {item.mes}
                </option>
              ))}
            </select>

            <label className="ml-1 text-[8px] font-black uppercase tracking-[0.12em] text-[#8a6458]">
              Ano
            </label>
            <select
              value={anoSeleccionado}
              onChange={(e) => {
                const nextAno = e.target.value;
                const disponibles = mesesDisponibles(Number(nextAno));
                const mesSigueValido = disponibles.some((item) => pad2(item.value) === mesSeleccionado);
                const nextMes = mesSigueValido ? mesSeleccionado : pad2(disponibles[0]?.value ?? FECHA_MINIMA_MES);
                aplicarPeriodo(nextMes, nextAno);
              }}
              className="rounded-[8px] border border-[#d0aba1] bg-white px-2 py-1 text-[10px] font-semibold text-[#4b312b] outline-none"
            >
              {ANOS.map((ano) => (
                <option key={ano} value={ano}>
                  {ano}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="rounded-[8px] border border-[#d1a79d] bg-white/70 px-2 py-1 text-[9px] font-semibold text-[#5a433d]">
              {cargandoMes
                ? "Cargando..."
                : hayCambiosSinGuardar
                  ? "Cambios sin guardar"
                  : mensajeEstado}
            </div>
            <div className="text-[10px] font-semibold text-[#5a433d]">
              Total <span className="font-black">{fmtImporte(totalMes)}</span>
            </div>
            <button
              type="button"
              onClick={guardarMes}
              disabled={guardando || guardandoOperativa || cargandoMes}
              className="rounded-[10px] border border-[#7c564d] bg-[#4a2d28] px-2.5 py-1 text-[10px] font-black text-white shadow-[0_6px_12px_rgba(85,52,46,0.16)] transition duration-150 hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={guardarEnOperativaCaja}
              disabled={guardandoOperativa || guardando || cargandoMes}
              className="rounded-[10px] border border-[#cfafa8] bg-[linear-gradient(180deg,#fffdfc_0%,#eedfda_100%)] px-2.5 py-1 text-[10px] font-black text-[#492f29] shadow-[0_6px_12px_rgba(85,52,46,0.08)] transition duration-150 hover:-translate-y-[1px] hover:border-[#c28779] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardandoOperativa ? "Guardando en Caja..." : "Guardar en Caja"}
            </button>
          </div>
        </div>
      </section>

      <section className="min-h-0 overflow-hidden rounded-[14px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fefaf9_0%,#efe4df_100%)] p-1 shadow-[0_14px_24px_rgba(85,52,46,0.10)]">
        <div
          className="grid h-full min-h-0 gap-2"
          style={{ gridTemplateRows: GRID_ALTURAS_BLOQUES }}
        >
          {bloquesCaja.map((bloque) => {
            const totalBloqueMes = bloque.totalMes(dias);

            return (
              <section
                key={bloque.id}
                className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#d7b6ad] bg-[linear-gradient(180deg,#fffaf8_0%,#f1e5e0_100%)] shadow-[0_8px_14px_rgba(85,52,46,0.08)]"
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

                <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
                  <table
                    className="h-full border-collapse text-[9px] text-[#4b312b]"
                    style={{
                      width: `${ANCHO_TABLA_OBJETIVO}px`,
                      minWidth: `${ANCHO_TABLA_OBJETIVO}px`,
                      tableLayout: "fixed",
                    }}
                  >
                    <colgroup>
                      <col style={{ width: `${ANCHO_COLUMNA_CAJA}px` }} />
                      {Array.from({ length: NUM_DIAS }, (_, index) => (
                        <col
                          key={`${bloque.id}-col-${index + 1}`}
                          style={{ width: `${ANCHOS_DIAS[index] ?? ANCHO_BASE_DIA}px` }}
                        />
                      ))}
                      <col style={{ width: `${ANCHO_COLUMNA_TOTAL}px` }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#f4e7e2] text-[8px] font-black uppercase tracking-[0.04em] text-[#8a6458]">
                        <th className="sticky left-0 z-10 border-r border-[#d8b4aa] bg-[#f4e7e2] px-1.5 py-1.5 text-left">
                          Caja
                        </th>
                        {Array.from({ length: NUM_DIAS }, (_, index) => {
                          const dia = index + 1;
                          const visible = dia <= dias.length;

                          return (
                            <th
                              key={`${bloque.id}-${dia}`}
                              className="border-r border-[#e4ccc4] px-0 py-1.5 text-center"
                            >
                              {visible ? etiquetaDia(dia, mesNumero, anoNumero) : ""}
                            </th>
                          );
                        })}
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

                            {Array.from({ length: NUM_DIAS }, (_, index) => {
                              const dia = dias[index];

                              if (!dia) {
                                return (
                                  <td
                                    key={`${bloque.id}-${fila.id}-vacio-${index + 1}`}
                                    className="border-r border-[#f0dfd9] p-[1px]"
                                  >
                                    <div className="rounded-[6px] bg-white/40 px-0 py-1" />
                                  </td>
                                );
                              }

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

          <section className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-[#d7b6ad] bg-[linear-gradient(180deg,#fffaf8_0%,#f1e5e0_100%)] shadow-[0_8px_14px_rgba(85,52,46,0.08)]">
            <div className="border-b border-[#dfc2ba] px-2 py-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[9px] font-black uppercase tracking-[0.1em] text-[#7f5b52]">
                  Total dia
                </div>
                <div className="text-[9px] font-semibold text-[#6e564f]">
                  Total <span className="font-black">{fmtImporte(totalMes)}</span>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
              <table
                className="h-full border-collapse text-[9px] text-[#4b312b]"
                style={{
                  width: `${ANCHO_TABLA_OBJETIVO}px`,
                  minWidth: `${ANCHO_TABLA_OBJETIVO}px`,
                  tableLayout: "fixed",
                }}
              >
                <colgroup>
                  <col style={{ width: `${ANCHO_COLUMNA_CAJA}px` }} />
                  {Array.from({ length: NUM_DIAS }, (_, index) => (
                    <col
                      key={`total-dia-col-${index + 1}`}
                      style={{ width: `${ANCHOS_DIAS[index] ?? ANCHO_BASE_DIA}px` }}
                    />
                  ))}
                  <col style={{ width: `${ANCHO_COLUMNA_TOTAL}px` }} />
                </colgroup>
                <thead>
                  <tr className="bg-[#f4e7e2] text-[8px] font-black uppercase tracking-[0.04em] text-[#8a6458]">
                    <th className="sticky left-0 z-10 border-r border-[#d8b4aa] bg-[#f4e7e2] px-1.5 py-1.5 text-left">
                      Resumen
                    </th>
                    {Array.from({ length: NUM_DIAS }, (_, index) => {
                      const dia = index + 1;
                      const visible = dia <= dias.length;

                      return (
                        <th
                          key={`total-dia-${dia}`}
                          className="border-r border-[#e4ccc4] px-0 py-1.5 text-center"
                        >
                          {visible ? etiquetaDia(dia, mesNumero, anoNumero) : ""}
                        </th>
                      );
                    })}
                    <th className="px-1 py-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[#d9b8ae] bg-[linear-gradient(180deg,#fffdfc_0%,#f1e4de_100%)]">
                    <td className="sticky left-0 z-10 border-r border-[#d8b4aa] bg-[linear-gradient(180deg,#fbf6f4_0%,#f2e6e2_100%)] px-1.5 py-1.5 font-black">
                      Total dia
                    </td>
                    {Array.from({ length: NUM_DIAS }, (_, index) => {
                      const item = totalesDia[index];

                      return (
                        <td
                          key={`total-dia-valor-${index + 1}`}
                          className="border-r border-[#f0dfd9] p-[1px]"
                        >
                          <div className="rounded-[6px] bg-white/60 px-0 py-1 text-center text-[9px] font-black">
                            {!item || item.total === 0 ? "" : fmtImporte(item.total).replace(",00", "")}
                          </div>
                        </td>
                      );
                    })}
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
