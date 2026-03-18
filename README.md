# gestion-pubs

Aplicacion Next.js para gestion operativa, maestros y consultas del grupo.

Estado de referencia: 18/03/2026

## Stack

- Next.js 16
- React 19
- TypeScript
- Supabase
- Tesseract.js para lectura de facturas

## Modulos principales

- Operativa:
  `Facturas recibidas`, `Facturas emitidas`, `Alquileres`, `Gastos bancarios`, `Creditos`, `Impuestos`, `Personal`, `Caja`, `Notas varias`
- Maestros:
  `Tipos/Fam/Sub`, `Proveedores`, `Clientes`, `Maestros varios`
- Consultas:
  vista principal `/consultas` y detalle `/consultas/detalle`

## Persistencia

- Maestros persistidos en Supabase
- Operativa persistida en tablas `operativa_*`
- Consultas leen operativa real desde BBDD, sin arrays de prueba

Archivo clave de operativa:

- `src/modules/operativa/utils/persistencia-operativa.ts`

Archivos clave de consultas:

- `src/modules/consultas/utils/cargar-operativa-consultas.ts`
- `src/modules/consultas/utils/motor-consultas.ts`
- `src/modules/consultas/utils/estado-consultas.ts`

## Variables de entorno

La aplicacion necesita estas variables publicas para crear el cliente de Supabase:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Si faltan, la app lanza error al inicializar `src/lib/supabase.ts`.

## Arranque local

```bash
npm install
npm run dev
```

## Validacion recomendada

```bash
npm run verify
```

Equivale a:

- `npm run lint`
- `npm run typecheck`
- `npm run build`

## SQL base de operativa

Estos scripts son la base si hay que reconstruir la parte operativa en Supabase:

- `sql/crear-operativa-formularios.sql`
- `sql/activar-operativa-formularios.sql`

## Regla clave de consultas

- `Caja` es el ingreso base real
- `Facturas emitidas` de `Caja` no duplican ingresos
- El resto de `Facturas emitidas` compensa gasto en su misma clasificacion
- `Riverocio` se trata como `Empresa`
- Sin filtro de locales: `Riverocio` aparece como bloque propio
- Con locales operativos seleccionados: los gastos de `Riverocio` se reparten por caja entre los locales elegidos

## Checklist rapido de deploy

1. Confirmar que la rama a desplegar contiene los cambios validados.
2. Configurar en el proveedor de hosting las variables:
   `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Verificar que en Supabase ya estan ejecutados:
   `sql/crear-operativa-formularios.sql` y `sql/activar-operativa-formularios.sql`.
4. Ejecutar `npm run verify`.
5. Desplegar.

## Rutas principales

- `/facturas-recibidas`
- `/facturas-emitidas`
- `/alquileres`
- `/gastos-bancarios`
- `/creditos`
- `/impuestos`
- `/personal`
- `/caja`
- `/notas-varias`
- `/consultas`
- `/consultas/detalle`
- `/maestros/proveedores`
- `/maestros/clientes`
- `/maestros/clasificacion`
- `/maestros/varios`
