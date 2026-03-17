"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";

type CampoFechaProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  placeholderLabel?: string;
};

export const CampoFecha = forwardRef<HTMLInputElement, CampoFechaProps>(function CampoFecha(
  { value, placeholderLabel = "Fecha", onFocus, onBlur, disabled, className, ...props },
  ref
) {
  const valueNormalizado = typeof value === "string" ? value : "";
  const [estaActivo, setEstaActivo] = useState(false);
  const modoTexto = !disabled && !estaActivo && !valueNormalizado;

  return (
    <input
      {...props}
      ref={ref}
      value={valueNormalizado}
      disabled={disabled}
      type={disabled || !modoTexto ? "date" : "text"}
      placeholder={modoTexto ? placeholderLabel : undefined}
      className={`${className ?? ""}${modoTexto ? " placeholder:text-current placeholder:opacity-100" : ""}`}
      onFocus={(event) => {
        setEstaActivo(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setEstaActivo(false);
        onBlur?.(event);
      }}
    />
  );
});
