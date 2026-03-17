"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CampoFecha } from "@/components/ui/campo-fecha";
import type { ClasificacionMapa } from "@/lib/clasificacion";
import type { MaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";

const CLIENTES_PREDETERMINADOS: string[] = [];

type TipoClasificacion = string;

type FormularioFactura = {
  empresa: string;
  cliente: string;
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
    cliente: "",
    fechaFactura: "",
    numeroFactura: "",
    tipo: "",
    familia: "",
    subfamilia: "",
    base0: "",
    base4: "",
    base10: "",
    base21: "",
    pagado: false,
    fechaPago: "",
    formaPago: "",
    banco: "",
    numeroPagare: "",
    observaciones: "",
  };
}

function formularioDesdeRegistro(registro: RegistroFactura): FormularioFactura {
  return {
    empresa: registro.empresa,
    cliente: registro.cliente,
    fechaFactura: registro.fechaFactura,
    numeroFactura: registro.numeroFactura,
    tipo: registro.tipo,
    familia: registro.familia,
    subfamilia: registro.subfamilia,
    base0: registro.base0,
    base4: registro.base4,
    base10: registro.base10,
    base21: registro.base21,
    pagado: registro.pagado,
    fechaPago: registro.fechaPago,
    formaPago: registro.formaPago,
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
      className={`rounded-[22px] border border-[#9cb7c3] bg-[linear-gradient(180deg,rgba(239,247,250,0.99)_0%,rgba(220,233,239,0.99)_100%)] p-3 shadow-[0_16px_34px_rgba(39,72,92,0.10)] 2xl:rounded-[24px] 2xl:p-4 2xl:shadow-[0_20px_40px_rgba(39,72,92,0.12)] ${className}`}
    >
      <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.22em] text-[#587487] 2xl:mb-3 2xl:text-[11px] 2xl:tracking-[0.24em]">
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
      <span className="text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[#5f7886] 2xl:text-[11px] 2xl:tracking-[0.1em]">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[#afc5d0] bg-[linear-gradient(180deg,#fdfefe_0%,#eef5f8_100%)] px-3 py-2 text-center text-sm text-[#1f3139] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_6px_14px_rgba(48,81,96,0.06)] outline-none transition placeholder:text-[#8fa4af] focus:border-[#5c96ab] focus:bg-white focus:shadow-[0_0_0_3px_rgba(92,150,171,0.16)] 2xl:py-2.5";

const accionClassName =
  "min-w-[54px] rounded-2xl border border-[#a9c1cb] bg-[linear-gradient(180deg,#f8fcfd_0%,#dceaf0_100%)] px-3 py-2 text-center text-sm font-semibold text-[#24414e] shadow-[0_10px_18px_rgba(46,82,96,0.10)] transition hover:border-[#6f9aae] hover:bg-[#f2f9fb] 2xl:min-w-[60px] 2xl:py-2.5";

const campoDeshabilitadoClassName =
  "cursor-not-allowed border-[#c9d9df] bg-[linear-gradient(180deg,#fbfdfe_0%,#edf3f6_100%)] text-[#8498a3] shadow-none opacity-70";

export function PantallaFacturasEmitidas({
  clientes = CLIENTES_PREDETERMINADOS,
  clasificacion,
  maestros,
}: {
  clientes?: string[];
  clasificacion?: ClasificacionMapa;
  maestros?: MaestrosFormulario;
}) {
  const opcionesCliente = clientes;
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
  const iva4 = round2((base4 * 4) / 100);
  const iva10 = round2((base10 * 10) / 100);
  const iva21 = round2((base21 * 21) / 100);
  const totalBase = round2(base0 + base4 + base10 + base21);
  const totalIva = round2(iva4 + iva10 + iva21);
  const totalFactura = round2(totalBase + totalIva);
  const idVisible = modoNuevo ? obtenerSiguienteId(registros) : (registros[indiceActual]?.id ?? 1);
  const snapshotActual = useMemo(
    () => crearSnapshot(formulario, archivoAdjunto),
    [archivoAdjunto, formulario]
  );
  const hayCambiosSinGuardar = snapshotActual !== snapshotInicial;
  const botonGuardado = !modoNuevo && !hayCambiosSinGuardar;
  const formularioValido =
    Boolean(formulario.empresa) &&
    Boolean(formulario.cliente) &&
    Boolean(formulario.fechaFactura) &&
    Boolean(formulario.numeroFactura.trim()) &&
    Boolean(formulario.tipo) &&
    Boolean(formulario.familia) &&
    totalBase !== 0;

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
    setFormulario((prev) => ({ ...prev, [campo]: valor }));
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

    if (!formulario.empresa || !formulario.cliente || !formulario.fechaFactura) {
      window.alert("Completa Local, Cliente y Fecha factura.");
      return;
    }

    if (!formulario.numeroFactura.trim()) {
      window.alert("El numero de factura es obligatorio.");
      return;
    }

    if (!formulario.tipo || !formulario.familia) {
      window.alert("Tipo y Familia son obligatorios.");
      return;
    }

    if (totalBase === 0) {
      window.alert("La factura debe tener importe distinto de cero.");
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
        parseDecimal(registro.base10) +
        parseDecimal(registro.base21)
    );
    const totalIvaRegistro = round2(
      (parseDecimal(registro.base4) * 4) / 100 +
        (parseDecimal(registro.base10) * 10) / 100 +
        (parseDecimal(registro.base21) * 21) / 100
    );
    const totalFacturaRegistro = round2(totalBaseRegistro + totalIvaRegistro);

    return [
      String(registro.id),
      registro.empresa,
      registro.cliente,
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
      fmtMoney(totalFacturaRegistro),
      registro.pagado ? "cobrado" : "pendiente cobro",
      registro.fechaPago,
      registro.observaciones,
      registro.formaPago,
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
      <header className="flex items-center justify-between rounded-[22px] border border-[#97b4c1] bg-[linear-gradient(180deg,#eef7fa_0%,#d9e8ee_100%)] px-3 py-1 shadow-[0_16px_34px_rgba(39,72,92,0.10)] 2xl:rounded-[24px] 2xl:px-4 2xl:py-1.5 2xl:shadow-[0_18px_38px_rgba(39,72,92,0.12)]">
        <div className="w-[48px] shrink-0 2xl:w-[56px]" />

        <div className="flex-1 text-center">
          <h1 className="text-[18px] font-black tracking-tight text-[#1f3846] 2xl:text-[20px]">
            Facturas emitidas
          </h1>
        </div>

        <div className="rounded-2xl border border-[#97b4c1] bg-[linear-gradient(180deg,#f7fcfd_0%,#dceaf0_100%)] px-2 py-0.75 text-center shadow-[0_10px_18px_rgba(46,82,96,0.10)] 2xl:px-2.5 2xl:py-1">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#5b7785]">
            ID
          </div>
          <div className="text-base font-black text-[#1f3846] 2xl:text-lg">{idVisible}</div>
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

              <Campo label="Cliente">
                <select
                  value={formulario.cliente}
                  onChange={(e) => cambiarCampo("cliente", e.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecciona cliente</option>
                  {opcionesCliente.map((item) => (
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
                  onChange={(e) => cambiarCampo("numeroFactura", e.target.value)}
                  type="text"
                  className={inputClassName}
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
                  onChange={(e) => cambiarImporte("base0", e.target.value)}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  className={`${inputClassName} py-1.5 2xl:py-2`}
                />
              </Campo>

              <Campo label="Base IVA 4%">
                <input
                  ref={base4Ref}
                  value={formulario.base4}
                  onChange={(e) => cambiarImporte("base4", e.target.value)}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  className={`${inputClassName} py-1.5 2xl:py-2`}
                />
              </Campo>

              <Campo label="Base IVA 10%">
                <input
                  ref={base10Ref}
                  value={formulario.base10}
                  onChange={(e) => cambiarImporte("base10", e.target.value)}
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  className={`${inputClassName} py-1.5 2xl:py-2`}
                />
              </Campo>

              <Campo label="Base IVA 21%">
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
              <div className="rounded-2xl border border-[#93aebe] bg-[linear-gradient(180deg,#edf6fb_0%,#cadce7_100%)] px-3.5 py-1.5 text-center shadow-[0_12px_24px_rgba(49,82,102,0.14)] 2xl:px-4 2xl:py-2">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.16em] text-[#456377]">
                  Total base
                </div>
                <div className="mt-0.5 text-center text-[18px] font-black text-[#203846] 2xl:text-[22px]">
                  {fmtMoney(totalBase)} EUR
                </div>
              </div>

              <div className="rounded-2xl border border-[#7ba5b6] bg-[linear-gradient(180deg,#e7f5fb_0%,#bdd8e5_100%)] px-3.5 py-1.5 text-center shadow-[0_12px_24px_rgba(34,89,112,0.15)] 2xl:px-4 2xl:py-2">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.16em] text-[#2d657a]">
                  Total IVA
                </div>
                <div className="mt-0.5 text-center text-[18px] font-black text-[#17465a] 2xl:text-[22px]">
                  {fmtMoney(totalIva)} EUR
                </div>
              </div>

              <div className="rounded-2xl border border-[#4d9c8c] bg-[linear-gradient(180deg,#d9f4ee_0%,#8fcfbe_100%)] px-3.5 py-1.5 text-center shadow-[0_16px_30px_rgba(24,102,86,0.22)] 2xl:px-4 2xl:py-2">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#0f6252]">
                  Total factura
                </div>
                <div className="mt-0.5 text-center text-[22px] font-black text-[#0a4d3f] 2xl:text-[26px]">
                  {fmtMoney(totalFactura)} EUR
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-[#9cb7c3] bg-[linear-gradient(180deg,rgba(240,248,251,0.96)_0%,rgba(220,233,239,0.99)_100%)] px-3 py-3 shadow-[0_14px_26px_rgba(39,72,92,0.09)] 2xl:mt-5 2xl:px-4 2xl:py-4">
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

                <div className="min-w-[80px] rounded-2xl border border-[#a9c1cb] bg-[linear-gradient(180deg,#f9fdfe_0%,#ddebf1_100%)] px-3 py-2 text-center text-sm font-black text-[#24414e] shadow-[0_10px_18px_rgba(46,82,96,0.10)] 2xl:min-w-[88px] 2xl:px-4 2xl:py-2.5">
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
                      ? "min-w-[124px] rounded-2xl border border-[#69a999] bg-[linear-gradient(180deg,#dcf4ee_0%,#abd8cb_100%)] px-4 py-2 text-[15px] font-semibold text-[#14483b] shadow-[0_12px_20px_rgba(32,104,87,0.18)] 2xl:min-w-[136px] 2xl:py-2.5"
                      : !formularioValido
                        ? "min-w-[124px] rounded-2xl border border-[#c99292] bg-[linear-gradient(180deg,#f4e0e0_0%,#dfbbbb_100%)] px-4 py-2 text-[15px] font-semibold text-[#6b2f2f] shadow-[0_12px_20px_rgba(128,71,67,0.12)] 2xl:min-w-[136px] 2xl:py-2.5"
                        : "min-w-[124px] rounded-2xl border border-[#86b4c4] bg-[linear-gradient(180deg,#f3fbfd_0%,#cfe3eb_100%)] px-4 py-2 text-[15px] font-semibold text-[#24414e] shadow-[0_12px_20px_rgba(46,82,96,0.12)] transition hover:bg-[#ecf8fb] 2xl:min-w-[136px] 2xl:py-2.5"
                  }
                >
                  {botonGuardado ? "Guardado" : "Guardar"}
                </button>
              </div>
            </div>
          </Bloque>
        </div>

        <div className="relative grid min-h-0 gap-2.5 2xl:gap-3">
          <Bloque titulo="Cobro">
            <div className="grid gap-2.5 lg:grid-cols-[1fr_1fr] 2xl:gap-3">
              <button
                type="button"
                onClick={() => cambiarCampo("pagado", true)}
                className={
                  formulario.pagado
                    ? "rounded-2xl border border-[#69a999] bg-[linear-gradient(180deg,#dcf4ee_0%,#abd8cb_100%)] px-4 py-2 text-sm font-black text-[#14483b] shadow-[0_12px_20px_rgba(32,104,87,0.18)] 2xl:py-2.5"
                    : "rounded-2xl border border-[#a9c1cb] bg-[linear-gradient(180deg,#f8fcfd_0%,#ddebf1_100%)] px-4 py-2 text-sm font-black text-[#5d7480] shadow-[0_10px_18px_rgba(46,82,96,0.10)] 2xl:py-2.5"
                }
              >
                Cobrado
              </button>

              <button
                type="button"
                onClick={() => cambiarCampo("pagado", false)}
                className={
                  !formulario.pagado
                    ? "rounded-2xl border border-[#c99292] bg-[linear-gradient(180deg,#f4e0e0_0%,#dfbbbb_100%)] px-4 py-2 text-sm font-black text-[#6b2f2f] shadow-[0_12px_22px_rgba(128,71,67,0.14)] 2xl:py-2.5"
                    : "rounded-2xl border border-[#a9c1cb] bg-[linear-gradient(180deg,#f8fcfd_0%,#ddebf1_100%)] px-4 py-2 text-sm font-black text-[#5d7480] shadow-[0_10px_18px_rgba(46,82,96,0.10)] 2xl:py-2.5"
                }
              >
                No cobrado
              </button>
            </div>

            <div className="mt-2 grid gap-2 2xl:mt-2.5 2xl:gap-2.5">
              <Campo label="Fecha">
                <CampoFecha
                  ref={fechaPagoRef}
                  value={formulario.fechaPago}
                  onChange={(e) => cambiarCampo("fechaPago", e.target.value)}
                  className={`${inputClassName} text-center`}
                />
              </Campo>

              <Campo label="Forma de pago">
                <select
                  value={formulario.formaPago}
                  onChange={(e) => cambiarCampo("formaPago", e.target.value)}
                  className={inputClassName}
                >
                  <option value="">Forma de pago</option>
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
                  disabled
                  aria-disabled="true"
                  className={`${inputClassName} ${campoDeshabilitadoClassName}`}
                >
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

              <div className="rounded-2xl border border-[#9cb7c3] bg-[linear-gradient(180deg,#eff7fa_0%,#d8e7ed_100%)] px-3 py-2 shadow-[0_10px_18px_rgba(46,82,96,0.10)]">
                <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#5b7785]">
                  Adjunto
                </div>

                <div className="mt-1 truncate text-center text-[11px] font-medium text-[#516874]">
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
                    className="rounded-xl border border-[#86b4c4] bg-[linear-gradient(180deg,#f3fbfd_0%,#cfe3eb_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#24414e] shadow-[0_8px_14px_rgba(46,82,96,0.10)] transition hover:bg-[#ecf8fb]"
                  >
                    {archivoAdjunto ? "Cambiar" : "Seleccionar"}
                  </button>

                  <button
                    type="button"
                    onClick={abrirAdjuntoTemporal}
                    disabled={!archivoAdjunto}
                    className="rounded-xl border border-[#a9c1cb] bg-[linear-gradient(180deg,#f8fcfd_0%,#ddebf1_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#24414e] shadow-[0_8px_14px_rgba(46,82,96,0.10)] transition hover:bg-[#f1f9fb] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Ver
                  </button>

                  <button
                    type="button"
                    onClick={quitarAdjunto}
                    disabled={!archivoAdjunto}
                    className="rounded-xl border border-[#a9c1cb] bg-[linear-gradient(180deg,#f8fcfd_0%,#ddebf1_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#24414e] shadow-[0_8px_14px_rgba(46,82,96,0.10)] transition hover:bg-[#f1f9fb] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          </Bloque>

          {buscadorAbierto ? (
            <div className="absolute left-1/2 top-[356px] z-40 w-[320px] -translate-x-1/2">
              <div className="rounded-[24px] border border-[#4f7182] bg-[linear-gradient(180deg,#29404c_0%,#203540_48%,#182932_100%)] p-5 shadow-[0_24px_56px_rgba(18,42,54,0.30)]">
                <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#b8d4df]">
                  Buscar
                </div>

                <div className="mt-2 grid gap-3">
                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#b8d4df]">
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
                      className="w-full rounded-2xl border border-[#a9c1cb] bg-[linear-gradient(180deg,#fbfeff_0%,#e7f1f5_100%)] px-3 py-2 text-sm text-[#1f3139] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none"
                    />
                  </label>

                  <label className="flex items-center justify-center gap-2 text-sm font-medium text-[#e1f0f5]">
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
                    <div className="rounded-2xl border border-[#7e9cab] bg-[rgba(247,252,254,0.94)] px-3 py-2 text-center text-sm text-[#34515e]">
                      {mensajeBusqueda}
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={buscarDesdeInicio}
                      className="rounded-2xl border border-[#86b4c4] bg-[linear-gradient(180deg,#f3fbfd_0%,#cfe3eb_100%)] px-4 py-2 text-sm font-semibold text-[#24414e] shadow-[0_10px_18px_rgba(46,82,96,0.12)]"
                    >
                      Buscar
                    </button>

                    {resultadosBusqueda.length > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={buscarMas}
                          className="rounded-2xl border border-[#86b4c4] bg-[linear-gradient(180deg,#f3fbfd_0%,#cfe3eb_100%)] px-4 py-2 text-sm font-semibold text-[#24414e] shadow-[0_10px_18px_rgba(46,82,96,0.12)]"
                        >
                          Buscar mas
                        </button>

                        <button
                          type="button"
                          onClick={irPrimeraCoincidencia}
                          className="rounded-2xl border border-[#86b4c4] bg-[linear-gradient(180deg,#f3fbfd_0%,#cfe3eb_100%)] px-4 py-2 text-sm font-semibold text-[#24414e] shadow-[0_10px_18px_rgba(46,82,96,0.12)]"
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
                      className="rounded-2xl border border-[#4f7182] bg-[linear-gradient(180deg,#314c59_0%,#243b46_100%)] px-4 py-2 text-sm font-semibold text-[#e1f0f5] shadow-[0_8px_16px_rgba(18,42,54,0.22)]"
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
          <div className="w-full max-w-md rounded-[24px] border border-[#d2b391] bg-[linear-gradient(180deg,#f7ede1_0%,#eadcc9_100%)] p-5 shadow-[0_24px_56px_rgba(28,20,15,0.26)]">
            <div className="text-lg font-black text-[#211915]">No has guardado el registro</div>
            <p className="mt-2 text-sm text-[#5f5144]">
              Si sales ahora, perderas los datos introducidos. Si habias metido adjunto,
              tendras que seleccionarlo otra vez.
            </p>

            <div className="mt-4 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={cerrarDialogoSalida}
                className="rounded-2xl border border-[#ceb08b] bg-[linear-gradient(180deg,#fff6e8_0%,#ecd8be_100%)] px-4 py-2 text-sm font-semibold text-[#2a201c] shadow-[0_10px_18px_rgba(74,54,39,0.08)]"
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

