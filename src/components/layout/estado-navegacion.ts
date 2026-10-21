export function marcaCargaVisible(aviso: {
  pendienteEnlace: boolean;
  href: string;
  rutaActual: string;
}): boolean {
  return aviso.pendienteEnlace && aviso.href !== aviso.rutaActual;
}

export type AvisoEnlace = {
  href: string;
  pending: boolean;
};

export function enlacesConCarga(enlaces: AvisoEnlace[], rutaActual: string): string[] {
  return enlaces
    .filter((enlace) =>
      marcaCargaVisible({
        pendienteEnlace: enlace.pending,
        href: enlace.href,
        rutaActual,
      })
    )
    .map((enlace) => enlace.href);
}

export type HechoNavegacion =
  | { tipo: "pedir"; href: string; id: number }
  | { tipo: "llegar"; href: string }
  | { tipo: "fallar"; id: number };

export type NavegacionVisible = {
  ruta: string;
  destino: string | null;
  generacion: number;
};

export function simularNavegacion(hechos: HechoNavegacion[]): NavegacionVisible {
  let ruta = "";
  let destino: string | null = null;
  let generacion = 0;

  for (const hecho of hechos) {
    if (hecho.tipo === "pedir") {
      destino = hecho.href;
      generacion = hecho.id;
      continue;
    }

    if (hecho.tipo === "llegar") {
      ruta = hecho.href;
      if (destino === hecho.href) {
        destino = null;
      }
      continue;
    }

    if (generacion === hecho.id) {
      destino = null;
    }
  }

  return { ruta, destino, generacion };
}
