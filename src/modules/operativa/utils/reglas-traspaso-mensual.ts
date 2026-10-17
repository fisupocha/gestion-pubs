// Los meses anteriores a estas fechas se cargaron a mano.
// El traspaso automático no puede sustituirlos.

const INICIO_CAJA_DIARIA = "2026-04-01";
const INICIO_CUADRANTE_PERSONAL = "2026-03-01";
const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

export type FilaTraspasoCuadrante = {
  local: string;
  familia: string;
  importe: number;
};

function normalizarFamilia(familia: string) {
  return familia
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function esFamiliaPersonalOficina(familia: string) {
  const normalizada = normalizarFamilia(familia);
  return normalizada === "pers ofi" || normalizada === "personal de oficina";
}

export function cajaDiariaPuedeSustituirMes(fecha: string) {
  return FECHA_VALIDA.test(fecha) && fecha >= INICIO_CAJA_DIARIA;
}

export function cuadrantePuedeSustituirMes(fecha: string) {
  return FECHA_VALIDA.test(fecha) && fecha >= INICIO_CUADRANTE_PERSONAL;
}

export function filasTraspasoCuadrante<T extends FilaTraspasoCuadrante>(filas: T[]) {
  return filas.filter((fila) => !esFamiliaPersonalOficina(fila.familia));
}
