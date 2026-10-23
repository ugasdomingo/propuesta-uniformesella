# Operación del constructor, comparador y asistentes

La aplicación se entrega en `main` local. El usuario hará push y desplegará manualmente; el correo y la hoja QR conservan las decisiones de la primera entrega. Este documento amplía `README.md` y `docs/DESPLIEGUE.md`.

## Uso

- **Hacer un pedido:** `/hacer-pedido`. Escribe una prenda o referencia; elige color y cantidades por talla. Añade otro color o referencia sin salir. Revisa, personaliza y envía al terminar. El pedido sigue sujeto a confirmación comercial.
- **Comparar:** `/comparar?refs=JT150,TSRA150,TSRA190`. Hasta tres prendas. Gramajes desconocidos e intervalos se muestran tal cual; la composición cambia con el color cuando la fuente indica una excepción. El botón Elegir conserva el pedido.
- **Asesor público:** lanzador «¿Te ayudo a elegir?». Solo catálogo, información aprobada, comparaciones y ranking agregado. No puede consultar solicitudes privadas ni enviarlas.
- **Asistente administrativo:** `/admin/asistente`, con rol administrador. Entrada de WhatsApp/Instagram/correo por texto pegado o captura, sin conectar cuentas externas. El contenido se interpreta en un borrador que hay que revisar. Los cambios del chat también muestran revisión y botón de confirmación.
- Un empleado con rol `staff` puede usar el panel habitual conforme a sus permisos existentes, pero no el asistente de gestión.

En el constructor, vacío equivale a cero mientras configuras. Una línea ya añadida debe tener al menos una unidad; para retirarla se elimina el grupo o se corrige el reparto. No se truncan cantidades silenciosamente. Cada variante admite hasta 10.000 unidades, con 250 variantes y 100.000 prendas por solicitud.

## Base de datos Atlas

Desde el 23/10/2026, el entorno del usuario usa MongoDB Atlas mediante `MONGODB_URI` en el `.env` privado. Configura la misma base en la API de Railway; Vercel solo recibe la URL HTTPS de la API. Atlas conserva también GridFS, sesiones, borradores, cuotas y cola de correo. No hace falta iniciar MongoDB local ni desplegar otro servicio de base de datos.

`npm run db:check` comprueba conexión y recuentos sin mostrar la URI ni modificar datos. Exige una base exclusiva, distinta de las bases de sistema o `test`. `npm run deploy:prepare` encadena esa comprobación, importación del catálogo, semilla idempotente y creación del administrador con `--if-missing`: conserva contraseña, permisos y sesiones existentes. El `railway.json` ya incluye este paso previo al arranque. Las migraciones históricas siguen siendo manuales.

## Instalación y migración

Usar Node 24.15+ de la rama 24 y `npm ci`. La API carga `.env` en la raíz; Nuxt mantiene su configuración propia y nunca recibe claves privadas mediante `NUXT_PUBLIC_*`.

La migración de metadatos es manual y repetible:

```powershell
npm run db:migrate:plan2
npm run db:migrate:plan2 -- --apply
```

El primer comando muestra recuentos sin escribir. El segundo clasifica el histórico de la demo, marca ejemplos y la comprobación de la primera entrega, y conserva snapshots, importes e historial. Si encuentra registros históricos sin clasificar fuera del modo demo, se detiene para evitar interpretar ventas reales automáticamente. No llena fechas comerciales desconocidas con fechas inventadas.

Los registros nuevos reciben canal y entorno desde servidor. Las comprobaciones manuales adicionales se marcaron individualmente como sintéticas. La base local no se sube a Git ni se copia al despliegue.

El navegador migra `ellas-selection-v1` a `ellas-order-v2` conservando las variantes válidas. El formato nuevo guarda también borradores de prendas y una comparación separada. No almacena contacto, mensajes privados, contraseñas ni tokens de logos en localStorage. Los datos del formulario permanecen en memoria al pasar entre añadir y revisar dentro de la página; no se promete conservar contacto después de cerrar o recargar la pestaña.

## OpenAI

La clave introducida por el usuario está en `.env`, excluido de Git. En Railway configurar las variables solo en la **API Express**. El frontend no necesita acceso a ellas.

| Variable | Valor por defecto / propósito |
| --- | --- |
| `OPENAI_API_KEY` | Clave privada del proyecto OpenAI |
| `OPENAI_MODEL` | `gpt-5.4-mini-2026-03-17` |
| `OPENAI_VISION_MODEL` | `gpt-5.4-mini-2026-03-17` |
| `AI_DAILY_CALL_LIMIT` | 200 intentos de llamada API al día, compartidos; 0 desactiva llamadas |
| `AI_SESSION_DAILY_LIMIT` | 20 llamadas por identidad pública; administrador e IP usan como mínimo 60 |
| `AI_MAX_OUTPUT_TOKENS` | 1.800 tokens de salida por llamada, incluyendo razonamiento cuando corresponda |
| `AI_TIMEOUT_MS` | 30.000 ms por llamada; el chat limita además la duración del turno |

Una conversación puede necesitar varias llamadas para consultar herramientas. Los contadores son reservas atómicas en MongoDB; no se reinician al reiniciar Express. Los intentos fallidos pueden consumir cupo. También hay límites por IP, tamaño de entrada y hasta ocho llamadas de herramienta por turno, sin ejecución de código ni consultas arbitrarias a la base.

La API usa el SDK oficial, Responses API, funciones con esquema estricto y salidas estructuradas para extracción. Se ha fijado el snapshot para evitar cambios silenciosos de alias; ambos modelos son configurables. La clave de esta cuenta permitió listar el modelo y completar solicitudes reales de texto, herramientas y visión. [Capacidades y precio del modelo](https://developers.openai.com/api/docs/models/gpt-5.4-mini), [funciones](https://developers.openai.com/api/docs/guides/function-calling), [salidas estructuradas](https://developers.openai.com/api/docs/guides/structured-outputs).

Precio publicado consultado el 22/10/2026: 0,75 USD por millón de tokens de entrada, 0,075 USD de entrada cacheada y 4,50 USD de salida. Una comparación observada usó 1.360 tokens de entrada y 240 de salida en dos llamadas: aproximadamente 0,0021 USD sin descontar caché. Es una muestra, no un precio fijo por conversación ni una garantía de facturación. Las imágenes y los turnos más largos cambian el consumo. Consultar el panel del proveedor para importes reales, incluidos intentos que terminan en timeout.

Las cuotas de llamadas y tokens de salida no constituyen un límite exacto en euros. Ajustar los controles de uso del proyecto y estas variables según el volumen previsto. `GET /api/admin/assistant/usage`, solo para administradores, muestra contadores agregados y tokens devueltos por el proveedor. Logs `ai_usage` y `ai_error` incluyen perfil, modelo, consumo conocido, estado y duración; no contienen claves, conversaciones completas ni contactos.

## Privacidad y revisión humana

Las herramientas públicas y privadas se autorizan en servidor. El rol procede de la base, no del navegador ni de una frase del chat. Cada cambio requiere sesión vigente, administrador, origen exacto, CSRF, una propuesta de un solo uso, caducidad y versión del recurso.

Las acciones caducan a los diez minutos; repetir una confirmación completada dentro de su vigencia devuelve su resultado. Un borrador tiene una clave estable de creación para impedir solicitudes duplicadas incluso al recuperar una interrupción. La revisión se invalida si el borrador cambia. La trazabilidad de los cambios asistidos se incorpora al historial de la solicitud, además de la propuesta temporal.

Los borradores pueden estar incompletos, pero no se convierten en solicitud hasta resolver dudas, validar contacto y variantes y revisar coincidencias. Las entradas de otros canales registran procedencia y cómo se obtuvieron los datos; no falsifican la casilla de privacidad de la web. Los emails de una importación se envían únicamente si se autorizaron al crear la solicitud; guardar o interpretar no envía nada.

Las capturas PNG/JPG/WebP de hasta 3 MB se validan por firma, decodifican con límite de píxeles, normalizan y procesan en memoria. No se conservan como blobs. Los borradores y su evidencia textual son privados de la cuenta, con caducidad a 30 días; el texto fuente se retira cuando se vincula la solicitud. Los registros comerciales mantienen su snapshot e historial.

Las conversaciones de la aplicación caducan a las 24 horas y los contadores pseudonimizados a las 72 horas. Las cookies del asesor son HttpOnly, SameSite=Lax y Secure en producción. Se utiliza `store:false` en OpenAI; esto no equivale a retención cero de todos los datos por parte del proveedor. Revisar [sus controles de datos](https://developers.openai.com/api/docs/guides/your-data) y la política definitiva antes de abrir comercialmente.

## Más pedidos

La frecuencia pública cuenta pedidos distintos confirmados durante 90 días, una vez por referencia. Unidades es la suma separada de cantidades. Se excluyen presupuestos, pendientes, cancelados, borradores, ejemplos, comprobaciones y registros de entorno demo.

La primera fecha de confirmación no cambia al volver a guardar un estado. Convertir un presupuesto mantiene el mismo documento; no crea otra venta ni cuenta hasta confirmar comercialmente. Los recuentos se derivan de las solicitudes canónicas y se cachean un minuto, con invalidación al modificar estados relevantes.

La demo local no contiene ventas reales. Por eso el Home muestra **Selección del equipo** y el comparador **Sin historial real suficiente**. No se usan ejemplos para aparentar popularidad real. Hay tres casos de estadísticas separados, `DEMO-PLAN2-RANK-A/B/C`, creados durante la revisión y marcados ficticios; no se incluyen en métricas públicas.

## Catálogo comparable

`data/catalog/technical.json` registra valores derivados del catálogo revisado y composiciones por color. No es una nueva fuente comercial ni usa IA. Incluye gramajes explícitos o desconocidos, porcentajes y excepciones, descripciones y enlaces a fuentes. Las excepciones de Flúor/Heather se aplican solo a los grupos explícitos de la ficha, con prioridad a códigos y grupos más específicos.

```powershell
npm run catalog:audit
# Solo después de revisar cambios en datos o reglas de derivación:
npm run catalog:technical
npm run catalog:audit
```

La auditoría comprueba la huella de la ficha y el registro técnico base y por color. No regenerar este registro solo para silenciar una discrepancia. Los snapshots existentes nunca se reescriben al actualizar el catálogo.

## Incidencias

- Sin clave: el asesor informa de que no está configurado; constructor y comparador continúan disponibles.
- Cuota agotada: 429; seguir el flujo manual o esperar al día siguiente UTC.
- Timeout/proveedor no disponible: conservar texto y borrador, permitir reintento; no simular éxito.
- Versión cambiada: 409; recargar, revisar diferencias y preparar una nueva propuesta.
- Sesión caducada: volver a entrar. Las solicitudes y los borradores guardados permanecen en MongoDB.
- El correo sigue su cola y configuración independientes de OpenAI. Su entrega real se comprobará al desplegar, como pidió el usuario.

Ver evidencia y límites en [PLAN-2-VERIFICACION.md](PLAN-2-VERIFICACION.md).
