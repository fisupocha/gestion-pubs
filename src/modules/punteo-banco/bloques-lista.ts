export type FilaOrdenada = {
  id: number;
  ordenBanco: number;
};

export const TAMANO_BLOQUE = 100;

export function unirBloque<T extends FilaOrdenada>(existentes: T[], nuevas: T[]): T[] {
  const ids = new Set(existentes.map((fila) => fila.id));
  const minimo = existentes.reduce(
    (menor, fila) => Math.min(menor, fila.ordenBanco),
    Number.POSITIVE_INFINITY
  );
  const anadidas: T[] = [];

  for (const fila of nuevas) {
    if (ids.has(fila.id) || fila.ordenBanco >= minimo) {
      continue;
    }

    ids.add(fila.id);
    anadidas.push(fila);
  }

  return [...existentes, ...anadidas];
}

export function ordenContinuo(filas: FilaOrdenada[]) {
  return filas.every((fila, indice) => indice === 0 || filas[indice - 1].ordenBanco > fila.ordenBanco);
}
