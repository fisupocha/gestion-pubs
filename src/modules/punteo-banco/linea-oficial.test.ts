import assert from "node:assert/strict";
import test from "node:test";
import { huellaSha256, lineasOficiales } from "./linea-oficial";
import type { MovimientoInterno } from "./movimiento-interno";

function fila(parcial: Partial<MovimientoInterno> & Pick<MovimientoInterno, "fecha" | "importe" | "saldo">): MovimientoInterno {
  return {
    id: "1",
    banco: "ibercaja",
    fechaValor: "",
    concepto: "no usar el texto unido",
    conceptoOriginal: "OPERACION EN CAJERO AUTOMATICO",
    detallesOriginales: "",
    referencias: [],
    clase: "normal",
    observaciones: "",
    ok: "pendiente",
    archivo: "ibercaja.xlsx",
    fila: 78,
    orden: 1,
    ...parcial,
  };
}

test("convierte importes a céntimos y numera desde el más antiguo", () => {
  const lineas = lineasOficiales("ibercaja", [
    fila({ fecha: "2026-04-27", importe: 62.5, saldo: 62.5, fila: 539 }),
    fila({
      fecha: "2026-09-30",
      importe: -500,
      saldo: 7534.64,
      conceptoOriginal: "OPERACION EN CAJERO AUTOMATICO",
      fila: 78,
    }),
  ]);

  assert.equal(lineas[0]?.posicion_archivo, "1");
  assert.equal(lineas[0]?.importe_centimos, "6250");
  assert.equal(lineas[0]?.saldo_centimos, "6250");
  assert.equal(lineas[1]?.posicion_archivo, "2");
  assert.equal(lineas[1]?.importe_centimos, "-50000");
  assert.equal(lineas[1]?.saldo_centimos, "753464");
  assert.equal(lineas[1]?.concepto_original, "OPERACION EN CAJERO AUTOMATICO");
  assert.equal(lineas[1]?.fila_excel, "78");
});

test("la huella SHA-256 corresponde al contenido del archivo", async () => {
  const contenido = new Uint8Array([97, 98, 99]).buffer;
  assert.equal(
    await huellaSha256(contenido),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
  );
});

test("rechaza una cadena que retrocede de fecha", () => {
  assert.throws(
    () =>
      lineasOficiales("ibercaja", [
        fila({ fecha: "2026-10-02", importe: 1, saldo: 1 }),
        fila({ fecha: "2026-10-01", importe: 1, saldo: 2 }),
      ]),
    /retrocede/
  );
});
