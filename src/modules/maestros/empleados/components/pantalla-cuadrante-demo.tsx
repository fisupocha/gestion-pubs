"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CampoFecha } from "@/components/ui/campo-fecha";
import {
  listarCajaResumenPersistido,
  guardarCuadranteDiarioPersistido,
  listarCuadranteDiarioPersistido,
  listarResumenCuadrantePersistido,
  type RegistroCajaResumen,
  type RegistroCuadranteDiario,
} from "@/modules/maestros/empleados/data/persistencia-cuadrante-diario";
import { guardarPersonalMensualDesdeCuadrante } from "@/modules/operativa/utils/persistencia-operativa";

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
  id: number;
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

type ResumenGrupo = {
  local: string;
  familia: string;
  mediasHoras: number;
  horas: number;
  importe: number;
};

type ResumenDiaLocalCaja = {
  fecha: string;
  local: string;
  mediasHoras: number;
  horas: number;
  importePersonal: number;
  caja: number;
  porcentaje: number | null;
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

const mesesAno = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
] as const;
const RESUMEN_MIN_ANO = 2026;
const RESUMEN_MIN_MES = "03";

function fmtImporte(value: number) {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function fmtHoras(value: number) {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
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

function normalizarClave(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function serializarEmpleados(empleados: EmpleadoDemo[]) {
  return JSON.stringify(
    empleados.map((empleado) => ({
      id: empleado.id,
      tramos: ordenarTramos(empleado.tramos).map((tramo) => ({
        inicio: tramo.inicio,
        local: tramo.local,
        importe: tramo.importe,
      })),
    }))
  );
}

function reconstruirDesdePersistencia(
  empleadosBase: EmpleadoBase[],
  registros: RegistroCuadranteDiario[]
) {
  const vacios = crearEmpleadosVacios(empleadosBase);
  const porEmpleado = new Map(
    vacios.map((empleado) => [empleado.id, { ...empleado, tramos: [] as Tramo[] }])
  );

  registros.forEach((registro) => {
    const empleado = porEmpleado.get(registro.empleadoId);

    if (!empleado) {
      return;
    }

    if (!Object.hasOwn(locales, registro.local)) {
      return;
    }

    empleado.tramos.push({
      inicio: registro.hora,
      local: registro.local as LocalNombre,
      importe: registro.precio,
    });
  });

  const mezclados = [...porEmpleado.values()]
    .map((empleado) => ({
      ...empleado,
      tramos: ordenarTramos(empleado.tramos),
    }))
    .sort(compararPorNombre);

  const conDatos = mezclados
    .filter((empleado) => empleado.tramos.length > 0)
    .sort(compararPorNombre);
  const sinDatos = mezclados
    .filter((empleado) => empleado.tramos.length === 0)
    .sort(compararPorNombre);

  return [...conDatos, ...sinDatos];
}

function obtenerFechaHoyLocal() {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function tituloMesAno(fecha: string) {
  if (!fecha) {
    return "Sin fecha";
  }

  const [year, month, day] = fecha.split("-").map(Number);
  const valor = new Date(year, (month ?? 1) - 1, day ?? 1);
  const texto = new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(valor);

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function fechaVisible(fecha: string) {
  if (!fecha) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES").format(new Date(`${fecha}T12:00:00`));
}

function finMes(fecha: string) {
  if (!fecha) {
    return "";
  }

  const [year, month] = fecha.split("-").map(Number);
  const ultimoDia = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
}

function normalizarPeriodoResumen(year?: string, month?: string) {
  const ano = (year ?? "").replace(/[^\d]/g, "").slice(0, 4);
  const mes = (month ?? "").slice(0, 2);

  if (!ano || ano.length !== 4) {
    return { ano: String(RESUMEN_MIN_ANO), mes: RESUMEN_MIN_MES };
  }

  if (Number(ano) < RESUMEN_MIN_ANO) {
    return { ano: String(RESUMEN_MIN_ANO), mes: RESUMEN_MIN_MES };
  }

  if (Number(ano) === RESUMEN_MIN_ANO && mes && mes < RESUMEN_MIN_MES) {
    return { ano: String(RESUMEN_MIN_ANO), mes: RESUMEN_MIN_MES };
  }

  return { ano, mes: mes || RESUMEN_MIN_MES };
}

function desplazarFecha(fecha: string, dias: number) {
  if (!fecha) {
    return "";
  }

  const [year, month, day] = fecha.split("-").map(Number);
  const valor = new Date(year, (month ?? 1) - 1, day ?? 1);
  valor.setDate(valor.getDate() + dias);

  return [
    valor.getFullYear(),
    String(valor.getMonth() + 1).padStart(2, "0"),
    String(valor.getDate()).padStart(2, "0"),
  ].join("-");
}

export function PantallaCuadranteDemo({
  empleadosBase,
  localesBbdd,
  modoPantalla = "cuadrante",
}: {
  empleadosBase: EmpleadoBase[];
  localesBbdd: Array<{ id: number; nombre: string }>;
  modoPantalla?: "cuadrante" | "resumen";
}) {
  const [empleados, setEmpleados] = useState<EmpleadoDemo[]>(() => crearEmpleadosVacios(empleadosBase));
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [localActivo, setLocalActivo] = useState<LocalNombre>("Tarantino");
  const [importeActivo, setImporteActivo] = useState("0");
  const [modo, setModo] = useState<"pintar" | "borrar">("pintar");
  const [resumenMes, setResumenMes] = useState("");
  const [resumenAno, setResumenAno] = useState("");
  const [resumenLocal, setResumenLocal] = useState("");
  const [resumenFamilia, setResumenFamilia] = useState("");
  const [resumenEmpleadoId, setResumenEmpleadoId] = useState("");
  const [registrosResumen, setRegistrosResumen] = useState<RegistroCuadranteDiario[]>([]);
  const [registrosCajaResumen, setRegistrosCajaResumen] = useState<RegistroCajaResumen[]>([]);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [guardandoPersonal, setGuardandoPersonal] = useState(false);
  const [mensajeResumen, setMensajeResumen] = useState<string | null>(null);
  const [arrastreActivo, setArrastreActivo] = useState<ArrastreActivo | null>(null);
  const [celdaEditando, setCeldaEditando] = useState<CeldaEditando | null>(null);
  const [cargandoFecha, setCargandoFecha] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [empleadoActivoId, setEmpleadoActivoId] = useState<number | null>(null);
  const [snapshotGuardado, setSnapshotGuardado] = useState(() =>
    serializarEmpleados(crearEmpleadosVacios(empleadosBase))
  );
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [tipoMensaje, setTipoMensaje] = useState<"ok" | "error" | null>(null);

  useEffect(() => {
    if (!fechaSeleccionada) {
      setFechaSeleccionada(obtenerFechaHoyLocal());
    }
  }, [fechaSeleccionada]);

  useEffect(() => {
    if (!fechaSeleccionada || (resumenMes && resumenAno)) {
      return;
    }

    const [year, month] = fechaSeleccionada.split("-");
    const periodo = normalizarPeriodoResumen(year, month);
    setResumenMes(periodo.mes);
    setResumenAno(periodo.ano);
  }, [fechaSeleccionada, resumenAno, resumenMes]);

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
    if (!fechaSeleccionada) {
      return;
    }

    let cancelado = false;

    async function cargarFecha() {
      setCargandoFecha(true);
      setMensaje(null);
      setTipoMensaje(null);

      try {
        const registros = await listarCuadranteDiarioPersistido(fechaSeleccionada);

        if (cancelado) {
          return;
        }

        const reconstruido = reconstruirDesdePersistencia(empleadosBase, registros);
        setEmpleados(reconstruido);
        setSnapshotGuardado(serializarEmpleados(reconstruido));
      } catch {
        if (cancelado) {
          return;
        }

        const vacios = crearEmpleadosVacios(empleadosBase);
        setEmpleados(vacios);
        setSnapshotGuardado(serializarEmpleados(vacios));
        setMensaje("No se pudo cargar el cuadrante. Si falta la tabla, ejecuta sql/crear-cuadrante-diario-empleados.sql en Supabase.");
        setTipoMensaje("error");
      } finally {
        if (!cancelado) {
          setCargandoFecha(false);
        }
      }
    }

    void cargarFecha();

    return () => {
      cancelado = true;
    };
  }, [empleadosBase, fechaSeleccionada]);

  const totalDia = useMemo(() => {
    return empleados.reduce(
      (sum, empleado) => sum + empleado.tramos.reduce((subsum, tramo) => subsum + tramo.importe, 0),
      0
    );
  }, [empleados]);

  const familiasDisponibles = useMemo(() => {
    return [...new Set(empleadosBase.map((empleado) => empleado.familia).filter(Boolean))].sort(
      (a, b) => a.localeCompare(b, "es", { sensitivity: "base" })
    );
  }, [empleadosBase]);

  const localesDisponibles = useMemo(() => {
    const base = Object.keys(locales);
    const extras = localesBbdd
      .map((local) => local.nombre)
      .filter((nombre) => nombre && !base.includes(nombre))
      .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

    return [...base, ...extras];
  }, [localesBbdd]);

  const resumenParaPersonal = useMemo(() => {
    const agrupado = new Map<string, ResumenGrupo>();

    registrosResumen.forEach((registro) => {
      const clave = `${registro.local}__${registro.familia}`;
      const actual = agrupado.get(clave) ?? {
        local: registro.local,
        familia: registro.familia,
        mediasHoras: 0,
        horas: 0,
        importe: 0,
      };

      actual.mediasHoras += 1;
      actual.horas += 0.5;
      actual.importe += registro.precio;
      agrupado.set(clave, actual);
    });

    return [...agrupado.values()]
      .map((item) => ({
        ...item,
        horas: Math.round(item.horas * 10) / 10,
        importe: Math.round(item.importe * 100) / 100,
      }))
      .sort(
        (a, b) =>
          a.local.localeCompare(b.local, "es", { sensitivity: "base" }) ||
          a.familia.localeCompare(b.familia, "es", { sensitivity: "base" })
      );
  }, [registrosResumen]);

  const resumenDiaLocalVsCaja = useMemo(() => {
    const empresasPorId = new Map(
      localesBbdd
        .filter((local) => typeof local.id === "number")
        .map((local) => [local.id, local.nombre])
    );

    const cajaPorDiaLocal = new Map<string, number>();

    registrosCajaResumen.forEach((registro) => {
      const local = registro.empresaId ? empresasPorId.get(registro.empresaId) ?? "" : "";

      if (!local) {
        return;
      }

      const clave = `${registro.fecha}__${local}`;
      cajaPorDiaLocal.set(
        clave,
        Math.round(((cajaPorDiaLocal.get(clave) ?? 0) + registro.totalCaja) * 100) / 100
      );
    });

    const agrupado = new Map<string, ResumenDiaLocalCaja>();

    registrosResumen.forEach((registro) => {
      const clave = `${registro.fecha}__${registro.local}`;
      const actual = agrupado.get(clave) ?? {
        fecha: registro.fecha,
        local: registro.local,
        mediasHoras: 0,
        horas: 0,
        importePersonal: 0,
        caja: 0,
        porcentaje: null,
      };

      actual.mediasHoras += 1;
      actual.horas += 0.5;
      actual.importePersonal += registro.precio;
      agrupado.set(clave, actual);
    });

    return [...agrupado.values()]
      .map((item) => {
        const caja = cajaPorDiaLocal.get(`${item.fecha}__${item.local}`) ?? 0;
        const porcentaje =
          caja > 0 ? Math.round(((item.importePersonal / caja) * 100) * 100) / 100 : null;

        return {
          ...item,
          horas: Math.round(item.horas * 10) / 10,
          importePersonal: Math.round(item.importePersonal * 100) / 100,
          caja,
          porcentaje,
        };
      })
      .sort(
        (a, b) =>
          a.fecha.localeCompare(b.fecha) ||
          a.local.localeCompare(b.local, "es", { sensitivity: "base" })
      );
  }, [localesBbdd, registrosCajaResumen, registrosResumen]);

  const totalResumenImporte = useMemo(() => {
    return Math.round(
      registrosResumen.reduce((sum, registro) => sum + registro.precio, 0) * 100
    ) / 100;
  }, [registrosResumen]);
  const mesesResumenDisponibles = useMemo(() => {
    const ano = Number(resumenAno || RESUMEN_MIN_ANO);
    return mesesAno.filter((mes) => ano > RESUMEN_MIN_ANO || mes.value >= RESUMEN_MIN_MES);
  }, [resumenAno]);
  const puedeGuardarEnPersonal =
    resumenParaPersonal.length > 0 &&
    !resumenLocal &&
    !resumenFamilia &&
    !resumenEmpleadoId &&
    resumenAno.length === 4 &&
    Number(resumenAno) >= RESUMEN_MIN_ANO &&
    !(Number(resumenAno) === RESUMEN_MIN_ANO && resumenMes < RESUMEN_MIN_MES);

  const snapshotActual = useMemo(() => serializarEmpleados(empleados), [empleados]);
  const hayCambiosSinGuardar = snapshotActual !== snapshotGuardado;

  useEffect(() => {
    if (modoPantalla !== "cuadrante" || !hayCambiosSinGuardar) {
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
  }, [hayCambiosSinGuardar, modoPantalla]);

  useEffect(() => {
    if (modoPantalla !== "cuadrante" || !hayCambiosSinGuardar) {
      return;
    }

    window.history.pushState(
      { ...(window.history.state ?? {}), __gestionPubsCuadranteGuard: true },
      "",
      window.location.href
    );

    function avisarHistorial() {
      const salir = window.confirm(
        "Hay cambios sin guardar en el cuadrante. Si sales ahora se perderan en pantalla.\n\nQuieres continuar?"
      );

      if (salir) {
        window.removeEventListener("popstate", avisarHistorial);
        window.history.back();
        return;
      }

      window.history.pushState(
        { ...(window.history.state ?? {}), __gestionPubsCuadranteGuard: true },
        "",
        window.location.href
      );
    }

    window.addEventListener("popstate", avisarHistorial);

    return () => {
      window.removeEventListener("popstate", avisarHistorial);
    };
  }, [hayCambiosSinGuardar, modoPantalla]);

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

  function limpiarCuadrante() {
    const confirmado = window.confirm(
      "Se van a quitar los cuadros pintados de la pantalla. Hasta que no pulses Guardar no se tocara la BBDD.\n\nQuieres continuar?"
    );

    if (!confirmado) {
      return;
    }

    setEmpleados(crearEmpleadosVacios(empleadosBase));
    setImporteActivo("0");
    setEmpleadoActivoId(null);
    setCeldaEditando(null);
    setArrastreActivo(null);
    setMensaje(null);
    setTipoMensaje(null);
  }

  function cambiarFecha(nextFecha: string) {
    if (!nextFecha || nextFecha === fechaSeleccionada) {
      return;
    }

    if (
      hayCambiosSinGuardar &&
      !window.confirm(
        "Hay cambios sin guardar en esta fecha. Si cambias de fecha ahora los perderas.\n\nQuieres continuar?"
      )
    ) {
      return;
    }

    setCeldaEditando(null);
    setArrastreActivo(null);
    setEmpleadoActivoId(null);
    setFechaSeleccionada(nextFecha);
  }

  function moverFechaSeleccionada(dias: number) {
    if (!fechaSeleccionada) {
      return;
    }

    cambiarFecha(desplazarFecha(fechaSeleccionada, dias));
  }

  function confirmarSalidaCuadrante() {
    if (modoPantalla !== "cuadrante" || !hayCambiosSinGuardar) {
      return true;
    }

    return window.confirm(
      "Hay cambios sin guardar en el cuadrante. Si sales ahora se perderan en pantalla.\n\nQuieres continuar?"
    );
  }

  async function guardarCuadrante() {
    if (!fechaSeleccionada) {
      window.alert("Selecciona una fecha antes de guardar.");
      return;
    }

    const empresasPorNombre = new Map(
      localesBbdd.map((local) => [normalizarClave(local.nombre), local.id])
    );

    const filasGuardar: RegistroCuadranteDiario[] = empleados.flatMap((empleado) =>
      empleado.tramos.map((tramo) => ({
        fecha: fechaSeleccionada,
        hora: tramo.inicio,
        empleadoId: empleado.id,
        nombreEmpleado: empleado.nombre,
        familia: empleado.familia,
        empresaId: empresasPorNombre.get(normalizarClave(tramo.local)) ?? null,
        local: tramo.local,
        precio: tramo.importe,
      }))
    );

    setGuardando(true);
    setMensaje(null);
    setTipoMensaje(null);

    try {
      await guardarCuadranteDiarioPersistido(fechaSeleccionada, filasGuardar);
      setSnapshotGuardado(serializarEmpleados(empleados));
      setMensaje("Cuadrante guardado en BBDD correctamente.");
      setTipoMensaje("ok");
    } catch {
      setMensaje("No se pudo guardar el cuadrante. Si falta la tabla, ejecuta sql/crear-cuadrante-diario-empleados.sql en Supabase.");
      setTipoMensaje("error");
    } finally {
      setGuardando(false);
    }
  }

  async function consultarResumenMensual() {
    if (!resumenMes || !resumenAno) {
      setMensajeResumen("Indica mes y ano para hacer la consulta.");
      return;
    }

    if (resumenAno.length !== 4) {
      setMensajeResumen("El ano debe tener 4 cifras.");
      return;
    }

    if (
      Number(resumenAno) < RESUMEN_MIN_ANO ||
      (Number(resumenAno) === RESUMEN_MIN_ANO && resumenMes < RESUMEN_MIN_MES)
    ) {
      setMensajeResumen("El resumen mensual empieza en marzo de 2026.");
      return;
    }

    const fechaDesde = `${resumenAno}-${resumenMes}-01`;
    const fechaHasta = finMes(fechaDesde);

    setCargandoResumen(true);
    setMensajeResumen(null);

    try {
      const [datos, datosCaja] = await Promise.all([
        listarResumenCuadrantePersistido({
          fechaDesde,
          fechaHasta,
          local: resumenLocal || undefined,
          familia: resumenFamilia || undefined,
          empleadoId: resumenEmpleadoId ? Number(resumenEmpleadoId) : undefined,
        }),
        listarCajaResumenPersistido({
          fechaDesde,
          fechaHasta,
          local: resumenLocal || undefined,
        }),
      ]);

      setRegistrosResumen(datos);
      setRegistrosCajaResumen(datosCaja);
    } catch {
      setMensajeResumen(
        "No se pudo cargar el resumen. Revisa la tabla del cuadrante en Supabase."
      );
      setRegistrosResumen([]);
      setRegistrosCajaResumen([]);
    } finally {
      setCargandoResumen(false);
    }
  }

  async function guardarResumenEnPersonal() {
    if (!puedeGuardarEnPersonal) {
      window.alert(
        "Para guardar en Personal usa el resumen mensual completo desde marzo de 2026, sin filtros de local, familia ni empleado."
      );
      return;
    }

    const fecha = finMes(`${resumenAno}-${resumenMes}-01`);

    if (
      !window.confirm(
        `Se va a actualizar Operativa Personal de ${mesesAno.find((item) => item.value === resumenMes)?.label ?? resumenMes} ${resumenAno} con las familias usadas en ese mes.\n\nQuieres continuar?`
      )
    ) {
      return;
    }

    try {
      setGuardandoPersonal(true);

      await guardarPersonalMensualDesdeCuadrante(
        fecha,
        resumenParaPersonal.map((fila) => ({
          local: fila.local,
          familia: fila.familia,
          importe: fila.importe,
        }))
      );

      window.alert("Operativa Personal actualizada.");
    } catch (error) {
      console.error("No se pudo actualizar Operativa Personal", error);
      window.alert("No se pudo actualizar Operativa Personal.");
    } finally {
      setGuardandoPersonal(false);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-2 overflow-hidden p-2">
      <header className="rounded-[18px] border border-[#d8b4aa] bg-[linear-gradient(180deg,#f8efec_0%,#f2e6e2_100%)] px-4 py-2.5 shadow-[0_12px_26px_rgba(85,52,46,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
              Gestion diaria
            </div>
            <h1 className="mt-1 text-2xl font-black text-[#4b312b]">
              {modoPantalla === "cuadrante" ? "Cuadrante diario" : "Consultas cuadrante"}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={
                modoPantalla === "cuadrante"
                  ? "/gestion-diaria/empleados"
                  : "/gestion-diaria/empleados/cuadrante-demo"
              }
              onClick={(event) => {
                if (!confirmarSalidaCuadrante()) {
                  event.preventDefault();
                }
              }}
              className="rounded-[14px] border border-[#cfafa8] bg-[linear-gradient(180deg,#fffdfc_0%,#eedfda_100%)] px-3 py-2 text-sm font-semibold text-[#492f29] shadow-[0_10px_18px_rgba(85,52,46,0.08)] transition duration-150 hover:-translate-y-[1px] hover:border-[#c28779]"
            >
              {modoPantalla === "cuadrante" ? "Volver a empleados" : "Volver al cuadrante"}
            </Link>

            {modoPantalla === "cuadrante" ? (
              <div className="rounded-[14px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fdf9f8_0%,#ede1dd_100%)] px-3 py-2 text-center shadow-[0_10px_18px_rgba(85,52,46,0.08)]">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                  {fechaVisible(fechaSeleccionada)}
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-[#7b635c]">
                  08:00 a 08:00
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {mensaje ? (
        <div
          className={
            tipoMensaje === "ok"
              ? "rounded-[16px] border border-[#98c48f] bg-[linear-gradient(180deg,#e5f4df_0%,#d2e7cb_100%)] px-4 py-2 text-sm font-semibold text-[#2f5b2b]"
              : "rounded-[16px] border border-[#d3a2a0] bg-[linear-gradient(180deg,#f6e3e2_0%,#ecd0cf_100%)] px-4 py-2 text-sm font-semibold text-[#7a2f2c]"
          }
        >
          {mensaje}
        </div>
      ) : null}

      {modoPantalla === "cuadrante" ? (
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
                {tituloMesAno(fechaSeleccionada)}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                Fecha
              </div>
              <button
                type="button"
                onClick={() => moverFechaSeleccionada(-1)}
                disabled={!fechaSeleccionada}
                aria-label="Dia anterior"
                className={
                  !fechaSeleccionada
                    ? "cursor-not-allowed rounded-[10px] border border-[#d8c8c1] bg-[#f2ebe8] px-3 py-1 text-sm font-black text-[#9c867f] opacity-80"
                    : "rounded-[10px] border border-[#d3b8b0] bg-white/80 px-3 py-1 text-sm font-black text-[#5a433d]"
                }
              >
                {"<"}
              </button>
              <CampoFecha
                value={fechaSeleccionada}
                onChange={(e) => cambiarFecha(e.target.value)}
                className="w-[148px] rounded-[10px] border border-[#d2aca3] bg-white px-2 py-1 text-center text-sm font-black text-[#4b312b] outline-none"
              />
              <button
                type="button"
                onClick={() => moverFechaSeleccionada(1)}
                disabled={!fechaSeleccionada}
                aria-label="Dia siguiente"
                className={
                  !fechaSeleccionada
                    ? "cursor-not-allowed rounded-[10px] border border-[#d8c8c1] bg-[#f2ebe8] px-3 py-1 text-sm font-black text-[#9c867f] opacity-80"
                    : "rounded-[10px] border border-[#d3b8b0] bg-white/80 px-3 py-1 text-sm font-black text-[#5a433d]"
                }
              >
                {">"}
              </button>
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                Precio
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
                onClick={limpiarCuadrante}
                className="rounded-[10px] border border-[#d3b8b0] bg-white/80 px-3 py-1.5 text-[11px] font-black text-[#5a433d]"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={guardarCuadrante}
                disabled={guardando || cargandoFecha || !fechaSeleccionada}
                className={
                  guardando || cargandoFecha || !fechaSeleccionada
                    ? "cursor-not-allowed rounded-[10px] border border-[#d8c8c1] bg-[#f2ebe8] px-3 py-1.5 text-[11px] font-black text-[#9c867f] opacity-80"
                    : "rounded-[10px] border border-[#8a6458] bg-[#4b312b] px-3 py-1.5 text-[11px] font-black text-white"
                }
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
              <Link
                href="/gestion-diaria/empleados/cuadrante-demo/resumen"
                className="rounded-[10px] border border-[#d3b8b0] bg-white/80 px-3 py-1.5 text-[11px] font-black text-[#5a433d]"
              >
                Resumen mensual
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {modoPantalla === "resumen" ? (
        <section className="flex min-h-0 flex-1 flex-col rounded-[18px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fefaf9_0%,#efe4df_100%)] px-4 py-3 shadow-[0_12px_24px_rgba(85,52,46,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6458]">
                Resumen mensual
              </div>
              <div className="mt-0.5 text-sm font-semibold text-[#5a433d]">
                Consulta mensual compacta para Personal y control contra Caja.
              </div>
            </div>
          </div>

          <div className="mt-2 grid gap-2 xl:grid-cols-[180px_120px_180px_180px_220px_auto] xl:items-end">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                Mes
              </span>
              <select
                value={resumenMes}
                onChange={(e) => setResumenMes(e.target.value)}
                className="rounded-[10px] border border-[#d2aca3] bg-white px-2 py-[9px] text-sm font-semibold text-[#4b312b] outline-none"
              >
                {mesesResumenDisponibles.map((mes) => (
                  <option key={mes.value} value={mes.value}>
                    {mes.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                Ano
              </span>
              <input
                value={resumenAno}
                onChange={(e) => {
                  const periodo = normalizarPeriodoResumen(e.target.value, resumenMes);
                  setResumenAno(periodo.ano);
                  setResumenMes(periodo.mes);
                }}
                className="rounded-[10px] border border-[#d2aca3] bg-white px-2 py-1.5 text-sm font-semibold text-[#4b312b] outline-none"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                Local
              </span>
              <select
                value={resumenLocal}
                onChange={(e) => setResumenLocal(e.target.value)}
                className="rounded-[10px] border border-[#d2aca3] bg-white px-2 py-[9px] text-sm font-semibold text-[#4b312b] outline-none"
              >
                <option value="">Todos</option>
                {localesDisponibles.map((local) => (
                  <option key={local} value={local}>
                    {local}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                Familia
              </span>
              <select
                value={resumenFamilia}
                onChange={(e) => setResumenFamilia(e.target.value)}
                className="rounded-[10px] border border-[#d2aca3] bg-white px-2 py-[9px] text-sm font-semibold text-[#4b312b] outline-none"
              >
                <option value="">Todas</option>
                {familiasDisponibles.map((familia) => (
                  <option key={familia} value={familia}>
                    {familia}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                Empleado
              </span>
              <select
                value={resumenEmpleadoId}
                onChange={(e) => setResumenEmpleadoId(e.target.value)}
                className="rounded-[10px] border border-[#d2aca3] bg-white px-2 py-[9px] text-sm font-semibold text-[#4b312b] outline-none"
              >
                <option value="">Todos</option>
                {empleadosBase
                  .slice()
                  .sort(compararPorNombre)
                  .map((empleado) => (
                    <option key={empleado.id} value={String(empleado.id)}>
                      {empleado.nombre}
                    </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={consultarResumenMensual}
              disabled={cargandoResumen}
              className={
                cargandoResumen
                  ? "cursor-not-allowed rounded-[10px] border border-[#d8c8c1] bg-[#f2ebe8] px-3 py-2 text-[11px] font-black text-[#9c867f] opacity-80"
                  : "rounded-[10px] border border-[#8a6458] bg-[#4b312b] px-3 py-2 text-[11px] font-black text-white"
              }
            >
              {cargandoResumen ? "Consultando..." : "Consultar"}
            </button>
          </div>

          {mensajeResumen ? (
            <div className="mt-3 rounded-[14px] border border-[#d3a2a0] bg-[linear-gradient(180deg,#f6e3e2_0%,#ecd0cf_100%)] px-4 py-2 text-sm font-semibold text-[#7a2f2c]">
              {mensajeResumen}
            </div>
          ) : null}

          <div className="mt-2 grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <section className="flex min-h-0 flex-col rounded-[16px] border border-[#d7bbb3] bg-white/65 p-3 shadow-[0_10px_18px_rgba(85,52,46,0.06)]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                    Resumen para Personal
                  </div>
                  <div className="mt-0.5 text-[12px] font-semibold text-[#5a433d]">
                    {resumenParaPersonal.length} filas - {fmtImporte(totalResumenImporte)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={guardarResumenEnPersonal}
                  disabled={guardandoPersonal || !puedeGuardarEnPersonal}
                  className={
                    guardandoPersonal || !puedeGuardarEnPersonal
                      ? "cursor-not-allowed rounded-[10px] border border-[#d8c8c1] bg-[#f2ebe8] px-3 py-2 text-[11px] font-black text-[#9c867f] opacity-80"
                      : "rounded-[10px] border border-[#8a6458] bg-[#4b312b] px-3 py-2 text-[11px] font-black text-white"
                  }
                >
                  {guardandoPersonal ? "Guardando..." : "Guardar en Personal"}
                </button>
              </div>

              <div className="mt-2 flex-1 overflow-auto">
                <table className="min-w-full table-fixed border-collapse">
                  <thead>
                    <tr className="bg-[#f4e7e2] text-[9px] font-black uppercase tracking-[0.08em] text-[#8a6458]">
                      <th className="border border-[#e0c7c0] px-2 py-2 text-left">Local</th>
                      <th className="border border-[#e0c7c0] px-2 py-2 text-left">Familia</th>
                      <th className="border border-[#e0c7c0] px-2 py-2 text-right">Horas</th>
                      <th className="border border-[#e0c7c0] px-2 py-2 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenParaPersonal.length > 0 ? (
                      resumenParaPersonal.map((fila) => (
                        <tr key={`${fila.local}-${fila.familia}`} className="bg-white/75 text-sm text-[#4b312b]">
                          <td className="border border-[#ecdbd5] px-2 py-2">{fila.local}</td>
                          <td className="border border-[#ecdbd5] px-2 py-2">{fila.familia}</td>
                          <td className="border border-[#ecdbd5] px-2 py-2 text-right">{fmtHoras(fila.horas)}</td>
                          <td className="border border-[#ecdbd5] px-2 py-2 text-right">{fmtImporte(fila.importe)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="border border-[#ecdbd5] px-3 py-6 text-center text-sm font-semibold text-[#7b635c]">
                          Haz una consulta para ver el resumen mensual.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="flex min-h-0 flex-col rounded-[16px] border border-[#d7bbb3] bg-white/65 p-3 shadow-[0_10px_18px_rgba(85,52,46,0.06)]">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                    Dia por dia vs Caja
                  </div>
                  <div className="mt-0.5 text-[12px] font-semibold text-[#5a433d]">
                    {resumenDiaLocalVsCaja.length} filas del mes por dia y local.
                  </div>
                </div>
              </div>

              <div className="mt-2 flex-1 overflow-auto">
                <table className="min-w-full table-fixed border-collapse">
                  <thead>
                    <tr className="sticky top-0 bg-[#f4e7e2] text-[9px] font-black uppercase tracking-[0.08em] text-[#8a6458]">
                      <th className="border border-[#e0c7c0] px-2 py-2 text-left">Fecha</th>
                      <th className="border border-[#e0c7c0] px-2 py-2 text-left">Local</th>
                      <th className="border border-[#e0c7c0] px-2 py-2 text-right">Horas</th>
                      <th className="border border-[#e0c7c0] px-2 py-2 text-right">Personal</th>
                      <th className="border border-[#e0c7c0] px-2 py-2 text-right">Caja</th>
                      <th className="border border-[#e0c7c0] px-2 py-2 text-right">% s/caja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenDiaLocalVsCaja.length > 0 ? (
                      resumenDiaLocalVsCaja.map((fila) => (
                        <tr key={`${fila.fecha}-${fila.local}`} className="bg-white/75 text-sm text-[#4b312b]">
                          <td className="border border-[#ecdbd5] px-2 py-2">{fechaVisible(fila.fecha)}</td>
                          <td className="border border-[#ecdbd5] px-2 py-2">{fila.local}</td>
                          <td className="border border-[#ecdbd5] px-2 py-2 text-right">{fmtHoras(fila.horas)}</td>
                          <td className="border border-[#ecdbd5] px-2 py-2 text-right">{fmtImporte(fila.importePersonal)}</td>
                          <td className="border border-[#ecdbd5] px-2 py-2 text-right">{fila.caja > 0 ? fmtImporte(fila.caja) : ""}</td>
                          <td className="border border-[#ecdbd5] px-2 py-2 text-right">
                            {fila.porcentaje === null ? "" : `${fmtImporte(fila.porcentaje)} %`}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="border border-[#ecdbd5] px-3 py-6 text-center text-sm font-semibold text-[#7b635c]">
                          Sin datos todavia para ese mes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {modoPantalla === "cuadrante" ? (
      <section className="min-h-0 flex-1 overflow-hidden rounded-[18px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fefaf9_0%,#efe4df_100%)] shadow-[0_18px_34px_rgba(85,52,46,0.10)]">
        <div className="border-b border-[#dfc2ba] px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
              Cuadrante del dia
            </div>
            <div className="text-[11px] font-semibold text-[#7b635c]">
              {cargandoFecha
                ? "Cargando fecha..."
                : hayCambiosSinGuardar
                  ? `Sin guardar - Total dia ${fmtImporte(totalDia)}`
                  : `Guardado en pantalla - Total dia ${fmtImporte(totalDia)}`}
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
              {empleados.map((empleado) => {
                const filaActiva = empleadoActivoId === empleado.id;

                return (
                <tr
                  key={empleado.id}
                  className={
                    filaActiva
                      ? "border-t border-[#d8b477] bg-[#fff5de]"
                      : "border-t border-[#ead5ce] bg-white/75"
                  }
                >
                  <td
                    onMouseDown={() => setEmpleadoActivoId(empleado.id)}
                    className={
                      filaActiva
                        ? "sticky left-0 z-10 border-r border-[#d0a861] bg-[linear-gradient(180deg,#fff2c9_0%,#f6e1a9_100%)] px-2 py-1.5 align-top shadow-[inset_4px_0_0_#c88f2f]"
                        : "sticky left-0 z-10 border-r border-[#d8b4aa] bg-[linear-gradient(180deg,#fbf6f4_0%,#f2e6e2_100%)] px-2 py-1.5 align-top"
                    }
                  >
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
                        key={`${empleado.id}-${hora}`}
                        className={
                          filaActiva
                            ? "border-r border-[#ecd4ab] bg-[#fff9ee] p-[2px]"
                            : "border-r border-[#f0dfd9] p-[2px]"
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setEmpleadoActivoId(empleado.id);

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
                            className={`flex h-8 items-center justify-center rounded-[8px] border text-[11px] font-black ${locales[tramo.local].celda} ${
                              filaActiva ? "ring-1 ring-[#ffe9b3] ring-offset-0" : ""
                            }`}
                            title={`${tramo.local} - ${hora} - ${fmtImporte(tramo.importe)}`}
                          >
                            {fmtImporte(tramo.importe)}
                          </div>
                        ) : (
                          <div
                            className={
                              filaActiva
                                ? "flex h-8 items-center justify-center rounded-[8px] border border-dashed border-[#d4aa57] bg-[#fff3d5] text-[9px] font-bold tracking-[0.02em] text-[#6a4914]"
                                : "flex h-8 items-center justify-center rounded-[8px] border border-dashed border-[#ddc5bb] bg-white/70 text-[9px] font-bold tracking-[0.02em] text-[#6f554c]"
                            }
                          >
                            {hora}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}
    </section>
  );
}
