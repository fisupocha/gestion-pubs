"use client";

import { useMemo, useRef, useState } from "react";

type Tipo = {
  id: number;
  nombre: string;
};

type Familia = {
  id: number;
  nombre: string;
  tipoId: number;
  tipo: string;
};

type Subfamilia = {
  id: number;
  nombre: string;
  familiaId: number;
  familia: string;
  tipoId: number;
  tipo: string;
};

type AccionClasificacion = (formData: FormData) => void | Promise<void>;

type PantallaClasificacionProps = {
  tipos: Tipo[];
  familias: Familia[];
  subfamilias: Subfamilia[];
  mensaje?: string;
  tipoMensaje?: string;
  accionCrearTipo: AccionClasificacion;
  accionActualizarTipo: AccionClasificacion;
  accionEliminarTipo: AccionClasificacion;
  accionCrearFamilia: AccionClasificacion;
  accionActualizarFamilia: AccionClasificacion;
  accionEliminarFamilia: AccionClasificacion;
  accionCrearSubfamilia: AccionClasificacion;
  accionActualizarSubfamilia: AccionClasificacion;
  accionEliminarSubfamilia: AccionClasificacion;
};

const bloqueClassName =
  "rounded-[22px] border border-[#d1a79d] bg-[linear-gradient(180deg,rgba(248,240,237,0.99)_0%,rgba(237,223,219,0.99)_100%)] p-3 shadow-[0_14px_28px_rgba(85,52,46,0.09)]";

const inputClassName =
  "w-full rounded-2xl border border-[#d2aca3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-2 text-center text-sm text-[#2e211d] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_6px_14px_rgba(85,52,46,0.06)] outline-none transition duration-150 placeholder:text-[#a78f88] hover:-translate-y-[1px] hover:border-[#c58f82] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_24px_rgba(85,52,46,0.10)] focus:-translate-y-[1px] focus:border-[#b97263] focus:bg-white focus:shadow-[0_0_0_4px_rgba(193,129,115,0.18),0_14px_26px_rgba(85,52,46,0.11)]";

const accionClassName =
  "min-w-0 flex-1 rounded-2xl border border-[#cfafa8] bg-[linear-gradient(180deg,#fbf7f6_0%,#e8dbd8_100%)] px-3 py-2 text-[14px] font-semibold text-[#492f29] shadow-[0_10px_16px_rgba(85,52,46,0.08)] transition duration-150 hover:-translate-y-[1px] hover:border-[#c28779] hover:bg-[linear-gradient(180deg,#fffdfc_0%,#eedfda_100%)] hover:shadow-[0_14px_24px_rgba(85,52,46,0.14)] focus-visible:-translate-y-[1px] focus-visible:border-[#b97263] focus-visible:bg-[linear-gradient(180deg,#fffdfc_0%,#f0e2dc_100%)] focus-visible:shadow-[0_0_0_4px_rgba(193,129,115,0.18),0_16px_28px_rgba(85,52,46,0.15)] focus-visible:outline-none";

const accionDeshabilitadaClassName =
  "min-w-0 flex-1 cursor-not-allowed rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fcf9f8_0%,#efe6e3_100%)] px-3 py-2 text-[14px] font-semibold text-[#96817b] opacity-70 shadow-none";

function normalizarTexto(valor: string) {
  return valor.trim().toLowerCase();
}

export function PantallaClasificacion({
  tipos,
  familias,
  subfamilias,
  mensaje,
  tipoMensaje,
  accionCrearTipo,
  accionActualizarTipo,
  accionEliminarTipo,
  accionCrearFamilia,
  accionActualizarFamilia,
  accionEliminarFamilia,
  accionCrearSubfamilia,
  accionActualizarSubfamilia,
  accionEliminarSubfamilia,
}: PantallaClasificacionProps) {
  const [textoBusquedaTipo, setTextoBusquedaTipo] = useState("");
  const [textoBusquedaFamilia, setTextoBusquedaFamilia] = useState("");
  const [textoBusquedaSubfamilia, setTextoBusquedaSubfamilia] = useState("");

  const [tipoSeleccionadoId, setTipoSeleccionadoId] = useState<number | null>(null);
  const [familiaSeleccionadaId, setFamiliaSeleccionadaId] = useState<number | null>(null);
  const [subfamiliaSeleccionadaId, setSubfamiliaSeleccionadaId] = useState<number | null>(null);

  const [nombreTipo, setNombreTipo] = useState("");
  const [nombreFamilia, setNombreFamilia] = useState("");
  const [nombreSubfamilia, setNombreSubfamilia] = useState("");

  const tipoNombreRef = useRef<HTMLInputElement | null>(null);
  const familiaNombreRef = useRef<HTMLInputElement | null>(null);
  const subfamiliaNombreRef = useRef<HTMLInputElement | null>(null);

  const tipoSeleccionado = tipos.find((item) => item.id === tipoSeleccionadoId) ?? null;
  const familiaSeleccionada = familias.find((item) => item.id === familiaSeleccionadaId) ?? null;

  const tiposFiltrados = useMemo(() => {
    const termino = normalizarTexto(textoBusquedaTipo);

    if (!termino) {
      return tipos;
    }

    return tipos.filter((tipo) => normalizarTexto(tipo.nombre).includes(termino));
  }, [textoBusquedaTipo, tipos]);

  const familiasFiltradas = useMemo(() => {
    const termino = normalizarTexto(textoBusquedaFamilia);
    const base =
      tipoSeleccionadoId === null
        ? []
        : familias.filter((familia) => familia.tipoId === tipoSeleccionadoId);

    if (!termino) {
      return base;
    }

    return base.filter((familia) => normalizarTexto(familia.nombre).includes(termino));
  }, [familias, textoBusquedaFamilia, tipoSeleccionadoId]);

  const subfamiliasFiltradas = useMemo(() => {
    const termino = normalizarTexto(textoBusquedaSubfamilia);
    const base =
      familiaSeleccionadaId === null
        ? []
        : subfamilias.filter((subfamilia) => subfamilia.familiaId === familiaSeleccionadaId);

    if (!termino) {
      return base;
    }

    return base.filter((subfamilia) =>
      normalizarTexto(subfamilia.nombre).includes(termino)
    );
  }, [familiaSeleccionadaId, subfamilias, textoBusquedaSubfamilia]);

  function seleccionarTipo(tipo: Tipo) {
    setTipoSeleccionadoId(tipo.id);
    setNombreTipo(tipo.nombre);
    setFamiliaSeleccionadaId(null);
    setSubfamiliaSeleccionadaId(null);
    setNombreFamilia("");
    setNombreSubfamilia("");
  }

  function seleccionarFamilia(familia: Familia) {
    setFamiliaSeleccionadaId(familia.id);
    setNombreFamilia(familia.nombre);
    setSubfamiliaSeleccionadaId(null);
    setNombreSubfamilia("");
  }

  function seleccionarSubfamilia(subfamilia: Subfamilia) {
    setSubfamiliaSeleccionadaId(subfamilia.id);
    setNombreSubfamilia(subfamilia.nombre);
  }

  function nuevoTipo() {
    setTipoSeleccionadoId(null);
    setNombreTipo("");
    setFamiliaSeleccionadaId(null);
    setSubfamiliaSeleccionadaId(null);
    setNombreFamilia("");
    setNombreSubfamilia("");
    requestAnimationFrame(() => tipoNombreRef.current?.focus());
  }

  function nuevaFamilia() {
    setFamiliaSeleccionadaId(null);
    setSubfamiliaSeleccionadaId(null);
    setNombreFamilia("");
    setNombreSubfamilia("");
    requestAnimationFrame(() => familiaNombreRef.current?.focus());
  }

  function nuevaSubfamilia() {
    setSubfamiliaSeleccionadaId(null);
    setNombreSubfamilia("");
    requestAnimationFrame(() => subfamiliaNombreRef.current?.focus());
  }

  function confirmarEliminacion(
    e: React.MouseEvent<HTMLButtonElement>,
    mensajeConfirmacion: string,
    puedeEliminar: boolean
  ) {
    if (!puedeEliminar) {
      e.preventDefault();
      return;
    }

    const confirmar = window.confirm(mensajeConfirmacion);

    if (!confirmar) {
      e.preventDefault();
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-2 p-2.5 2xl:gap-2.5 2xl:p-3">
      {mensaje ? (
        <div
          className={
            tipoMensaje === "ok"
              ? "rounded-[18px] border border-[#9bc394] bg-[linear-gradient(180deg,#e5f3e0_0%,#d2e7cb_100%)] px-3 py-2 text-sm font-medium text-[#2f5a2b]"
              : "rounded-[18px] border border-[#d3a2a0] bg-[linear-gradient(180deg,#f6e3e2_0%,#ecd0cf_100%)] px-3 py-2 text-sm font-medium text-[#7a2f2c]"
          }
        >
          {mensaje}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-2 xl:grid-cols-3">
        <section className={`${bloqueClassName} flex min-h-0 flex-col`}>
          <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
            Tipos
          </div>

          <form
            action={tipoSeleccionadoId === null ? accionCrearTipo : accionActualizarTipo}
            className="flex min-h-0 flex-1 flex-col gap-2.5"
          >
            <input name="id" type="hidden" value={tipoSeleccionadoId ?? ""} />

            <label className="grid gap-0">
              <input
                ref={tipoNombreRef}
                name="nombre"
                type="text"
                value={nombreTipo}
                onChange={(e) => setNombreTipo(e.target.value)}
                className={inputClassName}
                placeholder="Nombre del tipo"
              />
            </label>

            <div className="rounded-[18px] border border-[#d1a79d] bg-[linear-gradient(180deg,rgba(248,241,239,0.96)_0%,rgba(237,224,220,0.99)_100%)] px-2.5 py-2.5 shadow-[0_10px_18px_rgba(85,52,46,0.07)]">
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={nuevoTipo} className={accionClassName}>
                  Nuevo
                </button>
                <button type="submit" className={accionClassName}>
                  Guardar
                </button>
                <button
                  type="submit"
                  formAction={accionEliminarTipo}
                  disabled={tipoSeleccionadoId === null}
                  className={tipoSeleccionadoId === null ? accionDeshabilitadaClassName : accionClassName}
                  onClick={(e) =>
                    confirmarEliminacion(
                      e,
                      "Vas a eliminar este tipo.\n\nSi tiene familias asociadas no se podra eliminar.\n\nQuieres continuar?",
                      tipoSeleccionadoId !== null
                    )
                  }
                >
                  Eliminar
                </button>
              </div>
            </div>

            <div className="rounded-[20px] border border-[#79534c] bg-[linear-gradient(180deg,#4a342f_0%,#392823_48%,#2c1f1c_100%)] p-2.5 shadow-[0_18px_34px_rgba(31,20,17,0.18)]">
              <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#e3cdc6]">
                Buscar
              </div>
              <div className="mt-1.5 grid gap-1.5">
                <label className="grid gap-0">
                  <input
                    type="text"
                    value={textoBusquedaTipo}
                    onChange={(e) => setTextoBusquedaTipo(e.target.value)}
                    className="w-full rounded-2xl border border-[#d2aca3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-2 text-sm text-[#2e211d] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_6px_14px_rgba(85,52,46,0.06)] outline-none transition duration-150 hover:-translate-y-[1px] hover:border-[#c58f82] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_24px_rgba(85,52,46,0.10)] focus:-translate-y-[1px] focus:border-[#b97263] focus:bg-white focus:shadow-[0_0_0_4px_rgba(193,129,115,0.18),0_14px_26px_rgba(85,52,46,0.11)]"
                    placeholder="Nombre del tipo"
                  />
                </label>
                <div className="rounded-2xl border border-[#8a6d66] bg-[rgba(254,249,248,0.92)] px-3 py-1 text-center text-xs text-[#634c46]">
                  {textoBusquedaTipo.trim()
                    ? `${tiposFiltrados.length} resultado${tiposFiltrados.length === 1 ? "" : "s"}`
                    : "Escribe para buscar"}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-[#d7bbb3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <div className="min-h-0 flex-1 overflow-y-auto">
                {tiposFiltrados.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-[#856f69]">No hay coincidencias.</div>
                ) : (
                  <div className="divide-y divide-[#ead7d1]">
                    {tiposFiltrados.map((tipo) => {
                      const seleccionado = tipo.id === tipoSeleccionadoId;

                      return (
                        <button
                          key={tipo.id}
                          type="button"
                          onClick={() => seleccionarTipo(tipo)}
                          className={
                            seleccionado
                              ? "flex w-full items-center justify-between border-l-4 border-[#bd7f72] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-4 py-2.5 text-left text-sm text-[#3f2c28] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                              : "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-[#3f2c28] transition duration-150 hover:bg-[rgba(232,214,206,0.6)] hover:shadow-[inset_4px_0_0_#d2a39a]"
                          }
                        >
                          <span className="font-semibold">{tipo.nombre}</span>
                          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#98786f]">
                            ID {tipo.id}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </form>
        </section>

        <section className={`${bloqueClassName} flex min-h-0 flex-col`}>
          <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
            Familias
          </div>

          <form
            action={familiaSeleccionadaId === null ? accionCrearFamilia : accionActualizarFamilia}
            className="flex min-h-0 flex-1 flex-col gap-2.5"
          >
            <input name="id" type="hidden" value={familiaSeleccionadaId ?? ""} />
            <input name="tipo_id" type="hidden" value={tipoSeleccionadoId ?? ""} />

            <div className="rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fcf9f8_0%,#efe6e3_100%)] px-3 py-1.5 text-center text-xs text-[#96817b] opacity-80">
              {tipoSeleccionado?.nombre ?? "Selecciona un tipo"}
            </div>

            <label className="grid gap-0">
              <input
                ref={familiaNombreRef}
                name="nombre"
                type="text"
                value={nombreFamilia}
                onChange={(e) => setNombreFamilia(e.target.value)}
                disabled={tipoSeleccionadoId === null}
                className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-70`}
                placeholder="Nombre de la familia"
              />
            </label>

            <div className="rounded-[18px] border border-[#d1a79d] bg-[linear-gradient(180deg,rgba(248,241,239,0.96)_0%,rgba(237,224,220,0.99)_100%)] px-2.5 py-2.5 shadow-[0_10px_18px_rgba(85,52,46,0.07)]">
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={nuevaFamilia} className={accionClassName}>
                  Nuevo
                </button>
                <button
                  type="submit"
                  disabled={tipoSeleccionadoId === null}
                  className={tipoSeleccionadoId === null ? accionDeshabilitadaClassName : accionClassName}
                >
                  Guardar
                </button>
                <button
                  type="submit"
                  formAction={accionEliminarFamilia}
                  disabled={familiaSeleccionadaId === null}
                  className={familiaSeleccionadaId === null ? accionDeshabilitadaClassName : accionClassName}
                  onClick={(e) =>
                    confirmarEliminacion(
                      e,
                      "Vas a eliminar esta familia.\n\nSi tiene subfamilias asociadas no se podra eliminar.\n\nQuieres continuar?",
                      familiaSeleccionadaId !== null
                    )
                  }
                >
                  Eliminar
                </button>
              </div>
            </div>

            <div className="rounded-[20px] border border-[#79534c] bg-[linear-gradient(180deg,#4a342f_0%,#392823_48%,#2c1f1c_100%)] p-2.5 shadow-[0_18px_34px_rgba(31,20,17,0.18)]">
              <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#e3cdc6]">
                Buscar
              </div>
              <div className="mt-1.5 grid gap-1.5">
                <label className="grid gap-0">
                  <input
                    type="text"
                    value={textoBusquedaFamilia}
                    onChange={(e) => setTextoBusquedaFamilia(e.target.value)}
                    className="w-full rounded-2xl border border-[#d2aca3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-2 text-sm text-[#2e211d] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_6px_14px_rgba(85,52,46,0.06)] outline-none transition duration-150 hover:-translate-y-[1px] hover:border-[#c58f82] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_24px_rgba(85,52,46,0.10)] focus:-translate-y-[1px] focus:border-[#b97263] focus:bg-white focus:shadow-[0_0_0_4px_rgba(193,129,115,0.18),0_14px_26px_rgba(85,52,46,0.11)]"
                    placeholder="Nombre de la familia"
                    disabled={tipoSeleccionadoId === null}
                  />
                </label>
                <div className="rounded-2xl border border-[#8a6d66] bg-[rgba(254,249,248,0.92)] px-3 py-1 text-center text-xs text-[#634c46]">
                  {tipoSeleccionadoId === null
                    ? "Selecciona un tipo"
                    : textoBusquedaFamilia.trim()
                      ? `${familiasFiltradas.length} resultado${familiasFiltradas.length === 1 ? "" : "s"}`
                      : "Escribe para buscar"}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-[#d7bbb3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <div className="min-h-0 flex-1 overflow-y-auto">
                {tipoSeleccionadoId === null ? (
                  <div className="px-5 py-8 text-center text-sm text-[#856f69]">Selecciona un tipo.</div>
                ) : familiasFiltradas.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-[#856f69]">No hay coincidencias.</div>
                ) : (
                  <div className="divide-y divide-[#ead7d1]">
                    {familiasFiltradas.map((familia) => {
                      const seleccionado = familia.id === familiaSeleccionadaId;

                      return (
                        <button
                          key={familia.id}
                          type="button"
                          onClick={() => seleccionarFamilia(familia)}
                          className={
                            seleccionado
                              ? "flex w-full items-center justify-between border-l-4 border-[#bd7f72] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-4 py-2.5 text-left text-sm text-[#3f2c28] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                              : "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-[#3f2c28] transition duration-150 hover:bg-[rgba(232,214,206,0.6)] hover:shadow-[inset_4px_0_0_#d2a39a]"
                          }
                        >
                          <span className="font-semibold">{familia.nombre}</span>
                          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#98786f]">
                            ID {familia.id}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </form>
        </section>

        <section className={`${bloqueClassName} flex min-h-0 flex-col`}>
          <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
            Subfamilias
          </div>

          <form
            action={
              subfamiliaSeleccionadaId === null
                ? accionCrearSubfamilia
                : accionActualizarSubfamilia
            }
            className="flex min-h-0 flex-1 flex-col gap-2.5"
          >
            <input name="id" type="hidden" value={subfamiliaSeleccionadaId ?? ""} />
            <input name="familia_id" type="hidden" value={familiaSeleccionadaId ?? ""} />

            <div className="rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fcf9f8_0%,#efe6e3_100%)] px-3 py-1.5 text-center text-xs text-[#96817b] opacity-80">
              {familiaSeleccionada
                ? `${familiaSeleccionada.tipo} / ${familiaSeleccionada.nombre}`
                : "Selecciona una familia"}
            </div>

            <label className="grid gap-0">
              <input
                ref={subfamiliaNombreRef}
                name="nombre"
                type="text"
                value={nombreSubfamilia}
                onChange={(e) => setNombreSubfamilia(e.target.value)}
                disabled={familiaSeleccionadaId === null}
                className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-70`}
                placeholder="Nombre de la subfamilia"
              />
            </label>

            <div className="rounded-[18px] border border-[#d1a79d] bg-[linear-gradient(180deg,rgba(248,241,239,0.96)_0%,rgba(237,224,220,0.99)_100%)] px-2.5 py-2.5 shadow-[0_10px_18px_rgba(85,52,46,0.07)]">
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={nuevaSubfamilia} className={accionClassName}>
                  Nuevo
                </button>
                <button
                  type="submit"
                  disabled={familiaSeleccionadaId === null}
                  className={familiaSeleccionadaId === null ? accionDeshabilitadaClassName : accionClassName}
                >
                  Guardar
                </button>
                <button
                  type="submit"
                  formAction={accionEliminarSubfamilia}
                  disabled={subfamiliaSeleccionadaId === null}
                  className={subfamiliaSeleccionadaId === null ? accionDeshabilitadaClassName : accionClassName}
                  onClick={(e) =>
                    confirmarEliminacion(
                      e,
                      "Vas a eliminar esta subfamilia.\n\nQuieres continuar?",
                      subfamiliaSeleccionadaId !== null
                    )
                  }
                >
                  Eliminar
                </button>
              </div>
            </div>

            <div className="rounded-[20px] border border-[#79534c] bg-[linear-gradient(180deg,#4a342f_0%,#392823_48%,#2c1f1c_100%)] p-2.5 shadow-[0_18px_34px_rgba(31,20,17,0.18)]">
              <div className="text-center text-[10px] font-black uppercase tracking-[0.16em] text-[#e3cdc6]">
                Buscar
              </div>
              <div className="mt-1.5 grid gap-1.5">
                <label className="grid gap-0">
                  <input
                    type="text"
                    value={textoBusquedaSubfamilia}
                    onChange={(e) => setTextoBusquedaSubfamilia(e.target.value)}
                    className="w-full rounded-2xl border border-[#d2aca3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-2 text-sm text-[#2e211d] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_6px_14px_rgba(85,52,46,0.06)] outline-none transition duration-150 hover:-translate-y-[1px] hover:border-[#c58f82] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_24px_rgba(85,52,46,0.10)] focus:-translate-y-[1px] focus:border-[#b97263] focus:bg-white focus:shadow-[0_0_0_4px_rgba(193,129,115,0.18),0_14px_26px_rgba(85,52,46,0.11)]"
                    placeholder="Nombre de la subfamilia"
                    disabled={familiaSeleccionadaId === null}
                  />
                </label>
                <div className="rounded-2xl border border-[#8a6d66] bg-[rgba(254,249,248,0.92)] px-3 py-1 text-center text-xs text-[#634c46]">
                  {familiaSeleccionadaId === null
                    ? "Selecciona una familia"
                    : textoBusquedaSubfamilia.trim()
                      ? `${subfamiliasFiltradas.length} resultado${subfamiliasFiltradas.length === 1 ? "" : "s"}`
                      : "Escribe para buscar"}
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-[#d7bbb3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <div className="min-h-0 flex-1 overflow-y-auto">
                {familiaSeleccionadaId === null ? (
                  <div className="px-5 py-8 text-center text-sm text-[#856f69]">Selecciona una familia.</div>
                ) : subfamiliasFiltradas.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-[#856f69]">No hay coincidencias.</div>
                ) : (
                  <div className="divide-y divide-[#ead7d1]">
                    {subfamiliasFiltradas.map((subfamilia) => {
                      const seleccionado = subfamilia.id === subfamiliaSeleccionadaId;

                      return (
                        <button
                          key={subfamilia.id}
                          type="button"
                          onClick={() => seleccionarSubfamilia(subfamilia)}
                          className={
                            seleccionado
                              ? "flex w-full items-center justify-between border-l-4 border-[#bd7f72] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-4 py-2.5 text-left text-sm text-[#3f2c28] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                              : "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-[#3f2c28] transition duration-150 hover:bg-[rgba(232,214,206,0.6)] hover:shadow-[inset_4px_0_0_#d2a39a]"
                          }
                        >
                          <span className="font-semibold">{subfamilia.nombre}</span>
                          <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#98786f]">
                            ID {subfamilia.id}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}
