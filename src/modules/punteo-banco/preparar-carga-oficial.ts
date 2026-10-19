import { ordenarPorCadena } from "./continuidad-saldo";
import type { BancoPunteoId } from "./modelo";
import type { MovimientoInterno } from "./movimiento-interno";

export const FECHA_CORTE_HISTORICO = "2026-09-30";

export type LlamadaCarga = "historica" | "ordinaria";

export type PlanCargaOficial = {
  banco: BancoPunteoId;
  garantizada: boolean;
  aviso: string;
  historico: MovimientoInterno[];
  ordinario: MovimientoInterno[];
  llamadas: LlamadaCarga[];
};

export function prepararCargaOficial(banco: BancoPunteoId, movimientos: MovimientoInterno[]): PlanCargaOficial {
  if (movimientos.length === 0) {
    return sinGarantia(banco, "El archivo no trae movimientos. No se envía nada a la base.");
  }

  if (movimientos.some((movimiento) => movimiento.banco !== banco)) {
    return sinGarantia(banco, "El archivo mezcla bancos. No se envía nada a la base.");
  }

  if (movimientos.some((movimiento) => movimiento.saldo === null)) {
    return sinGarantia(
      banco,
      "Hay movimientos sin saldo. La vista previa no puede garantizar la importación y no se envía nada a la base."
    );
  }

  const orden = ordenarPorCadena(movimientos);

  if (orden.estado !== "ok") {
    return sinGarantia(
      banco,
      "La vista previa no puede garantizar la importación: la cadena de saldos no cuadra al céntimo. No se envía nada a la base. La base de datos será la autoridad cuando el archivo se pueda comprobar."
    );
  }

  const historico = orden.secuencia.filter((movimiento) => movimiento.fecha <= FECHA_CORTE_HISTORICO);
  const ordinario = orden.secuencia.filter((movimiento) => movimiento.fecha > FECHA_CORTE_HISTORICO);
  const llamadas: LlamadaCarga[] = [];

  if (historico.length > 0) {
    llamadas.push("historica");
  }

  if (ordinario.length > 0) {
    llamadas.push("ordinaria");
  }

  const aviso =
    llamadas.length === 2
      ? "El archivo se separa solo en memoria en el 30/09/2026. Son dos confirmaciones independientes. Si la parte posterior falla, el histórico confirmado no se borra. Los Excel no se modifican. La base de datos es la autoridad."
      : llamadas[0] === "historica"
        ? "La vista previa local cuadra al céntimo. Al confirmar se llamará solo a punteo_confirmar_carga_historica. Los Excel no se modifican. La base de datos es la autoridad."
        : "La vista previa local cuadra al céntimo. Al confirmar se llamará solo a punteo_confirmar_importacion. Los Excel no se modifican. La base de datos es la autoridad.";

  return {
    banco,
    garantizada: true,
    aviso,
    historico,
    ordinario,
    llamadas,
  };
}

function sinGarantia(banco: BancoPunteoId, aviso: string): PlanCargaOficial {
  return {
    banco,
    garantizada: false,
    aviso,
    historico: [],
    ordinario: [],
    llamadas: [],
  };
}
