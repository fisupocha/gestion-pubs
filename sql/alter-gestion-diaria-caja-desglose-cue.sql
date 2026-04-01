alter table public.gestion_diaria_caja
  add column if not exists cue_taquilla_parte_1 numeric(12,2),
  add column if not exists cue_taquilla_parte_2 numeric(12,2),
  add column if not exists cue_barra_grande_parte_1 numeric(12,2),
  add column if not exists cue_barra_grande_parte_2 numeric(12,2),
  add column if not exists cue_barra_pequena_parte_1 numeric(12,2),
  add column if not exists cue_barra_pequena_parte_2 numeric(12,2);
