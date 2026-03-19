"use client";

import { useRef, useState } from "react";

type ItemNombre = {
  id: number;
  nombre: string;
};

type ItemPorcentaje = {
  id: number;
  porcentaje: number;
};

type Accion = (formData: FormData) => void | Promise<void>;

type Props = {
  locales: ItemNombre[];
  bancos: ItemNombre[];
  formasPago: ItemNombre[];
  tiposIva: ItemPorcentaje[];
  conceptosGastosBancarios: ItemNombre[];
  mensaje?: string;
  tipoMensaje?: string;
  accionCrearLocal: Accion;
  accionActualizarLocal: Accion;
  accionEliminarLocal: Accion;
  accionCrearBanco: Accion;
  accionActualizarBanco: Accion;
  accionEliminarBanco: Accion;
  accionCrearFormaPago: Accion;
  accionActualizarFormaPago: Accion;
  accionEliminarFormaPago: Accion;
  accionCrearTipoIva: Accion;
  accionActualizarTipoIva: Accion;
  accionEliminarTipoIva: Accion;
  accionCrearConcepto: Accion;
  accionActualizarConcepto: Accion;
  accionEliminarConcepto: Accion;
};

const bloqueClassName =
  "rounded-[22px] border border-[#d1a79d] bg-[linear-gradient(180deg,rgba(248,240,237,0.99)_0%,rgba(237,223,219,0.99)_100%)] p-3 shadow-[0_14px_26px_rgba(85,52,46,0.09)]";

const inputClassName =
  "w-full rounded-2xl border border-[#d2aca3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] px-3 py-2 text-center text-sm text-[#2e211d] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_6px_14px_rgba(85,52,46,0.06)] outline-none transition duration-150 placeholder:text-[#a78f88] hover:-translate-y-[1px] hover:border-[#c58f82] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_12px_24px_rgba(85,52,46,0.10)] focus:-translate-y-[1px] focus:border-[#b97263] focus:bg-white focus:shadow-[0_0_0_4px_rgba(193,129,115,0.18),0_14px_26px_rgba(85,52,46,0.11)]";

const accionClassName =
  "min-w-0 flex-1 rounded-2xl border border-[#cfafa8] bg-[linear-gradient(180deg,#fbf7f6_0%,#e8dbd8_100%)] px-3 py-2 text-[14px] font-semibold text-[#492f29] shadow-[0_12px_20px_rgba(85,52,46,0.10)] transition duration-150 hover:-translate-y-[1px] hover:border-[#c28779] hover:bg-[linear-gradient(180deg,#fffdfc_0%,#eedfda_100%)] hover:shadow-[0_14px_24px_rgba(85,52,46,0.14)] focus-visible:-translate-y-[1px] focus-visible:border-[#b97263] focus-visible:bg-[linear-gradient(180deg,#fffdfc_0%,#f0e2dc_100%)] focus-visible:shadow-[0_0_0_4px_rgba(193,129,115,0.18),0_16px_28px_rgba(85,52,46,0.15)] focus-visible:outline-none";

const accionDeshabilitadaClassName =
  "min-w-0 flex-1 cursor-not-allowed rounded-2xl border border-[#dcc8c2] bg-[linear-gradient(180deg,#fcf9f8_0%,#efe6e3_100%)] px-3 py-2 text-[14px] font-semibold text-[#96817b] opacity-70 shadow-none";

function confirmarEliminacion(
  e: React.MouseEvent<HTMLButtonElement>,
  puedeEliminar: boolean,
  texto: string
) {
  if (!puedeEliminar) {
    e.preventDefault();
    return;
  }

  if (!window.confirm(texto)) {
    e.preventDefault();
  }
}

function BloqueSimple({
  titulo,
  valor,
  onChange,
  placeholder,
  seleccionId,
  setSeleccionId,
  setValor,
  items,
  accionCrear,
  accionActualizar,
  accionEliminar,
  inputRef,
}: {
  titulo: string;
  valor: string;
  onChange: (value: string) => void;
  placeholder: string;
  seleccionId: number | null;
  setSeleccionId: (value: number | null) => void;
  setValor: (value: string) => void;
  items: Array<{ id: number; label: string }>;
  accionCrear: Accion;
  accionActualizar: Accion;
  accionEliminar: Accion;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  function nuevo() {
    setSeleccionId(null);
    setValor("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <section className={`${bloqueClassName} flex min-h-0 flex-col`}>
      <div className="mb-2 text-center text-[10px] font-black uppercase tracking-[0.18em] text-[#8a6458]">
        {titulo}
      </div>

      <form
        action={seleccionId === null ? accionCrear : accionActualizar}
        className="flex min-h-0 flex-1 flex-col gap-2.5"
      >
        <input name="id" type="hidden" value={seleccionId ?? ""} />

        <label className="grid gap-0">
          <input
            ref={inputRef}
            name={titulo === "Tipos de IVA" ? "porcentaje" : "nombre"}
            type="text"
            value={valor}
            onChange={(e) => onChange(e.target.value)}
            className={inputClassName}
            placeholder={placeholder}
          />
        </label>

        <div className="rounded-[18px] border border-[#d1a79d] bg-[linear-gradient(180deg,rgba(248,241,239,0.96)_0%,rgba(237,224,220,0.99)_100%)] px-2.5 py-2.5 shadow-[0_10px_18px_rgba(85,52,46,0.07)]">
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={nuevo} className={accionClassName}>
              Nuevo
            </button>
            <button type="submit" className={accionClassName}>
              Guardar
            </button>
            <button
              type="submit"
              formAction={accionEliminar}
              disabled={seleccionId === null}
              className={seleccionId === null ? accionDeshabilitadaClassName : accionClassName}
              onClick={(e) =>
                confirmarEliminacion(
                  e,
                  seleccionId !== null,
                  `Vas a eliminar ${titulo.toLowerCase()}.\n\nQuieres continuar?`
                )
              }
            >
              Eliminar
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[18px] border border-[#d7bbb3] bg-[linear-gradient(180deg,#fffaf8_0%,#f5ece8_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {items.map((item) => {
              const seleccionado = item.id === seleccionId;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSeleccionId(item.id);
                    setValor(item.label);
                  }}
                  className={
                    seleccionado
                      ? "flex w-full items-center justify-between border-l-4 border-[#bd7f72] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-4 py-2.5 text-left text-sm text-[#3f2c28] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                      : "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-[#3f2c28] transition duration-150 hover:bg-[rgba(232,214,206,0.6)] hover:shadow-[inset_4px_0_0_#d2a39a]"
                  }
                >
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#98786f]">
                    ID {item.id}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </section>
  );
}

export function PantallaMaestrosVarios({
  locales,
  bancos,
  formasPago,
  tiposIva,
  conceptosGastosBancarios,
  mensaje,
  tipoMensaje,
  accionCrearLocal,
  accionActualizarLocal,
  accionEliminarLocal,
  accionCrearBanco,
  accionActualizarBanco,
  accionEliminarBanco,
  accionCrearFormaPago,
  accionActualizarFormaPago,
  accionEliminarFormaPago,
  accionCrearTipoIva,
  accionActualizarTipoIva,
  accionEliminarTipoIva,
  accionCrearConcepto,
  accionActualizarConcepto,
  accionEliminarConcepto,
}: Props) {
  const [localId, setLocalId] = useState<number | null>(null);
  const [bancoId, setBancoId] = useState<number | null>(null);
  const [formaPagoId, setFormaPagoId] = useState<number | null>(null);
  const [tipoIvaId, setTipoIvaId] = useState<number | null>(null);
  const [conceptoId, setConceptoId] = useState<number | null>(null);

  const [local, setLocal] = useState("");
  const [banco, setBanco] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [tipoIva, setTipoIva] = useState("");
  const [concepto, setConcepto] = useState("");

  const localRef = useRef<HTMLInputElement | null>(null);
  const bancoRef = useRef<HTMLInputElement | null>(null);
  const formaPagoRef = useRef<HTMLInputElement | null>(null);
  const tipoIvaRef = useRef<HTMLInputElement | null>(null);
  const conceptoRef = useRef<HTMLInputElement | null>(null);

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

      <div className="grid min-h-0 flex-1 gap-2 xl:grid-cols-3 xl:grid-rows-2">
        <BloqueSimple
          titulo="Locales"
          valor={local}
          onChange={setLocal}
          placeholder="Nombre del local"
          seleccionId={localId}
          setSeleccionId={setLocalId}
          setValor={setLocal}
          items={locales.map((item) => ({ id: item.id, label: item.nombre }))}
          accionCrear={accionCrearLocal}
          accionActualizar={accionActualizarLocal}
          accionEliminar={accionEliminarLocal}
          inputRef={localRef}
        />

        <BloqueSimple
          titulo="Bancos"
          valor={banco}
          onChange={setBanco}
          placeholder="Nombre del banco"
          seleccionId={bancoId}
          setSeleccionId={setBancoId}
          setValor={setBanco}
          items={bancos.map((item) => ({ id: item.id, label: item.nombre }))}
          accionCrear={accionCrearBanco}
          accionActualizar={accionActualizarBanco}
          accionEliminar={accionEliminarBanco}
          inputRef={bancoRef}
        />

        <BloqueSimple
          titulo="Formas de pago"
          valor={formaPago}
          onChange={setFormaPago}
          placeholder="Nombre de la forma de pago"
          seleccionId={formaPagoId}
          setSeleccionId={setFormaPagoId}
          setValor={setFormaPago}
          items={formasPago.map((item) => ({ id: item.id, label: item.nombre }))}
          accionCrear={accionCrearFormaPago}
          accionActualizar={accionActualizarFormaPago}
          accionEliminar={accionEliminarFormaPago}
          inputRef={formaPagoRef}
        />

        <BloqueSimple
          titulo="Tipos de IVA"
          valor={tipoIva}
          onChange={setTipoIva}
          placeholder="%"
          seleccionId={tipoIvaId}
          setSeleccionId={setTipoIvaId}
          setValor={setTipoIva}
          items={tiposIva.map((item) => ({ id: item.id, label: String(item.porcentaje) }))}
          accionCrear={accionCrearTipoIva}
          accionActualizar={accionActualizarTipoIva}
          accionEliminar={accionEliminarTipoIva}
          inputRef={tipoIvaRef}
        />

        <BloqueSimple
          titulo="Conceptos gastos bancarios"
          valor={concepto}
          onChange={setConcepto}
          placeholder="Nombre del concepto"
          seleccionId={conceptoId}
          setSeleccionId={setConceptoId}
          setValor={setConcepto}
          items={conceptosGastosBancarios.map((item) => ({ id: item.id, label: item.nombre }))}
          accionCrear={accionCrearConcepto}
          accionActualizar={accionActualizarConcepto}
          accionEliminar={accionEliminarConcepto}
          inputRef={conceptoRef}
        />

        <section className={`${bloqueClassName} flex min-h-0 flex-col`}>
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-[18px] border border-dashed border-[#e2ccc6] bg-[linear-gradient(180deg,#fffaf8_0%,#f7efec_100%)] text-center text-xs font-medium text-[#c2aca5]">
            Reservado
          </div>
        </section>
      </div>
    </section>
  );
}
