export type PeriodoExtracto = {
  desde: string;
  hasta: string;
};

export type PeriodoPendiente = {
  desde: string;
  hasta: string | null;
};

export type CoberturaExtracto = {
  ultimoDiaCubierto: string | null;
  proximoPeriodoPendiente: PeriodoPendiente | null;
  saltosSinConfirmar: PeriodoExtracto[];
};

const DIA_MS = 86400000;

function coberturaVacia(): CoberturaExtracto {
  return {
    ultimoDiaCubierto: null,
    proximoPeriodoPendiente: null,
    saltosSinConfirmar: [],
  };
}

function esFechaIsoReal(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [ano, mes, dia] = value.split("-").map(Number);
  const fecha = new Date(Date.UTC(ano, mes - 1, dia));

  return (
    fecha.getUTCFullYear() === ano &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

function aUtc(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return Date.UTC(ano, mes - 1, dia);
}

function desdeUtc(ms: number) {
  const fecha = new Date(ms);
  const ano = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function sumarDias(iso: string, dias: number) {
  return desdeUtc(aUtc(iso) + dias * DIA_MS);
}

function normalizarPeriodo(periodo: PeriodoExtracto): PeriodoExtracto | null {
  const desde = periodo.desde.trim();
  const hasta = periodo.hasta.trim();

  if (!esFechaIsoReal(desde) || !esFechaIsoReal(hasta)) {
    return null;
  }

  if (desde <= hasta) {
    return { desde, hasta };
  }

  return { desde: hasta, hasta: desde };
}

function fusionarPeriodos(periodos: PeriodoExtracto[]) {
  const ordenados = periodos
    .map(normalizarPeriodo)
    .filter((periodo): periodo is PeriodoExtracto => periodo !== null)
    .sort((a, b) => a.desde.localeCompare(b.desde) || a.hasta.localeCompare(b.hasta));

  const fusionados: PeriodoExtracto[] = [];

  ordenados.forEach((periodo) => {
    const ultimo = fusionados[fusionados.length - 1];

    if (!ultimo) {
      fusionados.push({ ...periodo });
      return;
    }

    const limite = sumarDias(ultimo.hasta, 1);

    if (periodo.desde <= limite) {
      if (periodo.hasta > ultimo.hasta) {
        ultimo.hasta = periodo.hasta;
      }
      return;
    }

    fusionados.push({ ...periodo });
  });

  return fusionados;
}

function periodoCubre(periodo: PeriodoExtracto, desde: string, hasta: string) {
  return periodo.desde <= desde && periodo.hasta >= hasta;
}

function huecoConfirmado(desde: string, hasta: string, huecosConfirmados: PeriodoExtracto[]) {
  return fusionarPeriodos(huecosConfirmados).some((periodo) =>
    periodoCubre(periodo, desde, hasta)
  );
}

export function calcularCoberturaExtracto(
  periodosImportados: PeriodoExtracto[],
  huecosConfirmados: PeriodoExtracto[] = []
): CoberturaExtracto {
  const bloques = fusionarPeriodos(periodosImportados);

  if (bloques.length === 0) {
    return coberturaVacia();
  }

  const saltosSinConfirmar: PeriodoExtracto[] = [];

  for (let indice = 0; indice < bloques.length - 1; indice += 1) {
    const desde = sumarDias(bloques[indice].hasta, 1);
    const hasta = sumarDias(bloques[indice + 1].desde, -1);

    if (desde <= hasta && !huecoConfirmado(desde, hasta, huecosConfirmados)) {
      saltosSinConfirmar.push({ desde, hasta });
    }
  }

  let ultimoDiaCubierto = bloques[0].hasta;

  for (let indice = 1; indice < bloques.length; indice += 1) {
    const desde = sumarDias(bloques[indice - 1].hasta, 1);
    const hasta = sumarDias(bloques[indice].desde, -1);
    const hayHueco = desde <= hasta;

    if (hayHueco && !huecoConfirmado(desde, hasta, huecosConfirmados)) {
      break;
    }

    ultimoDiaCubierto = bloques[indice].hasta;
  }

  const siguiente = sumarDias(ultimoDiaCubierto, 1);
  const saltoInmediato = saltosSinConfirmar.find((salto) => salto.desde === siguiente) ?? null;

  return {
    ultimoDiaCubierto,
    proximoPeriodoPendiente: saltoInmediato
      ? { desde: saltoInmediato.desde, hasta: saltoInmediato.hasta }
      : { desde: siguiente, hasta: null },
    saltosSinConfirmar,
  };
}
