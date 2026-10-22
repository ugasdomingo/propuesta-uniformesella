/goal Implementa completamente PLAN-2.md para convertir «Hacer un pedido» en la experiencia principal de Uniformes Ellas, incorporar comparador y estadísticas fiables de más pedidos e integrar un asistente real con la API de OpenAI para visitantes y administradores. Entrega todo revisado en main local, sin push ni despliegue.

CONTEXTO

Trabaja en:
C:\Users\Usuario\Programación\Propuestas\propuesta-uniformesella

Lee primero:
- PLAN-2.md, alcance y criterios de aceptación de esta fase.
- PLAN.md, requisitos originales que siguen vigentes.
- README.md, PROGRESS.md, docs/CATALOGO.md y docs/VERIFICACION.md.
- C:\Users\Usuario\Downloads\CLAUDE.md, como guía de simplicidad. La instrucción expresa de no escribir tests prevalece sobre sus ejemplos.

Parte de la implementación existente; inspecciona rama y cambios locales antes de editar. No reconstruyas la aplicación ni pierdas datos o selecciones previas. Conserva MongoDB persistente, catálogo completo revisado, idempotencia, snapshots, adjuntos privados, sesiones, permisos, protección CSRF, cola durable de correo y noindex de la demo.

AUTORIZACIÓN Y LÍMITES

- Implementa todo el plan y verifica su funcionamiento; no te detengas en un scaffold o una maqueta.
- Antes de cualquier implementación de la integración OpenAI, aplica el flujo seguro de credenciales disponible: comprueba únicamente presencia, pregunta si reutilizar o crear clave y espera esa decisión. Nunca imprimas claves ni me pidas pegarlas en el chat. Si hace falta escribir una clave, confirma su destino privado mediante el flujo seguro.
- El nombre del modelo no está fijado. Verifica documentación oficial y disponibilidad al implementar; elige uno compatible con herramientas y extracción estructurada, y visión para capturas. Documenta modelo, límites y estimación de coste; usa configuración privada del servidor.
- No hagas push, despliegues, cambios en la tienda real ni conexiones a WhatsApp/Instagram/correo. El usuario desplegará manualmente. El correo real se configurará al desplegar; conservar estado honesto mientras falte configuración. La hoja QR queda para después de recibir la URL pública estable.
- No escribas tests unitarios, integración o E2E ni instales frameworks de testing. Usa tipos, build, auditorías de datos y revisión manual de navegador.
- No resetees la base ni borres solicitudes para facilitar el trabajo. Las migraciones serán acotadas, repetibles y documentadas; conserva snapshots históricos.

REQUISITOS DE PRODUCTO

1. Hacer un pedido

Sustituye «Mi selección» en la navegación por «Hacer un pedido», con ruta /hacer-pedido y redirección compatible desde /seleccion. Mantén las líneas persistidas existentes. Título: «Viste a tu equipo. En un solo pedido.»

El usuario debe empezar con un buscador que ofrece sugerencias al escribir; elegir prenda; después color; después tallas válidas y cantidad por talla; añadir y continuar con otro color o referencia sin salir de la página. Presenta líneas agrupadas y editables, contador de prendas y resumen claro. Usa los mismos controles y reglas en ficha y captura administrativa donde corresponda.

Diseño minimalista y cuidado, móvil primero y accesible con teclado; revelado progresivo de opciones. Evita perder cantidades al cambiar color/producto, truncar cantidades silenciosamente o mostrar un formulario enorme antes de elegir prendas. El envío mantiene presupuesto/pedido pendiente de confirmación, sin registro ni pago online, validación completa e idempotencia.

2. Comparador

Compara dos o tres referencias, dando prioridad a gramaje y composición, y después atributos técnicos verificados, tallas/colores y popularidad real. No inventes datos ausentes, medias de intervalos, certificaciones o un ganador por mayor gramaje. Respeta excepciones por color y permite consultar fuentes. Usa /comparar con referencias validadas en URL y selección persistida; elegir una prenda abre el constructor sin borrar el pedido.

3. Más pedidos

Implementa la métrica exacta de PLAN-2.md: pedidos distintos confirmados durante 90 días, una aparición por referencia y pedido; unidades como dato secundario. Excluye ejemplos, comprobaciones, presupuestos, pendientes, borradores, duplicados y cancelados. Conversión y cambios repetidos no incrementan artificialmente el resultado.

Añade procedencia, entorno, clasificación sintética y primera confirmación comercial. Migra lo existente como demo, incluida la comprobación manual documentada; no inventes historial real. Muestra el ranking en Home y comparador cuando haya datos reales; si no, usa selección editorial y ausencia de historial claramente identificadas. Deriva recuentos de los pedidos canónicos, con caché breve e invalidación, sin exponer datos de clientes.

4. Asesor público con OpenAI real

Integra desde Express el SDK oficial y Responses API con herramientas acotadas y contratos estrictos. Consulta catálogo revisado, comparación, preguntas frecuentes aprobadas y métricas públicas. Sugiere referencias existentes con acciones para configurar o comparar; pide aclaraciones. No inventa precio, stock o plazos ni tiene acceso al panel. Proponer variantes no equivale a enviarlas: el usuario confirma con controles visibles y validación.

Mantén clave y herramientas en servidor, contexto acotado, cuotas persistentes, límites de turnos/tokens/tiempo, estados honestos y flujo manual utilizable si OpenAI falla. No simules respuestas para aparentar una integración funcional.

5. Asistente privado y entrada de otros canales

El administrador puede buscar/resumir solicitudes, preparar notas/cambios y crear borradores desde texto pegado o capturas privadas de WhatsApp, Instagram o correo. No conectes esas cuentas ni envíes respuestas por esos canales.

Extrae datos con esquema estructurado, evidencia del mensaje, candidatos y campos pendientes; nunca inventes referencia, color, talla, contacto o consentimiento web. El borrador es editable e incompleto hasta revisión; crear solicitud exige validación común del dominio, snapshot, procedencia e idempotencia. Detecta posibles duplicados sin fusionar pedidos automáticamente.

Los cambios persistentes y avisos por correo requieren una revisión concreta y confirmación visible del administrador. Autoriza en cada endpoint/herramienta, con rol desde sesión del servidor, CSRF, versión y acción de un solo uso ligada al contenido revisado. No confíes en un mensaje del modelo como confirmación. Registra propuesta, confirmante y cambios. Contenido importado y argumentos del modelo son datos no confiables.

Minimiza datos enviados a OpenAI, informa del procesamiento y aplica retención/limpieza explícitas a conversaciones, capturas y borradores. No expongas historial privado por IDs elegidos por el cliente ni guardes contactos o tokens de logos en localStorage.

VERIFICACIÓN Y CIERRE

- Ejecuta npm run typecheck, npm run catalog:audit y npm run build; resuelve fallos.
- Realiza todos los recorridos manuales de PLAN-2.md en navegador de escritorio y móvil, incluidos constructor vacío, varias referencias/colores/tallas, errores de cantidades, comparación con desconocidos, composición por color y migración del carrito.
- Verifica recuentos de ranking con datos de comprobación separados y marcados, cambios repetidos y cancelaciones, sin contaminar métricas reales ni enviar correo por la semilla.
- Comprueba el asesor con llamadas reales autorizadas a OpenAI y registra evidencia sin secretos. Comprueba borrador ambiguo, captura ilegible, campos faltantes, confirmación/reintento sin duplicados, permisos, contenido malicioso, concurrencia y fallo de proveedor/cuota.
- Verifica persistencia tras reinicio, aislamiento de sesiones, privacidad de adjuntos y continuidad del recorrido manual cuando la IA no está disponible.
- Actualiza documentación de arranque, configuración, privacidad, límites/costes, migraciones y evidencia visual/manual. Distingue comprobado, implementado pendiente de acceso y tareas externas. No afirmes que correo, OpenAI o despliegue funcionan sin verificarlos.
- Guarda los cambios revisados en main local mediante commit, sin push, preservando trabajo ajeno. Entrega hash, acceso local, instrucciones privadas y resumen de verificaciones y dependencias pendientes.

No marques la meta completada si falta algún requisito de esta fase. Si una dependencia externa impide verificar algo, explica el bloqueo concreto y conserva el avance verificable; no lo sustituyas por resultados simulados.
