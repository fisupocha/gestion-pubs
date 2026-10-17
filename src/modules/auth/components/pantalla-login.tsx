"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export function PantallaLogin() {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setEnviando(true);

    const { error: errorAcceso } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password: clave,
    });

    setEnviando(false);

    if (errorAcceso) {
      setClave("");
      setError("Correo o contraseña incorrectos.");
    }
  }

  return (
    <section className="flex h-full min-h-0 items-center justify-center px-6 py-8">
      <div className="w-full max-w-md rounded-[30px] border border-[#dbc5bc] bg-[linear-gradient(180deg,#fffaf8_0%,#f4ece8_100%)] p-8 text-[#402a24] shadow-[0_24px_60px_rgba(85,52,46,0.10)]">
        <div className="text-center text-[11px] font-black uppercase tracking-[0.22em] text-[#8a6458]">
          Gestión Pubs
        </div>
        <h1 className="mt-3 text-center text-3xl font-black tracking-tight">
          Iniciar sesión
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-[#6d5249]">
          Esta aplicación es privada. Entra con el correo y la contraseña de tu cuenta.
        </p>

        <form onSubmit={enviar} className="mt-6 grid gap-3">
          <label className="grid gap-1 text-sm font-semibold">
            Correo
            <input
              type="email"
              autoComplete="username"
              required
              value={correo}
              onChange={(event) => setCorreo(event.target.value)}
              className="rounded-2xl border border-[#d8c2b6] bg-white px-4 py-2.5 text-sm font-normal text-[#3f2a23] outline-none"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={clave}
              onChange={(event) => setClave(event.target.value)}
              className="rounded-2xl border border-[#d8c2b6] bg-white px-4 py-2.5 text-sm font-normal text-[#3f2a23] outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={enviando}
            className="rounded-2xl border border-[#b9796d] bg-[linear-gradient(180deg,#f5e3dc_0%,#edd4cb_100%)] px-4 py-2.5 text-sm font-black text-[#5a3025] disabled:opacity-60"
          >
            {enviando ? "Entrando..." : "Entrar"}
          </button>
          {error ? <p className="text-sm font-semibold text-[#a13d2f]">{error}</p> : null}
        </form>
      </div>
    </section>
  );
}
