import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { aplicarAlturaAlContenido } from "./altura-campo";

test("la altura sigue al contenido y no se corta en dos líneas", () => {
  const corto = { style: { height: "80px", overflow: "auto" }, scrollHeight: 18 };
  aplicarAlturaAlContenido(corto);
  assert.equal(corto.style.overflow, "hidden");
  assert.equal(corto.style.height, "18px");

  const largo = { style: { height: "18px", overflow: "auto" }, scrollHeight: 640 };
  aplicarAlturaAlContenido(largo);
  assert.equal(largo.style.height, "640px");
  assert.equal(Number.parseInt(largo.style.height, 10) > 18 * 2, true);
});

test("la tabla no recorta concepto ni observaciones", () => {
  const tabla = readFileSync(new URL("../../app/gestion-diaria/punteo-banco/tabla-movimientos.tsx", import.meta.url), "utf8");

  assert.equal(tabla.includes("line-clamp"), false);
  assert.equal(tabla.includes("truncate"), false);
  assert.equal(tabla.includes("max-h-"), false);
  assert.equal(tabla.includes("Fecha valor"), false);
  assert.equal(tabla.includes("aplicarAlturaAlContenido"), true);
  assert.equal(tabla.includes("overflow-hidden"), true);
  assert.equal(tabla.includes("No se guarda"), false);
  assert.equal(tabla.includes("Guardando…"), true);
});
