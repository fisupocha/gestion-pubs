# Conexión de costes y escandallos

Implementación del 29/10/2026. No modifica tablas, facturas ni condiciones comerciales existentes.

## Recorrido implementado

- mercaderias_lineas validadas y catálogos privados existentes -> conectarCompras -> costePeriodo -> calcularServicio.
- Misma clave normalizada producto + formato para catálogo, coste, receta, precio y ajuste. No fusionar capacidades diferentes por semejanza.
- Lista de precios y escandallos leen el mismo conjunto de precios vigentes. El botón Actualizar relee las líneas y refresca los datos privados del servidor.
- El año determina el periodo de compras. Abonos asignados a una referencia y periodo revisan ese periodo, aunque recibido sea posterior. El reparto mensual se pondera por unidades originales del periodo del abono, no por fecha de recepción ni por el importe completo en cada mes.
- Regalos en líneas de factura aumentan las unidades recibidas, sin reducir el escenario tarifa. Ajustes de regalos de periodo más amplio requieren seleccionar su periodo completo.
- Copa = 7 cl + mezclador confirmado; chupito = 5 cl; botella/unidad = unidad completa. No inferir 70 cl para formatos sin documentar. Sin mezclador no hay coste completo de copa.
- Tarifa se calcula con importes brutos documentados / unidades pagadas. Reyes Magos solo conserva netos: su tarifa queda pendiente.
- Costes conocidos de muestras Coca-Cola, La Bajada y Rojas se identifican como pruebas. No se presentan como cierre definitivo de compras.
- Márgenes con IVA, antes de gastos generales y consumibles no incorporados. Precio vigente a la fecha de referencia frente al coste anual revisado; no es margen histórico realizado si hubo distintos precios de venta.

## Datos privados preparados para enlazar

Objeto opcional del bucket privado operativa-adjuntos:
mercaderias-escandallos/escandallos/configuracion-v1.json

Estructura ConfiguracionEscandallo en escandallo.ts: version 1, ajustes, precios, recetas.
No publicar datos comerciales en Git. Lectura con la sesión normal y rol admin ya exigidos por la página. Sin service_role ni ampliación de permisos.

- ajustes: id único, documento, recibido, desde/hasta de efecto, clave de referencia, abonoCentimos con IVA y regaladas. Importes por referencia previamente documentados: no asignar un acuerdo de marca automáticamente a productos no confirmados. No volver a cargar descuentos ya incluidos en el neto o representados en las compras.
- precios: id, clave, formato de venta, desde/hasta de vigencia, centimos. No se admiten solapamientos por referencia/formato.
- recetas: clave, capacidadCl confirmada y mezclador con clave/unidades para copas.

Ausencia del objeto = pendientes explícitos; error de permisos o configuración inválida = error visible, sin cálculos parciales.
Este cambio solo añade lectura y cálculo: no ofrece un formulario de edición ni modifica objetos privados. Antes de añadir edición persistente deben conservarse versiones del documento de configuración y su origen; no sobrescribir el historial.

## Pendiente que no se debe declarar resuelto

No existe extracción automática de artículos de Facturas Recibidas hacia mercaderias_lineas. Guardar un PDF no carga sus productos en este módulo. Hace falta incorporar las líneas revisadas una vez con su procedencia, idempotencia y autorización. No se ha creado un acceso de escritura ni una migración para ello.

No se ha cargado ningún precio de venta, receta, acuerdo ni abono nuevo. El cálculo está conectado a las compras disponibles y preparado para esas entradas documentadas; no equivale a que toda la captura de documentos esté automatizada. No hay un historial de precios persistido hasta incorporar sus entradas de vigencia. No crear ajustes de abonos sin documento y reparto aprobados.
