"use client";

import { useMemo, useRef, useState } from "react";

type Empleado = {
  id: number;
  nombre: string;
  precioSueldo: number;
  familiaId: number;
  familia: string;
  tipoId: number;
};

type Local = {
  id: number;
  nombre: string;
};

type Hora = {
  id: number;
  fecha: string;
  horas: number;
  precioSueldo: number;
  totalSueldo: number;
  observaciones: string;
  empleadoId: number;
  empleado: string;
  empresaId: number;
  local: string;
  tipoId: number;
  familiaId: number;
  tipoEmpleado: string;
};

type AccionHora = (formData: FormData) => void | Promise<void>;

type PantallaHorasProps = {
  horas: Hora[];
  empleados: Empleado[];
  locales: Local[];
  mensaje?: string;
  tipo?: string;
  accionCrear: AccionHora;
  accionActualizar: AccionHora;
  accionEliminar: AccionHora;
};

const bloqueClassName =
  "rounded-[24px] border border-[#d1a79d] bg-[linear-gradient(180deg,rgba(248,240,237,0.99)_0%,rgba(237,223,219,0.99)_100%)] p-4 shadow-[0_18px_34px_rgba(85,52,46,0.10)]";

const labelClassName =
  "text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[#896d63]";

const inputClassName =
  "w-full rounded-2xl border border-[#d2aca3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-4 py-3 text-center text-sm text-[#2e211d] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_8px_18px_rgba(85,52,46,0.07)] outline-none transition duration-150 placeholder:text-[#a78f88] hover:-translate-y-[1px] hover:border-[#c58f82] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_14px_28px_rgba(85,52,46,0.12)] focus:-translate-y-[1px] focus:border-[#b97263] focus:bg-white focus:shadow-[0_0_0_4px_rgba(193,129,115,0.18),0_16px_30px_rgba(85,52,46,0.12)]";

const inputReadOnlyClassName =
  "w-full rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fcf9f8_0%,#efe6e3_100%)] px-4 py-3 text-center text-sm font-semibold text-[#6e5751] shadow-none";

const accionClassName =
  "min-w-[122px] rounded-2xl border border-[#cfafa8] bg-[linear-gradient(180deg,#fbf7f6_0%,#e8dbd8_100%)] px-4 py-2.5 text-[15px] font-semibold text-[#492f29] shadow-[0_12px_20px_rgba(85,52,46,0.10)] transition duration-150 hover:-translate-y-[1px] hover:border-[#c28779] hover:bg-[linear-gradient(180deg,#fffdfc_0%,#eedfda_100%)] hover:shadow-[0_16px_28px_rgba(85,52,46,0.16)] focus-visible:-translate-y-[1px] focus-visible:border-[#b97263] focus-visible:bg-[linear-gradient(180deg,#fffdfc_0%,#f0e2dc_100%)] focus-visible:shadow-[0_0_0_4px_rgba(193,129,115,0.18),0_18px_30px_rgba(85,52,46,0.16)] focus-visible:outline-none";

const accionDeshabilitadaClassName =
  "min-w-[122px] cursor-not-allowed rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fcf9f8_0%,#efe6e3_100%)] px-4 py-2.5 text-[15px] font-semibold text-[#96817b] opacity-70 shadow-none";

function fmtMoney(value: number) {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtHours(value: number) {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
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

function parseDecimal(value: string) {
  return Number(value.replace(",", ".").trim()) || 0;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function PantallaHoras({
  horas,
  empleados,
  locales,
  mensaje,
  tipo,
  accionCrear,
  accionActualizar,
  accionEliminar,
}: PantallaHorasProps) {
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [horaSeleccionadaId, setHoraSeleccionadaId] = useState<number | null>(null);
  const [fechaHoras, setFechaHoras] = useState("");
  const [empresaId, setEmpresaId] = useState("");
  const [empleadoId, setEmpleadoId] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [familiaId, setFamiliaId] = useState("");
  const [tipoEmpleadoLabel, setTipoEmpleadoLabel] = useState("");
  const [horasHechas, setHorasHechas] = useState("");
  const [precioSueldo, setPrecioSueldo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const fechaRef = useRef<HTMLInputElement | null>(null);

  const resumen = useMemo(() => {
    return horas.reduce(
      (acc, item) => ({
        totalHoras: round2(acc.totalHoras + item.horas),
        totalImporte: round2(acc.totalImporte + item.totalSueldo),
      }),
      { totalHoras: 0, totalImporte: 0 }
    );
  }, [horas]);

  const horasFiltradas = useMemo(() => {
    const termino = textoBusqueda.trim().toLowerCase();

    if (!termino) {
      return horas;
    }

    return horas.filter((item) => {
      return (
        item.empleado.toLowerCase().includes(termino) ||
        item.local.toLowerCase().includes(termino) ||
        item.tipoEmpleado.toLowerCase().includes(termino) ||
        item.fecha.includes(termino)
      );
    });
  }, [horas, textoBusqueda]);

  const totalSueldo = round2(parseDecimal(horasHechas) * parseDecimal(precioSueldo));

  function aplicarEmpleadoActual(id: string) {
    setEmpleadoId(id);

    const empleado = empleados.find((item) => String(item.id) === id);
    if (!empleado) {
      setTipoId("");
      setFamiliaId("");
      setTipoEmpleadoLabel("");
      setPrecioSueldo("");
      return;
    }

    setTipoId(String(empleado.tipoId));
    setFamiliaId(String(empleado.familiaId));
    setTipoEmpleadoLabel(empleado.familia);
    setPrecioSueldo(fmtMoney(empleado.precioSueldo));
  }

  function seleccionarHora(item: Hora) {
    setHoraSeleccionadaId(item.id);
    setFechaHoras(item.fecha);
    setEmpresaId(String(item.empresaId));
    setEmpleadoId(String(item.empleadoId));
    setTipoId(String(item.tipoId));
    setFamiliaId(String(item.familiaId));
    setTipoEmpleadoLabel(item.tipoEmpleado);
    setHorasHechas(fmtHours(item.horas));
    setPrecioSueldo(fmtMoney(item.precioSueldo));
    setObservaciones(item.observaciones);
  }

  function prepararNuevo() {
    setHoraSeleccionadaId(null);
    setFechaHoras("");
    setEmpresaId("");
    setEmpleadoId("");
    setTipoId("");
    setFamiliaId("");
    setTipoEmpleadoLabel("");
    setHorasHechas("");
    setPrecioSueldo("");
    setObservaciones("");

    requestAnimationFrame(() => {
      fechaRef.current?.focus();
    });
  }

  function confirmarEliminacion(e: React.MouseEvent<HTMLButtonElement>) {
    if (horaSeleccionadaId === null) {
      e.preventDefault();
      return;
    }

    if (!window.confirm("Vas a eliminar esta linea de horas.\n\nQuieres continuar?")) {
      e.preventDefault();
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-2 p-2.5 2xl:gap-2.5 2xl:p-3">
      <header className="rounded-[24px] border border-[#d8b4aa] bg-[linear-gradient(180deg,#f8efec_0%,#f2e6e2_100%)] px-5 py-4 shadow-[0_18px_40px_rgba(85,52,46,0.10)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#8a6458]">
              Operativa
            </div>
            <h1 className="mt-2 text-3xl font-black text-[#4b312b]">Horas</h1>
            <p className="mt-2 text-sm text-[#7b635c]">
              Introduce horas por empleado, local y fecha, con el precio de sueldo aplicado.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-[22px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fdf9f8_0%,#ede1dd_100%)] px-5 py-3 text-center shadow-[0_10px_18px_rgba(85,52,46,0.08)]">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                Registros
              </div>
              <div className="mt-1 text-2xl font-black text-[#5b3a33]">{horas.length}</div>
            </div>

            <div className="rounded-[22px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fdf9f8_0%,#ede1dd_100%)] px-5 py-3 text-center shadow-[0_10px_18px_rgba(85,52,46,0.08)]">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                Horas
              </div>
              <div className="mt-1 text-2xl font-black text-[#5b3a33]">{fmtHours(resumen.totalHoras)}</div>
            </div>

            <div className="rounded-[22px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fdf9f8_0%,#ede1dd_100%)] px-5 py-3 text-center shadow-[0_10px_18px_rgba(85,52,46,0.08)]">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
                Importe
              </div>
              <div className="mt-1 text-2xl font-black text-[#5b3a33]">{fmtMoney(resumen.totalImporte)}</div>
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

      <div className="grid min-h-0 flex-1 gap-2.5 xl:grid-cols-[0.98fr_1.2fr] 2xl:gap-3">
        <section className={`${bloqueClassName} flex min-h-0 flex-col`}>
          <div className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6458]">
            Parte de horas
          </div>

          <form
            action={horaSeleccionadaId === null ? accionCrear : accionActualizar}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <input name="id" type="hidden" value={horaSeleccionadaId ?? ""} />
            <input name="tipoId" type="hidden" value={tipoId} />
            <input name="familiaId" type="hidden" value={familiaId} />
            <input name="precioSueldo" type="hidden" value={precioSueldo} />

            <div className="grid gap-4">
              <label className="grid gap-1.5">
                <span className={labelClassName}>Fecha</span>
                <input
                  ref={fechaRef}
                  name="fechaHoras"
                  type="date"
                  value={fechaHoras}
                  onChange={(e) => setFechaHoras(e.target.value)}
                  className={inputClassName}
                />
              </label>

              <label className="grid gap-1.5">
                <span className={labelClassName}>Local</span>
                <select
                  name="empresaId"
                  value={empresaId}
                  onChange={(e) => setEmpresaId(e.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecciona local</option>
                  {locales.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className={labelClassName}>Empleado</span>
                <select
                  name="empleadoId"
                  value={empleadoId}
                  onChange={(e) => aplicarEmpleadoActual(e.target.value)}
                  className={inputClassName}
                >
                  <option value="">Selecciona empleado</option>
                  {empleados.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5">
                <span className={labelClassName}>Tipo de empleado</span>
                <input
                  type="text"
                  value={tipoEmpleadoLabel}
                  readOnly
                  className={inputReadOnlyClassName}
                  placeholder="Se rellena al elegir empleado"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className={labelClassName}>Horas</span>
                  <input
                    name="horas"
                    type="text"
                    value={horasHechas}
                    onChange={(e) => setHorasHechas(normalizarImporte(e.target.value))}
                    className={inputClassName}
                    placeholder="0,00"
                  />
                </label>

                <label className="grid gap-1.5">
                  <span className={labelClassName}>Precio sueldo</span>
                  <input
                    type="text"
                    value={precioSueldo}
                    readOnly
                    className={inputReadOnlyClassName}
                    placeholder="0,00"
                  />
                </label>
              </div>

              <div className="rounded-[20px] border border-[#d1a79d] bg-[linear-gradient(180deg,#f7efed_0%,#e8dcd9_100%)] px-4 py-3 text-center shadow-[0_12px_22px_rgba(85,52,46,0.08)]">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8a6458]">
                  Total sueldo
                </div>
                <div className="mt-1 text-[24px] font-black text-[#5d4038]">
                  {fmtMoney(totalSueldo)} EUR
                </div>
              </div>

              <label className="grid gap-1.5">
                <span className={labelClassName}>Observaciones</span>
                <textarea
                  name="observaciones"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                  className={`${inputClassName} h-20 resize-none text-left`}
                  placeholder="Observaciones"
                />
              </label>
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
                  disabled={horaSeleccionadaId === null}
                  aria-disabled={horaSeleccionadaId === null}
                  className={horaSeleccionadaId === null ? accionDeshabilitadaClassName : accionClassName}
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
                    placeholder="Empleado, local, tipo o fecha"
                  />
                </label>

                <div className="rounded-2xl border border-[#8a6d66] bg-[rgba(254,249,248,0.92)] px-3 py-2 text-center text-sm text-[#634c46]">
                  {textoBusqueda.trim()
                    ? `${horasFiltradas.length} resultado${horasFiltradas.length === 1 ? "" : "s"}`
                    : "Escribe para buscar"}
                </div>
              </div>
            </div>
          </form>
        </section>

        <section className={`${bloqueClassName} flex min-h-0 flex-col`}>
          <div className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6458]">
            Lista horas
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-[#d7bbb3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <div className="grid grid-cols-[0.65fr_1.1fr_0.9fr_0.7fr_0.8fr_auto] gap-3 border-b border-[#e3cbc4] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6458]">
              <span>Fecha</span>
              <span>Empleado</span>
              <span>Local</span>
              <span>Horas</span>
              <span>Total</span>
              <span>ID</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {horasFiltradas.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[#856f69]">
                  No hay coincidencias.
                </div>
              ) : (
                <div className="divide-y divide-[#ead7d1]">
                  {horasFiltradas.map((item) => {
                    const seleccionado = item.id === horaSeleccionadaId;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => seleccionarHora(item)}
                        className={
                          seleccionado
                            ? "grid w-full grid-cols-[0.65fr_1.1fr_0.9fr_0.7fr_0.8fr_auto] items-center gap-3 border-l-4 border-[#bd7f72] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-5 py-4 text-left text-sm text-[#3f2c28] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                            : "grid w-full grid-cols-[0.65fr_1.1fr_0.9fr_0.7fr_0.8fr_auto] items-center gap-3 px-5 py-4 text-left text-sm text-[#3f2c28] transition duration-150 hover:bg-[rgba(232,214,206,0.6)] hover:shadow-[inset_4px_0_0_#d2a39a]"
                        }
                      >
                        <span className="font-medium text-[#6e5751]">{item.fecha}</span>
                        <span>
                          <span className="block font-semibold">{item.empleado}</span>
                          <span className="block text-xs text-[#7b635c]">{item.tipoEmpleado}</span>
                        </span>
                        <span className="font-medium text-[#6e5751]">{item.local}</span>
                        <span className="font-medium text-[#6e5751]">{fmtHours(item.horas)}</span>
                        <span className="font-medium text-[#6e5751]">{fmtMoney(item.totalSueldo)}</span>
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#98786f]">
                          ID {item.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
