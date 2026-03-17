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
