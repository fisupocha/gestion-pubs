# Mercaderías y escandallos: primera pantalla

Ruta `/mercaderias-escandallos`, acceso independiente en el menú del administrador.
Instalación y publicación autorizadas expresamente el 29/10/2026.
La tabla independiente está instalada en gestion-pubs (dzxlvaeagtwgvprzwarq),
sin carga histórica. La extracción y validación del ZIP siguen pendientes.

La vista inicial es Riverocio completo, de 01/01/2026 a 31/08/2026. El selector
de locales se obtiene de las líneas cargadas. Sin asignar cuenta solo en el total
de Riverocio. Los formatos y variantes distintos no se fusionan por semejanza.

Los importes son céntimos documentales con IVA, netos de descuentos. Se suman antes
de dividir: precio medio comprado = importe / compradas; coste real = importe /
(compradas + bonificadas). Solo se redondea la presentación a dos decimales.
Orden descendente por unidades compradas. El detalle conserva proveedor, factura,
fecha, albarán, página y línea. No almacena PDF ni escribe en otros módulos.

El ZIP Reyes Magos contiene 23 PDF escaneados, 75 páginas, enero–agosto de 2026.
Solo está inventariado y muestreado: NO se ha extraído y validado el conjunto.
No publicar un acumulado definitivo basado en la muestra. Confirmar formatos no
indicados y asociar bonificaciones al producto correcto antes de validar líneas.
Las líneas pendientes quedan fuera del cálculo con un aviso de provisionalidad.
Cuadrar los importes con IVA de las líneas con los totales documentales al cargar;
no reconstruirlos multiplicando el precio unitario impreso ya redondeado.

Instalación aplicada: `sql/mercaderias-escandallos/001-LINEAS-NO-EJECUTAR.sql`.
SHA-256: `9020B310882D2C05F3DF2C0F8B03674EBE44BAA4D35889209644B5E612680D40`.
Solo crea `mercaderias_lineas`; RLS con lectura de administradores y sin permisos
de escritura para sesiones del navegador. No ejecutar sin autorización de la
instalación en el destino verificado. Reversión antes de cargar: retirar solo esa
tabla, sin CASCADE. Después de cargar, exportar y verificar el contenido primero.

Verificado: seis pruebas de cálculo, TypeScript/build en copia limpia sin secretos,
ESLint, SQL local con datos ficticios (lectura por rol, escritura denegada y unicidad),
pantalla en navegador con sesión local real. La comprobación publicada requiere
verificar el despliegue y abrir la ruta con sesión autenticada.
