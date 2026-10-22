# Implementación Plan 2 — entrega local completada

El Plan 2 está implementado para `main` local, sin push ni despliegue. La clave OpenAI introducida manualmente permanece en `.env`, excluido de Git. Se comprobaron llamadas reales de texto, herramientas y visión con `gpt-5.4-mini-2026-03-17`.

- Constructor accesible en `/hacer-pedido`: búsqueda, color, cantidades por talla, varias referencias, edición agrupada, borradores y recuperación del carrito; `/seleccion` redirige conservando parámetros.
- Comparador de tres prendas: gramaje, composición por color, excepciones, detalles y fuentes. Ranking de pedidos distintos confirmados en 90 días, sin datos demo/sintéticos ni cancelados.
- Asesor público de lectura y asistente administrativo con captura de texto/imagen, borradores privados, revisión humana, permisos, concurrencia e idempotencia.
- Catálogo conservado: 197 referencias, 1.912 colores, 11.067 variantes, 732 imágenes; 172 gramajes explícitos y 25 desconocidos. Registro técnico derivado y auditado.
- Migración histórica repetible aplicada sin reset. Solicitudes, snapshots, logos, propuestas, notas, sesiones y borradores persistieron tras reiniciar MongoDB y servidores.
- Recorridos manuales de constructor, comparación, extracción real, creación desde otros canales, confirmación, duplicados, permisos, reintentos, cuotas y errores documentados. Sin añadir tests ni frameworks de testing.
- Typecheck, auditoría y builds completados. Evidencia y límites: [verificación](PLAN-2-VERIFICACION.md). Configuración, cuotas, privacidad y mantenimiento: [operación](PLAN-2-OPERACION.md).

Correo real, despliegue público y hoja QR permanecen pendientes por decisión del usuario. La demo local está disponible en http://localhost:3000.
