export type ConsultaState = {
  localesSeleccionados: string[];
  desde: string;
  hasta: string;
  modoIva: "con" | "sin";
  tiposSeleccionados: string[];
  familiasSeleccionadas: string[];
  subfamiliasSeleccionadas: string[];
};

export const ESTADO_CONSULTA_INICIAL: ConsultaState = {
  localesSeleccionados: [],
  desde: "",
  hasta: "",
  modoIva: "con",
  tiposSeleccionados: [],
  familiasSeleccionadas: [],
  subfamiliasSeleccionadas: [],
};

export const CONSULTAS_STORAGE_KEY = "gestion-pubs:consultas-state";

type SearchParamsInput =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function readMany(input: SearchParamsInput, key: string) {
  if (input instanceof URLSearchParams) {
    return input.getAll(key).filter(Boolean);
  }

  const value = input[key];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return [value];
}

function readOne(input: SearchParamsInput, key: string) {
  const values = readMany(input, key);
  return values[0] ?? "";
}

export function consultaStateFromSearchParams(input: SearchParamsInput): ConsultaState {
  const modoIva = readOne(input, "iva") === "sin" ? "sin" : "con";

  return {
    localesSeleccionados: readMany(input, "local"),
    desde: readOne(input, "desde"),
    hasta: readOne(input, "hasta"),
    modoIva,
    tiposSeleccionados: readMany(input, "tipo"),
    familiasSeleccionadas: readMany(input, "fam"),
    subfamiliasSeleccionadas: readMany(input, "sub"),
  };
}

export function consultaStateToQueryString(state: ConsultaState) {
  const params = new URLSearchParams();

  state.localesSeleccionados.forEach((value) => params.append("local", value));
  state.tiposSeleccionados.forEach((value) => params.append("tipo", value));
  state.familiasSeleccionadas.forEach((value) => params.append("fam", value));
  state.subfamiliasSeleccionadas.forEach((value) => params.append("sub", value));

  if (state.desde) params.set("desde", state.desde);
  if (state.hasta) params.set("hasta", state.hasta);
  if (state.modoIva !== "con") params.set("iva", state.modoIva);

  return params.toString();
}

export function esEstadoConsultaVacio(state: ConsultaState) {
  return (
    state.localesSeleccionados.length === 0 &&
    state.desde === "" &&
    state.hasta === "" &&
    state.modoIva === "con" &&
    state.tiposSeleccionados.length === 0 &&
    state.familiasSeleccionadas.length === 0 &&
    state.subfamiliasSeleccionadas.length === 0
  );
}

export function normalizarConsultaState(value: unknown): ConsultaState {
  const input = typeof value === "object" && value !== null ? (value as Partial<ConsultaState>) : {};

  return {
    localesSeleccionados: Array.isArray(input.localesSeleccionados)
      ? input.localesSeleccionados.filter(Boolean)
      : [],
    desde: typeof input.desde === "string" ? input.desde : "",
    hasta: typeof input.hasta === "string" ? input.hasta : "",
    modoIva: input.modoIva === "sin" ? "sin" : "con",
    tiposSeleccionados: Array.isArray(input.tiposSeleccionados)
      ? input.tiposSeleccionados.filter(Boolean)
      : [],
    familiasSeleccionadas: Array.isArray(input.familiasSeleccionadas)
      ? input.familiasSeleccionadas.filter(Boolean)
      : [],
    subfamiliasSeleccionadas: Array.isArray(input.subfamiliasSeleccionadas)
      ? input.subfamiliasSeleccionadas.filter(Boolean)
      : [],
  };
}

export function leerConsultaStateGuardado() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CONSULTAS_STORAGE_KEY);
    if (!raw) return null;
    return normalizarConsultaState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function guardarConsultaState(state: ConsultaState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(CONSULTAS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // no-op
  }
}
