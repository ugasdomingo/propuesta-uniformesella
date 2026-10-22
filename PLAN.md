# Plan de la demo comercial de Uniformes Ellas

Fecha: 22 de octubre de 2026. Estado: aplicación implementada y verificada en local. Por indicación posterior del usuario, la entrega termina en `main` local: el usuario hará push y desplegará manualmente. Vercel, Railway, la recepción de correo real y la hoja con QR se comprobarán con la configuración y URL públicas disponibles. Véanse `PROGRESS.md` y `docs/VERIFICACION.md` para el estado de entrega; el documento siguiente conserva el plan aprobado.

## 1. Objetivo y decisiones confirmadas

Crear una aplicación que permita al propietario y a los empleados experimentar una mejora tangible: encontrar prendas, preparar un pedido de equipo, enviar una solicitud y gestionarla desde un área privada.

- Stack MEVN con TypeScript: MongoDB, Express, Vue mediante Nuxt y Node.js.
- Frontend desplegado en Vercel; API desplegada en Railway.
- Todo el catálogo del PDF JHK 2026, con sus fotografías y variantes reales.
- Solicitud de presupuesto o pedido pendiente de confirmación. Sin pago online.
- Destinatario configurable mediante `.env`; durante desarrollo, `ugasdomingo@gmail.com`.
- Usuario administrador de demostración e historial ficticio persistente.
- Acceso desde un QR en una hoja impresa.
- Sin escribir tests automatizados. Se realizarán comprobaciones de tipos, compilación y revisión manual del recorrido.

Se aplica CLAUDE.md como guía de simplicidad, alcance y claridad de supuestos. Su ejemplo de escribir tests queda sustituido por la instrucción explícita del usuario.

## 2. Investigación y consecuencias para el diseño

El scraping identifica https://uniformesellas.com como la web actual. Presenta ropa laboral por sectores, venta online y personalización. La página indexada de petos explica que hay que añadir cada talla por separado; esto ofrece una oportunidad concreta para mejorar los pedidos de empresas.

Las consultas directas a la web han devuelto tiempos de espera desde la herramienta de investigación. Se han contrastado el scraping aportado y páginas indexadas del propio negocio. No se ha realizado una auditoría visual completa ni se han medido sus Core Web Vitals; los tiempos de espera de esta herramienta no prueban que la web sea lenta para sus usuarios.

El PDF aportado contiene 115 páginas digitales, muchas maquetadas como dobles páginas impresas, y ocupa aproximadamente 71,6 MiB. Las dos extracciones de texto realizadas no recuperaron contenido textual: la importación necesita lectura visual/OCR. Se han revisado la portada, índice, ejemplos de fichas y parte del directorio, no todas las fichas individualmente.

El índice incluye JT, Regular, Workwear, Winter, Urban, Sport y Underwear, además de subcolecciones. La demo respetará esta oferta real: las categorías de la web original que no estén cubiertas por el PDF no se rellenarán con productos ficticios.

Ejemplo de complejidad comprobada: JT150 ofrece tallas XS–5XL, pero su carta de colores se reduce en 4XL–5XL. La composición también presenta excepciones según color. No basta con combinar automáticamente todas las tallas y todos los colores.

## 3. Dirección visual y Home

Concepto propuesto: «Tu equipo, con una imagen a su altura».

Mantener el nombre y el logotipo de Uniformes Ellas, con una presentación editorial contemporánea. Propuesta inicial de paleta: blanco cálido, grafito y un acento corporativo definido al revisar el logotipo original. Tipografía contundente para titulares y muy legible para catálogo y formularios.

La primera pantalla combinará una fotografía real del catálogo, un titular breve, un buscador visible y dos acciones: «Explorar catálogo» y «Preparar mi pedido». El producto y la facilidad para pedir deben entenderse sin desplazarse.

Orden del Home:

1. Cabecera compacta con buscador, catálogo, personalización y selección de prendas.
2. Hero editorial con fotografía del catálogo y acceso inmediato a la compra por cantidades.
3. Accesos visuales a familias y usos respaldados por los productos disponibles.
4. Selección destacada de prendas reales, con referencia, colores y acceso al configurador.
5. Explicación en tres pasos: elige prendas, reparte tallas, envía tu solicitud.
6. Personalización: logo, ubicación y técnica solicitada, sujeta a confirmación del equipo.
7. Información del negocio y contacto contrastados con la fuente original.
8. Llamada final a preparar un pedido.

Animación breve de entrada, transiciones entre filtros y respuesta visual al añadir prendas. Usar CSS para interacciones sencillas y una librería de movimiento compatible con Vue solo donde aporte valor. Respetar la preferencia de movimiento reducido. El contenido principal será visible sin esperar a una animación; evitar vídeo pesado de entrada y efectos que dificulten navegar desde el móvil.

## 4. Catálogo completo y buscador

### Importación

1. Inventariar todas las referencias del directorio y contrastarlas con las fichas del cuerpo del catálogo.
2. Registrar página digital y página impresa de origen para cada producto.
3. Recuperar texto por OCR y revisar referencias, composición, gramaje, medidas, colores, tallas y excepciones.
4. Extraer las fotografías originales cuando existan como recursos independientes; si la página está aplanada, recortar las zonas fotográficas a resolución suficiente.
5. Generar imágenes WebP/AVIF y tamaños adaptados a tarjetas, fichas y Home. No cargar el PDF completo para mostrar productos.
6. Construir un archivo de importación normalizado y un script TypeScript repetible que actualice por referencia sin duplicar.
7. Conciliar directorio y fichas: referencias esperadas, importadas, duplicadas, sin imagen y pendientes de revisión. Resolver los pendientes antes de declarar completo el catálogo.

No fijar todavía un número exacto de productos: debe salir del inventario por referencias, eliminando repeticiones de novedades/directorio y distinguiendo modelos de variantes. Un producto sin dato fiable conservará ese campo como desconocido; no se inventarán stock, tarifas o certificaciones.

### Experiencia de búsqueda

- Búsqueda por referencia, nombre y términos habituales; priorizar coincidencia exacta de referencia.
- Normalización de mayúsculas y acentos; sinónimos controlados como camiseta/t-shirt o chaleco/vest.
- Filtros por categoría, colección, público, talla, color, composición y gramaje cuando existan esos datos.
- Resultados paginados, filtros conservados en la URL, cantidad de coincidencias y opción clara para limpiar filtros.
- En móvil: panel de filtros y selección persistente accesibles con una mano.
- Sin resultados: sugerencias por categoría y opción de retirar filtros.

Para este catálogo, empezar con índices de MongoDB y búsqueda normalizada, sin un servicio adicional de búsqueda. Los filtros de talla y color se resolverán sobre combinaciones válidas de la misma variante.

Cada ficha mostrará fotografías, referencia, descripción, composición, guía de medidas, carta de color y disponibilidad de variantes en el catálogo. «Variante en catálogo» no implica existencias en almacén. Si no hay tarifas verificadas, mostrar «Precio bajo presupuesto».

## 5. Solicitud rápida de presupuesto o pedido

Recorrido principal sin registro obligatorio:

1. Seleccionar una prenda y uno o varios colores.
2. Introducir cantidades por talla en una tabla. En móvil, filas compactas por color con tallas desplegables.
3. Añadir de una vez todas las combinaciones válidas; continuar con otras prendas.
4. Indicar personalización opcional: logo, ubicación, técnica preferida o «Necesito asesoramiento».
5. Revisar cantidades y elegir «Solicitar presupuesto» o «Solicitar pedido».
6. Completar nombre, email y teléfono; empresa, observaciones y fecha deseada opcionales. Solicitar dirección solo cuando sea necesaria para la entrega.
7. Enviar y recibir un número de solicitud y resumen. Un pedido permanecerá pendiente de confirmación comercial, stock, precio y plazos.

El borrador de productos se conserva localmente para no perder la selección al navegar. Los errores se muestran junto al campo correspondiente. No se mostrará un total monetario inventado ni se reutilizarán precios de otros productos de la web actual.

La API comprobará productos, combinaciones y cantidades enteras positivas. Una clave de idempotencia evitará crear dos solicitudes al pulsar dos veces o reintentar tras un corte de red. El servidor conservará una copia de referencias, descripciones, variantes y personalización en cada solicitud para que su historial no cambie al actualizar el catálogo.

## 6. Área privada y demo

Acceso para administrador y empleados autorizados. En esta primera versión el área privada corresponde al equipo del negocio; el visitante puede solicitar sin crearse cuenta. Un portal de clientes con cuentas propias quedaría fuera de esta demo salvo ampliación posterior.

Funciones:

- Resumen de solicitudes nuevas, presupuestos pendientes y pedidos en preparación.
- Listado con búsqueda por número, nombre o empresa, y filtros por tipo, fecha y estado.
- Detalle con datos de contacto, prendas, cantidades, personalización y adjuntos.
- Notas internas y registro de cambios de estado con fecha y usuario.
- Edición de una propuesta económica: precio por línea y conceptos de personalización/entrega cuando el empleado disponga de ellos.
- Conversión de presupuesto aceptado en pedido, conservando la referencia y el historial.
- Visualización del estado del email y acción de reintento de envíos fallidos.

Estados de presupuesto: recibido, en revisión, presupuestado, aceptado o descartado. Estados de pedido: pendiente de confirmación, confirmado, en preparación, listo, entregado o cancelado. La aceptación se registrará manualmente en el panel en esta versión.

Sembrar unas 20 solicitudes ficticias repartidas entre presupuestos y pedidos, fechas y estados. Incluir pedidos de varias tallas y colores, con y sin personalización. Identificar claramente los datos de ejemplo y no usar personas reales.

El administrador de demo podrá recorrer las operaciones habituales sobre el entorno de demostración. Las credenciales se configurarán fuera del repositorio, con contraseña almacenada mediante hash. Los usuarios de prueba no podrán cambiar secretos de proveedores ni el destinatario del correo.

El script de reinicio de demo será manual, limitado al entorno y datos de demostración, sin borrados automáticos durante las visitas. Los datos de nuevas solicitudes se conservarán entre despliegues.

## 7. Arquitectura e implementación

| Capa | Elección | Responsabilidad |
| --- | --- | --- |
| Web | Nuxt + Vue + TypeScript | Home, SEO, catálogo, selección y panel |
| Estilos | Tailwind CSS y componentes propios | Sistema visual consistente y responsive |
| Estado | Pinia donde haga falta | Selección de prendas y cantidades |
| API | Node.js + Express + TypeScript | Catálogo, sesión, solicitudes, gestión y correo |
| Validación | Zod compartido | Validar entradas en navegador y servidor |
| Datos | MongoDB + Mongoose | Catálogo, solicitudes, sesiones y usuarios |
| Hosting web | Vercel | Renderizado y distribución del frontend |
| Hosting API y DB | Railway | Servicio Express y MongoDB con volumen persistente |
| Archivos | Almacenamiento de objetos privado | Logos adjuntos; acceso limitado al personal autorizado |
| Email | Proveedor transaccional por API HTTPS | Avisos de nuevas solicitudes y confirmaciones |

Nuxt sigue utilizando Vue y permite entregar HTML con contenido para SEO. La lógica comercial vivirá en Express. El navegador accederá a `/api` a través de un proxy del mismo origen en Nuxt hacia Railway para simplificar sesiones y evitar depender de cookies entre dominios de proveedores. El proxy se limitará a reenviar solicitudes; la API comprobará siempre la autorización.

MongoDB no será accesible desde el navegador. Se conectará por la red privada de Railway desde Express, con almacenamiento persistente y copia de seguridad configurada. No se usarán discos efímeros para datos ni logos.

Organización prevista:

```text
apps/web/                Nuxt, páginas, componentes y estilos
apps/api/                Express, dominio, persistencia y email
packages/shared/         Esquemas de entrada y tipos compartidos
data/catalog/            Inventario normalizado y procedencia
scripts/                 Importación y carga de datos de demo en TypeScript
docs/                    Configuración y operación
```

Modelo mínimo: Product, Category, User, Session, Request y Upload. Request incluirá líneas, contacto, personalización, estado, eventos y estado de notificación. Las referencias y slugs tendrán índices únicos. Los índices adicionales cubrirán búsqueda y listados por estado/fecha.

API orientativa: consulta de categorías/productos, búsqueda, detalle de producto, creación de solicitudes, carga de logo, login/logout/sesión, listado privado, detalle privado, actualización de estado, notas, propuesta económica y reintento de correo.

TypeScript estricto no sustituye la validación de datos externos: Zod validará formularios, parámetros y configuración del servidor. Comprobar permisos en cada operación privada, limitar intentos de login/envíos y proteger operaciones con sesión frente a CSRF. Cookies HttpOnly, Secure y política SameSite apropiada. Los adjuntos tendrán límites de tamaño y tipos permitidos; no se aceptará contenido ejecutable como una imagen.

## 8. Correo y configuración

Guardar primero la solicitud junto a su notificación pendiente. Después intentar el envío y persistir el resultado. Si falla el proveedor, la solicitud seguirá registrada y el panel permitirá identificar y reintentar el aviso. Un proceso sencillo en el servicio de Railway recuperará pendientes al reiniciar y hará reintentos limitados con espera progresiva. El envío usará idempotencia del proveedor cuando esté disponible.

El correo al negocio contendrá número de solicitud, tipo, contacto, variantes, cantidades, personalización y enlace autenticado al panel. No incluirá contraseñas ni enlaces públicos a logos privados.

Configuración prevista, sin crear todavía secretos:

```dotenv
DEMO_MODE=true
ORDER_NOTIFICATION_TO=ugasdomingo@gmail.com
EMAIL_REDIRECT_TO=ugasdomingo@gmail.com
EMAIL_FROM=
EMAIL_API_KEY=
MONGODB_URI=
APP_URL=
API_INTERNAL_URL=
SESSION_SECRET=
DEMO_ADMIN_EMAIL=
DEMO_ADMIN_PASSWORD=
```

En modo demo, EMAIL_REDIRECT_TO redirigirá todos los destinatarios, incluidas las confirmaciones al solicitante, al buzón de desarrollo. El asunto indicará que se trata de una demostración. Esto permite probar el recorrido completo sin enviar emails a direcciones ficticias del historial. La carga inicial de historial no disparará correos.

El remitente verificado y el proveedor de correo se concretarán al implementar. El email de destino confirmado por el usuario no equivale a autorización para usar ese dominio como remitente. No bloqueará desarrollar el flujo, pero será necesario configurar credenciales válidas para mostrar entrega real.

## 9. SEO y velocidad

- Home y contenido estable prerenderizados; categorías y fichas con renderizado de servidor y caché pública según su actualización.
- Panel, sesión, solicitudes y endpoints privados sin caché compartida.
- Títulos, descripciones, URLs legibles, canonical, enlaces internos y breadcrumbs.
- Datos estructurados de negocio, producto y navegación con información verificada. No inventar precios, disponibilidad o reseñas para generar resultados enriquecidos.
- Imágenes optimizadas con dimensiones declaradas; carga diferida salvo la imagen principal visible.
- Fuentes limitadas y alojadas con la aplicación; evitar cargar las dependencias del panel en el Home.
- Paginación rastreable. Filtros combinatorios y búsquedas internas con política explícita para evitar indexación masiva de URLs duplicadas.
- Preparar sitemap y reglas de robots para la futura web comercial.

La demo estará marcada con `noindex` y fuera de un sitemap público indexable para no competir con la web actual ni indexar datos de ejemplo. La arquitectura seguirá lista para SEO; al convertirla en web real se revisarán el dominio canónico, la retirada de `noindex` y las redirecciones desde las URLs actuales.

Objetivos de implementación, pendientes de medición: LCP inferior a 2,5 s, CLS inferior a 0,1 e interacción fluida en móvil. Lighthouse será una comprobación de laboratorio; una puntuación concreta o el INP real no se pueden garantizar antes de medir con tráfico y dispositivos reales.

## 10. Entrega comercial y recorrido de demostración

El QR apuntará a la URL estable del Home de la demo, con un parámetro de origen como `?origen=qr`. La experiencia se diseñará primero para móvil. Se mostrará una indicación discreta de «Demostración».

Hoja imprimible prevista: marca, mensaje breve de valor, QR legible con margen, URL escrita y tres pasos para probar. Se podrá entregar el acceso al panel al propietario y empleados en el material de acceso, sin incorporarlo a la página pública ni al QR.

Recorrido que debe poder realizar el prospecto:

1. Escanear el QR y ver el Home.
2. Buscar una referencia o filtrar prendas.
3. Añadir varias tallas y colores en una sola operación.
4. Enviar una solicitud y obtener su número.
5. Entrar al panel y encontrarla junto al historial ficticio.
6. Revisar detalles, añadir una nota y cambiar el estado.
7. Comprobar que llegó el correo al buzón de desarrollo.

## 11. Orden de construcción y criterios de finalización

| Fase | Entrega | Criterio de finalización |
| --- | --- | --- |
| 1. Inventario | Catálogo normalizado e imágenes | Todas las referencias del PDF conciliadas; excepciones de variantes resueltas |
| 2. Base técnica | Monorepo, contratos, DB y configuración | Web y API compilan con TypeScript estricto; configuración documentada |
| 3. Presentación | Home, navegación, categorías y ficha | Diseño coherente en móvil y escritorio; imágenes reales y contenido verificable |
| 4. Solicitudes | Selector, resumen, formulario y persistencia | Una selección multivariante se guarda con número y sin duplicados por doble envío |
| 5. Gestión | Login, panel y datos ficticios | El personal puede localizar solicitudes y completar su gestión básica |
| 6. Correo | Entrega y gestión de fallos | Aviso recibido en el buzón configurado; solicitud conservada si falla el envío |
| 7. Publicación | Railway, Vercel y material QR | Recorrido manual completo desde móvil, URLs estables y credenciales entregadas |

No se escribirán tests unitarios, de integración ni E2E. Las comprobaciones serán typecheck, build, revisión de datos y revisión manual en navegador. Los objetivos de funcionamiento no se darán por cumplidos solo porque compile.

La importación íntegra y la revisión del catálogo son el principal factor de esfuerzo. Conviene cerrar primero su inventario antes de comprometer una fecha exacta. Dominio final de la demo, remitente de email y credenciales de despliegue se resolverán al implementar; no hace falta decidirlos para aprobar esta arquitectura.

Quedan fuera de este alcance: pasarela de pago, stock en tiempo real del proveedor, ERP, facturación, migración de clientes de la tienda actual, multidioma y editor gráfico avanzado de logos.

## Fuentes

- Guía aportada: `C:\Users\Usuario\Downloads\CLAUDE.md`.
- Scraping aportado: `C:\Users\Usuario\Downloads\scrape_2026_10_22.md`.
- Catálogo aportado: `C:\Users\Usuario\Downloads\jhktshirt_catalogue_es.pdf`.
- [Web de Uniformes Ellas](https://uniformesellas.com/): contraste con contenido indexado; lectura directa limitada por tiempos de espera.
- [Proceso actual de compra de petos personalizados](https://uniformesellas.com/peto-penas/): selección por talla y personalización, consultado mediante contenido indexado.
- [Nuxt en Vercel](https://vercel.com/docs/frameworks/full-stack/nuxt): renderizado, prerenderizado y caché.
- [MongoDB en Railway](https://docs.railway.com/databases/mongodb): disponibilidad de despliegue de MongoDB en la plataforma.
