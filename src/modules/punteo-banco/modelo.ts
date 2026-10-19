import type { CoberturaExtracto, PeriodoExtracto } from "./cobertura-extracto";

export const BANCOS_PUNTEO = [
  { id: "caixabank", nombre: "CaixaBank" },
  { id: "ibercaja", nombre: "Ibercaja" },
] as const;

export type BancoPunteoId = (typeof BANCOS_PUNTEO)[number]["id"];

export const ANIO_INICIAL_PUNTEO = 2026;

export const ANIOS_PUNTEO = Array.from({ length: 10 }, (_, indice) => ANIO_INICIAL_PUNTEO + indice);

export const MESES_PUNTEO = [
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
] as const;

export const ESTADOS_MES_TPV = [
  "Mes en curso",
  "Pendiente de completar",
  "Guardar",
  "Guardado",
] as const;

export type EstadoMesTpv = (typeof ESTADOS_MES_TPV)[number];

export type EstadoOk = "pendiente" | "comprobar" | "ok";

export type OrdenOk = "original" | "pendientes";

export type MovimientoPunteo = {
  id: string;
  /** Fecha de operación. En Ibercaja es la "Fecha operación" original. */
  fecha: string;
  /** Fecha valor, solo informativa. */
  fechaValor: string;
  importe: string;
  concepto: string;
  observaciones: string;
  ok: EstadoOk;
  /** Posición en la secuencia bancaria. El número alto es el más reciente. No es la fecha. */
  orden: number;
};

export type BorradorBanco = {
  movimientos: MovimientoPunteo[];
  periodosImportados: PeriodoExtracto[];
  huecosConfirmados: PeriodoExtracto[];
};

export type FilaResumenTpv = {
  id: string;
  mes: string;
  ingresos: string | null;
  comisiones: string | null;
  porcentajeEfectivo: string | null;
  estado: EstadoMesTpv | null;
  /** Texto de la celda de estado cuando la cifra no puede ofrecerse como definitiva. */
  aviso?: string | null;
  esTotal?: boolean;
};

export function nombreBanco(id: BancoPunteoId) {
  return BANCOS_PUNTEO.find((banco) => banco.id === id)?.nombre ?? id;
}

export function claveBancoAnio(banco: BancoPunteoId, anio: number) {
  return `${banco}:${anio}`;
}

export function borradorVacio(): BorradorBanco {
  return {
    movimientos: [],
    periodosImportados: [],
    huecosConfirmados: [],
  };
}

export function serializarBorrador(borrador: BorradorBanco) {
  return JSON.stringify(borrador);
}

export function formatearFechaIso(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function textoUltimoDiaCubierto(cobertura: CoberturaExtracto) {
  if (!cobertura.ultimoDiaCubierto) {
    return "Sin extracto confirmado";
  }

  return formatearFechaIso(cobertura.ultimoDiaCubierto);
}

export function textoProximoPeriodo(cobertura: CoberturaExtracto) {
  const proximo = cobertura.proximoPeriodoPendiente;

  if (!proximo) {
    return "Pendiente de la primera importación confirmada";
  }

  if (proximo.hasta) {
    return `Del ${formatearFechaIso(proximo.desde)} al ${formatearFechaIso(proximo.hasta)}`;
  }

  return `A partir del ${formatearFechaIso(proximo.desde)}`;
}

export function filasTpvSinDatos(): FilaResumenTpv[] {
  return [
    ...MESES_PUNTEO.map((mes, indice) => ({
      id: `mes-${indice + 1}`,
      mes,
      ingresos: null,
      comisiones: null,
      porcentajeEfectivo: null,
      estado: null,
    })),
    {
      id: "total",
      mes: "Total",
      ingresos: null,
      comisiones: null,
      porcentajeEfectivo: null,
      estado: null,
      esTotal: true,
    },
  ];
}

function compararSecuenciaBancaria<T extends { orden: number; id: string }>(a: T, b: T) {
  return b.orden - a.orden || a.id.localeCompare(b.id);
}

/**
 * La presentación invierte la secuencia bancaria completa: el más reciente queda arriba.
 * No ordena por fecha. El campo `orden` interno no se modifica.
 */
export function ordenarMovimientos<T extends { id: string; ok: EstadoOk; orden: number }>(
  movimientos: T[],
  orden: OrdenOk
) {
  const secuencia = [...movimientos].sort(compararSecuenciaBancaria);

  if (orden === "original") {
    return secuencia;
  }

  const peso = (ok: EstadoOk) => (ok === "pendiente" ? 0 : ok === "comprobar" ? 1 : 2);

  return secuencia.sort((a, b) => peso(a.ok) - peso(b.ok) || compararSecuenciaBancaria(a, b));
}
