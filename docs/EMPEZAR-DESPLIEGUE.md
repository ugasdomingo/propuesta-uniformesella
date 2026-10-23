# Del push a la demo pública

Preparado el 23/10/2026. El repositorio es `ugasdomingo/propuesta-uniformesella`, rama `main`. No se ha hecho push ni creado despliegues desde este chat.

## 1. Hacer el push

Desde la raíz del repositorio:

```powershell
git push -u origin main
```

El remoto SSH ya está configurado. GitHub puede pedir tu autenticación. `.env`, `.local/ACCESO.md`, la base local, los archivos temporales y las claves quedan fuera de Git. Solo se publican plantillas vacías y datos de catálogo/ejemplo.

## 2. Atlas para los datos y Railway para la API

1. Usa una base exclusiva en MongoDB Atlas, con un usuario de base de datos que tenga `readWrite` sobre esa base. En Connect > Drivers copia la URI `mongodb+srv://…/NOMBRE_BASE?…`. La base debe ir antes de `?`; no uses la base `admin` ni el valor por defecto `test`.
2. Guarda esa URI en `MONGODB_URI` del `.env` privado para desarrollo y carga inicial. Atlas almacenará catálogo, solicitudes, usuarios, sesiones, trabajos de correo, borradores y logos privados GridFS. No necesitas ejecutar `db:local` ni crear MongoDB/volúmenes en Railway.
3. En Atlas, Network Access debe permitir la conexión desde tu equipo y desde la API alojada. La IP de tu equipo no es la de Railway: revisa la salida de red del servicio al desplegar y autoriza el origen correspondiente según tu configuración. Mantén TLS y la autenticación de Atlas. Configura backups según las opciones de tu clúster.
4. Crea un proyecto de Railway nuevo para la demo y añade **solo el servicio API** desde este repositorio, rama `main`. La raíz es la raíz del repositorio, **no** `apps/api`. Usa `/railway.json` si Railway solicita la ruta de configuración.
5. Pega [deploy/railway.env.example](../deploy/railway.env.example) en Variables > Raw Editor. Completa `MONGODB_URI` con la misma URI Atlas y la misma base; no copies el `.env` entero. Añade `SESSION_SECRET`, `DEMO_ADMIN_EMAIL` y `DEMO_ADMIN_PASSWORD`. La contraseña debe tener al menos 12 caracteres.
6. Genera un secreto de sesión nuevo en tu terminal privada y copia el resultado solo a Railway:

   ```powershell
   node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
   ```

7. Añade `OPENAI_API_KEY` directamente en Railway para activar el asesor. Añade `EMAIL_API_KEY` y `EMAIL_FROM` cuando tengas el remitente de Resend verificado. Las claves locales no viajan con Git. Se puede arrancar sin las claves de IA/correo: se indicará la función sin configurar.
8. Conserva provisionalmente `APP_URL=https://frontend-pendiente.invalid` hasta conocer la URL de Vercel. La API arrancará, pero rechazará escrituras desde un frontend real hasta que pongas su origen correcto.
9. Despliega manualmente. `Dockerfile.api` compila Express y audita el catálogo. `railway.json` configura el comando pre-deploy `npm run deploy:prepare`: comprueba la conexión/base, importa 197 referencias, inserta los ejemplos ausentes y crea el administrador solo si no existe. Si Atlas ya está inicializado, conserva solicitudes, ejemplos editados, contraseña y sesiones. No ejecuta un reset ni una migración histórica.
10. La configuración fija una réplica, sin suspensión, y 300 segundos para pre-deploy. Genera el dominio público HTTPS de la API. `https://TU-API.up.railway.app/health` debe devolver `{"ok":true}`. Railway proporciona el puerto.

La carga inicial se puede hacer antes desde tu equipo:

```powershell
npm run db:check
npm run deploy:prepare
```

Estos comandos leen el `.env` privado. Si la base tiene datos de una versión anterior, consulta antes la migración manual en [Operación](PLAN-2-OPERACION.md). No copies carpetas WiredTiger ni los datos locales de comprobación a Atlas.

## 3. Vercel: web Nuxt

1. Importa el mismo repositorio como un proyecto **nuevo**, sin usar el proyecto ni el dominio de la tienda actual. Rama de producción: `main`.
2. Root Directory: **`apps/web`**. Activa la inclusión de archivos fuera de esa raíz. Node: **24.x**. Framework: **Nuxt**.
3. `apps/web/vercel.json` ya fija instalación y compilación: `cd ../.. && npm ci --include=dev` y `npm run build`. No añadas `dist` ni una carpeta estática como Output Directory; Nitro genera la salida de Vercel. Si el panel tiene overrides anteriores, hazlos coincidir con estos comandos.
4. Usa [deploy/vercel.env.example](../deploy/vercel.env.example) en el entorno **Production**. Sustituye `NUXT_API_INTERNAL_URL` por la URL HTTPS de la API de Railway, sin `/api`, y `NUXT_PUBLIC_APP_URL` por la URL estable que hayas elegido para la web, sin ruta. Conserva `NITRO_PRESET=vercel`. No pongas claves, contraseñas ni URI de MongoDB en Vercel.
5. Despliega. Comprueba la URL estable que Vercel ha asignado. Si difiere de la prevista, corrige `NUXT_PUBLIC_APP_URL` y redespliega el frontend. No uses la URL temporal de un commit como URL principal.
6. En Railway cambia **`APP_URL` a esa misma URL estable**, incluyendo `https://` y sin ruta ni barra final. Aplica las variables y redespliega la API. La cookie y el proxy usan el dominio de la web; el navegador no necesita CORS abierto.

Las previews de otras ramas no están autorizadas para gestionar esta base con otro origen. Para probar escrituras en una preview, utiliza una API/base independiente con su `APP_URL` correspondiente.

## 4. Comprobar la demo

- Abre `/hacer-pedido`, busca JT150, añade varios colores/tallas y otra referencia. Revisa, adjunta un logo ficticio y envía. Debe aparecer un número de solicitud.
- En `/comparar`, compara JT150, TSRA150 y TSRA190; comprueba gramaje desconocido, intervalo y excepciones por color. La popularidad debe indicar que aún no hay historial real suficiente en esta demo.
- Entra a `/admin/solicitudes` con el usuario y contraseña configurados en Railway. Abre la nueva solicitud, su logo privado, una nota y un cambio de estado. Los ejemplos están identificados y no generan correo.
- Abre el asesor público y `/admin/asistente`. Comprueba texto y una captura ficticia. El administrador debe revisar y confirmar antes de crear una solicitud o aplicar cambios.
- Con Resend configurado, comprueba **recepción** de avisos en `ugasdomingo@gmail.com`. No basta el estado «Aceptado por el proveedor». Los pedidos importados solo generan avisos cuando se marcan expresamente.
- Repite acceso y consulta después de un reinicio de la API. Mantén `noindex`. Para abrir la demo desde móvil, el acceso del proyecto debe permitir los visitantes que elijas, manteniendo el login del panel.

Cuando la web esté estable, envía su URL en este chat para preparar la hoja con QR. No hace falta cambiar más código para empezar el despliegue.

## Referencia y límites de esta preparación

Conexión, usuario de base de datos e IP permitidas: [documentación oficial de Atlas](https://www.mongodb.com/docs/atlas/driver-connection/). El uso de configuración en el repositorio y pre-deploy se contrastó con [Vercel: configuración](https://vercel.com/docs/project-configuration/vercel-json), [monorepos](https://vercel.com/docs/monorepos/monorepo-faq) y [Railway: pre-deploy](https://docs.railway.com/deployments/pre-deploy-command). Verificado con Node 24.22.1: instalación limpia del lockfile sin copiar el `.env` privado, tipos de aplicación y scripts, auditoría sin fallos, `npm run build` completo y build del frontend con `NITRO_PRESET=vercel` desde la copia limpia. La salida de Vercel declara `nodejs24.x` y `maxDuration: 90`. Los primeros intentos bloquearon carpetas/junctions por los permisos del entorno restringido; ambos builds finalizaron correctamente con ejecución local autorizada, sin cambiar opciones de seguridad de Windows. Docker no está disponible en este equipo: la imagen Linux/Alpine deberá validarse en el build de Railway. La publicación y la recepción de correo solo pueden confirmarse al desplegar.

Detalles de almacenamiento, backups, incidencias y correo: [Despliegue](DESPLIEGUE.md). Modelos, cuotas y privacidad: [Operación del Plan 2](PLAN-2-OPERACION.md).


Atlas se comprobó mediante conexión real y dos preparaciones: 197 productos, 20 ejemplos, un administrador conservado y cero trabajos de correo. La API compilada devolvió `/health` 200 y búsqueda JT150 200 usando Atlas. La comprobación de secretos no encontró coincidencias entre los archivos de entrega; `.env`, accesos privados y datos temporales siguen ignorados por Git.
