# Verificación local — 22 de octubre de 2026

Revisión manual en navegador de la aplicación contra Express y un mongod real con WiredTiger y archivos persistentes en `.local/mongodb`. No se han escrito tests unitarios, de integración o E2E ni instalado frameworks de testing.

## Catálogo y compilación

- `npm run catalog:audit`: 201 entradas del directorio, 197 referencias, 1.912 colores, 11.067 variantes y 732 imágenes comprobadas. Sin referencias faltantes o sobrantes, fichas sin revisar ni fallos.
- `npm run typecheck`: contratos compartidos, API y Nuxt con tipos estrictos.
- `npm run build`: auditoría, paquetes compartidos, Express y Nuxt/Nitro.
- La revisión de catálogo contrasta las fichas del PDF, códigos y restricciones de talla/color; las huellas en `review-ledger.json` invalidan la revisión si cambian los datos críticos.

## Recorrido manual

1. Inicio, búsqueda de JT150 y ficha con fotografías, guía y colores. AZ no admite 4XL/5XL; WH y otros colores válidos sí. Se añadieron varias tallas y colores en una operación.
2. Se añadió JTPOLO y se conservó la selección al navegar y recargar: cinco líneas y 13 prendas en total.
3. Se cargó un logo PNG, se rellenaron datos ficticios y se envió una solicitud de presupuesto. La confirmación mostró **UE-2026-0309682444**. La solicitud y el logo quedaron guardados en MongoDB.
4. El panel exigió acceso, mostró los 20 ejemplos diferenciados y permitió localizar la solicitud adicional. Se abrió el logo autenticado, se añadió una nota y se cambió el estado.
5. Se guardó una propuesta de **166,98 €**, expresamente ficticia: camisetas a 8 €, polos a 15 €, personalización 20 € e IVA 21 %. No constituye una tarifa del negocio. Se registró aceptación y se convirtió a pedido pendiente de confirmación, conservando número, propuesta e historial.
6. Se corrigió y volvió a comprobar un fallo de conversión de valores numéricos al guardar propuestas. El cálculo del importe definitivo se realiza en servidor.
7. Se revisaron escritorio de 1440 × 900 y móvil de 390 × 844. El filtro WORKWEAR devolvió 45 prendas. Sin desbordamiento horizontal en el catálogo móvil.
8. Consultas sin cookies a `/api/admin/requests` y al logo privado devolvieron **401**. El logo se abrió correctamente desde una sesión del equipo.
9. Tras detener y reiniciar MongoDB con el mismo directorio, se arrancaron los builds finales de Express y Nuxt. Se recuperaron la sesión del empleado, la solicitud, sus 13 prendas, la propuesta de 166,98 €, el historial y el logo privado de GridFS.

Las claves de idempotencia y el índice único protegen el envío en servidor; el botón también bloquea envíos mientras guarda. El recorrido dejó una solicitud y dos trabajos de correo, sin afirmar una prueba de concurrencia bajo carga.

## Evidencia visual

- [Inicio en escritorio](../output/verification/portada-escritorio.png)
- [Inicio en móvil](../output/verification/portada-movil.png)
- [Catálogo filtrado en móvil](../output/verification/catalogo-movil.png)
- [Confirmación](../output/verification/confirmacion.png)
- [Solicitud gestionada](../output/verification/panel-solicitud.png)

Las capturas del panel contienen únicamente datos ficticios introducidos durante esta revisión. Credenciales, `.env`, base local, OCR temporal y binarios quedan fuera de Git.

## Límites de la entrega

El proveedor de correo sigue **sin configurar**, con cero intentos de envío. La cola y el panel muestran el estado real; no hay recepción acreditada. Para cerrarlo hay que configurar `EMAIL_FROM` y `EMAIL_API_KEY`, reiniciar la API y comprobar el buzón de desarrollo.

El usuario ha solicitado hacer el push y desplegar manualmente. No hay URL pública verificada, comprobación de backups del alojamiento, medición pública de Core Web Vitals ni prueba en un teléfono físico. La revisión móvil usa el viewport del navegador. Docker/Railway/Vercel están preparados y documentados, pero sus despliegues no se han ejecutado en esta entrega. La hoja imprimible con QR se prepara después de recibir la URL estable.
La ampliación posterior se documenta en [Verificación del Plan 2](PLAN-2-VERIFICACION.md). Este documento conserva la evidencia de la primera entrega.
