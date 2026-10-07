# Panel de Lula, pedidos y cuentas — instalación

Esto se hace **una sola vez** y lleva unos 15 minutos. Idealmente, **con la cuenta de Google de tu hermana**: así ella queda como dueña de la planilla de pedidos, de las fotos y del panel.

Al terminar vas a tener:

- **Panel "Mi catálogo"**: un link que tu hermana guarda en el celular. Desde ahí carga y edita productos, sube fotos, pausa lo agotado, ve los pedidos y les cambia el estado.
- **Registro de pedidos**: cada pedido que sale por WhatsApp queda anotado en una planilla privada, con número (ej. `LL-260927-49NW`) y estado.
- **Cuentas de clientas (opcionales)**: las clientas pueden crear una cuenta con su WhatsApp y un PIN para ver sus pedidos. Pedir sin cuenta sigue funcionando igual.

---

## Paso 1 — El panel (en la planilla de PRODUCTOS)

1. Abrí la planilla de productos, la misma que lee el catálogo.
2. Andá a **Extensiones → Apps Script**.
3. Borrá lo que haya en `Código.gs` y pegá todo el contenido de `apps-script/panel/Panel.gs`.
4. Arriba de todo, en `ADMINS`, dejá tu mail y **agregá el de tu hermana**:
   ```js
   const ADMINS = [
     'nahuelruizz18@gmail.com',
     'mail-de-tu-hermana@gmail.com',
   ];
   ```
5. Tocá el **+** al lado de "Archivos" → **HTML**, y nombralo exactamente `panel` (sin `.html`, **todo en minúscula**: con `Panel` el panel da error de archivo no encontrado). Pegá ahí el contenido de `apps-script/panel/panel.html`.
6. Guardá (ícono del disquete).
7. En la barra de arriba elegí la función **`configurar`** y tocá **▶ Ejecutar**. Google va a pedir permisos: **Revisar permisos → tu cuenta → Configuración avanzada → Ir a (no seguro) → Permitir**. Es normal: el script es tuyo y Google no lo verificó.
8. Abrí **Ver → Registros**. Vas a ver dos links; **copiá el de la "Planilla de pedidos"**, lo usás en el Paso 2.

   `configurar` creó las pestañas **Config** y **Puntos** en la planilla de productos, la carpeta **"Lula – Fotos del catálogo"** en Drive y la planilla privada **"Lula – Pedidos y clientas (PRIVADA)"**.
9. **Implementar → Nueva implementación** → tipo **App web**:
   - Ejecutar como: **Usuario que accede a la app web**
   - Quién tiene acceso: **Cualquier usuario con una cuenta de Google**
   - Tocá **Implementar** y copiá la **URL** (termina en `/exec`).
10. Esa URL es **el panel**. Mandásela a tu hermana. En el celular: abrir en Chrome → menú ⋮ → **Agregar a pantalla principal**. Queda como una app.

> Solo entran los mails de `ADMINS`. Cualquier otra persona ve "Esta página es solo para Lula".
>
> Si la pantalla carga pero no responde nada, o aparece un cartel rojo "ERROR DEL PANEL", sacale una captura: dice la línea exacta que falla.

## Paso 2 — La API (en la planilla PRIVADA de pedidos)

1. Abrí el link de la "Planilla de pedidos" que copiaste en el Paso 1.
2. **Extensiones → Apps Script**, borrá lo que haya y pegá `apps-script/api/Api.gs`.
3. Guardá, elegí la función **`configurar`** y tocá **▶ Ejecutar**. Aceptá los permisos igual que antes.

   Se crean las pestañas **Pedidos**, **Clientas** y **Sesiones** (esta última queda oculta).
4. **Implementar → Nueva implementación** → **App web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
   - **Implementar** → copiá la **URL**.

> **Importante:** esta planilla NO se comparte "con cualquiera que tenga el link". Tiene nombres y teléfonos de clientas. Solo la ven ustedes dos.

## Paso 3 — Conectar el catálogo

En `script.js`, buscá esta línea y pegá la URL del Paso 2:

```js
const API_URL = 'https://script.google.com/macros/s/XXXXXXXX/exec';
```

Volvé a subir la carpeta a Netlify. Listo.

Si `API_URL` queda vacía, el catálogo funciona como antes: sin registro, sin cuentas y con la configuración escrita en el código.

---

## Qué puede hacer tu hermana desde el panel

| Pestaña | Para qué |
|---|---|
| **Productos** | Buscar, filtrar (a la venta, pausados, sin foto, destacados). Interruptor **A la venta** para pausar lo agotado y **Destacado** para subirlo al inicio. Tocar un producto para editarlo, o **Nuevo producto** para cargar uno. |
| **Fotos** | Desde el editor del producto: **Agregar foto** abre la cámara o la galería. La foto se achica sola (de 4 MB a ~300 KB), se guarda en Drive y se pega en la planilla. Tocar una foto la hace principal. |
| **Pedidos** | Aparecen los pedidos nuevos, con un número rojo en la pestaña. Cada uno trae la clienta, el punto, el detalle, el total y la seña, más un botón para escribirle por WhatsApp. El desplegable cambia el estado: **Nuevo → Seña recibida → En preparación → Listo para retirar → Entregado** (o **Cancelado**). La clienta con cuenta ve ese estado en su celular. |
| **Ajustes** | **Tomando pedidos** (apagarlo = vacaciones: se puede mirar pero no pedir) y el mensaje de pausa. La franja de avisos, el WhatsApp que recibe los pedidos y el % de seña. Los puntos de encuentro, cada uno con su **mínimo** y un interruptor para ocultarlo. La lista de clientas con cuenta y **Reiniciar PIN**. |

Los cambios tardan hasta unos 2 minutos en verse en el catálogo: la configuración se guarda hasta 2 minutos y el catálogo tiene su propia copia.

## Cuentas de clientas: cómo funcionan

- La cuenta es **opcional**. En el carrito aparece "¿Querés seguir el estado de tus pedidos? Creá tu cuenta (opcional)".
- Se crea con **WhatsApp + un PIN de 6 números**. El PIN **nunca se guarda**: se guarda una huella cifrada (SHA-256 con sal) que no se puede revertir.
- Después de 5 intentos fallidos, ese número queda bloqueado 15 minutos, y después de 20 en un mismo día, hasta el día siguiente.
- Nadie verifica que el WhatsApp sea de quien crea la cuenta (no se manda ningún SMS). Por eso la cuenta solo muestra pedidos hechos *con esa cuenta*.
- **Si una clienta se olvida el PIN:** le escribe a Lula, y Lula toca **Reiniciar PIN** en Ajustes: el panel muestra un **código de 6 números** (vale 48 horas) y un botón para mandárselo por WhatsApp. La clienta va a "Crear cuenta", pone su WhatsApp, un PIN nuevo y ese código; conserva sus pedidos. Reiniciar el PIN también cierra todas sus sesiones abiertas (sirve si le robaron el celular). Sin el código nadie puede quedarse con la cuenta.
- La sesión dura 90 días en ese celular.

## Si algo cambia en el código más adelante

Cada vez que se edita `Panel.gs` o `Api.gs` hay que **publicar una versión nueva** para que el cambio tome efecto: **Implementar → Administrar implementaciones → ✏️ → Versión: Nueva → Implementar**. La URL no cambia.
