export function normalizarClave(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "")
    .toLowerCase()
    .trim();
}

export function normalizarTexto(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function hashEstable(value: string) {
  let hash = 2166136261;

  for (let indice = 0; indice < value.length; indice += 1) {
    hash ^= value.charCodeAt(indice);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function fechaIsoDesdeSerial(value: number) {
  const base = Date.UTC(1899, 11, 30);
  const fecha = new Date(base + value * 86400000);
  const ano = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function fechaIsoDesdeValor(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const ano = value.getFullYear();
    const mes = String(value.getMonth() + 1).padStart(2, "0");
    const dia = String(value.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 20000 && value < 80000) {
    return fechaIsoDesdeSerial(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  const texto = value.trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (iso) {
    return fechaValida(`${iso[1]}-${iso[2]}-${iso[3]}`);
  }

  const europea = texto.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);

  if (!europea) {
    return null;
  }

  const ano = europea[3].length === 2 ? `20${europea[3]}` : europea[3];
  return fechaValida(
    `${ano}-${europea[2].padStart(2, "0")}-${europea[1].padStart(2, "0")}`
  );
}

function fechaValida(iso: string) {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const fecha = new Date(Date.UTC(ano, mes - 1, dia));

  if (
    fecha.getUTCFullYear() !== ano ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }

  return iso;
}

export function importeDesdeValor(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return redondear(value);
  }

  if (typeof value !== "string") {
    return null;
  }

  let texto = value.trim().replace(/\s/g, "").replace(/€/g, "");

  if (!texto || texto === "-" || texto === "—") {
    return null;
  }

  let negativo = false;

  if (/^\(.*\)$/.test(texto)) {
    negativo = true;
    texto = texto.slice(1, -1);
  }

  if (texto.startsWith("-")) {
    negativo = true;
    texto = texto.slice(1);
  } else if (texto.startsWith("+")) {
    texto = texto.slice(1);
  }

  if (texto.includes(",") && texto.includes(".")) {
    if (texto.lastIndexOf(",") > texto.lastIndexOf(".")) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else {
      texto = texto.replace(/,/g, "");
    }
  } else if (texto.includes(",")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  }

  const numero = Number(texto);

  if (!Number.isFinite(numero)) {
    return null;
  }

  return redondear(negativo ? -numero : numero);
}

export function redondear(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatearImporte(value: number) {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function textoCelda(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return fechaIsoDesdeValor(value) ?? "";
  }

  return String(value).trim();
}
