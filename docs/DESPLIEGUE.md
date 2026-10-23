# Despliegue manual de la demo

No se ha publicado nada desde este chat. El usuario hará push de `main` y desplegará manualmente. No reutilizar ni modificar el proyecto o dominio de la tienda actual. Para empezar, sigue [Del push a la demo pública](EMPEZAR-DESPLIEGUE.md), con plantillas en `deploy/` y orden de configuración.

## 1. MongoDB Atlas

Usa una base exclusiva de la demo y un usuario Atlas con `readWrite` en esa base. Copia la URI de Connect > Drivers a `MONGODB_URI` del `.env` privado y del servicio API en Railway, indicando el nombre de base antes de los parámetros `?`. No la publiques ni uses `NUXT_PUBLIC_*`.

La lista de IP permitidas de Atlas debe incluir el origen de tu equipo para desarrollo y el de la API para el despliegue. Revisa la salida de red de Railway al configurarlo. Conserva autenticación/TLS y configura backups del clúster con una restauración de comprobación.

Los logos usan GridFS por defecto: Atlas conserva solicitudes, usuarios, sesiones, trabajos de correo, adjuntos y borradores. También se admite S3 privado si se completan todas sus variables. No hace falta un servicio MongoDB ni un volumen en Railway. El MongoDB local y `compose.yaml` quedan como alternativa de desarrollo.

## 2. Railway: API Express

Crear un servicio desde este repositorio, con raíz **del repositorio** y `Dockerfile.api`. `railway.json` configura el Dockerfile, `/health` y reinicio por fallo. El Dockerfile compila Express, ejecuta con un usuario sin privilegios y conserva los scripts administrativos para las tareas iniciales. Arranca con `node apps/api/dist/index.js`; Railway proporciona `PORT`.

Configurar variables del servicio, sin guardarlas en Git:

| Variable | Valor / propósito |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONGODB_URI` | URI privada de Atlas con la base exclusiva de esta demo |
| `APP_URL` | URL HTTPS estable del frontend en Vercel, sin ruta |
| `SESSION_SECRET` | Secreto aleatorio de al menos 32 caracteres, distinto del local |
| `DEMO_MODE` | `true` |
| `ORDER_NOTIFICATION_TO` | `ugasdomingo@gmail.com` |
| `EMAIL_REDIRECT_TO` | `ugasdomingo@gmail.com` |
| `EMAIL_FROM` | Remitente verificado de la cuenta Resend |
| `EMAIL_API_KEY` | Clave privada de Resend |
| `OPENAI_API_KEY` | Clave privada de OpenAI, solo en Express |
| `OPENAI_MODEL` | `gpt-5.4-mini-2026-03-17` |
| `OPENAI_VISION_MODEL` | `gpt-5.4-mini-2026-03-17` |
| `DEMO_ADMIN_EMAIL` | Email elegido para el acceso del equipo |
| `DEMO_ADMIN_PASSWORD` | Contraseña aleatoria de al menos 12 caracteres |

Generar un dominio HTTPS de Railway para la API. La API comprueba origen y sesión; no habilitar CORS abierto para evitar el proxy. Mantener **una réplica** en esta demo, ya que los límites de intentos por IP se guardan en memoria del proceso.

Las cuotas de OpenAI, privacidad, retención y migración del histórico se detallan en [Operación del Plan 2](PLAN-2-OPERACION.md). No copiar el `.env` local ni la base de comprobación al alojamiento. Para actualizar una base existente, revisar primero `npm run db:migrate:plan2` y aplicar con `-- --apply` una vez clasificado su histórico.

`railway.json` ya ejecuta automáticamente este comando pre-deploy con las variables del servicio:

```sh
npm run deploy:prepare
```

`deploy:prepare` comprueba la conexión y la base con `db:check`, importa el catálogo, inserta los ejemplos ausentes y ejecuta `admin:create -- --if-missing`. No borra solicitudes ni cambia ejemplos editados, contraseña, permisos o sesiones de un administrador existente. Requiere `DEMO_MODE=true` y las dos variables del administrador; una cuenta existente inactiva o sin rol administrador hace fallar el paso para revisión manual. No aplica migraciones históricas automáticamente. `--env-file-if-exists` permite usar las variables del servicio sin un archivo `.env` en el contenedor. Para cambiar deliberadamente la contraseña, `npm run admin:create` sin `--if-missing` mantiene la operación administrativa anterior y revoca las sesiones.

Puedes ejecutar `npm run db:check` y `npm run deploy:prepare` desde tu equipo con `MONGODB_URI` de Atlas en el `.env` privado. Atlas debe permitir tu conexión y la del servicio API. No copies la URI a un navegador ni a variables públicas.

## 3. Vercel: frontend Nuxt

1. Crear un proyecto **nuevo** desde el repositorio.
2. Root Directory: `apps/web`.
3. Framework: Nuxt. Node: rama **24.x** compatible con Nuxt.
4. Permitir archivos fuera de Root Directory para resolver `packages/shared` y el workspace.
5. `apps/web/vercel.json` fija Install Command: `cd ../.. && npm ci --include=dev`, ejecutado desde `apps/web`. Incluye las herramientas de build aunque el entorno sea producción.
6. El mismo archivo fija Build Command: `npm run build` desde `apps/web`. No configurar un directorio estático manual: usar la salida nativa del preset Vercel. Nitro configura 90 segundos para la función proxy, por encima del límite de turno del asistente.
7. Variables del frontend:

```dotenv
NUXT_API_INTERNAL_URL=https://URL-API-DEMO.up.railway.app
NUXT_PUBLIC_APP_URL=https://URL-ESTABLE-DEMO.vercel.app
NUXT_PUBLIC_DEMO_MODE=true
NITRO_PRESET=vercel
```

MongoDB, OpenAI, Resend, contraseñas y `SESSION_SECRET` pertenecen **solo a Railway**, nunca a `NUXT_PUBLIC_*`. El frontend reenvía `/api/*` hacia Express y mantiene las cookies en el origen del frontend. Configurar `APP_URL` de la API con la URL estable final de Vercel antes de enviar formularios.

Para visitantes con móvil y QR, la URL final tiene que ser accesible sin autenticación del proveedor. Publica el proyecto de demo con el acceso público que hayas elegido para este entorno. La autenticación del panel sigue siendo la de la aplicación.

## 4. Correo real

El destino de prueba no es autorización para usar su dominio como remitente. Verifica un remitente en tu cuenta Resend y configura las dos variables privadas. Todos los mensajes de demo se redirigen al buzón configurado; el historial ficticio no genera trabajos.

Crear una solicitud desde la web, revisar los trabajos en el panel y comprobar **recepción en ugasdomingo@gmail.com**. Registrar el ID del proveedor y el número de solicitud. El estado «Aceptado por el proveedor» solo acredita aceptación de la API, no recepción en el buzón. La [idempotencia de Resend](https://resend.com/changelog/idempotency-keys) evita envíos repetidos dentro de la ventana del proveedor; antes de reintentar manualmente un resultado ambiguo muy antiguo, comprobar su panel.

Sin remitente/clave el estado será «sin configurar». La solicitud permanece guardada. Tras configurar y reiniciar, el worker recupera pendientes; el equipo también dispone de reintento en el panel. No se ha fingido entrega de correo.

## 5. Recorrido público y QR

Desde escritorio y un móvil real:

1. Abrir inicio y buscar JT150 por referencia.
2. Añadir varias tallas y colores; comprobar que AZ no admite 4XL/5XL.
3. Combinar otra referencia, adjuntar un logo y enviar una solicitud.
4. Comprobar número de confirmación y persistencia tras recargar/reiniciar la API.
5. Entrar al panel, localizarla, abrir el logo, añadir nota y cambiar estado.
6. Guardar propuesta, registrar aceptación y convertir en pedido sin perder el número.
7. Comprobar correo y los 20 ejemplos claramente diferenciados. Revisar comparador técnico y asistentes público/administrativo con datos ficticios.
8. Verificar `noindex`, robots y ausencia de credenciales públicas.

Cuando funcione, comunicar la **URL estable** para generar la hoja imprimible con QR a `/?origen=qr`. El QR y las credenciales no se incorporan a la web pública. La hoja no se ha generado con una URL provisional.

## Operación

- `GET /health`: disponibilidad de API y MongoDB.
- Logs `email_failed`: ID de trabajo, intento y agotamiento; el panel contiene el error resumido.
- Cookie HttpOnly, Secure en producción, SameSite=Lax y caducidad de ocho horas. Las escrituras privadas requieren token CSRF y origen exacto.
- Los adjuntos son imágenes de hasta 3 MB, normalizadas y privadas. Sin almacenamiento efímero.
- `demo:reset -- --confirm-demo-only` borra únicamente `demo=true` y prefijo `DEMO-`; las solicitudes de visitantes se conservan.
- El repositorio no contiene el histórico local creado al comprobar la app ni sus credenciales. La base de Railway se inicializa con sus propios scripts.
- Mantener `noindex` y robots restrictivo mientras haya datos de demostración. Para una web comercial, revisar legal, destinatarios, dominio, redirecciones, sitemap y reglas SEO antes de retirar esas barreras.
