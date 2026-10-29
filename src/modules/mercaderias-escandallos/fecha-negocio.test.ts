import test from "node:test";
import assert from "node:assert/strict";
import { fechaNegocio } from "./fecha-negocio";
test("Vigencias usan el día de Madrid aunque UTC sea el anterior",()=>{
 assert.equal(fechaNegocio(new Date("2026-10-29T23:19:00Z")),"2026-10-30");
 assert.equal(fechaNegocio(new Date("2026-07-01T22:30:00Z")),"2026-07-02");
 assert.equal(fechaNegocio(new Date("2026-12-31T23:30:00Z")),"2027-01-01");
 assert.equal(fechaNegocio(new Date("2026-10-29T21:00:00Z")),"2026-10-29");
});
