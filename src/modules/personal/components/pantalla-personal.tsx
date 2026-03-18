"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CampoFecha } from "@/components/ui/campo-fecha";
import type { ClasificacionMapa } from "@/lib/clasificacion";
import type { MaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";
import {
  guardarPersonalPersistido,
  listarPersonalPersistido,
} from "@/modules/operativa/utils/persistencia-operativa";

const PROVEEDORES = [
  "JULPER ARANJUEZ, S.L.",
  "DISTRIBUCIONES CENTRO",
  "COCACOLA EUROPACIFIC",
  "ASESORIA RIVERO",
];
const FORMAS_PAGO = ["BANCO"];

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
    formaPago: "",
    banco: "",
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
      className={`rounded-[22px] border border-[#d1a79d] bg-[linear-gradient(180deg,rgba(248,240,237,0.99)_0%,rgba(237,223,219,0.99)_100%)] p-3 shadow-[0_16px_34px_rgba(85,52,46,0.09)] 2xl:rounded-[24px] 2xl:p-4 2xl:shadow-[0_20px_40px_rgba(85,52,46,0.11)] ${className}`}
    >
      <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.22em] text-[#8a6458] 2xl:mb-3 2xl:text-[11px] 2xl:tracking-[0.24em]">
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
      <span className="text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[#896d63] 2xl:text-[11px] 2xl:tracking-[0.1em]">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[#d7bbb3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-2 text-center text-sm text-[#2e211d] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_6px_14px_rgba(85,52,46,0.05)] outline-none transition placeholder:text-[#a78f88] focus:border-[#c18173] focus:bg-white focus:shadow-[0_0_0_3px_rgba(193,129,115,0.14)] 2xl:py-2.5";

const accionClassName =
  "min-w-[54px] rounded-2xl border border-[#d1b6ae] bg-[linear-gradient(180deg,#fdf9f8_0%,#ede1dd_100%)] px-3 py-2 text-center text-sm font-semibold text-[#492f29] shadow-[0_10px_18px_rgba(85,52,46,0.09)] transition hover:border-[#bd897d] hover:bg-[#f7f0ee] 2xl:min-w-[60px] 2xl:py-2.5";

const campoDeshabilitadoClassName =
  "cursor-not-allowed border-[#dcc8c2] bg-[linear-gradient(180deg,#fcf9f8_0%,#efe6e3_100%)] text-[#96817b] shadow-none opacity-70";

export function PantallaPersonal({
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

  useEffect(() => {
    let cancelado = false;

    async function cargarPersistidos() {
      try {
        const persistidos = await listarPersonalPersistido(clasificacionActiva);

        if (cancelado) {
          return;
        }

        setRegistros(persistidos as RegistroFactura[]);

        if (persistidos.length > 0) {
          const ultimo = persistidos[persistidos.length - 1] as RegistroFactura;
          setIndiceActual(persistidos.length - 1);
          setModoNuevo(false);
          setFormulario(formularioDesdeRegistro(ultimo));
          setArchivoAdjunto(ultimo.adjunto);
          setSnapshotInicial(crearSnapshot(formularioDesdeRegistro(ultimo), ultimo.adjunto));
        } else {
          const inicial = crearFormularioInicial();
          setIndiceActual(0);
          setModoNuevo(true);
          setFormulario(inicial);
          setArchivoAdjunto(null);
          setSnapshotInicial(crearSnapshot(inicial, null));
        }
      } catch {
        if (!cancelado) {
          window.alert("No se pudieron cargar los registros de personal guardados.");
        }
      }
    }

    void cargarPersistidos();

    return () => {
      cancelado = true;
    };
  }, [clasificacionActiva]);

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
  const base21 = parseDecimal(formulario.base21);
  const totalBase = round2(base0 + base21);
  const totalIva = round2(base21 * 0.21);
  const totalPersonal = round2(base0 + base21 + totalIva);
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
    (base0 !== 0 || base21 !== 0);

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

  async function guardarPrueba(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formulario.empresa || !formulario.fechaFactura) {
      window.alert("Completa Local y Fecha.");
      return;
    }

    if (!formulario.tipo || !formulario.familia) {
      window.alert("Tipo y Familia son obligatorios.");
      return;
    }

    if (base0 === 0 && base21 === 0) {
      window.alert("El personal debe tener importe distinto de cero.");
      return;
    }

    try {
      const registroActual: RegistroFactura = {
        id: modoNuevo ? 0 : (registros[indiceActual]?.id ?? 0),
        ...formulario,
        adjunto: archivoAdjunto,
      };

      const persistido = (await guardarPersonalPersistido(
        registroActual,
        clasificacionActiva
      )) as RegistroFactura;

      const registroGuardado: RegistroFactura = {
        ...persistido,
        adjunto: archivoAdjunto,
      };

      const siguientes = modoNuevo
        ? [...registros, registroGuardado]
        : registros.map((registro, indice) =>
            indice === indiceActual ? registroGuardado : registro
          );

      setRegistros(siguientes);
      setIndiceActual(
        modoNuevo
          ? siguientes.length - 1
          : siguientes.findIndex((registro) => registro.id === registroGuardado.id)
      );
      setModoNuevo(false);
      setFormulario(formularioDesdeRegistro(registroGuardado));
      setArchivoAdjunto(registroGuardado.adjunto);
      setSnapshotInicial(crearSnapshot(formularioDesdeRegistro(registroGuardado), registroGuardado.adjunto));
    } catch {
      window.alert("No se pudo guardar el registro de personal en BBDD.");
    }
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
    const base0Registro = parseDecimal(registro.base0);
    const base21Registro = parseDecimal(registro.base21);
    const totalBaseRegistro = round2(base0Registro + base21Registro);
    const totalIvaRegistro = round2(base21Registro * 0.21);
    const totalPersonalRegistro = round2(base0Registro + base21Registro + totalIvaRegistro);

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
      fmtMoney(totalPersonalRegistro),
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
      <header className="flex items-center justify-between rounded-[22px] border border-[#d1a79d] bg-[linear-gradient(180deg,#f8f0ed_0%,#eddcd7_100%)] px-3 py-1 shadow-[0_16px_34px_rgba(85,52,46,0.09)] 2xl:rounded-[24px] 2xl:px-4 2xl:py-1.5 2xl:shadow-[0_18px_38px_rgba(85,52,46,0.11)]">
        <div className="w-[48px] shrink-0 2xl:w-[56px]" />

        <div className="flex-1 text-center">
          <h1 className="text-[18px] font-black tracking-tight text-[#442924] 2xl:text-[20px]">
            Personal
          </h1>
        </div>

        <div className="rounded-2xl border border-[#d1a79d] bg-[linear-gradient(180deg,#faf3f1_0%,#eddeda_100%)] px-2 py-0.75 text-center shadow-[0_10px_18px_rgba(85,52,46,0.09)] 2xl:px-2.5 2xl:py-1">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#8a6458]">
            ID
          </div>
          <div className="text-base font-black text-[#442924] 2xl:text-lg">{idVisible}</div>
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
                  <option value="">Selec. local</option>
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
              <div className="rounded-2xl border border-[#d1a79d] bg-[linear-gradient(180deg,#f7efed_0%,#e8dcd9_100%)] px-3.5 py-1.5 text-center shadow-[0_10px_18px_rgba(85,52,46,0.08)] 2xl:px-4 2xl:py-2">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6458]">
                  Total base
                </div>
                <div className="mt-0.5 text-center text-[18px] font-black text-[#5d4038] 2xl:text-[22px]">
                  {fmtMoney(totalBase)} EUR
                </div>
              </div>

              <div className="rounded-2xl border border-[#d1a79d] bg-[linear-gradient(180deg,#f7efed_0%,#e8dcd9_100%)] px-3.5 py-1.5 text-center shadow-[0_10px_18px_rgba(85,52,46,0.08)] 2xl:px-4 2xl:py-2">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6458]">
                  Total IVA
                </div>
                <div className="mt-0.5 text-center text-[18px] font-black text-[#5d4038] 2xl:text-[22px]">
                  {fmtMoney(totalIva)} EUR
                </div>
              </div>

              <div className="rounded-2xl border border-[#bd7f72] bg-[linear-gradient(180deg,#ecd9d3_0%,#d8a89b_100%)] px-3.5 py-1.5 text-center shadow-[0_14px_26px_rgba(116,66,57,0.16)] 2xl:px-4 2xl:py-2">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#8a4535]">
                  Total personal
                </div>
                <div className="mt-0.5 text-center text-[22px] font-black text-[#6f2e22] 2xl:text-[26px]">
                  {fmtMoney(totalPersonal)} EUR
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-[#d1a79d] bg-[linear-gradient(180deg,rgba(248,241,239,0.96)_0%,rgba(237,224,220,0.99)_100%)] px-3 py-3 shadow-[0_14px_26px_rgba(85,52,46,0.08)] 2xl:mt-5 2xl:px-4 2xl:py-4">
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

                <div className="min-w-[80px] rounded-2xl border border-[#d1b6ae] bg-[linear-gradient(180deg,#fdf9f8_0%,#ede1dd_100%)] px-3 py-2 text-center text-sm font-black text-[#492f29] shadow-[0_10px_18px_rgba(85,52,46,0.09)] 2xl:min-w-[88px] 2xl:px-4 2xl:py-2.5">
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
                        : "min-w-[124px] rounded-2xl border border-[#cfafa8] bg-[linear-gradient(180deg,#fbf7f6_0%,#e8dbd8_100%)] px-4 py-2 text-[15px] font-semibold text-[#492f29] shadow-[0_12px_20px_rgba(85,52,46,0.10)] transition hover:bg-[#f4edeb] 2xl:min-w-[136px] 2xl:py-2.5"
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
                disabled
                aria-disabled="true"
                className={
                  formulario.pagado
                    ? "cursor-not-allowed rounded-2xl border border-[#8fb68a] bg-[linear-gradient(180deg,#dcefd7_0%,#b9d7b2_100%)] px-4 py-2 text-sm font-black text-[#264823] opacity-85 shadow-[0_12px_20px_rgba(63,107,56,0.10)] 2xl:py-2.5"
                    : "cursor-not-allowed rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fcf9f8_0%,#efe6e3_100%)] px-4 py-2 text-sm font-black text-[#96817b] opacity-70 shadow-none 2xl:py-2.5"
                }
              >
                Pagado
              </button>

              <button
                type="button"
                disabled
                aria-disabled="true"
                className={
                  !formulario.pagado
                    ? "cursor-not-allowed rounded-2xl border border-[#c18c89] bg-[linear-gradient(180deg,#f2dddd_0%,#debbb8_100%)] px-4 py-2 text-sm font-black text-[#6d2d2a] opacity-85 shadow-[0_12px_22px_rgba(128,71,67,0.10)] 2xl:py-2.5"
                    : "cursor-not-allowed rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fcf9f8_0%,#efe6e3_100%)] px-4 py-2 text-sm font-black text-[#96817b] opacity-70 shadow-none 2xl:py-2.5"
                }
              >
                No pagado
              </button>
            </div>

            <div className="mt-2 grid gap-2 2xl:mt-2.5 2xl:gap-2.5">
              <Campo label="Fecha">
                <input
                  ref={fechaPagoRef}
                  value={formulario.fechaPago}
                  disabled
                  aria-disabled="true"
                  type="date"
                  className={`${inputClassName} ${campoDeshabilitadoClassName} text-center`}
                />
              </Campo>

              <Campo label="Forma de pago">
                <select
                  value={formulario.formaPago}
                  disabled
                  aria-disabled="true"
                  className={`${inputClassName} ${campoDeshabilitadoClassName}`}
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

              <div className="rounded-2xl border border-[#d1a79d] bg-[linear-gradient(180deg,#f7efed_0%,#e8dcd9_100%)] px-3 py-2 shadow-[0_10px_18px_rgba(85,52,46,0.08)]">
                <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6458]">
                  Adjunto
                </div>

                <div className="mt-1 truncate text-center text-[11px] font-medium text-[#766660]">
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
                    className="rounded-xl border border-[#cfafa8] bg-[linear-gradient(180deg,#fbf7f6_0%,#e8dbd8_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#492f29] shadow-[0_8px_14px_rgba(85,52,46,0.10)] transition hover:bg-[#f4edeb]"
                  >
                    {archivoAdjunto ? "Cambiar" : "Seleccionar"}
                  </button>

                  <button
                    type="button"
                    onClick={abrirAdjuntoTemporal}
                    disabled={!archivoAdjunto}
                    className="rounded-xl border border-[#d0b8b0] bg-[linear-gradient(180deg,#fdfaf9_0%,#ece2df_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#492f29] shadow-[0_8px_14px_rgba(85,52,46,0.10)] transition hover:bg-[#f4edeb] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Ver
                  </button>

                  <button
                    type="button"
                    onClick={quitarAdjunto}
                    disabled={!archivoAdjunto}
                    className="rounded-xl border border-[#d0b8b0] bg-[linear-gradient(180deg,#fdfaf9_0%,#ece2df_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#492f29] shadow-[0_8px_14px_rgba(85,52,46,0.10)] transition hover:bg-[#f4edeb] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          </Bloque>

          {buscadorAbierto ? (
            <div className="absolute left-1/2 top-[356px] z-40 w-[320px] -translate-x-1/2">
              <div className="rounded-[24px] border border-[#79534c] bg-[linear-gradient(180deg,#4a342f_0%,#392823_48%,#2c1f1c_100%)] p-5 shadow-[0_24px_56px_rgba(31,20,17,0.30)]">
                <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#e3cdc6]">
                  Buscar
                </div>

                <div className="mt-2 grid gap-3">
                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#e3cdc6]">
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
                      className="w-full rounded-2xl border border-[#d7bbb3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-2 text-sm text-[#2e211d] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] outline-none"
                    />
                  </label>

                  <label className="flex items-center justify-center gap-2 text-sm font-medium text-[#f4e9e6]">
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
                    <div className="rounded-2xl border border-[#8a6d66] bg-[rgba(254,249,248,0.92)] px-3 py-2 text-center text-sm text-[#634c46]">
                      {mensajeBusqueda}
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={buscarDesdeInicio}
                      className="rounded-2xl border border-[#cfafa8] bg-[linear-gradient(180deg,#fbf7f6_0%,#e8dbd8_100%)] px-4 py-2 text-sm font-semibold text-[#492f29] shadow-[0_10px_18px_rgba(85,52,46,0.10)]"
                    >
                      Buscar
                    </button>

                    {resultadosBusqueda.length > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={buscarMas}
                          className="rounded-2xl border border-[#cfafa8] bg-[linear-gradient(180deg,#fbf7f6_0%,#e8dbd8_100%)] px-4 py-2 text-sm font-semibold text-[#492f29] shadow-[0_10px_18px_rgba(85,52,46,0.10)]"
                        >
                          Buscar mas
                        </button>

                        <button
                          type="button"
                          onClick={irPrimeraCoincidencia}
                          className="rounded-2xl border border-[#cfafa8] bg-[linear-gradient(180deg,#fbf7f6_0%,#e8dbd8_100%)] px-4 py-2 text-sm font-semibold text-[#492f29] shadow-[0_10px_18px_rgba(85,52,46,0.10)]"
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
                      className="rounded-2xl border border-[#805b54] bg-[linear-gradient(180deg,#553d37_0%,#402d29_100%)] px-4 py-2 text-sm font-semibold text-[#f4e9e6] shadow-[0_8px_16px_rgba(31,20,17,0.22)]"
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
          <div className="w-full max-w-md rounded-[24px] border border-[#d1a79d] bg-[linear-gradient(180deg,#faf3f1_0%,#eddcd7_100%)] p-5 shadow-[0_24px_56px_rgba(31,20,17,0.28)]">
            <div className="text-lg font-black text-[#211915]">No has guardado el registro</div>
            <p className="mt-2 text-sm text-[#766660]">
              Si sales ahora, perderas los datos introducidos. Si habias metido adjunto,
              tendras que seleccionarlo otra vez.
            </p>

            <div className="mt-4 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={cerrarDialogoSalida}
                className="rounded-2xl border border-[#cfafa8] bg-[linear-gradient(180deg,#fbf7f6_0%,#e8dbd8_100%)] px-4 py-2 text-sm font-semibold text-[#492f29] shadow-[0_10px_18px_rgba(85,52,46,0.10)]"
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

