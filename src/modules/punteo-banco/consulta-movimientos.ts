import { formatearCentimos } from "./centimos";
import {
  encajaFiltroLocal,
  type AmbitoConsulta,
  type ColumnaOrdenPunteo,
  type FiltroLocal,
  type LocalPunteo,
} from "./locales-punteo";

export const CLASES_CONSULTA_ORDINARIA = ["normal", "credito-cuota", "pendiente-clasificacion"] as const;
export const CLASES_CONSULTA_TPV = [
  "tpv-ingreso",
  "tpv-comision",
  "tpv-mantenimiento",
  "tpv-devolucion",
] as const;

export type ConsultaMovimiento = {
  id: number;
  fecha: string;
  fechaValor: string;
  importeCentimos: number;
  saldoCentimos: number;
  concepto: string;
  conceptoOriginal: string;
  conceptoNormalizado: string;
  detallesOriginales: string;
  observaciones: string;
  nuestroConcepto?: string;
  local: LocalPunteo | null;
  estado: string;
  clase: string;
  motivoEstado: string;
  origenEstado: string;
  referencias: string[];
  ordenBanco: number;
  filaExcel: number;
  clave?: string;
};

export type OpcionesConsulta = {
  filtroLocal: FiltroLocal;
  busqueda: string;
  columna: ColumnaOrdenPunteo;
  ascendente: boolean;
  ambito: AmbitoConsulta;
  desde: number;
  limite: number;
};

export function argumentosConsulta(opciones: {
  banco: string;
  anio: number;
  filtroLocal: FiltroLocal;
  busqueda: string;
  columna: ColumnaOrdenPunteo;
  ascendente: boolean;
  ambito: AmbitoConsulta;
  desde: number;
  limite: number;
}) {
  return {
    p_banco: opciones.banco,
    p_anio: opciones.anio,
    p_filtro_local: opciones.filtroLocal,
    p_busqueda: opciones.busqueda,
    p_orden: opciones.columna,
    p_ascendente: opciones.ascendente,
    p_ambito: opciones.ambito,
    p_desde: opciones.desde,
    p_limite: opciones.limite,
  };
}

export function textoConsultable(fila: ConsultaMovimiento) {
  const estado =
    fila.estado === "pendiente" ? "Pendiente" : fila.estado === "comprobar" ? "Pendiente" : fila.estado === "ok" ? "OK" : fila.estado;
  const clase =
    fila.clase === "tpv-ingreso"
      ? "ingreso"
      : fila.clase === "tpv-comision"
        ? "comision comisión"
        : fila.clase === "tpv-devolucion"
          ? "devolucion devolución"
          : fila.clase === "tpv-mantenimiento"
            ? "mantenimiento"
            : fila.clase.split("-").join(" ");

  return [
    fila.fecha,
    fechaTexto(fila.fecha),
    fila.fechaValor,
    fechaTexto(fila.fechaValor),
    textoImporte(fila.importeCentimos),
    textoImporte(fila.saldoCentimos),
    fila.concepto,
    fila.conceptoOriginal,
    fila.conceptoNormalizado,
    fila.detallesOriginales,
    fila.observaciones,
    fila.nuestroConcepto ?? "",
    fila.local ?? "Sin asignar",
    fila.estado,
    estado,
    fila.clase,
    clase,
    fila.motivoEstado,
    fila.origenEstado,
    fila.referencias.join(" "),
    String(fila.ordenBanco),
    String(fila.filaExcel),
  ]
    .join(" ")
    .toLowerCase();
}

export function coincideBusqueda(fila: ConsultaMovimiento, busqueda: string) {
  const texto = busqueda.trim().toLowerCase();

  if (!texto) {
    return true;
  }

  return textoConsultable(fila).includes(texto);
}

export function consultarMovimientos(filas: ConsultaMovimiento[], opciones: OpcionesConsulta) {
  const clases = opciones.ambito === "tpv" ? CLASES_CONSULTA_TPV : CLASES_CONSULTA_ORDINARIA;
  const admitidas = new Set<string>(clases);
  const filtradas = filas.filter(
    (fila) =>
      admitidas.has(fila.clase) &&
      encajaFiltroLocal(fila.local, opciones.filtroLocal) &&
      coincideBusqueda(fila, opciones.busqueda)
  );
  const ordenadas = [...filtradas].sort((a, b) => compararConsulta(a, b, opciones.columna, opciones.ascendente));
  const desde = Math.max(0, opciones.desde);
  const limite = Math.max(1, opciones.limite);
  const pagina = ordenadas.slice(desde, desde + limite);

  return {
    filas: pagina,
    hayMas: desde + limite < ordenadas.length,
  };
}

export function compararConsulta(
  a: ConsultaMovimiento,
  b: ConsultaMovimiento,
  columna: ColumnaOrdenPunteo,
  ascendente: boolean
) {
  const primario = compararClave(claveOrden(a, columna), claveOrden(b, columna), ascendente);

  if (primario !== 0) {
    return primario;
  }

  if (columna === "orden_banco") {
    return ascendente ? a.id - b.id : b.id - a.id;
  }

  return b.ordenBanco - a.ordenBanco || b.id - a.id;
}

export function anexarSinDuplicar<T extends { id: number }>(existentes: T[], nuevas: T[]) {
  const ids = new Set(existentes.map((fila) => fila.id));
  return [...existentes, ...nuevas.filter((fila) => !ids.has(fila.id))];
}

export function recorrerConsulta(filas: ConsultaMovimiento[], opciones: Omit<OpcionesConsulta, "desde"> & { tamano: number }) {
  const reunidas: ConsultaMovimiento[] = [];
  let desde = 0;

  for (let paso = 0; paso < filas.length + 2; paso += 1) {
    const pagina = consultarMovimientos(filas, {
      ...opciones,
      desde,
      limite: opciones.tamano,
    });
    const antes = reunidas.length;
    const siguientes = anexarSinDuplicar(reunidas, pagina.filas);

    if (siguientes.length !== antes + pagina.filas.length) {
      return { filas: siguientes, duplicada: true, completa: false };
    }

    reunidas.splice(0, reunidas.length, ...siguientes);
    desde += pagina.filas.length;

    if (!pagina.hayMas) {
      return { filas: reunidas, duplicada: false, completa: true };
    }
  }

  return { filas: reunidas, duplicada: false, completa: false };
}

function claveOrden(fila: ConsultaMovimiento, columna: ColumnaOrdenPunteo): { nulo: boolean; valor: number | string } {
  switch (columna) {
    case "fecha_operacion":
      return { nulo: false, valor: fila.fecha };
    case "fecha_valor":
      return fila.fechaValor ? { nulo: false, valor: fila.fechaValor } : { nulo: true, valor: "" };
    case "importe":
      return { nulo: false, valor: fila.importeCentimos };
    case "concepto":
      return { nulo: false, valor: fila.conceptoOriginal };
    case "observaciones":
      return { nulo: false, valor: fila.observaciones };
    case "local":
      return fila.local ? { nulo: false, valor: fila.local } : { nulo: true, valor: "" };
    case "estado":
      return { nulo: false, valor: fila.estado };
    case "orden_banco":
      return { nulo: false, valor: fila.ordenBanco };
  }
}

function compararClave(
  a: { nulo: boolean; valor: number | string },
  b: { nulo: boolean; valor: number | string },
  ascendente: boolean
) {
  if (a.nulo && b.nulo) {
    return 0;
  }

  if (a.nulo) {
    return 1;
  }

  if (b.nulo) {
    return -1;
  }

  const base =
    typeof a.valor === "number" && typeof b.valor === "number"
      ? a.valor - b.valor
      : String(a.valor).localeCompare(String(b.valor), "es", { sensitivity: "base" });

  return ascendente ? base : -base;
}

function fechaTexto(iso: string) {
  const [ano, mes, dia] = iso.split("-");

  if (!ano || !mes || !dia) {
    return "";
  }

  return `${dia}/${mes}/${ano}`;
}

function textoImporte(centimos: number) {
  const agrupado = formatearCentimos(centimos);
  const negativo = centimos < 0;
  const absoluto = Math.abs(centimos);
  const euros = Math.trunc(absoluto / 100);
  const resto = String(absoluto % 100).padStart(2, "0");
  const signo = negativo ? "-" : "";

  return `${agrupado} ${signo}${euros},${resto} ${signo}${euros}.${resto} ${centimos}`;
}
