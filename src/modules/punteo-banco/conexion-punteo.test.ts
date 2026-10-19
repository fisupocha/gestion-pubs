import assert from "node:assert/strict";
import test from "node:test";
import { CONEXION_PUNTEO_SUPABASE, conexionPunteoActiva, exigirConexionPunteo } from "./conexion-punteo";

test("la conexión de punteo está activada y sigue exigiendo el interruptor", () => {
  assert.equal(CONEXION_PUNTEO_SUPABASE, true);
  assert.equal(conexionPunteoActiva(), true);
  assert.doesNotThrow(() => exigirConexionPunteo());
});
