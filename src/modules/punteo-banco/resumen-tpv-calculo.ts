import { aCentimos, desdeCentimos, formatearCentimos } from "./centimos";
import type { BancoPunteoId, EstadoMesTpv, FilaResumenTpv } from "./modelo";
import { MESES_PUNTEO } from "./modelo";
import type { MovimientoInterno, PeriodoBanco } from "./movimiento-interno";
import { asignarDevolucionCentimos, lineasRepartoDesdeImportes } from "./reparto-abono-comision";

export type ClaveGastoTpv = {
  banco: BancoPunteoId;
  anio: number;
  mes: number;
};

type ResumenMes = {
  mes: number;
  ingresosCentimos: number | null;
  originalCentimos: number | null;
  devolucionCentimos: number | null;
  netaCentimos: number | null;
  estado: EstadoMesTpv | null;
};

export function resumirTpvAnual(opciones: {
  banco: BancoPunteoId;
  anio: number;
  movimientos: MovimientoInterno[];
  periodos: PeriodoBanco[];
  huecos: PeriodoBanco[];
  hoy: string;
  gastosRegistrados: ClaveGastoTpv[];
  hayHistorico: boolean;
}): FilaResumenTpv[] {
  const asignacion = asignarDevolucionCentimos(lineasRepartoDesdeImportes(opciones.movimientos));
  const meses = Array.from({ length: 12 }, (_, indice) =>
    resumirMes({ ...opciones, mes: indice + 1, asignacion })
  );
  const conDatos = meses.filter((mes) => mes.ingresosCentimos !== null || mes.netaCentimos !== null);
  const ingresos = conDatos.length
    ? conDatos.reduce((total, mes) => total + (mes.ingresosCentimos ?? 0), 0)
    : null;
  const original = conDatos.length
    ? conDatos.reduce((total, mes) => total + (mes.originalCentimos ?? 0), 0)
    : null;
  const devolucion = conDatos.length
    ? conDatos.reduce((total, mes) => total + (mes.devolucionCentimos ?? 0), 0)
    : null;
  const neta = conDatos.length ? conDatos.reduce((total, mes) => total + (mes.netaCentimos ?? 0), 0) : null;

  return [
    ...meses.map((mes) => filaMes(mes)),
    {
      id: "total",
      mes: "Total",
      ingresos: ingresos === null ? null : formatearCentimos(ingresos),
      comisionOriginal: original === null ? null : formatearCentimos(original),
      devolucionAsignada: devolucion === null ? null : formatearCentimos(devolucion),
      comisiones: neta === null ? null : formatearCentimos(neta),
      porcentajeEfectivo: porcentaje(ingresos, neta),
      estado: null,
      esTotal: true,
    },
  ];
}

function resumirMes(opciones: {
  banco: BancoPunteoId;
  anio: number;
  mes: number;
  movimientos: MovimientoInterno[];
  periodos: PeriodoBanco[];
  huecos: PeriodoBanco[];
  hoy: string;
  gastosRegistrados: ClaveGastoTpv[];
  hayHistorico: boolean;
  asignacion: Map<string, number>;
}): ResumenMes {
  const delMes = opciones.movimientos.filter(
    (movimiento) =>
      movimiento.banco === opciones.banco &&
      // Mes y año salen de la fecha de operación, nunca de la fecha valor.
      numeroAnio(movimiento.fecha) === opciones.anio &&
      numeroMes(movimiento.fecha) === opciones.mes &&
      (movimiento.clase === "tpv-ingreso" || movimiento.clase === "tpv-comision")
  );
  const hayIngresos = delMes.some((movimiento) => movimiento.clase === "tpv-ingreso");
  const hayComisiones = delMes.some((movimiento) => movimiento.clase === "tpv-comision");
  const ingresosCentimos = hayIngresos
    ? delMes
        .filter((movimiento) => movimiento.clase === "tpv-ingreso")
        .reduce((total, movimiento) => total + aCentimos(movimiento.importe), 0)
    : null;
  const originalCentimos = hayComisiones
    ? delMes
        .filter((movimiento) => movimiento.clase === "tpv-comision")
        .reduce((total, movimiento) => total + aCentimos(movimiento.importe), 0)
    : null;
  const devolucionCentimos = delMes
    .filter((movimiento) => movimiento.clase === "tpv-comision")
    .reduce((total, movimiento) => total + (opciones.asignacion.get(movimiento.id) ?? 0), 0);
  const hayDevolucion = devolucionCentimos !== 0;
  const netaCentimos =
    originalCentimos === null && !hayDevolucion ? null : (originalCentimos ?? 0) + devolucionCentimos;

  return {
    mes: opciones.mes,
    ingresosCentimos,
    originalCentimos: originalCentimos === null && !hayDevolucion ? null : (originalCentimos ?? 0),
    devolucionCentimos: netaCentimos === null ? null : devolucionCentimos,
    netaCentimos,
    estado: estadoMes(opciones, netaCentimos),
  };
}

export function comisionTpvDelMes(
  movimientos: MovimientoInterno[],
  banco: BancoPunteoId,
  anio: number,
  mes: number
) {
  const delMes = movimientos.filter(
    (movimiento) =>
      movimiento.banco === banco &&
      numeroAnio(movimiento.fecha) === anio &&
      numeroMes(movimiento.fecha) === mes &&
      movimiento.clase === "tpv-comision"
  );

  if (delMes.length === 0) {
    return null;
  }

  return desdeCentimos(delMes.reduce((total, movimiento) => total + aCentimos(movimiento.importe), 0));
}

function estadoMes(
  opciones: {
    banco: BancoPunteoId;
    anio: number;
    mes: number;
    movimientos: MovimientoInterno[];
    periodos: PeriodoBanco[];
    huecos: PeriodoBanco[];
    hoy: string;
    gastosRegistrados: ClaveGastoTpv[];
    hayHistorico: boolean;
  },
  netaCentimos: number | null
): EstadoMesTpv | null {
  if (!opciones.hayHistorico) {
    return null;
  }

  const registrado = opciones.gastosRegistrados.some(
    (gasto) =>
      gasto.banco === opciones.banco && gasto.anio === opciones.anio && gasto.mes === opciones.mes
  );

  if (registrado) {
    return "Guardado";
  }

  const inicioMes = isoDia(opciones.anio, opciones.mes, 1);
  const finMes = isoDia(opciones.anio, opciones.mes, diasDelMes(opciones.anio, opciones.mes));
  const primerDia = primerDiaCubierto(opciones.periodos, opciones.huecos, opciones.banco);
  const tieneTpv = opciones.movimientos.some(
    (movimiento) =>
      movimiento.banco === opciones.banco &&
      numeroAnio(movimiento.fecha) === opciones.anio &&
      numeroMes(movimiento.fecha) === opciones.mes &&
      (movimiento.clase === "tpv-ingreso" || movimiento.clase === "tpv-comision")
  );
  const mesActual =
    opciones.hoy.slice(0, 7) === `${opciones.anio}-${String(opciones.mes).padStart(2, "0")}`;
  const anteriorAlHistorico = primerDia !== null && finMes < primerDia;

  if ((opciones.hoy < inicioMes || anteriorAlHistorico) && !tieneTpv) {
    return null;
  }

  if (!primerDia && !tieneTpv) {
    return null;
  }

  if (mesActual && opciones.hoy <= finMes) {
    return "Mes en curso";
  }

  if (opciones.hoy < inicioMes) {
    return null;
  }

  if (!mesCubierto(opciones.anio, opciones.mes, opciones.periodos, opciones.huecos, opciones.banco)) {
    return "Pendiente de completar";
  }

  if (netaCentimos === null || netaCentimos === 0) {
    return null;
  }

  return "Sin autorizar";
}

function primerDiaCubierto(periodos: PeriodoBanco[], huecos: PeriodoBanco[], banco: BancoPunteoId) {
  const dias = [...periodos, ...huecos]
    .filter((periodo) => periodo.banco === banco)
    .map((periodo) => periodo.desde)
    .sort();

  return dias[0] ?? null;
}

function mesCubierto(
  anio: number,
  mes: number,
  periodos: PeriodoBanco[],
  huecos: PeriodoBanco[],
  banco: BancoPunteoId
) {
  const total = diasDelMes(anio, mes);

  for (let dia = 1; dia <= total; dia += 1) {
    const iso = isoDia(anio, mes, dia);
    const cubierto = [...periodos, ...huecos].some(
      (periodo) => periodo.banco === banco && periodo.desde <= iso && periodo.hasta >= iso
    );

    if (!cubierto) {
      return false;
    }
  }

  return true;
}

function filaMes(mes: ResumenMes): FilaResumenTpv {
  return {
    id: `mes-${mes.mes}`,
    mes: MESES_PUNTEO[mes.mes - 1],
    ingresos: mes.ingresosCentimos === null ? null : formatearCentimos(mes.ingresosCentimos),
    comisionOriginal: mes.originalCentimos === null ? null : formatearCentimos(mes.originalCentimos),
    devolucionAsignada: mes.devolucionCentimos === null ? null : formatearCentimos(mes.devolucionCentimos),
    comisiones: mes.netaCentimos === null ? null : formatearCentimos(mes.netaCentimos),
    porcentajeEfectivo: porcentaje(mes.ingresosCentimos, mes.netaCentimos),
    estado: mes.estado,
  };
}

function porcentaje(ingresosCentimos: number | null, netaCentimos: number | null) {
  if (ingresosCentimos === null || netaCentimos === null || ingresosCentimos <= 0) {
    return null;
  }

  const centesimas = Math.round((Math.abs(netaCentimos) * 10000) / ingresosCentimos);
  return `${formatearCentimos(centesimas)} %`;
}

function numeroAnio(iso: string) {
  return Number(iso.slice(0, 4));
}

function numeroMes(iso: string) {
  return Number(iso.slice(5, 7));
}

function diasDelMes(anio: number, mes: number) {
  return new Date(Date.UTC(anio, mes, 0)).getUTCDate();
}

function isoDia(anio: number, mes: number, dia: number) {
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
