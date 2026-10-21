import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  aplicarFalloConcepto,
  aplicarRespuestaConcepto,
  borradorInicial,
  combinarConceptos,
  editarBorradorConcepto,
  marcaDeConcepto,
  planGuardarNuestroConcepto,
  prepararEnvioConcepto,
} from "./guardado-nuestro-concepto";

const contexto = {
  estado: "pendiente",
  local: "Cue" as string | null,
  observaciones: "nota",
  conceptoOriginal: "PAGARE TRUN",
};

test("el plan solo llama a la función oficial y admite vacío", () => {
  const vacio = planGuardarNuestroConcepto(8, "   ");
  assert.equal(vacio.ok, true);
  if (vacio.ok) {
    assert.equal(vacio.texto, "");
    assert.equal(vacio.llamada.funcion, "punteo_guardar_nuestro_concepto");
    assert.equal(vacio.llamada.p_nuestro_concepto, "");
    assert.equal("estado" in vacio.llamada, false);
    assert.equal("local" in vacio.llamada, false);
    assert.equal("observaciones" in vacio.llamada, false);
  }

  const largo = planGuardarNuestroConcepto(8, "a".repeat(501));
  assert.equal(largo.ok, false);
});

test("no anuncia guardado antes de la confirmación y conserva el texto si falla", () => {
  let borrador = editarBorradorConcepto(borradorInicial(4, ""), "Distribuciones La Bajada");
  assert.equal(marcaDeConcepto(borrador), "pendiente");
  const envio = prepararEnvioConcepto(borrador);
  assert.equal(envio.accion, "enviar");
  if (envio.accion !== "enviar") {
    return;
  }

  borrador = envio.borrador;
  assert.equal(marcaDeConcepto(borrador), "guardando");
  assert.equal(borrador.mensaje, "");
  const fallo = aplicarFalloConcepto(borrador, envio.generacion, "No hay una sesión de administrador");
  assert.equal(fallo.borrador.visible, "Distribuciones La Bajada");
  assert.equal(fallo.borrador.oficial, "");
  assert.equal(marcaDeConcepto(fallo.borrador), "error");
  assert.equal(fallo.aviso?.tono, "error");

  const reintento = prepararEnvioConcepto(fallo.borrador);
  assert.equal(reintento.accion, "enviar");
});

test("una respuesta antigua no pisa un texto más reciente", () => {
  let borrador = editarBorradorConcepto(borradorInicial(4, ""), "A");
  const primero = prepararEnvioConcepto(borrador);
  assert.equal(primero.accion, "enviar");
  if (primero.accion !== "enviar") {
    return;
  }

  borrador = editarBorradorConcepto(primero.borrador, "AB");
  assert.equal(borrador.visible, "AB");
  const vieja = aplicarRespuestaConcepto(
    borrador,
    primero.generacion,
    { ok: true, nuestro_concepto: "A", estado: "pendiente", local: "Cue", observaciones: "nota", concepto_original: "PAGARE TRUN" },
    contexto
  );
  assert.equal(vieja.borrador.visible, "AB");
  assert.equal(vieja.borrador.oficial, "A");
  assert.equal(marcaDeConcepto(vieja.borrador), "pendiente");
  assert.equal(vieja.aviso, null);
  assert.equal(vieja.reintentar, true);

  const segundo = prepararEnvioConcepto(vieja.borrador);
  assert.equal(segundo.accion, "enviar");
  if (segundo.accion !== "enviar") {
    return;
  }

  const nueva = aplicarRespuestaConcepto(
    segundo.borrador,
    segundo.generacion,
    { ok: true, nuestro_concepto: "AB", estado: "pendiente", local: "Cue", observaciones: "nota", concepto_original: "PAGARE TRUN" },
    contexto
  );
  assert.equal(nueva.borrador.visible, "AB");
  assert.equal(nueva.borrador.oficial, "AB");
  assert.equal(marcaDeConcepto(nueva.borrador), "guardado");
  assert.equal(nueva.reintentar, false);
});

test("vaciar nuestro concepto se confirma y una recarga no borra un texto pendiente", () => {
  let borrador = editarBorradorConcepto(borradorInicial(4, "AB"), "");
  const envio = prepararEnvioConcepto(borrador);
  assert.equal(envio.accion, "enviar");
  if (envio.accion !== "enviar") {
    return;
  }

  const vacio = aplicarRespuestaConcepto(
    envio.borrador,
    envio.generacion,
    { ok: true, nuestro_concepto: "", estado: "ok", local: null, observaciones: "", concepto_original: "banco" },
    { estado: "ok", local: null, observaciones: "", conceptoOriginal: "banco" }
  );
  assert.equal(vacio.borrador.oficial, "");
  assert.equal(marcaDeConcepto(vacio.borrador), "guardado");

  const pendiente = editarBorradorConcepto(vacio.borrador, "sigue en pantalla");
  const combinado = combinarConceptos(
    [{ id: 4, nuestroConcepto: "", estado: "ok", local: null, observaciones: "" }],
    new Map([[4, pendiente]])
  );
  assert.equal(combinado.filas[0]?.nuestroConcepto, "sigue en pantalla");
  assert.equal(combinado.filas[0]?.estado, "ok");
});

test("si la respuesta cambia el estado, no se da por guardado", () => {
  const editado = editarBorradorConcepto(borradorInicial(4, ""), "Soho no va aquí");
  const envio = prepararEnvioConcepto(editado);
  assert.equal(envio.accion, "enviar");
  if (envio.accion !== "enviar") {
    return;
  }

  const respuesta = aplicarRespuestaConcepto(
    envio.borrador,
    envio.generacion,
    { ok: true, nuestro_concepto: "Soho no va aquí", estado: "ok", local: "Cue", observaciones: "nota", concepto_original: "PAGARE TRUN" },
    contexto
  );
  assert.equal(marcaDeConcepto(respuesta.borrador), "error");
  assert.equal(respuesta.borrador.oficial, "");
  assert.equal(respuesta.borrador.visible, "Soho no va aquí");
});

test("el acceso no escribe la tabla y la pantalla no anuncia un guardado ficticio", () => {
  const acceso = readFileSync(new URL("./acceso-oficial.ts", import.meta.url), "utf8");
  const tabla = readFileSync(new URL("../../app/gestion-diaria/punteo-banco/tabla-movimientos.tsx", import.meta.url), "utf8");
  const gancho = readFileSync(new URL("../../app/gestion-diaria/punteo-banco/use-modo-oficial.ts", import.meta.url), "utf8");

  assert.match(acceso, /punteo_guardar_nuestro_concepto/);
  assert.equal(acceso.includes(".update("), false);
  assert.equal(acceso.includes(".insert("), false);
  assert.equal(acceso.includes(".delete("), false);
  assert.match(gancho, /guardarNuestroConceptoOficial/);
  assert.equal(gancho.includes("punteo_movimientos"), false);
  assert.equal(tabla.includes("No se guarda"), false);
  assert.equal(tabla.includes("Solo en esta vista"), false);
  assert.match(tabla, /Guardando…/);
  assert.match(tabla, /No se ha guardado/);
  assert.match(tabla, /Guardado/);
});
