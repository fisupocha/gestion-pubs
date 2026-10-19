import assert from "node:assert/strict";
import test from "node:test";
import { mensajeErrorSeguro, mensajeImportacion } from "./mensajes-importacion";

test("explica una importación pendiente sin guardar movimientos", () => {
  const mensaje = mensajeImportacion({
    ok: false,
    estado: "pendiente_comprobacion",
    continuidad: "no-cuadra",
    motivo: "El saldo no cuadra al céntimo en la posición 4",
    filas_leidas: 8,
    filas_nuevas: 0,
    filas_omitidas: 0,
  });

  assert.equal(mensaje.tono, "error");
  assert.match(mensaje.texto, /No se ha confirmado/);
  assert.match(mensaje.texto, /céntimo/);
  assert.match(mensaje.texto, /nuevas 0/);
});

test("explica un archivo ya confirmado", () => {
  const mensaje = mensajeImportacion({
    ok: false,
    estado: "rechazada",
    continuidad: "duplicada",
    motivo: "Este archivo ya fue confirmado. No se duplican sus movimientos.",
    filas_leidas: 71,
    filas_nuevas: 0,
    filas_omitidas: 0,
  });

  assert.equal(mensaje.tono, "info");
  assert.match(mensaje.texto, /No se han guardado movimientos nuevos/);
});

test("no muestra un error interno con datos de acceso", () => {
  assert.match(mensajeErrorSeguro({ message: "jwt secret leaked" }), /detalle interno/);
  assert.equal(
    mensajeErrorSeguro({ message: "Punteo banco solo está disponible para el administrador" }),
    "Punteo banco solo está disponible para el administrador"
  );
});
