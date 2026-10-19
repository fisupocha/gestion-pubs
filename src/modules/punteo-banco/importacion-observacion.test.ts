import assert from "node:assert/strict";
import test from "node:test";
import { CONEXION_PUNTEO_SUPABASE } from "./conexion-punteo";
import {
  decidirConsulta,
  ejecutarCargaEnDosPartes,
  huellaDeParte,
  identificarExcel,
  LIMITE_HUELLA_DOBLE,
  type FilaComprobacion,
} from "./importacion-doble";
import type { ResultadoOficial } from "./mensajes-importacion";
import {
  aplicarConflicto,
  aplicarObservacionFallida,
  aplicarObservacionGuardada,
  combinarFilasConBorradores,
  esConflictoObservacion,
  estaPendiente,
  escribirObservacion,
  LIMITE_CONCURRENCIA_OBSERVACION,
  marcaDeNota,
  notaInicial,
  prepararGuardadoObservacion,
  resultadoNavegacion,
} from "./observacion-borrador";

test("las dos partes del mismo archivo tienen huellas distintas y el nombre no entra en la identidad", async () => {
  const bytes = Uint8Array.from([1, 2, 3, 4]).buffer;
  const copia = Uint8Array.from([1, 2, 3, 4]).buffer;
  const cambiados = Uint8Array.from([1, 2, 3, 5]).buffer;
  const primero = await identificarExcel(bytes);
  const repetido = await identificarExcel(copia);
  const distinto = await identificarExcel(cambiados);

  assert.equal(primero.archivo, "9f64a747e1b97f131fabb6b447296c9b6f0201e79fb3c5356e6c77e89b6a806a");
  assert.equal(primero.historica, "72bf463a7411c9979e9158c3be2fa32245ca7679cd19652865e9b7a15099e777");
  assert.equal(primero.ordinaria, "280ae419577a4de417a5f31ef37ca2ad5bdcf0c696679ac28e402bb82ec1f01b");
  assert.equal(distinto.archivo, "1571902abec0a45661de965dbe90cb0177b98c49fc58a5aabfa1edb6c678d972");
  assert.equal(primero.archivo, repetido.archivo);
  assert.equal(primero.historica, repetido.historica);
  assert.equal(primero.ordinaria, repetido.ordinaria);
  assert.notEqual(primero.historica, primero.ordinaria);
  assert.notEqual(primero.archivo, primero.historica);
  assert.notEqual(primero.archivo, distinto.archivo);
  assert.notEqual(primero.historica, distinto.historica);
  assert.match(LIMITE_HUELLA_DOBLE, /índice único|huella/);
  assert.equal(CONEXION_PUNTEO_SUPABASE, true);
});

test("caso 1: histórico y octubre confirmados es una importación completa", async () => {
  const informe = await ejecutarCargaEnDosPartes(await simulacion(confirmada("Histórico"), confirmada("Octubre")));

  assert.equal(informe.completa, true);
  assert.equal(informe.tono, "ok");
  assert.match(informe.texto, /Importación completa/);
  assert.equal(informe.deshacer, false);
  assert.deepEqual(informe.llamadas, ["historica", "ordinaria"]);
});

test("caso 2: octubre falla y el histórico confirmado queda como importación parcial", async () => {
  let deshacer = 0;
  const informe = await ejecutarCargaEnDosPartes(
    await simulacion(confirmada("Histórico guardado"), pendiente("El saldo no cuadra al céntimo en la posición 4"), {
      deshacer: () => {
        deshacer += 1;
      },
    })
  );

  assert.equal(informe.parcial, true);
  assert.equal(informe.completa, false);
  assert.equal(informe.tono, "error");
  assert.equal(informe.historicoGuardado, true);
  assert.equal(informe.octubreGuardado, false);
  assert.match(informe.texto, /parcial/);
  assert.match(informe.texto, /histórico está guardado/);
  assert.match(informe.texto, /no se han guardado/);
  assert.match(informe.texto, /céntimo/);
  assert.doesNotMatch(informe.texto, /Importación completa/);
  assert.equal(informe.deshacer, false);
  assert.equal(deshacer, 0);
});

test("caso 3: si el histórico falla no se envía octubre", async () => {
  let ordinarias = 0;
  const informe = await ejecutarCargaEnDosPartes(
    await simulacion(pendiente("El saldo no cuadra al céntimo en la posición 4"), confirmada("No debe usarse"), {
      alOrdinaria: () => {
        ordinarias += 1;
      },
    })
  );

  assert.equal(ordinarias, 0);
  assert.deepEqual(informe.llamadas, ["historica"]);
  assert.equal(informe.completa, false);
  assert.equal(informe.parcial, false);
  assert.match(informe.texto, /No se continúa/);
  assert.match(informe.texto, /céntimo/);
  assert.equal(informe.deshacer, false);
});

test("caso 4: el histórico ya confirmado no bloquea octubre", async () => {
  const informe = await ejecutarCargaEnDosPartes(await simulacion(yaEjecutada(), confirmada("Octubre nuevo")));

  assert.equal(informe.tono, "ok");
  assert.match(informe.texto, /ya estaba confirmado/);
  assert.match(informe.texto, /posteriores/);
  assert.equal(informe.completa, false);
  assert.deepEqual(informe.llamadas, ["historica", "ordinaria"]);
  assert.equal(informe.deshacer, false);
});

test("caso 5: un archivo ya importado no se anuncia como éxito ni duplica", async () => {
  const informe = await ejecutarCargaEnDosPartes(await simulacion(yaEjecutada(), duplicada()));

  assert.notEqual(informe.tono, "ok");
  assert.equal(informe.completa, false);
  assert.match(informe.texto, /ya estaba importado/);
  assert.match(informe.texto, /No se han duplicado/);
  assert.match(informe.texto, /estados/);
  assert.equal(informe.deshacer, false);
});

test("caso 6: una conexión interrumpida no se da por éxito ni por fracaso sin consultar", async () => {
  let ordinarias = 0;
  const desconocida = await ejecutarCargaEnDosPartes(
    await simulacion(new Error("Failed to fetch"), confirmada("Octubre"), {
      comprobar: async () => null,
      alOrdinaria: () => {
        ordinarias += 1;
      },
    })
  );

  assert.equal(ordinarias, 0);
  assert.equal(desconocida.parteDesconocida, "historica");
  assert.equal(desconocida.puedeRepetir, false);
  assert.equal(desconocida.requiereComprobacion, true);
  assert.notEqual(desconocida.tono, "ok");
  assert.match(desconocida.texto, /desconocido/);
  assert.equal(desconocida.deshacer, false);

  const ausente = await ejecutarCargaEnDosPartes(
    await simulacion(new Error("Failed to fetch"), confirmada("Octubre"), {
      comprobar: async () => [],
    })
  );

  assert.equal(ausente.puedeRepetir, true);
  assert.match(ausente.texto, /No consta/);
  assert.equal(ausente.llamadas.includes("ordinaria"), false);

  const encontrada = await ejecutarCargaEnDosPartes(
    await simulacion(new Error("Failed to fetch"), confirmada("Octubre"), {
      comprobar: async () => [fila("historica", "confirmada", await huellaDeParte("b".repeat(64), "historica"))],
      huellaArchivo: "b".repeat(64),
    })
  );

  assert.equal(encontrada.historicoGuardado, true);
  assert.equal(encontrada.octubreGuardado, true);
  assert.equal(encontrada.completa, true);
  assert.equal(encontrada.parteDesconocida, null);

  const consulta = decidirConsulta({
    parte: "historica",
    huella: "huella-historica",
    filas: null,
    faltaOrdinaria: true,
  });

  assert.equal(consulta.accion, "seguir-desconocido");
  assert.equal(consulta.deshacer, false);
  assert.equal(
    decidirConsulta({
      parte: "historica",
      huella: "huella-historica",
      filas: [],
      faltaOrdinaria: true,
    }).accion,
    "reintentar"
  );
});

test("una observación guardada conserva el estado y una fallida sigue visible", () => {
  const ok = escribirObservacion(notaInicial(1, "", "ok", true), "Recordar el contrato");
  const preparada = prepararGuardadoObservacion(ok, "");
  assert.equal(preparada.accion, "guardar");
  if (preparada.accion === "guardar") {
    assert.equal(preparada.textoEsperado, "");
  }
  const sinLectura = prepararGuardadoObservacion(ok, null);
  assert.equal(sinLectura.accion, "guardar");
  const guardada = aplicarObservacionGuardada(ok, { ok: true, estado: "ok", decision_protegida: true });

  assert.equal(guardada.nota.textoOficial, "Recordar el contrato");
  assert.equal(guardada.nota.estado, "ok");
  assert.equal(guardada.nota.decisionProtegida, true);
  assert.equal(estaPendiente(guardada.nota), false);
  assert.equal(marcaDeNota(guardada.nota), "oficial");

  const pendiente = escribirObservacion(notaInicial(2, "", "pendiente", false), "Nota roja");
  const guardadaPendiente = aplicarObservacionGuardada(pendiente, {
    ok: true,
    estado: "pendiente",
    decision_protegida: false,
  });

  assert.equal(guardadaPendiente.nota.estado, "pendiente");
  assert.equal(guardadaPendiente.nota.decisionProtegida, false);

  const vacia = escribirObservacion(notaInicial(3, "Nota vieja", "comprobar", false), "");
  const borrada = aplicarObservacionGuardada(vacia, { ok: true, estado: "comprobar", decision_protegida: false });

  assert.equal(borrada.nota.textoOficial, "");
  assert.equal(borrada.nota.estado, "comprobar");

  const escrita = escribirObservacion(notaInicial(4, "Oficial", "ok", true), "Texto local");
  const fallida = aplicarObservacionFallida(escrita, "No se ha guardado la observación.");

  assert.equal(fallida.nota.textoVisible, "Texto local");
  assert.equal(fallida.nota.textoOficial, "Oficial");
  assert.equal(fallida.nota.estado, "ok");
  assert.equal(fallida.nota.decisionProtegida, true);
  assert.match(fallida.aviso.texto, /No se ha guardado/);
  assert.equal(marcaDeNota(fallida.nota), "error");
  assert.equal(prepararGuardadoObservacion(escrita, null).accion, "guardar");

  const conflicto = aplicarConflicto(escrita, "Nota del otro dispositivo");

  assert.equal(conflicto.nota.textoVisible, "Texto local");
  assert.equal(conflicto.nota.textoOficial, "Oficial");
  assert.equal(prepararGuardadoObservacion(escrita, "Nota del otro dispositivo").accion, "conflicto");
  assert.match(LIMITE_CONCURRENCIA_OBSERVACION, /fila bloqueada/);
  const rechazada = aplicarObservacionGuardada(escrita, {
    ok: false,
    conflicto: true,
    observaciones: "Nota del otro dispositivo",
    estado: "ok",
    decision_protegida: true,
  });
  assert.equal(esConflictoObservacion({ ok: false, conflicto: true }), true);
  assert.equal(rechazada.nota.textoVisible, "Texto local");
  assert.equal(rechazada.nota.textoOficial, "Oficial");
  assert.equal(rechazada.nota.estado, "ok");
  assert.equal(rechazada.nota.decisionProtegida, true);
  assert.match(rechazada.aviso.texto, /No se ha sobrescrito/);

  const cambiada = aplicarObservacionGuardada(escrita, { ok: true, estado: "pendiente", decision_protegida: true });

  assert.equal(cambiada.nota.estado, "ok");
  assert.equal(cambiada.nota.textoOficial, "Oficial");
  assert.match(cambiada.aviso.texto, /no se da por guardada/);
});

test("cambiar de banco, año o página con una nota pendiente no la tira", () => {
  const nota = escribirObservacion(notaInicial(8, "Oficial", "ok", true), "Borrador visible");
  const filas = combinarFilasConBorradores(
    [{ id: 8, observaciones: "Oficial", estado: "ok" as const, decisionProtegida: true }],
    new Map([[8, nota]])
  );

  assert.equal(filas[0]?.observaciones, "Borrador visible");
  assert.equal(filas[0]?.estado, "ok");
  assert.equal(filas[0]?.decisionProtegida, true);
  assert.equal(marcaDeNota(nota), "pendiente");
  assert.deepEqual(resultadoNavegacion("cancelar"), { cambia: false, conservaBorrador: true });
  assert.deepEqual(resultadoNavegacion("guardar-fallido"), { cambia: false, conservaBorrador: true });
  assert.deepEqual(resultadoNavegacion("conservar"), { cambia: true, conservaBorrador: true });
  assert.deepEqual(resultadoNavegacion("guardar-ok"), { cambia: true, conservaBorrador: false });
});

function confirmada(motivo: string): ResultadoOficial {
  return { ok: true, estado: "confirmada", continuidad: "cuadra", motivo, filas_nuevas: 1 };
}

function pendiente(motivo: string): ResultadoOficial {
  return { ok: false, estado: "pendiente_comprobacion", continuidad: "no-cuadra", motivo, filas_nuevas: 0 };
}

function yaEjecutada(): ResultadoOficial {
  return {
    ok: false,
    estado: "rechazada",
    continuidad: "ya-ejecutada",
    motivo: "La carga histórica de este banco ya está confirmada. No se repite.",
    filas_nuevas: 0,
  };
}

function duplicada(): ResultadoOficial {
  return {
    ok: false,
    estado: "rechazada",
    continuidad: "duplicada",
    motivo: "Este archivo ya fue confirmado. No se duplican sus movimientos.",
    filas_nuevas: 0,
  };
}

function fila(tipo: string, estado: string, huella: string): FilaComprobacion {
  return { tipo, estado, continuidad: "cuadra", huella, motivo: "Encontrada" };
}

async function simulacion(
  historica: ResultadoOficial | Error,
  ordinaria: ResultadoOficial | Error,
  extra?: {
    comprobar?: () => Promise<FilaComprobacion[] | null>;
    alOrdinaria?: () => void;
    deshacer?: () => void;
    huellaArchivo?: string;
  }
) {
  const huellaArchivo = extra?.huellaArchivo ?? "c".repeat(64);

  return {
    hayHistorico: true,
    hayOrdinario: true,
    huellaHistorica: await huellaDeParte(huellaArchivo, "historica"),
    huellaOrdinaria: await huellaDeParte(huellaArchivo, "ordinaria"),
    confirmarHistorica: async () => {
      if (historica instanceof Error) {
        throw historica;
      }

      return historica;
    },
    confirmarOrdinaria: async () => {
      extra?.alOrdinaria?.();

      if (ordinaria instanceof Error) {
        throw ordinaria;
      }

      return ordinaria;
    },
    comprobar: extra?.comprobar ?? (async () => null),
    prepararHuellas: huellaArchivo,
  };
}
