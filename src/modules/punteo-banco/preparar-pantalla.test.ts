import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { anunciaExito, planCambioEstado, planObservacion } from "./acciones-oficiales";
import { CONEXION_PUNTEO_SUPABASE } from "./conexion-punteo";
import type { MovimientoInterno } from "./movimiento-interno";
import {
  decisionPaginaTpv,
  mesTpvUtilizable,
  presentarTpvOficial,
  sumarImportesTpv,
  TAMANO_PAGINA_TPV,
} from "./paginacion-tpv";
import { prepararCargaOficial } from "./preparar-carga-oficial";

test("el interruptor está encendido y la pantalla no importa la base al arrancar", () => {
  assert.equal(CONEXION_PUNTEO_SUPABASE, true);
  const cliente = readFileSync(
    new URL("../../app/gestion-diaria/punteo-banco/punteo-banco-client.tsx", import.meta.url),
    "utf8"
  );
  const modo = readFileSync(new URL("../../app/gestion-diaria/punteo-banco/use-modo-oficial.ts", import.meta.url), "utf8");
  const conexion = readFileSync(new URL("./conexion-punteo.ts", import.meta.url), "utf8");

  assert.equal(cliente.includes("@/lib/supabase"), false);
  assert.equal(cliente.includes("acceso-oficial"), false);
  assert.equal(/import\s+\{[^}]*\}\s+from\s+"@\/modules\/punteo-banco\/acceso-oficial"/.test(modo), false);
  assert.match(conexion, /CONEXION_PUNTEO_SUPABASE = true/);
  const llamada = modo.indexOf('import("@/modules/punteo-banco/acceso-oficial")');
  assert.ok(llamada > modo.indexOf("if (!conexionPunteoActiva())"));
});

test("separa en memoria el corte del 30/09/2026 y no confirma una cadena rota", () => {
  const plan = prepararCargaOficial("caixabank", [
    movimiento("2026-10-01", -20, 130),
    movimiento("2026-09-30", 50, 150),
    movimiento("2026-09-29", 100, 100),
  ]);

  assert.equal(plan.garantizada, true);
  assert.deepEqual(
    plan.historico.map((fila) => fila.fecha),
    ["2026-09-29", "2026-09-30"]
  );
  assert.deepEqual(
    plan.ordinario.map((fila) => fila.fecha),
    ["2026-10-01"]
  );
  assert.deepEqual(plan.llamadas, ["historica", "ordinaria"]);

  const rota = prepararCargaOficial("caixabank", [
    movimiento("2026-09-29", 100, 100),
    movimiento("2026-09-30", 50, 151),
  ]);

  assert.equal(rota.garantizada, false);
  assert.equal(rota.llamadas.length, 0);
  assert.match(rota.aviso, /no puede garantizar/);
});

test("una página llena de TPV no se da por terminada y un fallo no es definitivo", () => {
  assert.equal(decisionPaginaTpv(TAMANO_PAGINA_TPV, TAMANO_PAGINA_TPV, false), "seguir");
  assert.equal(decisionPaginaTpv(TAMANO_PAGINA_TPV - 1, TAMANO_PAGINA_TPV, false), "completa");
  assert.equal(decisionPaginaTpv(TAMANO_PAGINA_TPV, TAMANO_PAGINA_TPV, true), "incompleta");

  const suma = sumarImportesTpv([
    { clase: "tpv-ingreso", importe_centimos: 1000 },
    { clase: "tpv-comision", importe_centimos: -25 },
    { clase: "tpv-mantenimiento", importe_centimos: -400 },
    { clase: "tpv-devolucion", importe_centimos: -10 },
  ]);

  assert.deepEqual(suma, { ingresosCentimos: 1000, comisionesCentimos: -25 });

  const filas = presentarTpvOficial([
    { mes: 1, ingresosCentimos: 1000, comisionesCentimos: -25, incompleto: true },
    ...Array.from({ length: 11 }, (_, indice) => ({
      mes: indice + 2,
      ingresosCentimos: 0,
      comisionesCentimos: 0,
      incompleto: false,
    })),
  ]);
  const enero = filas.find((fila) => fila.id === "mes-1");
  const total = filas.find((fila) => fila.id === "total");

  assert.equal(enero?.ingresos, null);
  assert.equal(enero?.aviso, "Incompleto");
  assert.equal(enero?.estado, null);
  assert.equal(total?.ingresos, null);
  assert.equal(total?.aviso, "Incompleto");
  assert.equal(mesTpvUtilizable({ mes: 1, ingresosCentimos: 1000, comisionesCentimos: -25, incompleto: true }), false);
});

test("una observación conserva el estado y un fallo de importación no es éxito", () => {
  const nota = planObservacion("ok", true);
  const cambio = planCambioEstado("comprobar", " revisar el recibo ");

  assert.equal(nota.funcion, "punteo_guardar_observacion");
  assert.equal(nota.estado, "ok");
  assert.equal(nota.decisionProtegida, true);
  assert.equal(cambio.funcion, "punteo_cambiar_estado");
  assert.equal(cambio.observaciones, null);
  assert.equal(cambio.motivo, "revisar el recibo");
  assert.throws(() => planCambioEstado("ok", "  "), /motivo/);
  assert.equal(anunciaExito({ ok: true, estado: "pendiente_comprobacion", motivo: "revisar" }), false);
  assert.equal(anunciaExito({ ok: false, estado: "rechazada", motivo: "duplicada" }), false);
  assert.equal(anunciaExito({ ok: true, estado: "confirmada", motivo: "Lista" }), true);
});

function movimiento(fecha: string, importe: number, saldo: number): MovimientoInterno {
  return {
    id: fecha,
    banco: "caixabank",
    fecha,
    fechaValor: "",
    importe,
    concepto: "Apunte",
    conceptoOriginal: "Apunte",
    detallesOriginales: "",
    saldo,
    referencias: [],
    clase: "normal",
    observaciones: "",
    ok: "pendiente",
    archivo: "extracto.xls",
    fila: 1,
    orden: 1,
  };
}
