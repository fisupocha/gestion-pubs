"use client";

import { useMemo, useRef, useState } from "react";

type Proveedor = {
  id: number;
  nombre: string;
  cif: string;
};

type AccionProveedor = (formData: FormData) => void | Promise<void>;

type PantallaProveedoresProps = {
  proveedores: Proveedor[];
  mensaje?: string;
  tipo?: string;
  accionCrear: AccionProveedor;
  accionActualizar: AccionProveedor;
  accionEliminar: AccionProveedor;
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

export function PantallaProveedores({
  proveedores,
  mensaje,
  tipo,
  accionCrear,
  accionActualizar,
  accionEliminar,
}: PantallaProveedoresProps) {
  const [textoBusqueda, setTextoBusqueda] = useState("");
  const [proveedorSeleccionadoId, setProveedorSeleccionadoId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [cif, setCif] = useState("");
  const nombreRef = useRef<HTMLInputElement | null>(null);

  const proveedoresFiltrados = useMemo(() => {
    const termino = textoBusqueda.trim().toLowerCase();

    if (!termino) {
      return proveedores;
    }

    return proveedores.filter((proveedor) => {
      const nombreNormalizado = proveedor.nombre.toLowerCase();
      const cifNormalizado = proveedor.cif.toLowerCase();
      return nombreNormalizado.includes(termino) || cifNormalizado.includes(termino);
    });
  }, [proveedores, textoBusqueda]);

  function seleccionarProveedor(proveedor: Proveedor) {
    setProveedorSeleccionadoId(proveedor.id);
    setNombre(proveedor.nombre);
    setCif(proveedor.cif);
  }

  function prepararNuevo() {
    setProveedorSeleccionadoId(null);
    setNombre("");
    setCif("");
    requestAnimationFrame(() => {
      nombreRef.current?.focus();
    });
  }

  function confirmarEliminacion(e: React.MouseEvent<HTMLButtonElement>) {
    if (proveedorSeleccionadoId === null) {
      e.preventDefault();
      return;
    }

    const confirmar = window.confirm(
      "Vas a eliminar este proveedor.\n\nSi tiene registros asociados no se podra eliminar.\n\nQuieres continuar?"
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
            <h1 className="mt-2 text-3xl font-black text-[#4b312b]">Proveedores</h1>
            <p className="mt-2 text-sm text-[#7b635c]">
              Busca, selecciona y mantiene nombre y CIF.
            </p>
          </div>

          <div className="rounded-[22px] border border-[#d1a79d] bg-[linear-gradient(180deg,#fdf9f8_0%,#ede1dd_100%)] px-5 py-3 text-center shadow-[0_10px_18px_rgba(85,52,46,0.08)]">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
              Registros
            </div>
            <div className="mt-1 text-2xl font-black text-[#5b3a33]">{proveedores.length}</div>
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

      <div className="grid min-h-0 flex-1 gap-2.5 xl:grid-cols-[0.9fr_1.15fr] 2xl:gap-3">
        <section className={`${bloqueClassName} flex min-h-0 flex-col`}>
          <div className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6458]">
            Ficha proveedor
          </div>

          <form
            action={proveedorSeleccionadoId === null ? accionCrear : accionActualizar}
            className="flex min-h-0 flex-1 flex-col gap-4"
          >
            <input name="id" type="hidden" value={proveedorSeleccionadoId ?? ""} />

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
                  placeholder="Nombre del proveedor"
                />
              </label>

              <label className="grid gap-1.5">
                <span className={labelClassName}>CIF</span>
                <input
                  name="cif"
                  type="text"
                  value={cif}
                  onChange={(e) => setCif(e.target.value.toUpperCase())}
                  className={inputClassName}
                  placeholder="CIF"
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
                  disabled={proveedorSeleccionadoId === null}
                  aria-disabled={proveedorSeleccionadoId === null}
                  className={
                    proveedorSeleccionadoId === null
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
                    placeholder="Nombre o CIF"
                  />
                </label>

                <div className="rounded-2xl border border-[#8a6d66] bg-[rgba(254,249,248,0.92)] px-3 py-2 text-center text-sm text-[#634c46]">
                  {textoBusqueda.trim()
                    ? `${proveedoresFiltrados.length} resultado${proveedoresFiltrados.length === 1 ? "" : "s"}`
                    : "Escribe para buscar"}
                </div>
              </div>
            </div>
          </form>
        </section>

        <section className={`${bloqueClassName} flex min-h-0 flex-col`}>
          <div className="mb-4 text-center text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6458]">
            Lista proveedores
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-[#d7bbb3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <div className="grid grid-cols-[1.3fr_0.8fr_auto] gap-3 border-b border-[#e3cbc4] px-5 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#8a6458]">
              <span>Nombre</span>
              <span>CIF</span>
              <span>ID</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {proveedoresFiltrados.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-[#856f69]">
                  No hay coincidencias.
                </div>
              ) : (
                <div className="divide-y divide-[#ead7d1]">
                  {proveedoresFiltrados.map((proveedor) => {
                    const seleccionado = proveedor.id === proveedorSeleccionadoId;

                    return (
                      <button
                        key={proveedor.id}
                        type="button"
                        onClick={() => seleccionarProveedor(proveedor)}
                        className={
                          seleccionado
                            ? "grid w-full grid-cols-[1.3fr_0.8fr_auto] items-center gap-3 border-l-4 border-[#bd7f72] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-5 py-4 text-left text-sm text-[#3f2c28] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                            : "grid w-full grid-cols-[1.3fr_0.8fr_auto] items-center gap-3 px-5 py-4 text-left text-sm text-[#3f2c28] transition duration-150 hover:bg-[rgba(232,214,206,0.6)] hover:shadow-[inset_4px_0_0_#d2a39a]"
                        }
                      >
                        <span className="font-semibold">{proveedor.nombre}</span>
                        <span className="font-medium text-[#6e5751]">{proveedor.cif}</span>
                        <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#98786f]">
                          ID {proveedor.id}
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
