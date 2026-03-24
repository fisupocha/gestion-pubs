"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccesoApp } from "@/components/acceso/control-acceso-app";
import { CampoFecha } from "@/components/ui/campo-fecha";
import type { ClasificacionMapa } from "@/lib/clasificacion";
import type { MaestrosFormulario } from "@/modules/maestros/varios/data/obtener-maestros-formulario";
import {
  guardarAlquilerPersistido,
  listarAlquileresPersistidos,
} from "@/modules/operativa/utils/persistencia-operativa";

const PROVEEDORES_PREDETERMINADOS: string[] = [];

type TipoClasificacion = string;

type FormularioFactura = {
  empresa: string;
  proveedor: string;
  fechaFactura: string;
  numeroFactura: string;
  tipo: TipoClasificacion | "";
  familia: string;
  subfamilia: string;
  retencion: string;
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
    retencion: "",
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
    proveedor: registro.proveedor,
    fechaFactura: registro.fechaFactura,
    numeroFactura: registro.numeroFactura,
    tipo: registro.tipo,
    familia: registro.familia,
    subfamilia: registro.subfamilia,
    retencion: registro.retencion,
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
      className={`rounded-[22px] border border-[#c89b7e] bg-[linear-gradient(180deg,rgba(248,239,233,0.99)_0%,rgba(237,221,210,0.99)_100%)] p-3 shadow-[0_16px_34px_rgba(81,54,38,0.09)] 2xl:rounded-[24px] 2xl:p-4 2xl:shadow-[0_20px_40px_rgba(81,54,38,0.11)] ${className}`}
    >
      <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.22em] text-[#8a5d49] 2xl:mb-3 2xl:text-[11px] 2xl:tracking-[0.24em]">
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
      <span className="text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[#886454] 2xl:text-[11px] 2xl:tracking-[0.1em]">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[#77a1aa] bg-[linear-gradient(180deg,#ffffff_0%,#eef5f6_100%)] px-3 py-2 text-center text-sm text-[#173138] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_14px_28px_rgba(45,63,68,0.13)] outline-none transition duration-150 placeholder:text-[#789198] hover:-translate-y-[1px] hover:scale-[1.005] hover:border-[#3d6d77] hover:bg-[#ffffff] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.98),0_22px_38px_rgba(45,63,68,0.20)] focus:border-[#244d57] focus:bg-white focus:shadow-[0_0_0_6px_rgba(95,142,152,0.28),0_24px_42px_rgba(45,63,68,0.22)] 2xl:py-2.5";

const campoDependienteDeshabilitadoClassName =
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:appearance-none disabled:!border-[#ccd6d9] disabled:!bg-[linear-gradient(180deg,#d9e2e5_0%,#c7d1d5_100%)] disabled:!text-[#5e747b] disabled:!shadow-[inset_0_1px_0_rgba(255,255,255,0.44)] disabled:opacity-100 disabled:hover:translate-y-0 disabled:hover:scale-100 disabled:hover:!border-[#ccd6d9] disabled:hover:!bg-[linear-gradient(180deg,#d9e2e5_0%,#c7d1d5_100%)] disabled:hover:!shadow-[inset_0_1px_0_rgba(255,255,255,0.44)]";

const accionClassName =
  "min-w-[54px] rounded-2xl border border-[#cfb099] bg-[linear-gradient(180deg,#fff8f3_0%,#efdfd4_100%)] px-3 py-2 text-center text-sm font-semibold text-[#412821] shadow-[0_10px_18px_rgba(81,54,38,0.09)] transition duration-150 hover:-translate-y-[2px] hover:scale-[1.02] hover:border-[#8c4d28] hover:bg-[#fff9f3] hover:shadow-[0_22px_36px_rgba(81,54,38,0.22)] active:translate-y-0 active:scale-100 2xl:min-w-[60px] 2xl:py-2.5";

export function PantallaAlquileres({
  proveedores = PROVEEDORES_PREDETERMINADOS,
  clasificacion,
  maestros,
}: {
  proveedores?: string[];
  clasificacion?: ClasificacionMapa;
  maestros?: MaestrosFormulario;
}) {
  const acceso = useAccesoApp();
  const esGestoria = acceso.esGestoria;
  const opcionesProveedor = proveedores;
  const clasificacionActiva: ClasificacionMapa = useMemo(() => clasificacion ?? {}, [clasificacion]);
  const opcionesLocal = maestros?.locales ?? [];
  const opcionesFormaPago = maestros?.formasPago ?? [];
  const opcionesBanco = maestros?.bancos ?? [];

  type CampoResaltable =
    | "fechaFactura"
    | "numeroFactura"
    | "retencion"
    | "base0"
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
  const retencionRef = useRef<HTMLInputElement | null>(null);
  const base0Ref = useRef<HTMLInputElement | null>(null);
  const base10Ref = useRef<HTMLInputElement | null>(null);
  const base21Ref = useRef<HTMLInputElement | null>(null);
  const fechaPagoRef = useRef<HTMLInputElement | null>(null);
  const numeroPagareRef = useRef<HTMLInputElement | null>(null);
  const observacionesRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelado = false;

    async function cargarPersistidos() {
      try {
        const persistidos = await listarAlquileresPersistidos(clasificacionActiva);

        if (cancelado) {
          return;
        }

        setRegistros(persistidos as RegistroFactura[]);

        if (persistidos.length > 0) {
          const inicial = crearFormularioInicial();
          setIndiceActual(persistidos.length - 1);
          setModoNuevo(true);
          setFormulario(inicial);
          setArchivoAdjunto(null);
          setSnapshotInicial(crearSnapshot(inicial, null));
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
          window.alert("No se pudieron cargar los alquileres guardados.");
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
  const retencionCalculada = round2((base21 * 19) / 100);
  const iva21 = round2((base21 * 21) / 100);
  const totalBase = round2(base0 + base21);
  const totalIva = round2(iva21);
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
    Boolean(formulario.proveedor) &&
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
      retencion: retencionRef,
      base0: base0Ref,
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

  function cambiarImporte(
    campo: "retencion" | "base0" | "base10" | "base21",
    value: string
  ) {
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

    if (!formulario.empresa || !formulario.proveedor || !formulario.fechaFactura) {
      window.alert("Completa Local, Proveedor y Fecha factura.");
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

    try {
      const registroActual: RegistroFactura = {
        id: modoNuevo ? 0 : (registros[indiceActual]?.id ?? 0),
        ...formulario,
        adjunto: archivoAdjunto,
      };

      const persistido = (await guardarAlquilerPersistido(
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
      window.alert("No se pudo guardar el alquiler en BBDD.");
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
      if (esGestoria) {
        return;
      }

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

    if (esGestoria) {
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
    const totalBaseRegistro = round2(parseDecimal(registro.base0) + parseDecimal(registro.base21));
    const totalIvaRegistro = round2(
      (parseDecimal(registro.base21) * 21) / 100
    );
    const totalFacturaRegistro = round2(totalBaseRegistro + totalIvaRegistro);

    return [
      String(registro.id),
      registro.empresa,
      registro.proveedor,
      registro.numeroFactura,
      tipoLabel,
      familiaLabel,
      registro.subfamilia,
      fmtMoney(round2((parseDecimal(registro.base21) * 19) / 100)),
      registro.base0,
      registro.base10,
      registro.base21,
      fmtMoney(totalBaseRegistro),
      fmtMoney(totalIvaRegistro),
      fmtMoney(totalFacturaRegistro),
      registro.pagado ? "pagado" : "pendiente",
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
      ["retencion", registro.retencion],
      ["base0", registro.base0],
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
      <header className="flex items-center justify-between rounded-[22px] border border-[#c89b7e] bg-[linear-gradient(180deg,#f8efe9_0%,#edd8cb_100%)] px-3 py-1 shadow-[0_16px_34px_rgba(81,54,38,0.09)] 2xl:rounded-[24px] 2xl:px-4 2xl:py-1.5 2xl:shadow-[0_18px_38px_rgba(81,54,38,0.10)]">
        <div className="w-[48px] shrink-0 2xl:w-[56px]" />

        <div className="flex-1 text-center">
          <h1 className="text-[18px] font-black tracking-tight text-[#43261c] 2xl:text-[20px]">
            Alquileres
          </h1>
        </div>

        <div className="rounded-2xl border border-[#c89b7e] bg-[linear-gradient(180deg,#faf2ec_0%,#eddccf_100%)] px-2 py-0.75 text-center shadow-[0_10px_18px_rgba(81,54,38,0.09)] 2xl:px-2.5 2xl:py-1">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#8a5d49]">
            ID
          </div>
          <div className="text-base font-black text-[#43261c] 2xl:text-lg">{idVisible}</div>
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
                  onChange={(e) => cambiarCampo("proveedor", e.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecciona proveedor</option>
                  {opcionesProveedor.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Fecha fact.">
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
                  className={`${inputClassName} ${campoDependienteDeshabilitadoClassName}`}
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
                  className={`${inputClassName} ${campoDependienteDeshabilitadoClassName}`}
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
              <Campo label="Retencion">
                <input
                  ref={retencionRef}
                  value={formulario.base21 ? fmtMoney(retencionCalculada) : ""}
                  readOnly
                  type="text"
                  inputMode="decimal"
                  placeholder="0,00"
                  className={`${inputClassName} py-1.5 2xl:py-2`}
                />
              </Campo>

              <Campo label="Basura">
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
              <div className="rounded-2xl border border-[#cda287] bg-[linear-gradient(180deg,#f7eee8_0%,#ead8cb_100%)] px-3.5 py-1.5 text-center shadow-[0_12px_22px_rgba(81,54,38,0.09)] 2xl:px-4 2xl:py-2">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.16em] text-[#7f5a49]">
                  Total base
                </div>
                <div className="mt-0.5 text-center text-[18px] font-black text-[#3b241c] 2xl:text-[22px]">
                  {fmtMoney(totalBase)} EUR
                </div>
              </div>

              <div className="rounded-2xl border border-[#cda287] bg-[linear-gradient(180deg,#f7eee8_0%,#ead8cb_100%)] px-3.5 py-1.5 text-center shadow-[0_12px_22px_rgba(81,54,38,0.09)] 2xl:px-4 2xl:py-2">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.16em] text-[#7f5a49]">
                  Total IVA
                </div>
                <div className="mt-0.5 text-center text-[18px] font-black text-[#3b241c] 2xl:text-[22px]">
                  {fmtMoney(totalIva)} EUR
                </div>
              </div>

              <div className="rounded-2xl border border-[#c47c55] bg-[linear-gradient(180deg,#f5dfd3_0%,#e7b89d_100%)] px-3.5 py-1.5 text-center shadow-[0_14px_26px_rgba(147,84,48,0.16)] 2xl:px-4 2xl:py-2">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#9a4c1f]">
                  Total factura
                </div>
                <div className="mt-0.5 text-center text-[22px] font-black text-[#6f2d0b] 2xl:text-[26px]">
                  {fmtMoney(totalFactura)} EUR
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-[#c89b7e] bg-[linear-gradient(180deg,rgba(248,240,234,0.96)_0%,rgba(237,223,214,0.99)_100%)] px-3 py-3 shadow-[0_14px_26px_rgba(81,54,38,0.08)] 2xl:mt-5 2xl:px-4 2xl:py-4">
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

                <div className="min-w-[80px] rounded-2xl border border-[#cfb099] bg-[linear-gradient(180deg,#fff8f3_0%,#efdfd4_100%)] px-3 py-2 text-center text-sm font-black text-[#412821] shadow-[0_10px_18px_rgba(81,54,38,0.09)] 2xl:min-w-[88px] 2xl:px-4 2xl:py-2.5">
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
                        : "min-w-[124px] rounded-2xl border border-[#cfab95] bg-[linear-gradient(180deg,#fff6f0_0%,#ecd7ca_100%)] px-4 py-2 text-[15px] font-semibold text-[#412821] shadow-[0_12px_20px_rgba(81,54,38,0.10)] transition hover:bg-[#fbefe7] 2xl:min-w-[136px] 2xl:py-2.5"
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
                onClick={() => cambiarCampo("pagado", true)}
                className={
                  formulario.pagado
                    ? "rounded-2xl border border-[#8fb68a] bg-[linear-gradient(180deg,#dcefd7_0%,#b9d7b2_100%)] px-4 py-2 text-sm font-black text-[#264823] shadow-[0_12px_20px_rgba(63,107,56,0.14)] 2xl:py-2.5"
                    : "rounded-2xl border border-[#cfb099] bg-[linear-gradient(180deg,#fff8f3_0%,#efdfd4_100%)] px-4 py-2 text-sm font-black text-[#7b6559] shadow-[0_10px_18px_rgba(81,54,38,0.08)] 2xl:py-2.5"
                }
              >
                Pagado
              </button>

              <button
                type="button"
                onClick={() => cambiarCampo("pagado", false)}
                className={
                  !formulario.pagado
                    ? "rounded-2xl border border-[#c18c89] bg-[linear-gradient(180deg,#f2dddd_0%,#debbb8_100%)] px-4 py-2 text-sm font-black text-[#6d2d2a] shadow-[0_12px_22px_rgba(128,71,67,0.14)] 2xl:py-2.5"
                    : "rounded-2xl border border-[#cfb099] bg-[linear-gradient(180deg,#fff8f3_0%,#efdfd4_100%)] px-4 py-2 text-sm font-black text-[#7b6559] shadow-[0_10px_18px_rgba(81,54,38,0.08)] 2xl:py-2.5"
                }
              >
                No pagado
              </button>
            </div>

            <div className="mt-2 grid gap-2 2xl:mt-2.5 2xl:gap-2.5">
              <Campo label="Fecha de pago">
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
                  onChange={(e) => cambiarCampo("numeroPagare", e.target.value)}
                  type="text"
                  className={inputClassName}
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

              <div className="rounded-2xl border border-[#77a1aa] bg-[linear-gradient(180deg,#ffffff_0%,#eef5f6_100%)] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_14px_28px_rgba(45,63,68,0.13)]">
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
                    className="rounded-xl border border-[#cfab95] bg-[linear-gradient(180deg,#fff6f0_0%,#ecd7ca_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#412821] shadow-[0_8px_14px_rgba(81,54,38,0.09)] transition hover:bg-[#fbefe7]"
                  >
                    {archivoAdjunto ? "Cambiar" : "Seleccionar"}
                  </button>

                  <button
                    type="button"
                    onClick={abrirAdjuntoTemporal}
                    disabled={!archivoAdjunto}
                    className="rounded-xl border border-[#cfb099] bg-[linear-gradient(180deg,#fff8f3_0%,#efdfd4_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#412821] shadow-[0_8px_14px_rgba(81,54,38,0.09)] transition hover:bg-[#fbf1ea] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Ver
                  </button>

                  <button
                    type="button"
                    onClick={quitarAdjunto}
                    disabled={!archivoAdjunto}
                    className="rounded-xl border border-[#cfb099] bg-[linear-gradient(180deg,#fff8f3_0%,#efdfd4_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#412821] shadow-[0_8px_14px_rgba(81,54,38,0.09)] transition hover:bg-[#fbf1ea] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          </Bloque>

          {buscadorAbierto ? (
            <div className="absolute left-1/2 top-[356px] z-40 w-[320px] -translate-x-1/2">
              <div className="rounded-[24px] border border-[#7a5646] bg-[linear-gradient(180deg,#4c352c_0%,#3b2a22_48%,#2f221d_100%)] p-5 shadow-[0_24px_56px_rgba(31,20,15,0.30)]">
                <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#e6c8b8]">
                  Buscar
                </div>

                <div className="mt-2 grid gap-3">
                  <label className="grid gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#e6c8b8]">
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
                      className="w-full rounded-2xl border border-[#d4b59d] bg-[linear-gradient(180deg,#fffaf6_0%,#f5e9e0_100%)] px-3 py-2 text-sm text-[#2c1d18] shadow-[inset_0_1px_0_rgba(255,255,255,0.84)] outline-none"
                    />
                  </label>

                  <label className="flex items-center justify-center gap-2 text-sm font-medium text-[#f5e6dc]">
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
                    <div className="rounded-2xl border border-[#8a6a59] bg-[rgba(255,248,244,0.92)] px-3 py-2 text-center text-sm text-[#65493d]">
                      {mensajeBusqueda}
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={buscarDesdeInicio}
                      className="rounded-2xl border border-[#cfab95] bg-[linear-gradient(180deg,#fff6f0_0%,#ecd7ca_100%)] px-4 py-2 text-sm font-semibold text-[#412821] shadow-[0_10px_18px_rgba(81,54,38,0.09)]"
                    >
                      Buscar
                    </button>

                    {resultadosBusqueda.length > 0 ? (
                      <>
                        <button
                          type="button"
                          onClick={buscarMas}
                          className="rounded-2xl border border-[#cfab95] bg-[linear-gradient(180deg,#fff6f0_0%,#ecd7ca_100%)] px-4 py-2 text-sm font-semibold text-[#412821] shadow-[0_10px_18px_rgba(81,54,38,0.09)]"
                        >
                          Buscar mas
                        </button>

                        <button
                          type="button"
                          onClick={irPrimeraCoincidencia}
                          className="rounded-2xl border border-[#cfab95] bg-[linear-gradient(180deg,#fff6f0_0%,#ecd7ca_100%)] px-4 py-2 text-sm font-semibold text-[#412821] shadow-[0_10px_18px_rgba(81,54,38,0.09)]"
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
                      className="rounded-2xl border border-[#7f5e4f] bg-[linear-gradient(180deg,#5a4136_0%,#463229_100%)] px-4 py-2 text-sm font-semibold text-[#f5e6dc] shadow-[0_8px_16px_rgba(31,20,15,0.22)]"
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
          <div className="w-full max-w-md rounded-[24px] border border-[#c89b7e] bg-[linear-gradient(180deg,#faf2ec_0%,#edd8cb_100%)] p-5 shadow-[0_24px_56px_rgba(31,20,15,0.28)]">
            <div className="text-lg font-black text-[#211915]">No has guardado el registro</div>
            <p className="mt-2 text-sm text-[#6d5549]">
              Si sales ahora, perderas los datos introducidos. Si habias metido adjunto,
              tendras que seleccionarlo otra vez.
            </p>

            <div className="mt-4 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={cerrarDialogoSalida}
                className="rounded-2xl border border-[#cfab95] bg-[linear-gradient(180deg,#fff6f0_0%,#ecd7ca_100%)] px-4 py-2 text-sm font-semibold text-[#412821] shadow-[0_10px_18px_rgba(81,54,38,0.09)]"
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

