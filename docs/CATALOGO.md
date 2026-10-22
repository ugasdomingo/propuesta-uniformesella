# Catálogo y trazabilidad

Fuente principal: `jhktshirt_catalogue_es.pdf` aportado por el usuario, 115 páginas digitales. La huella SHA-256 del PDF está en `data/catalog/review-ledger.json`. Se renderizaron 226 medias páginas para OCR de Windows; un segundo OCR con Tesseract recuperó el texto de las 186 medias páginas asociadas a las fichas. También se aislaron las etiquetas de color para leer texto blanco sobre muestras.

## Resultado conciliado

| Comprobación | Resultado |
| --- | ---: |
| Entradas del directorio | 201 |
| Referencias de producto | 197 |
| Opciones de color | 1.912 |
| Combinaciones color/talla válidas | 11.067 |
| Imágenes y muestras comprobadas | 732 |
| Referencias ausentes / ajenas / pendientes | 0 / 0 / 0 |

Los recuentos vigentes están en `data/catalog/audit.json`. La auditoría también detecta duplicados, incoherencias de tallas, guías incompletas, archivos ausentes y fichas modificadas después de su revisión.

La revisión combinó el inventario del directorio, 556 datos del cuerpo del PDF que cubren las 197 referencias, matrices oficiales de JHK con `data-sizes` por color, inspección visual de las imágenes en diez hojas de contacto y revisión a tamaño legible de las discrepancias. No se ha tratado el producto cartesiano de todas las tallas y todos los colores como si fuera válido.

## Correcciones relevantes

- **PORA210:** regular, Wash y Contrast comparten referencia. 44 + 5 + 14 = 63 colores. Wash y Contrast llegan a 3XL; las tallas mayores conservan su carta reducida. POPL200 y PKID210 también agrupan sus subgamas Contrast: estas cuatro entradas adicionales explican 201 → 197.
- **JT150:** XS–5XL; en 4XL–5XL solo WH, GM, BK, RD, RB y NY. Se conservan las excepciones AS y GM de composición. No se asigna gramaje a JT150 a partir de su nombre: la ficha no lo especifica.
- **TSUAPICO, p. 178:** 18 colores en el PDF; la ficha online solo ofrecía 14. Se incorporaron SL, PB, MO y BT desde la carta visual del PDF, en S–XXL.
- **SWRBHOOD y SWPANTSB, p. 147:** seis colores en el PDF, incluido SK como novedad; la web mostraba cinco. SK se conserva para las tallas 0, 1 y 2 de ambas prendas.
- **SPHEAVYMEN / SPHEAVYLDY, pp. 205 / 204:** siete combinaciones de color en el PDF. Se excluyó WHNY de la web online; hombre S–XXL, mujer S–3XL.
- **SWRAZIP:** el directorio la sitúa en p. 122, pero la ficha real Half Zip está en p. 121. SWRAFUZIP sigue en p. 122. Son referencias distintas y se conservan ambas.
- **JTSOFTJACK:** se respeta la referencia del PDF. El fabricante la abrevia online como JTSOFTJAC; queda documentada como alias, no como otro producto.
- **TSR160ORG:** el OCR del directorio confundía la O con 0; se normaliza la referencia real.
- **Gramajes:** prevalecen las fichas del cuerpo frente al resumen del directorio: JTPOLO 180, TSRA150 155, TSRA190 185–190, TSRKSTRAP 155, TSRA150WLT 155 y POPL200WK 200 g/m².
- **Pantalones WK:** se muestran las tallas alfabéticas del PDF y se añade la equivalencia numérica a la guía de medidas, conservando la correspondencia de cada variante.
- **WLT:** el fabricante codifica el color como WH, pero se identifica en pantalla como blanco WLT especial para tintar. No se presenta como blanco convencional.

Las composiciones y excepciones proceden de las fichas del catálogo y del fabricante. Las muestras de color son aproximaciones de pantalla obtenidas de las imágenes reales, no una garantía de reproducción física. La ficha original está disponible dentro de cada producto para consultar las notas completas.

## Archivos

- `inventory.json`: 201 entradas recuperadas del directorio, incluidas las subgamas y los datos originales para conciliar.
- `products.json`: importación normalizada de las 197 referencias.
- `pdf-ocr.json`: texto del segundo OCR por media página de origen.
- `review-overrides.json`: correcciones verificadas, restricciones especiales y recortes concretos.
- `review-ledger.json`: huellas de los datos revisados; cambiar variantes, composición o medidas invalida su revisión.
- `reconciliation.json`: mapeo completo, agrupaciones, páginas y correcciones por referencia.
- `audit.json`: resultado ejecutable de la auditoría.
- `apps/web/public/catalog/`: fotografías, miniaturas, muestras y fichas originales WebP.

## Importación y mantenimiento

La ejecución normal no requiere el PDF ni acceso al proveedor:

```powershell
npm run catalog:audit
npm run catalog:import
```

El segundo comando actualiza MongoDB por referencia, sin duplicar ni borrar solicitudes. Las solicitudes existentes conservan su snapshot.

Para regenerar desde las fuentes en este equipo se incluyen `render-catalog.py`, `ocr-catalog.ps1`, `inventory-catalog.py`, `fetch-supplier.py`, `inspect-supplier.py`, `prepare-color-ocr.py`, `ocr-colors.mjs`, `ocr-details.mjs`, `reconcile-colors.py`, `build-catalog.py` y `check-pdf-facts.py`. Requieren Python con PyMuPDF, Pillow, NumPy y BeautifulSoup; Tesseract.js está en las dependencias de desarrollo. Los renders y las cachés se guardan en `tmp/`, excluido de Git. Algunos scripts usan la ubicación original del PDF aportado; ajústala si cambia.

`build-catalog.py` conserva la revisión solo cuando la huella coincide con el registro existente. Si se cambia una ficha, la marca como pendiente y la auditoría/importación se detienen hasta revisar sus fuentes y actualizar explícitamente el registro. No se debe dar por revisado un catálogo nuevo solo porque cuadre el número de referencias.
# Datos técnicos del Plan 2

`data/catalog/technical.json` conserva gramajes, composición base y por color, excepciones y huella de procedencia derivados del catálogo revisado, sin IA. Regenerar con `npm run catalog:technical`; `npm run catalog:audit` comprueba su correspondencia con las fichas y variantes. Hay 172 referencias con gramaje explícito y 25 sin dato: el comparador muestra «No especificado» en estas últimas. Se mantienen 197 referencias, 1.912 colores, 11.067 variantes y 732 imágenes.
