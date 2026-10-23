# Registro de implementación

## Alcance vigente — 22/10/2026

El usuario ha pospuesto Vercel y Railway: entregar todo en `main` local, sin push. El usuario hará push y despliegue manual y comunicará la URL para preparar después la hoja con QR. No publicar ni modificar la web actual. La entrega local no equivale a correo recibido ni a verificación pública.

## Progreso

- Leídos PLAN.md, la guía CLAUDE.md y la petición completa.
- Repositorio inicial: README y PLAN, sin aplicación; rama actual `main`.
- PDF: 115 páginas digitales, texto trazado sin capa extraíble; fotografías independientes disponibles. OCR local de Windows disponible en español.
- Plugin Vercel requiere reautenticación; hay configuración CLI local, no se han utilizado credenciales ni realizado despliegues.
- Instrucción expresa: sin tests ni frameworks de testing. Verificar tipos, build, conciliación y navegación manual.

## Decisiones

- Mantener MEVN estricto: Nuxt/Vue, API Express independiente y MongoDB persistente.
- Catálogo como datos versionados con procedencia y revisión; importación idempotente por referencia.
- No inventar precios, stock ni características. Correos mediante proveedor real configurado, nunca simulados.

## Entrega local

- Implementación local completada: OCR e inventario conciliado, fotografías, web Nuxt, API Express, persistencia MongoDB, sesiones, adjuntos privados, solicitudes, panel y cola de correo con reintentos.
- Catálogo: 197 referencias, 1.912 colores, 11.067 variantes y 732 imágenes comprobadas; auditoría sin fallos ni fichas pendientes de revisión.
- Recorrido manual: selección de 13 prendas de dos referencias y varios colores/tallas, logo privado, solicitud UE-2026-0309682444, nota, propuesta ficticia de 166,98 €, aceptación y conversión en pedido conservando el número.
- Veinte solicitudes ficticias diferenciadas. Ninguna genera correo. El recorrido manual adicional conserva sus datos en la base local, excluida de Git.
- Evidencia, comprobaciones y límites: `docs/VERIFICACION.md`. Operación y despliegue: `README.md` y `docs/DESPLIEGUE.md`.
- Tipos y build final correctos. Reiniciados MongoDB, Express y Nuxt: se conservan sesión, solicitud, adjunto, propuesta e historial. Demo local disponible en `http://localhost:3000`.

## Pendiente externo

Plan 2 implementado: constructor de pedidos, comparador técnico por color, estadísticas de pedidos confirmados y asistentes OpenAI público/privado. El usuario guardó la clave en el entorno privado; se verificaron llamadas reales de texto, herramientas y visión. Recorridos completos, permisos, reintentos, concurrencia, ranking separado y persistencia documentados en `docs/PLAN-2-VERIFICACION.md`. Catálogo y solicitudes anteriores conservados. El usuario ha confirmado que configurará el correo con el despliegue.

- Correo real: pendiente de acceso a proveedor y remitente verificado.
- Despliegues públicos, comprobación pública y QR: pospuestos por el usuario.


## Preparación del despliegue y Atlas — 23/10/2026

- El usuario realizará el push y los despliegues manualmente. Remoto GitHub existente, rama main; ninguna publicación desde el chat.
- Atlas sustituye al servicio MongoDB de Railway. URI guardada por el usuario en `.env`, excluida de Git. Conexión e inicialización reales: 197 productos, 20 ejemplos y 1 administrador; sin trabajos de correo. Preparación repetida conserva el administrador y los recuentos.
- API compilada conectada a Atlas: `/health` 200 y búsqueda JT150 200. Servidor de comprobación temporal detenido después de revisar.
- Node 24 fijado, configuración Vercel en `apps/web/vercel.json`, función Nitro de 90 segundos y Docker con los manifests/tsconfig necesarios para scripts. Railway incluye comprobación e inicialización idempotente, una réplica y proceso activo para correo.
- Instalación limpia del lockfile sin `.env`, tipos de la aplicación y scripts, auditoría, build completo y preset Vercel comprobados con Node 24.22.1. Los bloqueos de archivos generados del entorno restringido se resolvieron al compilar con ejecución local autorizada. Salida Vercel: nodejs24.x, función de 90 segundos. La imagen Docker queda para el build de Railway; no hay Docker instalado en este equipo.
- Guía actual: `docs/EMPEZAR-DESPLIEGUE.md`; variables de cada plataforma en `deploy/`, sin valores privados. Correo real, URLs públicas y QR pendientes del despliegue del usuario.


## Cuentas de administrador y comprador — 23/10/2026

- Administrador existente conservado en Atlas y comprador de demostración creado. Credenciales en `.local/USUARIOS-DEMO.md`, excluido de Git. `users:demo` repetido conserva contraseñas, sesiones y ejemplo.
- Portal `/mi-cuenta` con login, lista y detalle de solicitudes propias. Nuevos pedidos autenticados vinculados por identificador; capturas administrativas vinculadas por email de una cuenta activa. Pedidos anónimos conservan el flujo sin registro.
- Permisos de servidor separados: comprador sin panel ni asistente privado, ni pedidos/logos ajenos. DTO de cliente sin eventos, metadatos de captura ni claves internas; páginas privadas con no-store y CSRF en escrituras autenticadas.
- Tres solicitudes ficticias propias para revisar: semilla, pedido web con logo y captura WhatsApp. Cero emails. Base Atlas actual: 197 productos, 23 solicitudes y 2 cuentas activas.
- Login, denegaciones, idempotencia, pertenencia, descarga de logo y renderizado SSR comprobados; tipos, auditoría, build completo y preset Vercel correctos. Navegador integrado no disponible para revisión visual en este turno. Detalle: `docs/USUARIOS.md`.
- Entrega en main local, sin push ni despliegue.
