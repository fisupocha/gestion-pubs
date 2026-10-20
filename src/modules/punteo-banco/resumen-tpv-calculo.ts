import { formatearImporte, redondear } from "./celdas";
import type { BancoPunteoId, EstadoMesTpv, FilaResumenTpv } from "./modelo";
import { MESES_PUNTEO } from "./modelo";
import type { MovimientoInterno, PeriodoBanco } from "./movimiento-interno";

export type ClaveGastoTpv = {
  banco: BancoPunteoId;
  anio: number;
  mes: number;
};

type ResumenMes = {
  mes: number;
  ingresos: number | null;
  comisiones: number | null;
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
  const meses = Array.from({ length: 12 }, (_, indice) =>
    resumirMes({ ...opciones, mes: indice + 1 })
  );
  const conDatos = meses.filter((mes) => mes.ingresos !== null || mes.comisiones !== null);
  const ingresos = conDatos.length
    ? redondear(conDatos.reduce((total, mes) => total + (mes.ingresos ?? 0), 0))
    : null;
  const comisiones = conDatos.length
    ? redondear(conDatos.reduce((total, mes) => total + (mes.comisiones ?? 0), 0))
    : null;

  return [
    ...meses.map((mes) => filaMes(mes)),
    {
      id: "total",
      mes: "Total",
      ingresos: ingresos === null ? null : formatearImporte(ingresos),
      comisiones: comisiones === null ? null : formatearImporte(comisiones),
      porcentajeEfectivo: porcentaje(ingresos, comisiones),
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
}): ResumenMes {
  const delMes = opciones.movimientos.filter(
    (movimiento) =>
      movimiento.banco === opciones.banco &&
      // Mes y año salen de la fecha de operación, nunca de la fecha valor.
      numeroAnio(movimiento.fecha) === opciones.anio &&
      numeroMes(movimiento.fecha) === opciones.mes &&
      (movimiento.clase === "tpv-ingreso" || movimiento.clase === "tpv-comision")
  );
  const ingresos = delMes.some((movimiento) => movimiento.clase === "tpv-ingreso")
    ? redondear(
        delMes
          .filter((movimiento) => movimiento.clase === "tpv-ingreso")
          .reduce((total, movimiento) => total + movimiento.importe, 0)
      )
    : null;
  const comisiones = delMes.some((movimiento) => movimiento.clase === "tpv-comision")
    ? redondear(
        delMes
          .filter((movimiento) => movimiento.clase === "tpv-comision")
          .reduce((total, movimiento) => total + movimiento.importe, 0)
      )
    : null;

  return {
    mes: opciones.mes,
    ingresos,
    comisiones,
    estado: estadoMes(opciones, comisiones),
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

  return redondear(delMes.reduce((total, movimiento) => total + movimiento.importe, 0));
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
  comisiones: number | null
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

  if (comisiones === null || comisiones === 0) {
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
    ingresos: mes.ingresos === null ? null : formatearImporte(mes.ingresos),
    comisiones: mes.comisiones === null ? null : formatearImporte(mes.comisiones),
    porcentajeEfectivo: porcentaje(mes.ingresos, mes.comisiones),
    estado: mes.estado,
  };
}

function porcentaje(ingresos: number | null, comisiones: number | null) {
  if (ingresos === null || comisiones === null || ingresos <= 0) {
    return null;
  }

  return `${formatearImporte(redondear((Math.abs(comisiones) / ingresos) * 100))} %`;
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
