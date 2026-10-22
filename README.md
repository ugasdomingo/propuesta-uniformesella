# Uniformes Ellas — demo comercial

Aplicación MEVN con TypeScript estricto: Nuxt 4 / Vue, API Express 5 y MongoDB. Catálogo JHK 2026 completo, selección multivariante, solicitudes sin registro, logos privados y panel de gestión.

**Alcance actualizado por el usuario:** entrega en `main` local, sin push ni despliegues. El usuario publicará en Railway y Vercel y comunicará después la URL estable para la hoja con QR. No se ha modificado la tienda actual.

## Arranque local

Requiere Node **24.15+ de la rama 24** (también compatible con 22.22.3+), npm y MongoDB. Usa `npm ci` para respetar el lockfile.

```powershell
npm ci
npx tsx scripts/setup-local.ts
```

El segundo comando crea `.env` y `.local/ACCESO.md` con una contraseña aleatoria, ambos excluidos de Git. No sobrescribe un `.env` existente. Si ya tienes configuración, usa `.env.example` y define un secreto de sesión aleatorio de al menos 32 caracteres.

En una terminal, arranca MongoDB:

```powershell
npm run db:local
```

Descarga y ejecuta un **mongod real**, con WiredTiger y datos en `.local/mongodb`. `mongodb-memory-server-core` se usa como gestor del binario; la base **no es volátil**. Alternativa con Docker: `docker compose up -d mongo`. No ejecutes ambos a la vez: usan el mismo puerto.

En otra terminal:

```powershell
npm run catalog:audit
npm run catalog:import
npm run demo:seed
npm run admin:create
npm run dev:api
```

En una tercera:

```powershell
npm run dev:web
```

- Web: <http://localhost:3000>
- Panel: <http://localhost:3000/admin/solicitudes>
- API: <http://127.0.0.1:4000/health>
- Acceso privado: `.local/ACCESO.md`. La contraseña no se publica en el repositorio ni en la web.

Usa `localhost`: debe coincidir con `APP_URL`. Si cambias puerto o dominio, actualiza también `NUXT_PUBLIC_APP_URL` y la URL de la API de Nuxt. En local Nuxt lee `apps/web/.env`; sus valores por defecto ya apuntan a Express local.

## Catálogo

- 201 entradas del directorio conciliadas en **197 referencias**. Wash y Contrast se agrupan en su referencia real, conservando restricciones por color.
- **1.912 opciones de color y 11.067 combinaciones válidas** en la importación revisada.
- WebP grandes y pequeños, muestras reales de color y fichas originales por página. El navegador no descarga el PDF completo.
- Procedencia, OCR, correcciones y huellas de revisión en `data/catalog/`. No hay precios, existencias ni certificaciones inventadas.
- Importación idempotente por referencia. `data/catalog/audit.json` comprueba inventario, imágenes y variantes.

Mantenimiento y discrepancias resueltas: [docs/CATALOGO.md](docs/CATALOGO.md).

## Gestión y correo

El visitante combina prendas, tallas y colores, adjunta un logo y solicita presupuesto o pedido pendiente de confirmación. La API valida las variantes, guarda un snapshot del catálogo y evita duplicados por doble envío o reintento del mismo contenido mediante una clave de idempotencia.

El panel permite buscar y filtrar, consultar logos, añadir notas, editar una propuesta, registrar aceptación, convertir un presupuesto aceptado en pedido y cambiar estados. Una versión de la solicitud detecta ediciones concurrentes.

Las 20 solicitudes ficticias se marcan **Ejemplo**, con importes expresamente ilustrativos. Su carga y gestión no generan emails. Repetir la semilla no sobrescribe cambios. Reinicio manual de los ejemplos:

```powershell
npm run demo:reset -- --confirm-demo-only
npm run demo:seed
```

El correo usa **Resend por HTTPS**: configura `EMAIL_API_KEY` y `EMAIL_FROM` con un remitente verificado. En demo todos los mensajes se redirigen a `EMAIL_REDIRECT_TO=ugasdomingo@gmail.com`, incluidas las confirmaciones al solicitante. `ORDER_NOTIFICATION_TO` queda en el mismo buzón.

La solicitud se guarda antes del envío. Los trabajos persisten en MongoDB, con recuperación tras reinicios, hasta cinco intentos, espera progresiva e idempotencia del proveedor. El panel muestra intentos, errores e ID del proveedor y permite reintentar. Sin credenciales muestra **sin configurar**, sin simular envíos. La aceptación del proveedor no acredita recepción: comprueba el buzón al configurar el servicio.

## Archivos privados

Logos PNG, JPG o WebP, máximo **3 MB**. Se comprueba la firma del archivo, se decodifica con límite de píxeles y se vuelve a codificar como PNG para retirar metadatos. El límite permite pasar por el proxy de Vercel, cuyo [máximo de payload es 4,5 MB](https://vercel.com/docs/functions/limitations).

Sin S3, los archivos se guardan en **MongoDB GridFS**, con persistencia junto a la base. También se admite almacenamiento de objetos privado compatible con S3 mediante variables de entorno. El acceso al logo siempre requiere sesión del empleado. No hay archivos de usuario en discos efímeros de los proveedores.

## Comprobaciones y build

```powershell
npm run catalog:audit
npm run typecheck
npm run build
```

No hay tests unitarios, de integración o E2E ni frameworks de testing. La auditoría es una comprobación de datos de importación. El recorrido se revisa manualmente en navegador; evidencia y límites en [docs/VERIFICACION.md](docs/VERIFICACION.md).

Para ejecutar los builds localmente, con las variables configuradas:

```powershell
node --env-file=.env apps/api/dist/index.js
# Otra terminal, desde apps/web:
node .output/server/index.mjs
```

## Despliegue manual

[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) detalla Railway, MongoDB con volumen y backups, Vercel y comprobaciones posteriores. Se incluyen `Dockerfile.api`, `railway.json`, `compose.yaml` y `.env.example` sin credenciales reales.

La demo tiene `noindex`, `X-Robots-Tag`, robots restrictivo y sitemap vacío. El contenido comercial usa SSR, canonical, datos estructurados sin precios ficticios, imágenes dimensionadas y fuentes locales. Se respeta el movimiento reducido. La política de privacidad identifica la demo y el buzón de desarrollo; debe revisarse antes de una apertura comercial.

No se da por verificada ninguna URL pública, recepción de correo ni métrica pública de Core Web Vitals antes de comprobarlas.

## Estructura

```text
apps/web/            Nuxt, páginas, selector, panel y proxy del mismo origen
apps/api/            Express, MongoDB, sesiones, archivos y cola de correo
packages/shared/     Contratos Zod y tipos
data/catalog/        Catálogo, inventario, OCR, correcciones y auditoría
scripts/             Importación, semilla, administrador y catálogo
docs/                Operación, despliegue y evidencia
PROGRESS.md          Registro y alcance vigente
```
