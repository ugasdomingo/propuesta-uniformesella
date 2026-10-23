# Administrador y comprador

Las cuentas están en la misma base Atlas configurada en `MONGODB_URI`. Se conservó el administrador existente y se creó una cuenta de comprador de demostración. Sus usuarios y contraseñas están en **`.local/USUARIOS-DEMO.md`**, excluido de Git. No se publican credenciales en este documento.

| Cuenta | Entrada | Permisos |
| --- | --- | --- |
| Administrador | `/admin/login` | Panel de solicitudes y asistente administrativo |
| Comprador | `/mi-cuenta/entrar` | Sus pedidos, presupuestos, propuestas y logos vinculados |

«Mi cuenta» está disponible en la cabecera, el menú móvil y el pie de la web. El comprador consulta su lista en `/mi-cuenta` y abre el detalle de cada solicitud. Los pedidos enviados con su sesión iniciada se vinculan en servidor a su identificador. Los capturados por el equipo desde otros canales se vinculan a una cuenta activa cuando coincide el email registrado. Una solicitud anónima no se asigna automáticamente a una cuenta solo por escribir su email.

El pedido sin registro sigue disponible. El comprador no accede al panel, a sus endpoints ni al asistente privado, y no recibe notas internas, procedencia privada ni identificadores de envío. El acceso a logos también comprueba el propietario de la solicitud. Las páginas y endpoints de cuenta usan caché privada y `no-store`.

La cuenta de comprador es ficticia y sus nuevas solicitudes quedan marcadas como sintéticas, sin avisos de correo. Tiene un pedido semilla de cinco prendas y dos recorridos manuales adicionales: pedido web con logo y captura ficticia de WhatsApp. Los ejemplos anteriores permanecen en la base.

## Preparación repetible

```powershell
npm run users:demo
```

Requiere `.env` privado con URI de la base, `DEMO_MODE=true` y credenciales del administrador. Conserva contraseñas, roles y sesiones existentes; si una cuenta no coincide con la configuración, se detiene. Genera y guarda `DEMO_CUSTOMER_EMAIL` y `DEMO_CUSTOMER_PASSWORD` cuando faltan, crea el ejemplo ausente y actualiza el archivo privado de accesos. No genera trabajos de correo ni resetea la base.

No necesitas copiar la contraseña del comprador a Vercel o Railway: la cuenta ya está en Atlas. Estas variables solo sirven para este comando administrativo. Al desplegar contra la misma base, usa las mismas credenciales y sustituye el origen localhost por la URL estable.

## Verificación del 23/10/2026

- Login real del administrador y comprador: **200**, roles correctos. Cliente usando el acceso del equipo: **403**.
- API privada del panel y del asistente con la cuenta de comprador: **403**. Otro pedido y otro logo: **404**. Sin sesión: **401**.
- Nuevo pedido autenticado: **201**; reintento: **200**, mismo número. Sin CSRF: **403**. Otro email de contacto: **400**. Propietario guardado, marcado sintético y cero trabajos de correo.
- Pedido capturado por el equipo: asociación por email comprobada y cero trabajos de correo para la cuenta ficticia.
- Web compilada y proxy: `/mi-cuenta` anónimo redirige **302**; comprador autenticado obtiene **200**, tres solicitudes propias y cabecera `private, no-store`. Detalle **200**. Panel administrativo **200** con la cuenta del equipo.
- Tipos, script de cuentas, auditoría, build completo y preset Vercel comprobados. No se añadieron tests ni frameworks de testing.
- La herramienta de navegador integrado no estuvo disponible. La revisión de esta ampliación se hizo por API y renderizado SSR; no se acredita una nueva revisión visual en navegador.
