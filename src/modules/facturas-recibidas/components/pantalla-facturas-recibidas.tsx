"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const FECHA_PRUEBA = "2026-03-11";
const EMPRESAS = ["EMPRESA", "PUB 1", "PUB 2", "PUB 3"];
const PROVEEDORES = [
  "JULPER ARANJUEZ, S.L.",
  "DISTRIBUCIONES CENTRO",
  "COCACOLA EUROPACIFIC",
  "ASESORIA RIVERO",
];
const FORMAS_PAGO = ["TRANSFERENCIA", "PAGARE", "EFECTIVO", "RECIBO"];
const BANCOS = ["CAIXABANK", "SANTANDER", "BBVA", "NINGUNO"];

const CLASIFICACION = {
  mercaderia: {
    label: "Mercaderia",
    familias: {
      refrescos: {
        label: "Refrescos",
        subfamilias: ["Coca-Cola", "Pepsi", "Fanta"],
      },
      cerveza: {
        label: "Cerveza",
        subfamilias: ["Barril", "Botellin", "Lata"],
      },
      tabaco: {
        label: "Tabaco",
        subfamilias: [],
      },
    },
  },
  fijos: {
    label: "Fijos",
    familias: {
      asesoria: {
        label: "Asesoria",
        subfamilias: [],
      },
      suministros: {
        label: "Suministros",
        subfamilias: ["Luz", "Agua", "Gas"],
      },
    },
  },
  varios: {
    label: "Varios",
    familias: {
      limpieza: {
        label: "Limpieza",
        subfamilias: ["Productos", "Utillaje"],
      },
      mantenimiento: {
        label: "Mantenimiento",
        subfamilias: [],
      },
    },
  },
  extras: {
    label: "Extras",
    familias: {
      decoracion: {
        label: "Decoracion",
        subfamilias: [],
      },
      eventos: {
        label: "Eventos",
        subfamilias: [],
      },
    },
  },
  empleados: {
    label: "Empleados",
    familias: {
      uniformes: {
        label: "Uniformes",
        subfamilias: [],
      },
      formacion: {
        label: "Formacion",
        subfamilias: [],
      },
    },
  },
} as const;

type TipoClasificacion = keyof typeof CLASIFICACION;

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
    fechaFactura: FECHA_PRUEBA,
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
    formaPago: FORMAS_PAGO[0],
    banco: BANCOS[0],
    numeroPagare: "",
    observaciones: "",
  };
}

function crearRegistroPrueba(
  id: number,
  overrides: Partial<FormularioFactura>
): RegistroFactura {
  return {
    id,
    ...crearFormularioInicial(),
    ...overrides,
    adjunto: null,
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

const REGISTROS_PRUEBA: RegistroFactura[] = [
  crearRegistroPrueba(3842, {
    empresa: "PUB 1",
    proveedor: "COCACOLA EUROPACIFIC",
    fechaFactura: "2026-02-27",
    numeroFactura: "CC-102",
    tipo: "mercaderia",
    familia: "refrescos",
    subfamilia: "Coca-Cola",
    base21: "184,50",
  }),
  crearRegistroPrueba(3843, {
    empresa: "EMPRESA",
    proveedor: "ASESORIA RIVERO",
    fechaFactura: "2026-03-05",
    numeroFactura: "AR-031",
    tipo: "fijos",
    familia: "asesoria",
    subfamilia: "",
    base0: "0,00",
    base21: "120,00",
  }),
  crearRegistroPrueba(3844, {
    empresa: "EMPRESA",
    proveedor: "JULPER ARANJUEZ, S.L.",
    fechaFactura: FECHA_PRUEBA,
    numeroFactura: "87",
    tipo: "mercaderia",
    familia: "refrescos",
    subfamilia: "",
    base21: "307,02",
  }),
];

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
      className={`rounded-[22px] border border-[#d7bea0] bg-[linear-gradient(180deg,rgba(237,245,235,0.99)_0%,rgba(222,234,217,0.99)_100%)] p-3 shadow-[0_16px_34px_rgba(61,43,30,0.08)] 2xl:rounded-[24px] 2xl:p-4 2xl:shadow-[0_20px_40px_rgba(61,43,30,0.09)] ${className}`}
    >
      <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.22em] text-[#8d6e50] 2xl:mb-3 2xl:text-[11px] 2xl:tracking-[0.24em]">
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
      <span className="text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[#8a715a] 2xl:text-[11px] 2xl:tracking-[0.1em]">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-2xl border border-[#d8c2a5] bg-[linear-gradient(180deg,#fffaf4_0%,#f4eadf_100%)] px-3 py-2 text-center text-sm text-[#241b17] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_6px_14px_rgba(85,61,41,0.04)] outline-none transition placeholder:text-[#ac9a89] focus:border-[#b98a50] focus:bg-white focus:shadow-[0_0_0_3px_rgba(185,138,80,0.14)] 2xl:py-2.5";

const accionClassName =
  "min-w-[54px] rounded-2xl border border-[#d2baa0] bg-[linear-gradient(180deg,#fffaf2_0%,#eee1d0_100%)] px-3 py-2 text-center text-sm font-semibold text-[#2a201c] shadow-[0_10px_18px_rgba(74,54,39,0.08)] transition hover:border-[#b99569] hover:bg-[#fff7ed] 2xl:min-w-[60px] 2xl:py-2.5";

export function PantallaFacturasRecibidas() {
  const ultimoIndice = Math.max(REGISTROS_PRUEBA.length - 1, 0);
  const registroInicial = REGISTROS_PRUEBA[ultimoIndice];
  const [registros, setRegistros] = useState<RegistroFactura[]>(REGISTROS_PRUEBA);
  const [indiceActual, setIndiceActual] = useState(ultimoIndice);
  const [modoNuevo, setModoNuevo] = useState(false);
  const [formulario, setFormulario] = useState<FormularioFactura>(() =>
    formularioDesdeRegistro(registroInicial)
  );
  const [archivoAdjunto, setArchivoAdjunto] = useState<AdjuntoTemporal>(registroInicial.adjunto);
  const [snapshotInicial, setSnapshotInicial] = useState(() =>
    crearSnapshot(formularioDesdeRegistro(registroInicial), registroInicial.adjunto)
  );
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
  const inputAdjuntoRef = useRef<HTMLInputElement | null>(null);

  const familiasDisponibles = useMemo(() => {
    if (!formulario.tipo) {
      return [];
    }

    return Object.entries(CLASIFICACION[formulario.tipo].familias).map(([id, item]) => ({
      id,
      label: item.label,
    }));
  }, [formulario.tipo]);

  const subfamiliasDisponibles = useMemo(() => {
    if (!formulario.tipo || !formulario.familia) {
      return [];
    }

    const familias = CLASIFICACION[formulario.tipo].familias as Record<
      string,
      {
        label: string;
        subfamilias: readonly string[];
      }
    >;

    return [...(familias[formulario.familia]?.subfamilias ?? [])];
  }, [formulario.familia, formulario.tipo]);

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
    Boolean(formulario.proveedor) &&
    Boolean(formulario.fechaFactura) &&
    Boolean(formulario.numeroFactura.trim()) &&
    Boolean(formulario.tipo) &&
    Boolean(formulario.familia) &&
    totalBase !== 0;

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

    if (!formulario.empresa || !formulario.proveedor || !formulario.fechaFactura) {
      window.alert("Completa Empresa, Proveedor y Fecha factura.");
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
    const tipoConfig = registro.tipo ? CLASIFICACION[registro.tipo] : null;
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

    return [
      String(registro.id),
      registro.empresa,
      registro.proveedor,
      registro.numeroFactura,
      registro.fechaFactura,
      tipoLabel,
      familiaLabel,
      registro.subfamilia,
      registro.base0,
      registro.base4,
      registro.base10,
      registro.base21,
      fmtMoney(
        round2(
          parseDecimal(registro.base0) +
            parseDecimal(registro.base4) +
            parseDecimal(registro.base10) +
            parseDecimal(registro.base21)
        )
      ),
      registro.observaciones,
      registro.formaPago,
      registro.banco,
      registro.numeroPagare,
    ]
      .filter(Boolean)
      .map((campo) => normalizarTextoBusqueda(campo));
  }

  function buscarRegistro(irAlPrimero: boolean) {
    const termino = normalizarTextoBusqueda(textoBusqueda);

    if (!termino) {
      setMensajeBusqueda("Escribe algo para buscar.");
      return;
    }

    if (registros.length === 0) {
      setMensajeBusqueda("No hay registros guardados.");
      return;
    }

    const inicio = irAlPrimero || modoNuevo ? 0 : indiceActual + 1;

    for (let paso = 0; paso < registros.length; paso += 1) {
      const indice = (inicio + paso) % registros.length;
      const campos = obtenerCamposBusqueda(registros[indice]);
      const coincide = campos.some((campo) =>
        busquedaExacta ? campo === termino : campo.includes(termino)
      );

      if (coincide) {
        if (!modoNuevo && indice === indiceActual) {
          setMensajeBusqueda(
            irAlPrimero
              ? "El registro actual ya es la primera coincidencia."
              : "No hay una coincidencia siguiente distinta al registro actual."
          );
          return;
        }

        setMensajeBusqueda(null);
        solicitarDestino(
          { tipo: "registro", indice },
          {
            cerrarBuscador: true,
          }
        );
        return;
      }
    }

    setMensajeBusqueda("No se han encontrado resultados.");
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-2 p-2.5 2xl:gap-2.5 2xl:p-3">
      <header className="flex items-center justify-between rounded-[22px] border border-[#d2b391] bg-[linear-gradient(180deg,#f6ece0_0%,#eadcc9_100%)] px-3 py-1 shadow-[0_16px_34px_rgba(61,43,30,0.08)] 2xl:rounded-[24px] 2xl:px-4 2xl:py-1.5 2xl:shadow-[0_18px_38px_rgba(61,43,30,0.09)]">
        <div className="w-[48px] shrink-0 2xl:w-[56px]" />

        <div className="flex-1 text-center">
          <h1 className="text-[18px] font-black tracking-tight text-[#1f1713] 2xl:text-[20px]">
            Facturas recibidas
          </h1>
        </div>

        <div className="rounded-2xl border border-[#d2b391] bg-[linear-gradient(180deg,#f7ede1_0%,#e9dac7_100%)] px-2 py-0.75 text-right shadow-[0_10px_18px_rgba(74,54,39,0.08)] 2xl:px-2.5 2xl:py-1">
          <div className="text-[8px] font-black uppercase tracking-[0.2em] text-[#8b6d52]">
            ID
          </div>
          <div className="text-base font-black text-[#1f1713] 2xl:text-lg">{idVisible}</div>
        </div>
      </header>

      <form onSubmit={guardarPrueba} className="grid min-h-0 flex-1 gap-2.5 lg:grid-cols-[1.55fr_0.95fr] 2xl:gap-3">
        <div className="grid min-h-0 gap-2.5 2xl:gap-3">
          <Bloque titulo="Datos principales">
            <div className="grid gap-2.5 lg:grid-cols-[126px_minmax(0,1fr)_144px_144px] 2xl:gap-3 2xl:grid-cols-[140px_minmax(0,1fr)_150px_150px]">
              <Campo label="Empresa">
                <select
                  value={formulario.empresa}
                  onChange={(e) => cambiarCampo("empresa", e.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecciona empresa</option>
                  {EMPRESAS.map((item) => (
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
                  {PROVEEDORES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Fecha factura">
                <input
                  value={formulario.fechaFactura}
                  onChange={(e) => cambiarCampo("fechaFactura", e.target.value)}
                  type="date"
                  className={`${inputClassName} text-center`}
                />
              </Campo>

              <Campo label="Numero factura">
                <input
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
                  {Object.entries(CLASIFICACION).map(([id, item]) => (
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
              <div className="rounded-2xl border border-[#d2b391] bg-[linear-gradient(180deg,#f5ecdf_0%,#e8dac7_100%)] px-3.5 py-1.5 text-center shadow-[0_12px_22px_rgba(72,53,39,0.08)] 2xl:px-4 2xl:py-2">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.16em] text-[#8b6e52]">
                  Total base
                </div>
                <div className="mt-0.5 text-center text-[18px] font-black text-[#231a16] 2xl:text-[22px]">
                  {fmtMoney(totalBase)} EUR
                </div>
              </div>

              <div className="rounded-2xl border border-[#d2b391] bg-[linear-gradient(180deg,#f5ecdf_0%,#e8dac7_100%)] px-3.5 py-1.5 text-center shadow-[0_12px_22px_rgba(72,53,39,0.08)] 2xl:px-4 2xl:py-2">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.16em] text-[#8b6e52]">
                  Total IVA
                </div>
                <div className="mt-0.5 text-center text-[18px] font-black text-[#231a16] 2xl:text-[22px]">
                  {fmtMoney(totalIva)} EUR
                </div>
              </div>

              <div className="rounded-2xl border border-[#d2b391] bg-[linear-gradient(180deg,#f3e0be_0%,#dfbf8d_100%)] px-3.5 py-1.5 text-center shadow-[0_14px_26px_rgba(145,92,27,0.14)] 2xl:px-4 2xl:py-2">
                <div className="text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#8e470a]">
                  Total factura
                </div>
                <div className="mt-0.5 text-center text-[22px] font-black text-[#713002] 2xl:text-[26px]">
                  {fmtMoney(totalFactura)} EUR
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-[#d2b391] bg-[linear-gradient(180deg,rgba(246,238,229,0.96)_0%,rgba(234,224,211,0.99)_100%)] px-3 py-3 shadow-[0_14px_26px_rgba(61,43,30,0.07)] 2xl:mt-5 2xl:px-4 2xl:py-4">
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

                <div className="min-w-[80px] rounded-2xl border border-[#d3bea3] bg-[linear-gradient(180deg,#fffaf2_0%,#ede1d0_100%)] px-3 py-2 text-center text-sm font-black text-[#2a201c] shadow-[0_10px_18px_rgba(74,54,39,0.08)] 2xl:min-w-[88px] 2xl:px-4 2xl:py-2.5">
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
                    setMensajeBusqueda(null);
                    setBuscadorAbierto(true);
                  }}
                  className={accionClassName}
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
                      ? "min-w-[124px] rounded-2xl border border-[#8fb68a] bg-[linear-gradient(180deg,#dcefd7_0%,#b9d7b2_100%)] px-4 py-2 text-sm font-semibold text-[#264823] shadow-[0_12px_20px_rgba(63,107,56,0.14)] 2xl:min-w-[136px] 2xl:py-2.5"
                      : !formularioValido
                        ? "min-w-[124px] rounded-2xl border border-[#c18c89] bg-[linear-gradient(180deg,#f2dddd_0%,#debbb8_100%)] px-4 py-2 text-sm font-semibold text-[#6d2d2a] shadow-[0_12px_20px_rgba(128,71,67,0.12)] 2xl:min-w-[136px] 2xl:py-2.5"
                        : "min-w-[124px] rounded-2xl border border-[#ceb08b] bg-[linear-gradient(180deg,#fff6e8_0%,#ecd8be_100%)] px-4 py-2 text-sm font-semibold text-[#2a201c] shadow-[0_12px_20px_rgba(74,54,39,0.09)] transition hover:bg-[#fff4e4] 2xl:min-w-[136px] 2xl:py-2.5"
                  }
                >
                  {botonGuardado ? "Guardado" : "Guardar"}
                </button>
              </div>
            </div>
          </Bloque>
        </div>

        <div className="grid min-h-0 gap-2.5 2xl:gap-3">
          <Bloque titulo="Pago">
            <div className="grid gap-2.5 lg:grid-cols-[1fr_1fr] 2xl:gap-3">
              <button
                type="button"
                onClick={() => cambiarCampo("pagado", true)}
                className={
                  formulario.pagado
                    ? "rounded-2xl border border-[#8fb68a] bg-[linear-gradient(180deg,#dcefd7_0%,#b9d7b2_100%)] px-4 py-2.5 text-sm font-black text-[#264823] shadow-[0_12px_20px_rgba(63,107,56,0.14)] 2xl:py-3"
                    : "rounded-2xl border border-[#d3bea4] bg-[linear-gradient(180deg,#fffaf2_0%,#eee3d3_100%)] px-4 py-2.5 text-sm font-black text-[#6b5b50] shadow-[0_10px_18px_rgba(74,54,39,0.07)] 2xl:py-3"
                }
              >
                Pagado
              </button>

              <button
                type="button"
                onClick={() => cambiarCampo("pagado", false)}
                className={
                  !formulario.pagado
                    ? "rounded-2xl border border-[#c18c89] bg-[linear-gradient(180deg,#f2dddd_0%,#debbb8_100%)] px-4 py-2.5 text-sm font-black text-[#6d2d2a] shadow-[0_12px_22px_rgba(128,71,67,0.14)] 2xl:py-3"
                    : "rounded-2xl border border-[#d3bea4] bg-[linear-gradient(180deg,#fffaf2_0%,#eee3d3_100%)] px-4 py-2.5 text-sm font-black text-[#6b5b50] shadow-[0_10px_18px_rgba(74,54,39,0.07)] 2xl:py-3"
                }
              >
                No pagado
              </button>
            </div>

            <div className="mt-2.5 grid gap-2.5 2xl:mt-3 2xl:gap-3">
              <Campo label="Fecha de pago">
                <input
                  value={formulario.fechaPago}
                  onChange={(e) => cambiarCampo("fechaPago", e.target.value)}
                  type="date"
                  className={inputClassName}
                />
              </Campo>

              <Campo label="Forma de pago">
                <select
                  value={formulario.formaPago}
                  onChange={(e) => cambiarCampo("formaPago", e.target.value)}
                  className={inputClassName}
                >
                  {FORMAS_PAGO.map((item) => (
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
                  {BANCOS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </Campo>

              <Campo label="Numero pagare">
                <input
                  value={formulario.numeroPagare}
                  onChange={(e) => cambiarCampo("numeroPagare", e.target.value)}
                  type="text"
                  className={inputClassName}
                />
              </Campo>

              <Campo label="Observaciones">
                <textarea
                  value={formulario.observaciones}
                  onChange={(e) => cambiarCampo("observaciones", e.target.value)}
                  rows={3}
                  className={`${inputClassName} h-16 resize-none 2xl:h-24`}
                />
              </Campo>

              <div className="rounded-2xl border border-[#d2b391] bg-[linear-gradient(180deg,#f5ecdf_0%,#e8dac7_100%)] px-3 py-2.5 shadow-[0_10px_18px_rgba(72,53,39,0.06)]">
                <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#8b6e52]">
                  Adjunto
                </div>

                <div className="mt-1 truncate text-center text-[11px] font-medium text-[#5f5144]">
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
                    className="rounded-xl border border-[#ceb08b] bg-[linear-gradient(180deg,#fff6e8_0%,#ecd8be_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#2a201c] shadow-[0_8px_14px_rgba(74,54,39,0.08)] transition hover:bg-[#fff4e4]"
                  >
                    {archivoAdjunto ? "Cambiar" : "Seleccionar"}
                  </button>

                  <button
                    type="button"
                    onClick={abrirAdjuntoTemporal}
                    disabled={!archivoAdjunto}
                    className="rounded-xl border border-[#d2baa0] bg-[linear-gradient(180deg,#fffaf2_0%,#eee1d0_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#2a201c] shadow-[0_8px_14px_rgba(74,54,39,0.08)] transition hover:bg-[#fff7ed] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Ver
                  </button>

                  <button
                    type="button"
                    onClick={quitarAdjunto}
                    disabled={!archivoAdjunto}
                    className="rounded-xl border border-[#d2baa0] bg-[linear-gradient(180deg,#fffaf2_0%,#eee1d0_100%)] px-3 py-1.5 text-[11px] font-semibold text-[#2a201c] shadow-[0_8px_14px_rgba(74,54,39,0.08)] transition hover:bg-[#fff7ed] disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    Quitar
                  </button>
                </div>
              </div>
            </div>
          </Bloque>

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

      {buscadorAbierto ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(22,16,12,0.28)] p-4">
          <div className="w-full max-w-xl rounded-[24px] border border-[#d2b391] bg-[linear-gradient(180deg,#f7ede1_0%,#eadcc9_100%)] p-5 shadow-[0_24px_56px_rgba(28,20,15,0.22)]">
            <div className="text-lg font-black text-[#211915]">Buscar en facturas recibidas</div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a715a]">
                  Buscar
                </span>
                <input
                  value={textoBusqueda}
                  onChange={(e) => setTextoBusqueda(e.target.value)}
                  type="text"
                  className="w-full rounded-2xl border border-[#d8c2a5] bg-[linear-gradient(180deg,#fffaf4_0%,#f4eadf_100%)] px-3 py-2 text-sm text-[#241b17] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] outline-none"
                />
              </label>

              <label className="flex items-center justify-center gap-2 text-sm font-medium text-[#5f5144]">
                <input
                  checked={busquedaExacta}
                  onChange={(e) => setBusquedaExacta(e.target.checked)}
                  type="checkbox"
                />
                Coincidencia exacta
              </label>

              {mensajeBusqueda ? (
                <div className="rounded-2xl border border-[#d2b391] bg-white/55 px-3 py-2 text-center text-sm text-[#6a5647]">
                  {mensajeBusqueda}
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2.5">
              <button
                type="button"
                onClick={() => buscarRegistro(false)}
                className="rounded-2xl border border-[#ceb08b] bg-[linear-gradient(180deg,#fff6e8_0%,#ecd8be_100%)] px-4 py-2 text-sm font-semibold text-[#2a201c] shadow-[0_10px_18px_rgba(74,54,39,0.08)]"
              >
                Buscar siguiente
              </button>

              <button
                type="button"
                onClick={() => buscarRegistro(true)}
                className="rounded-2xl border border-[#ceb08b] bg-[linear-gradient(180deg,#fff6e8_0%,#ecd8be_100%)] px-4 py-2 text-sm font-semibold text-[#2a201c] shadow-[0_10px_18px_rgba(74,54,39,0.08)]"
              >
                Ir al primero
              </button>

              <button
                type="button"
                onClick={() => setBuscadorAbierto(false)}
                className="rounded-2xl border border-[#d2baa0] bg-[linear-gradient(180deg,#fffaf2_0%,#eee1d0_100%)] px-4 py-2 text-sm font-semibold text-[#2a201c] shadow-[0_10px_18px_rgba(74,54,39,0.08)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
