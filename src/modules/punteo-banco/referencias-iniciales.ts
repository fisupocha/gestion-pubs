import type { BancoPunteoId } from "./modelo";

/**
 * Referencias iniciales confirmadas por el usuario.
 * Son el último movimiento de septiembre de 2026 de cada banco.
 * No son movimientos de octubre y no se crean como apuntes.
 */
export type ReferenciaMovimiento = {
  banco: BancoPunteoId;
  fecha: string;
  concepto: string;
  importe: number;
  saldo: number;
};

export const REFERENCIAS_INICIALES: Record<BancoPunteoId, ReferenciaMovimiento> = {
  caixabank: {
    banco: "caixabank",
    fecha: "2026-09-30",
    concepto: "Pagaré",
    importe: -465.54,
    saldo: -9128.52,
  },
  ibercaja: {
    banco: "ibercaja",
    fecha: "2026-09-30",
    concepto: "Operación en cajero automático",
    importe: -500,
    saldo: 7534.64,
  },
};

export function referenciaVigente(
  banco: BancoPunteoId,
  guardadas: ReferenciaMovimiento[]
) {
  return guardadas.find((referencia) => referencia.banco === banco) ?? REFERENCIAS_INICIALES[banco];
}
