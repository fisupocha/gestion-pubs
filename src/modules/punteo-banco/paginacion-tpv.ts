import { formatearCentimos } from "./centimos";
import type { EstadoMesTpv, FilaResumenTpv } from "./modelo";
import { MESES_PUNTEO } from "./modelo";

export const TAMANO_PAGINA_TPV = 1000;

export type DecisionPaginaTpv = "seguir" | "completa" | "incompleta";

export type SumaTpv = {
  ingresosCentimos: number;
  comisionesCentimos: number;
};

export type MesTpvOficial = {
  mes: number;
  ingresosCentimos: number;
  comisionesCentimos: number;
  incompleto: boolean;
};

export function decisionPaginaTpv(
  filasRecibidas: number,
  tamano: number,
  huboError: boolean
): DecisionPaginaTpv {
  if (huboError) {
    return "incompleta";
  }

  if (filasRecibidas < tamano) {
    return "completa";
  }

  return "seguir";
}

export function sumarImportesTpv(filas: { clase: string; importe_centimos: number }[]): SumaTpv {
  let ingresosCentimos = 0;
  let comisionesCentimos = 0;

  filas.forEach((fila) => {
    if (fila.clase === "tpv-ingreso") {
      ingresosCentimos += fila.importe_centimos;
    }

    if (fila.clase === "tpv-comision") {
      comisionesCentimos += fila.importe_centimos;
    }
  });

  return { ingresosCentimos, comisionesCentimos };
}

export function presentarTpvOficial(meses: MesTpvOficial[]): FilaResumenTpv[] {
  const porMes = new Map(meses.map((mes) => [mes.mes, mes]));
  const filas = Array.from({ length: 12 }, (_, indice) => filaDeMes(indice + 1, porMes.get(indice + 1)));
  const algunoIncompleto = meses.some((mes) => mes.incompleto);
  const todosPresentes = Array.from({ length: 12 }, (_, indice) => indice + 1).every((mes) => porMes.has(mes));

  if (!todosPresentes || algunoIncompleto) {
    return [
      ...filas,
      {
        id: "total",
        mes: "Total",
        ingresos: null,
        comisiones: null,
        porcentajeEfectivo: null,
        estado: null,
        aviso: algunoIncompleto ? "Incompleto" : null,
        esTotal: true,
      },
    ];
  }

  const ingresos = meses.reduce((total, mes) => total + mes.ingresosCentimos, 0);
  const comisiones = meses.reduce((total, mes) => total + mes.comisionesCentimos, 0);

  return [
    ...filas,
    {
      id: "total",
      mes: "Total",
      ingresos: formatearCentimos(ingresos),
      comisiones: formatearCentimos(comisiones),
      porcentajeEfectivo: porcentaje(ingresos, comisiones),
      estado: null,
      esTotal: true,
    },
  ];
}

export function mesTpvUtilizable(mes: MesTpvOficial | undefined) {
  return Boolean(mes && !mes.incompleto);
}

function filaDeMes(numero: number, mes: MesTpvOficial | undefined): FilaResumenTpv {
  if (!mes || mes.incompleto) {
    return {
      id: `mes-${numero}`,
      mes: MESES_PUNTEO[numero - 1],
      ingresos: null,
      comisiones: null,
      porcentajeEfectivo: null,
      estado: null,
      aviso: mes?.incompleto ? "Incompleto" : null,
    };
  }

  const hayCifras = mes.ingresosCentimos !== 0 || mes.comisionesCentimos !== 0;
  const estado: EstadoMesTpv | null = mes.comisionesCentimos !== 0 ? "Sin autorizar" : null;

  return {
    id: `mes-${numero}`,
    mes: MESES_PUNTEO[numero - 1],
    ingresos: hayCifras ? formatearCentimos(mes.ingresosCentimos) : null,
    comisiones: hayCifras ? formatearCentimos(mes.comisionesCentimos) : null,
    porcentajeEfectivo: hayCifras ? porcentaje(mes.ingresosCentimos, mes.comisionesCentimos) : null,
    estado,
  };
}

function porcentaje(ingresosCentimos: number, comisionesCentimos: number) {
  if (ingresosCentimos <= 0) {
    return null;
  }

  const centesimas = Math.round((Math.abs(comisionesCentimos) * 10000) / ingresosCentimos);
  return `${formatearCentimos(centesimas)} %`;
}
