import { supabase } from "@/lib/supabase";

export type FiltroLiquidacionMensual = {
  fechaDesde: string;
  fechaHasta: string;
};

export type RegistroLiquidacionMensual = {
  empleadoId: number;
  nombreEmpleado: string;
  familia: string;
  mediasHoras: number;
  horas: number;
  precioMedioHora: number;
  totalSueldo: number;
  saldoAnterior: number;
  adelantosMes: number;
  totalPagar: number;
  saldoSiguiente: number;
  pagado: boolean;
};

export type AdelantoEmpleado = {
  id: number;
  fecha: string;
  empleadoId: number;
  importe: number;
  observaciones: string;
};

type RegistroCuadranteRow = {
  fecha: string;
  empleado_id: number;
  nombre_empleado: string;
  familia: string;
  precio: number | string;
};

type RegistroAdelantoRow = {
  id: number;
  fecha: string;
  empleado_id: number;
  importe: number | string;
  observaciones: string | null;
};

type RegistroPagoRow = {
  empleado_id: number;
  periodo: string;
  pagado: boolean | null;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

const FECHA_INICIO_LIQUIDACION = "2026-03-01";

function monthKey(fecha: string) {
  return fecha.slice(0, 7);
}

function buildMonthRange(fechaDesde: string) {
  const meses: string[] = [];
  const inicio = new Date(`${FECHA_INICIO_LIQUIDACION}T00:00:00`);
  const fin = new Date(`${fechaDesde}T00:00:00`);
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);

  while (cursor <= fin) {
    meses.push(
      `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
    );
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return meses;
}

export async function listarLiquidacionMensualEmpleados({
  fechaDesde,
  fechaHasta,
}: FiltroLiquidacionMensual) {
  const mesSeleccionado = monthKey(fechaDesde);
  const meses = buildMonthRange(fechaDesde);
  const fechaCierre = fechaHasta;
  const [cuadranteRes, adelantosRes, pagosRes] = await Promise.all([
    supabase
      .from("cuadrante_diario_empleados")
      .select("fecha, empleado_id, nombre_empleado, familia, precio")
      .gte("fecha", FECHA_INICIO_LIQUIDACION)
      .lte("fecha", fechaHasta),
    supabase
      .from("gestion_diaria_adelantos_empleados")
      .select("id, fecha, empleado_id, importe, observaciones")
      .gte("fecha", FECHA_INICIO_LIQUIDACION)
      .lte("fecha", fechaHasta)
      .order("fecha", { ascending: false }),
    supabase
      .from("gestion_diaria_liquidacion_empleados")
      .select("empleado_id, periodo, pagado")
      .eq("periodo", fechaCierre),
  ]);

  if (cuadranteRes.error || adelantosRes.error || pagosRes.error) {
    throw new Error("No se pudo cargar la liquidacion mensual de empleados");
  }

  const adelantos = ((adelantosRes.data ?? []) as RegistroAdelantoRow[]).map((item) => ({
    id: item.id,
    fecha: item.fecha,
    empleadoId: item.empleado_id,
    importe: round2(Number(item.importe ?? 0)),
    observaciones: String(item.observaciones ?? ""),
  }));

  const adelantosMesSeleccionado = adelantos.filter((item) => monthKey(item.fecha) === mesSeleccionado);
  const adelantosPorEmpleadoYMes = new Map<string, number>();
  adelantos.forEach((item) => {
    const key = `${monthKey(item.fecha)}::${item.empleadoId}`;
    adelantosPorEmpleadoYMes.set(key, round2((adelantosPorEmpleadoYMes.get(key) ?? 0) + item.importe));
  });
  const pagosPorEmpleado = new Map<number, boolean>();
  ((pagosRes.data ?? []) as RegistroPagoRow[]).forEach((item) => {
    pagosPorEmpleado.set(Number(item.empleado_id), Boolean(item.pagado));
  });

  const agrupadoPorEmpleadoYMes = new Map<
    string,
    Omit<
      RegistroLiquidacionMensual,
      "saldoAnterior" | "adelantosMes" | "totalPagar" | "saldoSiguiente" | "pagado"
    >
  >();
  const empleadosInfo = new Map<number, { nombreEmpleado: string; familia: string }>();
  ((cuadranteRes.data ?? []) as RegistroCuadranteRow[]).forEach((item) => {
    const empleadoId = Number(item.empleado_id);
    const key = `${monthKey(item.fecha)}::${empleadoId}`;
    const actual = agrupadoPorEmpleadoYMes.get(key) ?? {
      empleadoId,
      nombreEmpleado: item.nombre_empleado,
      familia: item.familia ?? "",
      mediasHoras: 0,
      horas: 0,
      precioMedioHora: 0,
      totalSueldo: 0,
    };

    actual.mediasHoras += 1;
    actual.horas += 0.5;
    actual.totalSueldo = round2(actual.totalSueldo + Number(item.precio ?? 0));
    agrupadoPorEmpleadoYMes.set(key, actual);
    empleadosInfo.set(empleadoId, {
      nombreEmpleado: item.nombre_empleado,
      familia: item.familia ?? "",
    });
  });

  const empleadosIds = new Set<number>([
    ...[...agrupadoPorEmpleadoYMes.values()].map((item) => item.empleadoId),
    ...adelantos.map((item) => item.empleadoId),
  ]);

  const liquidacion: RegistroLiquidacionMensual[] = [];

  [...empleadosIds].forEach((empleadoId) => {
      let saldoArrastrado = 0;
      let filaSeleccionada: RegistroLiquidacionMensual | null = null;

      meses.forEach((mes) => {
        const resumenMes = agrupadoPorEmpleadoYMes.get(`${mes}::${empleadoId}`);
        const totalSueldo = round2(resumenMes?.totalSueldo ?? 0);
        const horas = round2(resumenMes?.horas ?? 0);
        const mediasHoras = resumenMes?.mediasHoras ?? 0;
        const adelantosMes = round2(adelantosPorEmpleadoYMes.get(`${mes}::${empleadoId}`) ?? 0);
        const precioMedioHora = horas > 0 ? round2(totalSueldo / horas) : 0;
        const saldoAnterior = round2(saldoArrastrado);
        const totalPagar = round2(Math.max(totalSueldo - saldoAnterior - adelantosMes, 0));
        const saldoSiguiente = round2(Math.max(saldoAnterior + adelantosMes - totalSueldo, 0));

        saldoArrastrado = saldoSiguiente;

        if (mes === mesSeleccionado) {
          const info = empleadosInfo.get(empleadoId);
          const tieneContenido =
            mediasHoras > 0 ||
            totalSueldo > 0 ||
            adelantosMes > 0 ||
            saldoAnterior > 0 ||
            saldoSiguiente > 0;

          if (!tieneContenido) {
            return;
          }

          filaSeleccionada = {
            empleadoId,
            nombreEmpleado: info?.nombreEmpleado ?? "",
            familia: info?.familia ?? "",
            mediasHoras,
            horas,
            precioMedioHora,
            totalSueldo,
            saldoAnterior,
            adelantosMes,
            totalPagar,
            saldoSiguiente,
            pagado: pagosPorEmpleado.get(empleadoId) ?? false,
          };
        }
      });

      if (filaSeleccionada) {
        liquidacion.push(filaSeleccionada);
      }
    });

  liquidacion.sort((a, b) => {
    const grupoA = a.pagado ? 1 : 0;
    const grupoB = b.pagado ? 1 : 0;

    if (grupoA !== grupoB) {
      return grupoA - grupoB;
    }

    return a.nombreEmpleado.localeCompare(b.nombreEmpleado, "es", { sensitivity: "base" });
  });

  return {
    liquidacion,
    adelantos: adelantosMesSeleccionado,
  };
}

export async function guardarAdelantoEmpleado({
  fecha,
  empleadoId,
  importe,
  observaciones,
}: {
  fecha: string;
  empleadoId: number;
  importe: number;
  observaciones: string;
}) {
  const { error } = await supabase.from("gestion_diaria_adelantos_empleados").insert({
    fecha,
    empleado_id: empleadoId,
    importe: round2(importe),
    observaciones: observaciones.trim(),
  });

  if (error) {
    throw new Error("No se pudo guardar el adelanto");
  }
}

export async function eliminarAdelantoEmpleado(id: number) {
  const { error } = await supabase.from("gestion_diaria_adelantos_empleados").delete().eq("id", id);

  if (error) {
    throw new Error("No se pudo eliminar el adelanto");
  }
}

export async function guardarEstadoPagoLiquidacion({
  periodo,
  empleadoId,
  pagado,
}: {
  periodo: string;
  empleadoId: number;
  pagado: boolean;
}) {
  const { error } = await supabase.from("gestion_diaria_liquidacion_empleados").upsert(
    {
      periodo,
      empleado_id: empleadoId,
      pagado,
    },
    {
      onConflict: "periodo,empleado_id",
    }
  );

  if (error) {
    throw new Error("No se pudo guardar el estado de pagado");
  }
}
