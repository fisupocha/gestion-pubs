"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  eliminarAdelantoEmpleado,
  guardarAdelantoEmpleado,
  guardarEstadoPagoLiquidacion,
  listarLiquidacionMensualEmpleados,
  type AdelantoEmpleado,
  type RegistroLiquidacionMensual,
} from "@/modules/maestros/empleados/data/persistencia-liquidacion-empleados";

type Empleado = {
  id: number;
  nombre: string;
  familiaId: number;
  familia: string;
  precioSueldo: number;
  tipoId: number;
  tieneHoras: boolean;
};

type TipoEmpleado = {
  id: number;
  label: string;
};

type AccionEmpleado = (formData: FormData) => void | Promise<void>;

type PantallaEmpleadosProps = {
  empleados: Empleado[];
  tiposEmpleado: TipoEmpleado[];
  mensaje?: string;
  tipo?: string;
  cuadranteDemoHref: string;
  accionCrear: AccionEmpleado;
  accionActualizar: AccionEmpleado;
  accionEliminar: AccionEmpleado;
};

const bloqueClassName =
  "rounded-[24px] border border-[#d1a79d] bg-[linear-gradient(180deg,rgba(248,240,237,0.99)_0%,rgba(237,223,219,0.99)_100%)] p-4 shadow-[0_18px_34px_rgba(85,52,46,0.10)]";

const labelClassName =
  "text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[#896d63]";

const inputClassName =
  "w-full rounded-2xl border border-[#d2aca3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-4 py-3 text-center text-sm text-[#2e211d] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_8px_18px_rgba(85,52,46,0.07)] outline-none transition duration-150 placeholder:text-[#a78f88] hover:-translate-y-[1px] hover:border-[#c58f82] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_28px_rgba(85,52,46,0.12)] focus:-translate-y-[1px] focus:border-[#b97263] focus:bg-white focus:shadow-[0_0_0_4px_rgba(193,129,115,0.18),0_16px_30px_rgba(85,52,46,0.12)]";

const accionClassName =
  "min-w-[122px] rounded-2xl border border-[#cfafa8] bg-[linear-gradient(180deg,#fbf7f6_0%,#e8dbd8_100%)] px-4 py-2.5 text-[15px] font-semibold text-[#492f29] shadow-[0_12px_20px_rgba(85,52,46,0.10)] transition duration-150 hover:-translate-y-[1px] hover:border-[#c28779] hover:bg-[linear-gradient(180deg,#fffdfc_0%,#eedfda_100%)] hover:shadow-[0_16px_28px_rgba(85,52,46,0.16)] focus-visible:-translate-y-[1px] focus-visible:border-[#b97263] focus-visible:bg-[linear-gradient(180deg,#fffdfc_0%,#f0e2dc_100%)] focus-visible:shadow-[0_0_0_4px_rgba(193,129,115,0.18),0_18px_30px_rgba(85,52,46,0.16)] focus-visible:outline-none";

const accionDeshabilitadaClassName =
  "min-w-[122px] cursor-not-allowed rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fcf9f8_0%,#efe6e3_100%)] px-4 py-2.5 text-[15px] font-semibold text-[#96817b] opacity-70 shadow-none";
const LIQUIDACION_MIN_ANO = 2026;
const LIQUIDACION_MIN_MES = "04";
const MESES = [
  { value: "01", label: "Enero" },
  { value: "02", label: "Febrero" },
  { value: "03", label: "Marzo" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Mayo" },
  { value: "06", label: "Junio" },
  { value: "07", label: "Julio" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
] as const;

function fmtMoney(value: number) {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function parseImporte(value: string) {
  const limpio = value.replace(",", ".").trim();
  const numero = Number(limpio);
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : 0;
}

function fmtHoras(value: number) {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

function resolverPeriodoInicial() {
  const hoy = new Date();
  const ano = hoy.getFullYear();
  const mes = hoy.getMonth() + 1;

  if (ano < LIQUIDACION_MIN_ANO || (ano === LIQUIDACION_MIN_ANO && mes < Number(LIQUIDACION_MIN_MES))) {
    return { ano: String(LIQUIDACION_MIN_ANO), mes: LIQUIDACION_MIN_MES };
  }

  return { ano: String(ano), mes: String(mes).padStart(2, "0") };
}

function mesesDisponibles(ano: string) {
  return MESES.filter((mes) => Number(ano) > LIQUIDACION_MIN_ANO || mes.value >= LIQUIDACION_MIN_MES);
}

function finMes(ano: string, mes: string) {
  const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
  return `${ano}-${mes}-${String(ultimoDia).padStart(2, "0")}`;
}

export function PantallaEmpleados({
  empleados,
  tiposEmpleado,
  mensaje,
  tipo,
  cuadranteDemoHref,
  accionCrear,
  accionActualizar,
  accionEliminar,
}: PantallaEmpleadosProps) {
  const periodoInicial = resolverPeriodoInicial();
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [empleadoSeleccionadoId, setEmpleadoSeleccionadoId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [familiaId, setFamiliaId] = useState("");
  const [precioSueldo, setPrecioSueldo] = useState("");
  const [empleadoTieneHoras, setEmpleadoTieneHoras] = useState(false);
  const [modoDerecha, setModoDerecha] = useState<"lista" | "liquidacion">("lista");
  const [liquidacionMes, setLiquidacionMes] = useState(periodoInicial.mes);
  const [liquidacionAno, setLiquidacionAno] = useState(periodoInicial.ano);
  const [filasLiquidacion, setFilasLiquidacion] = useState<RegistroLiquidacionMensual[]>([]);
  const [adelantosMes, setAdelantosMes] = useState<AdelantoEmpleado[]>([]);
  const [cargandoLiquidacion, setCargandoLiquidacion] = useState(false);
  const [mensajeLiquidacion, setMensajeLiquidacion] = useState("");
  const [adelantoEmpleadoId, setAdelantoEmpleadoId] = useState("");
  const [adelantoFecha, setAdelantoFecha] = useState(`${periodoInicial.ano}-${periodoInicial.mes}-01`);
  const [adelantoImporte, setAdelantoImporte] = useState("");
  const [adelantoObservaciones, setAdelantoObservaciones] = useState("");
  const [guardandoAdelanto, setGuardandoAdelanto] = useState(false);
  const [guardandoPagoId, setGuardandoPagoId] = useState<number | null>(null);
  const nombreRef = useRef<HTMLInputElement | null>(null);
  const mesesLiquidacionDisponibles = useMemo(
    () => mesesDisponibles(liquidacionAno),
    [liquidacionAno]
  );

  const empleadosFiltrados = useMemo(() => {
    const termino = textoBusqueda.trim().toLowerCase();

    if (!termino) {
      return empleados;
    }

    return empleados.filter((empleado) => {
      return (
        empleado.nombre.toLowerCase().includes(termino) ||
        empleado.familia.toLowerCase().includes(termino) ||
        fmtMoney(empleado.precioSueldo).includes(termino)
      );
    });
  }, [empleados, textoBusqueda]);
  const totalSueldoMes = useMemo(
    () => filasLiquidacion.reduce((sum, fila) => sum + fila.totalSueldo, 0),
    [filasLiquidacion]
  );
  const totalSaldoAnteriorMes = useMemo(
    () => filasLiquidacion.reduce((sum, fila) => sum + fila.saldoAnterior, 0),
    [filasLiquidacion]
  );
  const totalAdelantosMes = useMemo(
    () => filasLiquidacion.reduce((sum, fila) => sum + fila.adelantosMes, 0),
    [filasLiquidacion]
  );
  const totalPagarMes = useMemo(
    () => filasLiquidacion.reduce((sum, fila) => sum + fila.totalPagar, 0),
    [filasLiquidacion]
  );
  const totalSaldoSiguienteMes = useMemo(
    () => filasLiquidacion.reduce((sum, fila) => sum + fila.saldoSiguiente, 0),
    [filasLiquidacion]
  );

  async function cargarLiquidacionMensual() {
    if (liquidacionAno.length !== 4) {
      setMensajeLiquidacion("El ano debe tener 4 cifras.");
      return;
    }

    if (
      Number(liquidacionAno) < LIQUIDACION_MIN_ANO ||
      (Number(liquidacionAno) === LIQUIDACION_MIN_ANO && liquidacionMes < LIQUIDACION_MIN_MES)
    ) {
      setMensajeLiquidacion("La liquidacion mensual empieza en abril de 2026.");
      return;
    }

    setCargandoLiquidacion(true);
    setMensajeLiquidacion("");

    try {
      const fechaDesde = `${liquidacionAno}-${liquidacionMes}-01`;
      const { liquidacion, adelantos } = await listarLiquidacionMensualEmpleados({
        fechaDesde,
        fechaHasta: finMes(liquidacionAno, liquidacionMes),
      });

      setFilasLiquidacion(liquidacion);
      setAdelantosMes(adelantos);
      setAdelantoFecha(fechaDesde);
    } catch {
      setMensajeLiquidacion("No se pudo cargar la liquidacion mensual.");
      setFilasLiquidacion([]);
      setAdelantosMes([]);
    } finally {
      setCargandoLiquidacion(false);
    }
  }

  useEffect(() => {
    if (modoDerecha !== "liquidacion") {
      return;
    }

    void cargarLiquidacionMensual();
  }, [modoDerecha, liquidacionAno, liquidacionMes]);

  async function guardarNuevoAdelanto() {
    const importe = parseImporte(adelantoImporte);

    if (!adelantoEmpleadoId || !adelantoFecha || importe <= 0) {
      window.alert("Completa empleado, fecha e importe del adelanto.");
      return;
    }

    try {
      setGuardandoAdelanto(true);
      await guardarAdelantoEmpleado({
        fecha: adelantoFecha,
        empleadoId: Number(adelantoEmpleadoId),
        importe,
        observaciones: adelantoObservaciones,
      });
      setAdelantoImporte("");
      setAdelantoObservaciones("");
      await cargarLiquidacionMensual();
    } catch {
      window.alert("No se pudo guardar el adelanto.");
    } finally {
      setGuardandoAdelanto(false);
    }
  }

  async function borrarAdelanto(id: number) {
    if (!window.confirm("Vas a eliminar este adelanto.\n\nQuieres continuar?")) {
      return;
    }

    try {
      await eliminarAdelantoEmpleado(id);
      await cargarLiquidacionMensual();
    } catch {
      window.alert("No se pudo eliminar el adelanto.");
    }
  }

  async function actualizarEstadoPagado(empleadoId: number, pagado: boolean) {
    const periodo = finMes(liquidacionAno, liquidacionMes);

    try {
      setGuardandoPagoId(empleadoId);
      setFilasLiquidacion((prev) =>
        prev.map((fila) => (fila.empleadoId === empleadoId ? { ...fila, pagado } : fila))
      );
      await guardarEstadoPagoLiquidacion({
        periodo,
        empleadoId,
        pagado,
      });
    } catch {
      window.alert("No se pudo guardar el estado de pagado.");
      await cargarLiquidacionMensual();
    } finally {
      setGuardandoPagoId(null);
    }
  }

  function seleccionarEmpleado(empleado: Empleado) {
    setEmpleadoSeleccionadoId(empleado.id);
    setNombre(empleado.nombre);
    setFamiliaId(String(empleado.familiaId));
    setPrecioSueldo(fmtMoney(empleado.precioSueldo));
    setEmpleadoTieneHoras(empleado.tieneHoras);
  }

  function prepararNuevo() {
    setEmpleadoSeleccionadoId(null);
    setNombre("");
    setFamiliaId("");
    setPrecioSueldo("");
    setEmpleadoTieneHoras(false);
    requestAnimationFrame(() => {
      nombreRef.current?.focus();
    });
  }

  function confirmarEliminacion(e: React.MouseEvent<HTMLButtonElement>) {
    if (empleadoSeleccionadoId === null || empleadoTieneHoras) {
      e.preventDefault();
      return;
    }

    const confirmar = window.confirm(
      "Vas a eliminar este empleado.\n\nSi tiene horas asociadas no se podra eliminar.\n\nQuieres continuar?"
    );

    if (!confirmar) {
      e.preventDefault();
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-2 p-2.5 2xl:gap-2.5 2xl:p-3">
      <header className="rounded-[24px] border border-[#d8b4aa] bg-[linear-gradient(180deg,#f8efec_0%,#f2e6e2_100%)] px-5 py-4 shadow-[0_18px_40px_rgba(85,52,46,0.10)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#8a6458]">
              Maestros
            </div>
            <h1 className="mt-2 text-3xl font-black text-[#4b312b]">Empleados</h1>
            <p className="mt-2 text-sm text-[#7b635c]">
              Mantiene nombre, tipo de empleado y precio de sueldo.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href={cuadranteDemoHref}
              className="rounded-[22px] border border-[#cfafa8] bg-[linear-gradient(180deg,#fffdfc_0%,#eedfda_100%)] px-5 py-3 text-center shadow-[0_12px_20px_rgba(85,52,46,0.10)] transition duration-150 hover:-translate-y-[1px] hover:border-[#c28779] hover:shadow-[0_16px_28px_rgba(85,52,46,0.16)]"
            >
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                Gestion diaria
              </div>
              <div className="mt-1 text-sm font-black text-[#5b3a33]">Cuadrante diario</div>
            </Link>

            <div className="rounded-[22px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fdf9f8_0%,#ede1dd_100%)] px-5 py-3 text-center shadow-[0_10px_18px_rgba(85,52,46,0.08)]">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                Registros
              </div>
              <div className="mt-1 text-2xl font-black text-[#5b3a33]">{empleados.length}</div>
            </div>
          </div>
        </div>
      </header>

      {mensaje ? (
        <div
          className={
            tipo === "ok"
              ? "rounded-[20px] border border-[#9bc394] bg-[linear-gradient(180deg,#e5f3e0_0%,#d2e7cb_100%)] px-4 py-3 text-sm font-medium text-[#2f5a2b]"
              : "rounded-[20px] border border-[#d3a2a0] bg-[linear-gradient(180deg,#f6e3e2_0%,#ecd0cf_100%)] px-4 py-3 text-sm font-medium text-[#7a2f2c]"
          }
        >
          {mensaje}
        </div>
      ) : null}

      <div
        className={`grid min-h-0 flex-1 gap-2.5 2xl:gap-3 ${
          modoDerecha === "liquidacion" ? "xl:grid-cols-1" : "xl:grid-cols-[0.95fr_1.2fr]"
        }`}
      >
        {modoDerecha === "lista" ? (
        <section className={`${bloqueClassName} flex min-h-0 flex-col`}>
          <div className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6458]">
            Ficha empleado
          </div>

          <form
            action={empleadoSeleccionadoId === null ? accionCrear : accionActualizar}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <input name="id" type="hidden" value={empleadoSeleccionadoId ?? ""} />

            <div className="grid gap-4">
              <label className="grid gap-1.5">
                <span className={labelClassName}>Nombre</span>
                <input
                  ref={nombreRef}
                  name="nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className={inputClassName}
                  placeholder="Nombre del empleado"
                />
              </label>

              <label className="grid gap-1.5">
                <span className={labelClassName}>Tipo de empleado</span>
                <select
                  name="familiaId"
                  value={familiaId}
                  onChange={(e) => setFamiliaId(e.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecciona tipo</option>
                  {tiposEmpleado.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className={labelClassName}>Precio sueldo</span>
                <input
                  name="precioSueldo"
                  type="text"
                  value={precioSueldo}
                  onChange={(e) => setPrecioSueldo(normalizarImporte(e.target.value))}
                  className={inputClassName}
                  placeholder="0,00"
                />
              </label>

              {empleadoSeleccionadoId !== null && empleadoTieneHoras ? (
                <div className="rounded-[18px] border border-[#d3a2a0] bg-[linear-gradient(180deg,#f6e3e2_0%,#ecd0cf_100%)] px-4 py-3 text-center text-sm font-semibold text-[#7a2f2c]">
                  Este empleado ya tiene horas registradas y no se puede eliminar.
                </div>
              ) : null}
            </div>

            <div className="rounded-[20px] border border-[#d1a79d] bg-[linear-gradient(180deg,rgba(248,241,239,0.96)_0%,rgba(237,224,220,0.99)_100%)] px-4 py-4 shadow-[0_14px_26px_rgba(85,52,46,0.08)]">
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button type="button" onClick={prepararNuevo} className={accionClassName}>
                  Nuevo
                </button>

                <button type="submit" className={accionClassName}>
                  Guardar
                </button>

                <button
                  type="submit"
                  formAction={accionEliminar}
                  onClick={confirmarEliminacion}
                  disabled={empleadoSeleccionadoId === null || empleadoTieneHoras}
                  aria-disabled={empleadoSeleccionadoId === null || empleadoTieneHoras}
                  className={
                    empleadoSeleccionadoId === null || empleadoTieneHoras
                      ? accionDeshabilitadaClassName
                      : accionClassName
                  }
                >
                  Eliminar
                </button>
              </div>
            </div>

            <div className="rounded-[24px] border border-[#79534c] bg-[linear-gradient(180deg,#4a342f_0%,#392823_48%,#2c1f1c_100%)] p-4 shadow-[0_24px_56px_rgba(31,20,17,0.22)]">
              <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#e3cdc6]">
                Buscar
              </div>

              <div className="mt-3 grid gap-3">
                <label className="grid gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#e3cdc6]">
                    Texto
                  </span>
                  <input
                    type="text"
                    value={textoBusqueda}
                    onChange={(e) => setTextoBusqueda(e.target.value)}
                    className="w-full rounded-2xl border border-[#d2aca3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-2 text-sm text-[#2e211d] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_6px_14px_rgba(85,52,46,0.06)] outline-none transition duration-150 hover:-translate-y-[1px] hover:border-[#c58f82] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_24px_rgba(85,52,46,0.10)] focus:-translate-y-[1px] focus:border-[#b97263] focus:bg-white focus:shadow-[0_0_0_4px_rgba(193,129,115,0.18),0_14px_26px_rgba(85,52,46,0.11)]"
                    placeholder="Nombre, tipo o precio"
                  />
                </label>

                <div className="rounded-2xl border border-[#8a6d66] bg-[rgba(254,249,248,0.92)] px-3 py-2 text-center text-sm text-[#634c46]">
                  {textoBusqueda.trim()
                    ? `${empleadosFiltrados.length} resultado${empleadosFiltrados.length === 1 ? "" : "s"}`
                    : "Escribe para buscar"}
                </div>
              </div>
            </div>
          </form>
        </section>
        ) : null}

        <section className={`${bloqueClassName} flex min-h-0 flex-col`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6458]">
              {modoDerecha === "lista" ? "Lista empleados" : "Liquidacion mensual"}
            </div>

            <div className="flex rounded-[18px] border border-[#d1a79d] bg-white/70 p-1 shadow-[0_8px_14px_rgba(85,52,46,0.06)]">
              <button
                type="button"
                onClick={() => setModoDerecha("lista")}
                className={
                  modoDerecha === "lista"
                    ? "rounded-[14px] bg-[#4b312b] px-3 py-1.5 text-[11px] font-black text-white"
                    : "rounded-[14px] px-3 py-1.5 text-[11px] font-black text-[#6c5550]"
                }
              >
                Lista empleados
              </button>
              <button
                type="button"
                onClick={() => setModoDerecha("liquidacion")}
                className={
                  modoDerecha === "liquidacion"
                    ? "rounded-[14px] bg-[#4b312b] px-3 py-1.5 text-[11px] font-black text-white"
                    : "rounded-[14px] px-3 py-1.5 text-[11px] font-black text-[#6c5550]"
                }
              >
                Liquidacion mensual
              </button>
            </div>
          </div>

          {modoDerecha === "lista" ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-[#d7bbb3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <div className="grid grid-cols-[1.3fr_0.9fr_0.7fr_auto] gap-3 border-b border-[#e3cbc4] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6458]">
                <span>Nombre</span>
                <span>Tipo</span>
                <span>Precio</span>
                <span>ID</span>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {empleadosFiltrados.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-[#856f69]">
                    No hay coincidencias.
                  </div>
                ) : (
                  <div className="divide-y divide-[#ead7d1]">
                    {empleadosFiltrados.map((empleado) => {
                      const seleccionado = empleado.id === empleadoSeleccionadoId;

                      return (
                        <button
                          key={empleado.id}
                          type="button"
                          onClick={() => seleccionarEmpleado(empleado)}
                          className={
                            seleccionado
                              ? "grid w-full grid-cols-[1.3fr_0.9fr_0.7fr_auto] items-center gap-3 border-l-4 border-[#bd7f72] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-5 py-4 text-left text-sm text-[#3f2c28] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                              : "grid w-full grid-cols-[1.3fr_0.9fr_0.7fr_auto] items-center gap-3 px-5 py-4 text-left text-sm text-[#3f2c28] transition duration-150 hover:bg-[rgba(232,214,206,0.6)] hover:shadow-[inset_4px_0_0_#d2a39a]"
                          }
                        >
                          <span className="font-semibold">{empleado.nombre}</span>
                          <span className="font-medium text-[#6e5751]">{empleado.familia}</span>
                          <span className="font-medium text-[#6e5751]">{fmtMoney(empleado.precioSueldo)}</span>
                          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#98786f]">
                            ID {empleado.id}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.68fr)_minmax(360px,0.82fr)]">
                <div className="flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#d7bbb3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <div className="grid grid-cols-[1.55fr_0.56fr_0.7fr_0.82fr_0.82fr_0.88fr_0.88fr_0.9fr_0.74fr] gap-3 border-b border-[#e3cbc4] px-4 py-3 text-[11px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                    <span>Nombre</span>
                    <span>Horas</span>
                    <span>Precio medio</span>
                    <span>Total sueldo</span>
                    <span>Saldo ant.</span>
                    <span>Adelantos mes</span>
                    <span>Total a pagar</span>
                    <span>Saldo sig.</span>
                    <span>Pagado</span>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {cargandoLiquidacion ? (
                      <div className="px-5 py-8 text-center text-sm text-[#856f69]">Cargando liquidacion...</div>
                    ) : filasLiquidacion.length === 0 ? (
                      <div className="px-5 py-8 text-center text-sm text-[#856f69]">
                        No hay datos de liquidacion para ese mes.
                      </div>
                    ) : (
                      <div className="divide-y divide-[#ead7d1]">
                        {filasLiquidacion.map((fila) => (
                          <div
                            key={fila.empleadoId}
                            className="grid grid-cols-[1.55fr_0.56fr_0.7fr_0.82fr_0.82fr_0.88fr_0.88fr_0.9fr_0.74fr] gap-3 px-4 py-3 text-sm text-[#3f2c28]"
                          >
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{fila.nombreEmpleado}</div>
                              <div className="truncate text-xs font-medium uppercase tracking-[0.08em] text-[#856f69]">
                                {fila.familia}
                              </div>
                            </div>
                            <span className="text-right font-medium text-[#6e5751]">{fmtHoras(fila.horas)}</span>
                            <span className="text-right font-medium text-[#6e5751]">{fmtMoney(fila.precioMedioHora)}</span>
                            <span className="text-right font-semibold">{fmtMoney(fila.totalSueldo)}</span>
                            <span className="text-right font-medium text-[#6e5751]">{fmtMoney(fila.saldoAnterior)}</span>
                            <span className="text-right font-medium text-[#6e5751]">{fmtMoney(fila.adelantosMes)}</span>
                            <span className="text-right font-black text-[#4b312b]">{fmtMoney(fila.totalPagar)}</span>
                            <span className="text-right font-medium text-[#6e5751]">{fmtMoney(fila.saldoSiguiente)}</span>
                            <select
                              value={fila.pagado ? "si" : "no"}
                              onChange={(e) => void actualizarEstadoPagado(fila.empleadoId, e.target.value === "si")}
                              disabled={guardandoPagoId === fila.empleadoId}
                              className="w-full rounded-xl border border-[#d2aca3] bg-white px-2 py-1.5 text-sm font-semibold text-[#4b312b] outline-none"
                            >
                              <option value="no">No</option>
                              <option value="si">Si</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid min-h-0 gap-3 xl:grid-rows-[auto_minmax(0,1fr)]">
                  <div className="rounded-[20px] border border-[#d7bbb3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <div className="grid gap-2.5">
                      <div className="grid gap-2.5 xl:grid-cols-[1fr_108px] xl:items-end">
                        <label className="grid gap-1.5">
                          <span className={labelClassName}>Mes</span>
                          <select
                            value={liquidacionMes}
                            onChange={(e) => setLiquidacionMes(e.target.value)}
                            className={`${inputClassName} px-3 py-2.5`}
                          >
                            {mesesLiquidacionDisponibles.map((mes) => (
                              <option key={mes.value} value={mes.value}>
                                {mes.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="grid gap-1.5">
                          <span className={labelClassName}>Ano</span>
                          <input
                            value={liquidacionAno}
                            onChange={(e) => {
                              const soloDigitos = e.target.value.replace(/[^\d]/g, "").slice(0, 4);
                              const nextAno =
                                soloDigitos.length === 4 && Number(soloDigitos) < LIQUIDACION_MIN_ANO
                                  ? String(LIQUIDACION_MIN_ANO)
                                  : soloDigitos;
                              setLiquidacionAno(nextAno || String(LIQUIDACION_MIN_ANO));
                              if (
                                (nextAno || String(LIQUIDACION_MIN_ANO)) === String(LIQUIDACION_MIN_ANO) &&
                                liquidacionMes < LIQUIDACION_MIN_MES
                              ) {
                                setLiquidacionMes(LIQUIDACION_MIN_MES);
                              }
                            }}
                            className={`${inputClassName} px-3 py-2.5`}
                          />
                        </label>
                      </div>

                      <div className="rounded-[16px] border border-[#d1a79d] bg-white/80 px-3 py-2.5 text-[13px] font-semibold leading-5 text-[#654d47]">
                        Total sueldo {fmtMoney(totalSueldoMes)} | Saldo anterior{" "}
                        {fmtMoney(totalSaldoAnteriorMes)} | Adelantos mes {fmtMoney(totalAdelantosMes)} |
                        Pagar {fmtMoney(totalPagarMes)} | Saldo siguiente{" "}
                        {fmtMoney(totalSaldoSiguienteMes)}
                      </div>

                      {mensajeLiquidacion ? (
                        <div className="rounded-[16px] border border-[#d3a2a0] bg-[linear-gradient(180deg,#f6e3e2_0%,#ecd0cf_100%)] px-3 py-2.5 text-sm font-medium text-[#7a2f2c]">
                          {mensajeLiquidacion}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-[#d7bbb3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                    <div className="border-b border-[#e3cbc4] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                      Adelantos
                    </div>

                    <div className="grid gap-2.5 border-b border-[#ead7d1] p-3">
                      <label className="grid gap-1.5">
                        <span className={labelClassName}>Empleado</span>
                        <select
                          value={adelantoEmpleadoId}
                          onChange={(e) => setAdelantoEmpleadoId(e.target.value)}
                          className={`${inputClassName} px-3 py-2.5`}
                        >
                          <option value="">Selecciona empleado</option>
                          {empleados
                            .slice()
                            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }))
                            .map((empleado) => (
                              <option key={empleado.id} value={String(empleado.id)}>
                                {empleado.nombre}
                              </option>
                            ))}
                        </select>
                      </label>

                      <div className="grid gap-2.5 xl:grid-cols-[1fr_0.82fr]">
                        <label className="grid gap-1.5">
                          <span className={labelClassName}>Fecha</span>
                          <input
                            type="date"
                            value={adelantoFecha}
                            onChange={(e) => setAdelantoFecha(e.target.value)}
                            className={`${inputClassName} px-3 py-2.5`}
                          />
                        </label>

                        <label className="grid gap-1.5">
                          <span className={labelClassName}>Importe</span>
                          <input
                            value={adelantoImporte}
                            onChange={(e) => setAdelantoImporte(normalizarImporte(e.target.value))}
                            className={`${inputClassName} px-3 py-2.5`}
                            placeholder="0,00"
                          />
                        </label>
                      </div>

                      <label className="grid gap-1.5">
                        <span className={labelClassName}>Observaciones</span>
                        <input
                          value={adelantoObservaciones}
                          onChange={(e) => setAdelantoObservaciones(e.target.value)}
                          className={`${inputClassName} px-3 py-2.5`}
                          placeholder="Opcional"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={guardarNuevoAdelanto}
                        disabled={guardandoAdelanto}
                        className={guardandoAdelanto ? accionDeshabilitadaClassName : accionClassName}
                      >
                        {guardandoAdelanto ? "Guardando..." : "Guardar adelanto"}
                      </button>
                    </div>

                    <div className="grid grid-cols-[82px_minmax(0,1fr)_78px_auto] gap-3 border-b border-[#e3cbc4] px-4 py-2.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#8a6458]">
                      <span>Fecha</span>
                      <span>Empleado</span>
                      <span>Importe</span>
                      <span />
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto">
                      {adelantosMes.length === 0 ? (
                        <div className="px-5 py-8 text-center text-sm text-[#856f69]">
                          No hay adelantos en ese mes.
                        </div>
                      ) : (
                        <div className="divide-y divide-[#ead7d1]">
                          {adelantosMes.map((adelanto) => {
                            const empleado = empleados.find((item) => item.id === adelanto.empleadoId);

                            return (
                              <div
                                key={adelanto.id}
                                className="grid grid-cols-[82px_minmax(0,1fr)_78px_auto] items-center gap-3 px-4 py-2.5 text-sm text-[#3f2c28]"
                              >
                                <span className="font-medium text-[#6e5751]">{adelanto.fecha.slice(5)}</span>
                                <div className="min-w-0">
                                  <div className="truncate font-semibold">{empleado?.nombre ?? `ID ${adelanto.empleadoId}`}</div>
                                  {adelanto.observaciones ? (
                                    <div className="truncate text-xs text-[#856f69]">{adelanto.observaciones}</div>
                                  ) : null}
                                </div>
                                <span className="text-right font-semibold">{fmtMoney(adelanto.importe)}</span>
                                <button
                                  type="button"
                                  onClick={() => borrarAdelanto(adelanto.id)}
                                  className="rounded-[12px] border border-[#cfafa8] bg-[linear-gradient(180deg,#fbf7f6_0%,#e8dbd8_100%)] px-3 py-2 text-[11px] font-semibold text-[#492f29] shadow-[0_8px_14px_rgba(85,52,46,0.08)] transition duration-150 hover:-translate-y-[1px] hover:border-[#c28779]"
                                >
                                  Borrar
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
