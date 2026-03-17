"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CampoFecha } from "@/components/ui/campo-fecha";
import type { ClasificacionMapa } from "@/lib/clasificacion";
import type { MaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";

const PROVEEDORES = [
  "JULPER ARANJUEZ, S.L.",
  "DISTRIBUCIONES CENTRO",
  "COCACOLA EUROPACIFIC",
  "ASESORIA RIVERO",
];
const FORMAS_PAGO = ["BANCO"];
const BANCOS = ["CAIXABANK", "SANTANDER", "BBVA", "NINGUNO"];

type TipoClasificacion = string;

type FormularioFactura = {
  empresa: string;
  proveedor: string;
  fechaFactura: string;
  numeroFactura: string;
  tipo: TipoClasificacion | "";
  familia: string;
  subfamilia: string;
  base0: string;
  base4: string;
  base10: string;
  base21: string;
  pagado: boolean;
  fechaPago: string;
  formaPago: string;
  banco: string;
  numeroPagare: string;
  observaciones: string;
};

type AdjuntoTemporal = {
  file: File;
  url: string;
} | null;

type RegistroFactura = FormularioFactura & {
  id: number;
  adjunto: AdjuntoTemporal;
};

type DestinoNavegacion =
  | { tipo: "registro"; indice: number }
  | { tipo: "nuevo" };

function crearFormularioInicial(): FormularioFactura {
  return {
    empresa: "",
    proveedor: "",
    fechaFactura: "",
    numeroFactura: "",
    tipo: "",
    familia: "",
    subfamilia: "",
    base0: "",
    base4: "",
    base10: "",
    base21: "",
    pagado: true,
    fechaPago: "",
    formaPago: FORMAS_PAGO[0],
    banco: BANCOS[0],
    numeroPagare: "",
    observaciones: "",
  };
}

function formularioDesdeRegistro(registro: RegistroFactura): FormularioFactura {
  return {
    empresa: registro.empresa,
    proveedor: registro.proveedor,
    fechaFactura: registro.fechaFactura,
    numeroFactura: registro.numeroFactura,
    tipo: registro.tipo,
    familia: registro.familia,
    subfamilia: registro.subfamilia,
    base0: registro.base0,
    base4: registro.base4,
    base10: registro.base10,
    base21: registro.base21,
    pagado: true,
    fechaPago: registro.fechaFactura,
    formaPago: FORMAS_PAGO[0],
    banco: registro.banco,
    numeroPagare: registro.numeroPagare,
    observaciones: registro.observaciones,
  };
}

function crearSnapshot(formulario: FormularioFactura, adjunto: AdjuntoTemporal) {
  return JSON.stringify({
    ...formulario,
    adjunto: adjunto
      ? {
          nombre: adjunto.file.name,
          tamano: adjunto.file.size,
          fecha: adjunto.file.lastModified,
        }
      : null,
  });
}

function obtenerSiguienteId(registros: RegistroFactura[]) {
  return registros.length === 0 ? 1 : Math.max(...registros.map((registro) => registro.id)) + 1;
}

export const REGISTROS_PRUEBA: RegistroFactura[] = [];

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function parseDecimal(value?: string) {
  return Number((value ?? "").replace(",", ".")) || 0;
}

function normalizarImporte(value: string) {
  const limpio = value.replace(/[^\d,.\-\s]/g, "").replace(/\s+/g, "");
  const negativo = limpio.startsWith("-") ? "-" : "";
  const sinSigno = limpio.replace(/-/g, "").replace(/\./g, ",");
  const partes = sinSigno.split(",");

  if (sinSigno === "" && negativo) {
    return "-";
  }

  if (partes.length === 1) {
    return `${negativo}${partes[0]}`;
  }

  return `${negativo}${partes[0]},${partes.slice(1).join("").slice(0, 2)}`;
}

function fmtMoney(value: number) {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizarTextoBusqueda(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function expandirVariantesFechaBusqueda(value: string) {
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!iso) {
    return [value];
  }

  const [, year, month, day] = iso;
  return [value, `${day}/${month}/${year}`, `${day}-${month}-${year}`];
}

function Bloque({
  titulo,
  children,
  className = "",
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[22px] border border-[#97adb1] bg-[linear-gradient(180deg,rgba(236,242,243,0.99)_0%,rgba(220,229,231,0.99)_100%)] p-3 shadow-[0_16px_34px_rgba(39,57,62,0.10)] 2xl:rounded-[24px] 2xl:p-4 2xl:shadow-[0_20px_40px_rgba(39,57,62,0.12)] ${className}`}
    >
      <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.22em] text-[#60767b] 2xl:mb-3 2xl:text-[11px] 2xl:tracking-[0.24em]">
        {titulo}
      </div>
      {children}
    </section>
  );
}

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[#64777b] 2xl:text-[11px] 2xl:tracking-[0.1em]">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[#b7c7ca] bg-[linear-gradient(180deg,#fbfdfd_0%,#edf2f3_100%)] px-3 py-2 text-center text-sm text-[#1f2e31] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_6px_14px_rgba(45,63,68,0.05)] outline-none transition placeholder:text-[#8b9ea3] focus:border-[#5f8e98] focus:bg-white focus:shadow-[0_0_0_3px_rgba(95,142,152,0.14)] 2xl:py-2.5";

const accionClassName =
  "min-w-[54px] rounded-2xl border border-[#adbec2] bg-[linear-gradient(180deg,#f8fbfb_0%,#dfe7e8_100%)] px-3 py-2 text-center text-sm font-semibold text-[#25383c] shadow-[0_10px_18px_rgba(45,63,68,0.10)] transition hover:border-[#73939a] hover:bg-[#f0f5f6] 2xl:min-w-[60px] 2xl:py-2.5";

const campoDeshabilitadoClassName =
  "cursor-not-allowed border-[#cfdadd] bg-[linear-gradient(180deg,#f8fbfb_0%,#e8eef0_100%)] text-[#7f9094] shadow-none opacity-70";

const tarjetaDeshabilitadaClassName =
  "rounded-2xl border border-[#cfdadd] bg-[linear-gradient(180deg,#f8fbfb_0%,#e8eef0_100%)] px-3.5 py-1.5 text-center opacity-70 shadow-none 2xl:px-4 2xl:py-2";

export function PantallaGastosBancarios({
  clasificacion,
  maestros,
}: {
  clasificacion?: ClasificacionMapa;
  maestros?: MaestrosFormulario;
}) {
  const clasificacionActiva: ClasificacionMapa = useMemo(() => clasificacion ?? {}, [clasificacion]);
  const opcionesLocal = maestros?.locales ?? [];
  const opcionesFormaPago = maestros?.formasPago ?? [];
  const opcionesBanco = maestros?.bancos ?? [];
  type CampoResaltable =
    | "fechaFactura"
    | "numeroFactura"
    | "base0"
    | "base4"
    | "base10"
    | "base21"
    | "fechaPago"
    | "numeroPagare"
    | "observaciones";

  const ultimoIndice = Math.max(REGISTROS_PRUEBA.length - 1, 0);
  const [registros, setRegistros] = useState<RegistroFactura[]>(REGISTROS_PRUEBA);
  const [indiceActual, setIndiceActual] = useState(ultimoIndice);
  const [modoNuevo, setModoNuevo] = useState(true);
  const [formulario, setFormulario] = useState<FormularioFactura>(() => crearFormularioInicial());
  const [archivoAdjunto, setArchivoAdjunto] = useState<AdjuntoTemporal>(null);
  const [snapshotInicial, setSnapshotInicial] = useState(() => crearSnapshot(crearFormularioInicial(), null));
  const [dialogoSalida, setDialogoSalida] = useState<{
    abierto: boolean;
    destino: DestinoNavegacion | null;
    cerrarBuscador: boolean;
  }>({
    abierto: false,
    destino: null,
    cerrarBuscador: false,
  });
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [busquedaExacta, setBusquedaExacta] = useState(false);
  const [mensajeBusqueda, setMensajeBusqueda] = useState<string | null>(null);
  const [resultadosBusqueda, setResultadosBusqueda] = useState<number[]>([]);
  const [indiceResultadoActual, setIndiceResultadoActual] = useState(-1);
  const [resaltadoBusqueda, setResaltadoBusqueda] = useState<{
    campo: CampoResaltable | null;
    token: number;
  }>({
    campo: null,
    token: 0,
  });
  const inputAdjuntoRef = useRef<HTMLInputElement | null>(null);
  const inputBusquedaRef = useRef<HTMLInputElement | null>(null);
  const fechaFacturaRef = useRef<HTMLInputElement | null>(null);
  const numeroFacturaRef = useRef<HTMLInputElement | null>(null);
  const base0Ref = useRef<HTMLInputElement | null>(null);
  const base4Ref = useRef<HTMLInputElement | null>(null);
  const base10Ref = useRef<HTMLInputElement | null>(null);
  const base21Ref = useRef<HTMLInputElement | null>(null);
  const fechaPagoRef = useRef<HTMLInputElement | null>(null);
  const numeroPagareRef = useRef<HTMLInputElement | null>(null);
  const observacionesRef = useRef<HTMLTextAreaElement | null>(null);

  const familiasDisponibles = useMemo(() => {
    if (!formulario.tipo) {
      return [];
    }

    const tipoConfig = clasificacionActiva[formulario.tipo];
    if (!tipoConfig) {
      return [];
    }

    return Object.entries(tipoConfig.familias).map(([id, item]) => ({
      id,
      label: item.label,
    }));
  }, [clasificacionActiva, formulario.tipo]);

  const subfamiliasDisponibles = useMemo(() => {
    if (!formulario.tipo || !formulario.familia) {
      return [];
    }

    const familias = (clasificacionActiva[formulario.tipo]?.familias ?? {}) as Record<
      string,
      {
        label: string;
        subfamilias: readonly string[];
      }
    >;

    return [...(familias[formulario.familia]?.subfamilias ?? [])];
  }, [clasificacionActiva, formulario.familia, formulario.tipo]);

  const base0 = parseDecimal(formulario.base0);
  const base4 = parseDecimal(formulario.base4);
  const base10 = parseDecimal(formulario.base10);
  const base21 = parseDecimal(formulario.base21);
  const totalBase = round2(base0 + base4 + base10);
  const totalIva = 0;
  const totalGasto = round2(base21);
  const idVisible = modoNuevo ? obtenerSiguienteId(registros) : (registros[indiceActual]?.id ?? 1);
  const snapshotActual = useMemo(
    () => crearSnapshot(formulario, archivoAdjunto),
    [archivoAdjunto, formulario]
  );
  const hayCambiosSinGuardar = snapshotActual !== snapshotInicial;
  const botonGuardado = !modoNuevo && !hayCambiosSinGuardar;
  const formularioValido =
    Boolean(formulario.empresa) &&
    Boolean(formulario.fechaFactura) &&
    Boolean(formulario.tipo) &&
    Boolean(formulario.familia) &&
    totalGasto !== 0;

  useEffect(() => {
    if (!resaltadoBusqueda.campo || resaltadoBusqueda.token === 0) {
      return;
    }

    const refs: Record<
      CampoResaltable,
      React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>
    > = {
      fechaFactura: fechaFacturaRef,
      numeroFactura: numeroFacturaRef,
      base0: base0Ref,
      base4: base4Ref,
      base10: base10Ref,
      base21: base21Ref,
      fechaPago: fechaPagoRef,
      numeroPagare: numeroPagareRef,
      observaciones: observacionesRef,
    };

    const objetivo = refs[resaltadoBusqueda.campo].current;

    if (!objetivo) {
      return;
    }

    objetivo.focus();

    if ("select" in objetivo) {
      objetivo.select();
    }

  }, [resaltadoBusqueda]);

  useEffect(() => {
    if (!buscadorAbierto) {
      return;
    }

    inputBusquedaRef.current?.focus();
  }, [buscadorAbierto]);

  function cambiarCampo<K extends keyof FormularioFactura>(
    campo: K,
    valor: FormularioFactura[K]
  ) {
    setFormulario((prev) => ({
      ...prev,
      [campo]: valor,
      ...(campo === "fechaFactura" ? { fechaPago: String(valor) } : {}),
    }));
  }

  function cambiarTipo(nextTipo: TipoClasificacion) {
    setFormulario((prev) => ({
      ...prev,
      tipo: nextTipo,
      familia: "",
      subfamilia: "",
    }));
  }

  function cambiarFamilia(nextFamilia: string) {
    setFormulario((prev) => ({
      ...prev,
      familia: nextFamilia,
      subfamilia: "",
    }));
  }

  function cambiarImporte(campo: "base0" | "base4" | "base10" | "base21", value: string) {
    setFormulario((prev) => ({
      ...prev,
      [campo]: normalizarImporte(value),
    }));
  }

  function cargarRegistroPorIndice(indice: number) {
    const registro = registros[indice];

    if (!registro) {
      return;
    }

    const nextFormulario = formularioDesdeRegistro(registro);
    setIndiceActual(indice);
    setModoNuevo(false);
    setFormulario(nextFormulario);
    setArchivoAdjunto(registro.adjunto);
    setSnapshotInicial(crearSnapshot(nextFormulario, registro.adjunto));

    if (inputAdjuntoRef.current) {
      inputAdjuntoRef.current.value = "";
    }
  }

  function abrirNuevoRegistro() {
    const nextFormulario = crearFormularioInicial();
    setModoNuevo(true);
    setFormulario(nextFormulario);
    setArchivoAdjunto(null);
    setSnapshotInicial(crearSnapshot(nextFormulario, null));

    if (inputAdjuntoRef.current) {
      inputAdjuntoRef.current.value = "";
    }
  }

  function ejecutarDestino(destino: DestinoNavegacion) {
    if (destino.tipo === "nuevo") {
      abrirNuevoRegistro();
      return;
    }

    cargarRegistroPorIndice(destino.indice);
  }

  function solicitarDestino(destino: DestinoNavegacion, opciones?: { cerrarBuscador?: boolean }) {
    if (destino.tipo === "registro" && !modoNuevo && destino.indice === indiceActual) {
      return;
    }

    if (destino.tipo === "nuevo" && modoNuevo) {
      return;
    }

    if (hayCambiosSinGuardar) {
      setDialogoSalida({
        abierto: true,
        destino,
        cerrarBuscador: Boolean(opciones?.cerrarBuscador),
      });
      return;
    }

    if (opciones?.cerrarBuscador) {
      setBuscadorAbierto(false);
    }

    ejecutarDestino(destino);
  }

  function guardarPrueba(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formulario.empresa || !formulario.fechaFactura) {
      window.alert("Completa Local y Fecha gasto.");
      return;
    }

    if (!formulario.tipo || !formulario.familia) {
      window.alert("Tipo y Familia son obligatorios.");
      return;
    }

    if (totalGasto === 0) {
      window.alert("El gasto debe tener importe distinto de cero.");
      return;
    }

    if (modoNuevo) {
      const nextId = obtenerSiguienteId(registros);
      const nextRegistro: RegistroFactura = {
        id: nextId,
        ...formulario,
        adjunto: archivoAdjunto,
      };

      setRegistros((prev) => [...prev, nextRegistro]);
      setIndiceActual(registros.length);
      setModoNuevo(false);
      setSnapshotInicial(crearSnapshot(formulario, archivoAdjunto));
      return;
    }

    setRegistros((prev) =>
      prev.map((registro, indice) =>
        indice === indiceActual
          ? {
              ...registro,
              ...formulario,
              adjunto: archivoAdjunto,
            }
          : registro
      )
    );

    setSnapshotInicial(crearSnapshot(formulario, archivoAdjunto));
  }

  function seleccionarAdjunto(e: React.ChangeEvent<HTMLInputElement>) {
    const nextArchivo = e.target.files?.[0];

    if (!nextArchivo) {
      return;
    }

    setArchivoAdjunto((prev) => {
      if (prev?.url) {
        URL.revokeObjectURL(prev.url);
      }

      return {
        file: nextArchivo,
        url: URL.createObjectURL(nextArchivo),
      };
    });
  }

  function abrirAdjuntoTemporal() {
    if (!archivoAdjunto?.url) {
      return;
    }

    window.open(archivoAdjunto.url, "_blank", "noopener,noreferrer");
  }

  function quitarAdjunto() {
    if (!archivoAdjunto) {
      return;
    }

    const confirmar = window.confirm(
      "Solo se quitara el adjunto. El resto del registro no se borra.\n\nQuieres quitarlo?"
    );

    if (!confirmar) {
      return;
    }

    if (archivoAdjunto.url) {
      URL.revokeObjectURL(archivoAdjunto.url);
    }

    setArchivoAdjunto(null);

    if (inputAdjuntoRef.current) {
      inputAdjuntoRef.current.value = "";
    }
  }

  useEffect(() => {
    return () => {
      const urls = new Set<string>();

      registros.forEach((registro) => {
        if (registro.adjunto?.url) {
          urls.add(registro.adjunto.url);
        }
      });

      if (archivoAdjunto?.url) {
        urls.add(archivoAdjunto.url);
      }

      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [archivoAdjunto, registros]);

  function irPrimerRegistro() {
    if (registros.length === 0) {
      return;
    }

    solicitarDestino({ tipo: "registro", indice: 0 });
  }

  function irRegistroAnterior() {
    if (registros.length === 0) {
      return;
    }

    if (modoNuevo) {
      solicitarDestino({ tipo: "registro", indice: registros.length - 1 });
      return;
    }

    if (indiceActual > 0) {
      solicitarDestino({ tipo: "registro", indice: indiceActual - 1 });
    }
  }

  function irRegistroSiguiente() {
    if (registros.length === 0) {
      abrirNuevoRegistro();
      return;
    }

    if (modoNuevo) {
      return;
    }

    if (indiceActual < registros.length - 1) {
      solicitarDestino({ tipo: "registro", indice: indiceActual + 1 });
      return;
    }

    solicitarDestino({ tipo: "nuevo" });
  }

  function irUltimoRegistro() {
    if (registros.length === 0) {
      return;
    }

    solicitarDestino({ tipo: "registro", indice: registros.length - 1 });
  }

  function cerrarDialogoSalida() {
    setDialogoSalida({
      abierto: false,
      destino: null,
      cerrarBuscador: false,
    });
  }

  function salirYPerderCambios() {
    if (!dialogoSalida.destino) {
      return;
    }

    const destino = dialogoSalida.destino;
    const cerrarBuscador = dialogoSalida.cerrarBuscador;
    cerrarDialogoSalida();

    if (cerrarBuscador) {
      setBuscadorAbierto(false);
    }

    ejecutarDestino(destino);
  }

  function obtenerCamposBusqueda(registro: RegistroFactura) {
    const tipoConfig = registro.tipo ? clasificacionActiva[registro.tipo] : null;
    const tipoLabel = tipoConfig?.label ?? "";
    const familias = (tipoConfig?.familias ?? {}) as Record<
      string,
      {
        label: string;
        subfamilias: readonly string[];
      }
    >;
    const familiaLabel =
      familias[registro.familia]?.label ?? registro.familia;
    const totalBaseRegistro = round2(
      parseDecimal(registro.base0) +
        parseDecimal(registro.base4) +
        parseDecimal(registro.base10)
    );
    const totalIvaRegistro = 0;
    const totalGastoRegistro = round2(parseDecimal(registro.base21));

    return [
      String(registro.id),
      registro.empresa,
      registro.proveedor,
      registro.numeroFactura,
      tipoLabel,
      familiaLabel,
      registro.subfamilia,
      registro.base0,
      registro.base4,
      registro.base10,
      registro.base21,
      fmtMoney(totalBaseRegistro),
      fmtMoney(totalIvaRegistro),
      fmtMoney(totalGastoRegistro),
      "pagado",
      registro.fechaFactura,
      registro.observaciones,
      FORMAS_PAGO[0],
      registro.banco,
      registro.numeroPagare,
      ...expandirVariantesFechaBusqueda(registro.fechaFactura),
    ]
      .filter(Boolean)
      .map((campo) => normalizarTextoBusqueda(campo));
  }

  function obtenerCampoResaltable(registro: RegistroFactura, termino: string): CampoResaltable | null {
    const campos: Array<[CampoResaltable, string]> = [
      ["numeroFactura", registro.numeroFactura],
      ["fechaFactura", registro.fechaFactura],
      ["base0", registro.base0],
      ["base4", registro.base4],
      ["base10", registro.base10],
      ["base21", registro.base21],
      ["fechaPago", registro.fechaPago],
      ["numeroPagare", registro.numeroPagare],
      ["observaciones", registro.observaciones],
    ];

    const coincidencia = campos.find(([, valor]) => {
      const normalizado = normalizarTextoBusqueda(valor);
      return busquedaExacta ? normalizado === termino : normalizado.includes(termino);
    });

    return coincidencia?.[0] ?? null;
  }

  function reiniciarBusqueda() {
    setResultadosBusqueda([]);
    setIndiceResultadoActual(-1);
    setMensajeBusqueda(null);
    setResaltadoBusqueda({
      campo: null,
      token: 0,
    });
  }

  function obtenerCoincidencias(termino: string) {
    return registros.reduce<number[]>((acc, registro, indice) => {
      const campos = obtenerCamposBusqueda(registro);
      const coincide = campos.some((campo) =>
        busquedaExacta ? campo === termino : campo.includes(termino)
      );

      if (coincide) {
        acc.push(indice);
      }

      return acc;
    }, []);
  }

  function buscarDesdeInicio() {
    const termino = normalizarTextoBusqueda(textoBusqueda);

    if (!termino) {
      reiniciarBusqueda();
      setMensajeBusqueda("Escribe algo para buscar.");
      return;
    }

    if (registros.length === 0) {
      reiniciarBusqueda();
      setMensajeBusqueda("No hay registros guardados.");
      return;
    }

    const coincidencias = obtenerCoincidencias(termino);

    if (coincidencias.length === 0) {
      reiniciarBusqueda();
      setMensajeBusqueda("No se han encontrado resultados.");
      return;
    }

    setResultadosBusqueda(coincidencias);
    setIndiceResultadoActual(0);
    setResaltadoBusqueda((prev) => ({
      campo: obtenerCampoResaltable(registros[coincidencias[0]], termino),
      token: prev.token + 1,
    }));
    solicitarDestino({ tipo: "registro", indice: coincidencias[0] });
    setMensajeBusqueda(`1 de ${coincidencias.length}`);
  }

  function buscarMas() {
    const termino = normalizarTextoBusqueda(textoBusqueda);

    if (resultadosBusqueda.length === 0 || indiceResultadoActual < 0) {
      buscarDesdeInicio();
      return;
    }

    if (indiceResultadoActual >= resultadosBusqueda.length - 1) {
      setMensajeBusqueda('Ya no hay mas coincidencias. Puedes ir al primero o cerrar.');
      return;
    }

    const siguienteResultado = indiceResultadoActual + 1;
    setIndiceResultadoActual(siguienteResultado);
    setResaltadoBusqueda((prev) => ({
      campo: obtenerCampoResaltable(registros[resultadosBusqueda[siguienteResultado]], termino),
      token: prev.token + 1,
    }));
    solicitarDestino({ tipo: "registro", indice: resultadosBusqueda[siguienteResultado] });
    setMensajeBusqueda(
      `${siguienteResultado + 1} de ${resultadosBusqueda.length}`
    );
  }

  function irPrimeraCoincidencia() {
    const termino = normalizarTextoBusqueda(textoBusqueda);

    if (resultadosBusqueda.length === 0) {
      buscarDesdeInicio();
      return;
    }

    setIndiceResultadoActual(0);
    setResaltadoBusqueda((prev) => ({
      campo: obtenerCampoResaltable(registros[resultadosBusqueda[0]], termino),
      token: prev.token + 1,
    }));
    solicitarDestino({ tipo: "registro", indice: resultadosBusqueda[0] });
    setMensajeBusqueda(`1 de ${resultadosBusqueda.length}`);
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-2 p-2.5 2xl:gap-2.5 2xl:p-3">
      <header className="flex items-center justify-between rounded-[22px] border border-[#98adb2] bg-[linear-gradient(180deg,#edf3f4_0%,#dbe5e7_100%)] px-3 py-1 shadow-[0_16px_34px_rgba(39,57,62,0.10)] 2xl:rounded-[24px] 2xl:px-4 2xl:py-1.5 2xl:shadow-[0_18px_38px_rgba(39,57,62,0.12)]">
        <div className="w-[48px] shrink-0 2xl:w-[56px]" />

        <div className="flex-1 text-center">
          <h1 className="text-[18px] font-black tracking-tight text-[#21363a] 2xl:text-[20px]">
            Gastos bancarios
          </h1>
        </div>

        <div className="rounded-2xl border border-[#98adb2] bg-[linear-gradient(180deg,#f4f8f8_0%,#e0e8ea_100%)] px-2 py-0.75 text-center shadow-[0_10px_18px_rgba(45,63,68,0.10)] 2xl:px-2.5 2xl:py-1">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#60767b]">
            ID
          </div>
          <div className="text-base font-black text-[#21363a] 2xl:text-lg">{idVisible}</div>
        </div>
      </header>

      <form onSubmit={guardarPrueba} className="grid min-h-0 flex-1 gap-2.5 lg:grid-cols-[1.55fr_0.95fr] 2xl:gap-3">
        <div className="relative grid min-h-0 gap-2.5 2xl:gap-3">
          <Bloque titulo="Datos principales">
            <div className="grid gap-2.5 lg:grid-cols-[126px_minmax(0,1fr)_144px_144px] 2xl:gap-3 2xl:grid-cols-[140px_minmax(0,1fr)_150px_150px]">
              <Campo label="Local">
                <select
                  value={formulario.empresa}
                  onChange={(e) => cambiarCampo("empresa", e.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecciona local</option>
                  {opcionesLocal.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Proveedor">
                <select
                  value={formulario.proveedor}
                  disabled
                  aria-disabled="true"
                  className={`${inputClassName} ${campoDeshabilitadoClassName}`}
                >
                  <option value="">Selecciona proveedor</option>
                  {PROVEEDORES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Fecha">
                <CampoFecha
                  ref={fechaFacturaRef}
                  value={formulario.fechaFactura}
                  onChange={(e) => cambiarCampo("fechaFactura", e.target.value)}
                  className={`${inputClassName} text-center`}
                />
              </Campo>

              <Campo label="Numero factura">
                <input
                  ref={numeroFacturaRef}
                  value={formulario.numeroFactura}
                  disabled
                  aria-disabled="true"
                  type="text"
                  className={`${inputClassName} ${campoDeshabilitadoClassName}`}
                />
              </Campo>
            </div>

            <div className="mt-2.5 grid gap-2.5 lg:grid-cols-3 2xl:mt-3 2xl:gap-3">
              <Campo label="Tipo">
                <select
                  value={formulario.tipo}
                  onChange={(e) => {
                    const nextTipo = e.target.value;

                    if (!nextTipo) {
                      setFormulario((prev) => ({
                        ...prev,
                        tipo: "",
                        familia: "",
                        subfamilia: "",
                      }));
                      return;
                    }

                    cambiarTipo(nextTipo as TipoClasificacion);
                  }}
                  className={inputClassName}
                >
                  <option value="">Selecciona tipo</option>
                    {Object.entries(clasificacionActiva).map(([id, item]) => (
                      <option key={id} value={id}>
                        {item.label}
                      </option>
                    ))}
                </select>
              </Campo>

              <Campo label="Familia">
                <select
                  value={formulario.familia}
                  onChange={(e) => cambiarFamilia(e.target.value)}
                  disabled={!formulario.tipo}
                  className={`${inputClassName} disabled:bg-stone-100`}
                >
                  <option value="">Selecciona familia</option>
                  {familiasDisponibles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Subfamilia">
                <select
                  value={formulario.subfamilia}
                  onChange={(e) => cambiarCampo("subfamilia", e.target.value)}
                  disabled={!formulario.familia || subfamiliasDisponibles.length === 0}
                  className={`${inputClassName} disabled:bg-stone-100`}
                >
                  <option value="">
                    {!formulario.familia
                      ? "Selecciona familia antes"
                      : subfamiliasDisponibles.length === 0
                        ? "No aplica"
                        : "Selecciona subfamilia"}
                  </option>
                  {subfamiliasDisponibles.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </Bloque>

          <Bloque titulo="Bases e importes">
            <div className="grid gap-2 lg:grid-cols-4 2xl:gap-2.5">
              <Campo label="Base IVA 0%">
                <input
                  ref={base0Ref}
                  value={formulario.base0}
                  disabled
                  aria-disabled="true"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  className={`${inputClassName} ${campoDeshabilitadoClassName} py-1.5 2xl:py-2`}
                />
              </Campo>

              <Campo label="Base IVA 4%">
                <input
                  ref={base4Ref}
                  value={formulario.base4}
                  disabled
                  aria-disabled="true"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  className={`${inputClassName} ${campoDeshabilitadoClassName} py-1.5 2xl:py-2`}
                />
              </Campo>

              <Campo label="Base IVA 10%">
                <input
                  ref={base10Ref}
                  value={formulario.base10}
                  disabled
                  aria-disabled="true"
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  className={`${inputClassName} ${campoDeshabilitadoClassName} py-1.5 2xl:py-2`}
                />
              </Campo>

              <Campo label="Total gasto">
                <input
                  ref={base21Ref}
                  value={formulario.base21}
                  onChange={(e) => cambiarImporte("base21", e.target.value)}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  className={`${inputClassName} py-1.5 2xl:py-2`}
                />
              </Campo>
            </div>

            <div className="mt-2 grid gap-2 lg:grid-cols-[1fr_1fr_1.08fr] 2xl:mt-2.5 2xl:gap-2.5 2xl:grid-cols-[1fr_1fr_1.1fr]">
              <div className={tarjetaDeshabilitadaClassName}>
                <div className="text-center text-[11px] font-black uppercase tracking-[0.16em] text-[#7f9094]">
                  Total base
                </div>
                <div className="mt-0.5 text-center text-[18px] font-black text-[#5f7074] 2xl:text-[22px]">
                  {fmtMoney(totalBase)} EUR
                </div>
              </div>

              <div className={tarjetaDeshabilitadaClassName}>
                <div className="text-center text-[11px] font-black uppercase tracking-[0.16em] text-[#7f9094]">
                  Total IVA
                </div>
                <div className="mt-0.5 text-center text-[18px] font-black text-[#5f7074] 2xl:text-[22px]">
                  {fmtMoney(totalIva)} EUR
                </div>
              </div>

              <div className="rounded-2xl border border-[#5f8e98] bg-[linear-gradient(180deg,#dceef1_0%,#9fc3ca_100%)] px-3.5 py-1.5 text-center shadow-[0_14px_26px_rgba(46,91,103,0.18)] 2xl:px-4 2xl:py-2">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#1e6677]">
                  Total gasto
                </div>
                <div className="mt-0.5 text-center text-[22px] font-black text-[#164855] 2xl:text-[26px]">
                  {fmtMoney(totalGasto)} EUR
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-[#98adb2] bg-[linear-gradient(180deg,rgba(239,245,246,0.96)_0%,rgba(220,229,231,0.99)_100%)] px-3 py-3 shadow-[0_14px_26px_rgba(39,57,62,0.09)] 2xl:mt-5 2xl:px-4 2xl:py-4">
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={irPrimerRegistro}
                  title="Primer registro"
                  className={accionClassName}
                >
                  {"<<"}
                </button>

                <button
                  type="button"
                  onClick={irRegistroAnterior}
                  title="Anterior"
                  className={accionClassName}
                >
                  {"<"}
                </button>

                <div className="min-w-[80px] rounded-2xl border border-[#adbec2] bg-[linear-gradient(180deg,#f8fbfb_0%,#dfe7e8_100%)] px-3 py-2 text-center text-sm font-black text-[#25383c] shadow-[0_10px_18px_rgba(45,63,68,0.10)] 2xl:min-w-[88px] 2xl:px-4 2xl:py-2.5">
                  ID {idVisible}
                </div>

                <button
                  type="button"
                  onClick={irRegistroSiguiente}
                  title="Siguiente"
                  className={accionClassName}
                >
                  {">"}
                </button>

                <button
                  type="button"
                  onClick={irUltimoRegistro}
                  title="Ultimo registro"
                  className={accionClassName}
                >
                  {">>"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTextoBusqueda("");
                    setBusquedaExacta(false);
                    reiniciarBusqueda();
                    setBuscadorAbierto(true);
                  }}
                  className={`${accionClassName} text-[15px]`}
                >
                  Buscar
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5 2xl:mt-4 2xl:gap-3">
                <button
                  type="submit"
                  disabled={botonGuardado || !formularioValido}
                  className={
                    botonGuardado
                      ? "min-w-[124px] rounded-2xl border border-[#8fb68a] bg-[linear-gradient(180deg,#dcefd7_0%,#b9d7b2_100%)] px-4 py-2 text-[15px] font-semibold text-[#264823] shadow-[0_12px_20px_rgba(63,107,56,0.14)] 2xl:min-w-[136px] 2xl:py-2.5"
                      : !formularioValido
                        ? "min-w-[124px] rounded-2xl border border-[#c18c89] bg-[linear-gradient(180deg,#f2dddd_0%,#debbb8_100%)] px-4 py-2 text-[15px] font-semibold text-[#6d2d2a] shadow-[0_12px_20px_rgba(128,71,67,0.12)] 2xl:min-w-[136px] 2xl:py-2.5"
                        : "min-w-[124px] rounded-2xl border border-[#a4bcc1] bg-[linear-gradient(180deg,#f5fafb_0%,#d8e4e6_100%)] px-4 py-2 text-[15px] font-semibold text-[#25383c] shadow-[0_12px_20px_rgba(45,63,68,0.11)] transition hover:bg-[#edf4f5] 2xl:min-w-[136px] 2xl:py-2.5"
                  }
                >
                  {botonGuardado ? "Guardado" : "Guardar"}
                </button>
              </div>
            </div>
          </Bloque>
        </div>

        <div className="relative grid min-h-0 gap-2.5 2xl:gap-3">
          <Bloque titulo="Pago">
            <div className="grid gap-2.5 lg:grid-cols-[1fr_1fr] 2xl:gap-3">
              <button
                type="button"
                className="rounded-2xl border border-[#8fb68a] bg-[linear-gradient(180deg,#dcefd7_0%,#b9d7b2_100%)] px-4 py-2 text-sm font-black text-[#264823] shadow-[0_12px_20px_rgba(63,107,56,0.14)] 2xl:py-2.5"
              >
                Pagado
              </button>

              <button
                type="button"
                disabled
                aria-disabled="true"
                className="cursor-not-allowed rounded-2xl border border-[#cfdadd] bg-[linear-gradient(180deg,#f8fbfb_0%,#e8eef0_100%)] px-4 py-2 text-sm font-black text-[#7f9094] opacity-70 shadow-none 2xl:py-2.5"
              >
                No pagado
              </button>
            </div>

            <div className="mt-2 grid gap-2 2xl:mt-2.5 2xl:gap-2.5">
              <Campo label="Fecha de pago">
                <input
                  ref={fechaPagoRef}
                  value={formulario.fechaFactura}
                  disabled
                  aria-disabled="true"
                  type="date"
                  className={`${inputClassName} ${campoDeshabilitadoClassName} text-center`}
                />
              </Campo>

              <Campo label="Forma de pago">
                <select
                  value={FORMAS_PAGO[0]}
                  disabled
                  aria-disabled="true"
                  className={`${inputClassName} ${campoDeshabilitadoClassName}`}
                >
                  {opcionesFormaPago.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Banco">
                <select
                  value={formulario.banco}
                  onChange={(e) => cambiarCampo("banco", e.target.value)}
                  className={inputClassName}
                >
                  <option value="">Banco</option>
                  {opcionesBanco.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Numero de pagare">
                <input
                  ref={numeroPagareRef}
                  value={formulario.numeroPagare}
                  disabled
                  aria-disabled="true"
                  type="text"
                  className={`${inputClassName} ${campoDeshabilitadoClassName}`}
                />
              </Campo>

              <Campo label="Observaciones">
                <textarea
                  ref={observacionesRef}
                  value={formulario.observaciones}
                  onChange={(e) => cambiarCampo("observaciones", e.target.value)}
                  rows={3}
                  className={`${inputClassName} h-14 resize-none 2xl:h-20`}
                />
              </Campo>

              <div className="rounded-2xl border border-[#98adb2] bg-[linear-gradient(180deg,#eef4f5_0%,#d9e3e5_100%)] px-3 py-2 shadow-[0_10px_18px_rgba(45,63,68,0.08)]">
                <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#60767b]">
                  Adjunto
                </div>

                <div className="mt-1 truncate text-center text-[11px] font-medium text-[#62757a]">
                  {archivoAdjunto ? archivoAdjunto.file.name : "Sin archivo adjunto"}
                </div>

                <div className="mt-2 flex items-center justify-center gap-2">
                  <input
                    ref={inputAdjuntoRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={seleccionarAdjunto}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => inputAdjuntoRef.current?.click()}
                    className="rounded-xl border border-[#a4bcc1] bg-[linear-gradient(180deg,#f5fafb_0%,#d8e4e6_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#25383c] shadow-[0_8px_14px_rgba(45,63,68,0.10)] transition hover:bg-[#edf4f5]"
                  >
                    {archivoAdjunto ? "Cambiar" : "Seleccionar"}
                  </button>

                  <button
                    type="button"
                    onClick={abrirAdjuntoTemporal}
                    disabled={!archivoAdjunto}
                    className="rounded-xl border border-[#b2c2c5] bg-[linear-gradient(180deg,#f8fbfb_0%,#e0e8ea_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#25383c] shadow-[0_8px_14px_rgba(45,63,68,0.10)] transition hover:bg-[#edf4f5] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Ver
                  </button>

                  <button
                    type="button"
                    onClick={quitarAdjunto}
                    disabled={!archivoAdjunto}
                    className="rounded-xl border border-[#b2c2c5] bg-[linear-gradient(180deg,#f8fbfb_0%,#e0e8ea_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#25383c] shadow-[0_8px_14px_rgba(45,63,68,0.10)] transition hover:bg-[#edf4f5] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          </Bloque>

          {buscadorAbierto ? (
            <div className="absolute left-1/2 top-[356px] z-40 w-[320px] -translate-x-1/2">
              <div className="rounded-[24px] border border-[#4f6970] bg-[linear-gradient(180deg,#29393e_0%,#223136_48%,#1a2529_100%)] p-5 shadow-[0_24px_56px_rgba(18,31,35,0.30)]">
                <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#c8dce0]">
                  Buscar
                </div>

                <div className="mt-2 grid gap-3">
                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#c8dce0]">
                      Texto
                    </span>
                    <input
                      ref={inputBusquedaRef}
                      value={textoBusqueda}
                      onChange={(e) => {
                        setTextoBusqueda(e.target.value);
                        reiniciarBusqueda();
                      }}
                      type="text"
                      className="w-full rounded-2xl border border-[#b7c7ca] bg-[linear-gradient(180deg,#fbfdfd_0%,#edf2f3_100%)] px-3 py-2 text-sm text-[#1f2e31] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none"
                    />
                  </label>

                  <label className="flex items-center justify-center gap-2 text-sm font-medium text-[#e3eff1]">
                    <input
                      checked={busquedaExacta}
                      onChange={(e) => {
                        setBusquedaExacta(e.target.checked);
                        reiniciarBusqueda();
                      }}
                      type="checkbox"
                    />
                    Coincidencia exacta
                  </label>

                  {mensajeBusqueda ? (
                    <div className="rounded-2xl border border-[#748c92] bg-[rgba(247,252,253,0.92)] px-3 py-2 text-center text-sm text-[#3e5358]">
                      {mensajeBusqueda}
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={buscarDesdeInicio}
                      className="rounded-2xl border border-[#a4bcc1] bg-[linear-gradient(180deg,#f5fafb_0%,#d8e4e6_100%)] px-4 py-2 text-sm font-semibold text-[#25383c] shadow-[0_10px_18px_rgba(45,63,68,0.10)]"
                    >
                      Buscar
                    </button>

                    {resultadosBusqueda.length > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={buscarMas}
                          className="rounded-2xl border border-[#a4bcc1] bg-[linear-gradient(180deg,#f5fafb_0%,#d8e4e6_100%)] px-4 py-2 text-sm font-semibold text-[#25383c] shadow-[0_10px_18px_rgba(45,63,68,0.10)]"
                        >
                          Buscar mas
                        </button>

                        <button
                          type="button"
                          onClick={irPrimeraCoincidencia}
                          className="rounded-2xl border border-[#a4bcc1] bg-[linear-gradient(180deg,#f5fafb_0%,#d8e4e6_100%)] px-4 py-2 text-sm font-semibold text-[#25383c] shadow-[0_10px_18px_rgba(45,63,68,0.10)]"
                        >
                          Ir al primero
                        </button>
                      </>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => {
                        setTextoBusqueda("");
                        setBusquedaExacta(false);
                        reiniciarBusqueda();
                        setBuscadorAbierto(false);
                      }}
                      className="rounded-2xl border border-[#57737a] bg-[linear-gradient(180deg,#33454b_0%,#29373c_100%)] px-4 py-2 text-sm font-semibold text-[#e3eff1] shadow-[0_8px_16px_rgba(18,31,35,0.22)]"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

        </div>
      </form>

      {dialogoSalida.abierto ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(22,16,12,0.38)] p-4">
          <div className="w-full max-w-md rounded-[24px] border border-[#98adb2] bg-[linear-gradient(180deg,#f4f8f8_0%,#dbe5e7_100%)] p-5 shadow-[0_24px_56px_rgba(18,31,35,0.28)]">
            <div className="text-lg font-black text-[#211915]">No has guardado el registro</div>
            <p className="mt-2 text-sm text-[#62757a]">
              Si sales ahora, perderas los datos introducidos. Si habias metido adjunto,
              tendras que seleccionarlo otra vez.
            </p>

            <div className="mt-4 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={cerrarDialogoSalida}
                className="rounded-2xl border border-[#a4bcc1] bg-[linear-gradient(180deg,#f5fafb_0%,#d8e4e6_100%)] px-4 py-2 text-sm font-semibold text-[#25383c] shadow-[0_10px_18px_rgba(45,63,68,0.10)]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={salirYPerderCambios}
                className="rounded-2xl border border-[#c18c89] bg-[linear-gradient(180deg,#f2dddd_0%,#debbb8_100%)] px-4 py-2 text-sm font-black text-[#6d2d2a] shadow-[0_10px_18px_rgba(128,71,67,0.12)]"
              >
                Salir y perder los datos
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}

