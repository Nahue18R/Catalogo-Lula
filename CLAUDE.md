# Lula Luján Creaciones — catálogo web

Catálogo online del emprendimiento de la **hermana de Nahuel**: figuras de yeso **SIN PINTAR** (santería, macetas, souvenirs, combos de bandeja + porta sahumerios), zona oeste del GBA. Las clientas llegan por un link de WhatsApp **desde el celular**, arman el carrito y el pedido sale por WhatsApp. Se cobra una seña (10% por defecto) y el resto al retirar; las entregas son los sábados en puntos de encuentro.

## Reglas que no se discuten

- **La que opera el negocio no es técnica.** Ante dos soluciones, elegir siempre la que la deja autónoma, aunque cueste más construirla. Ella no toca código ni edita la planilla a mano: usa su **panel** (`apps-script/panel/`).
- **"Sin pintar", nunca "pintada a mano".** Es el atributo principal del producto. Si aparece "pintada/o a mano" en textos o descripciones, es un error.
- **Mobile-first.** Casi todo el tráfico es de celular. Verificar siempre a 375×812 además de escritorio.
- **Mantener el look actual** (decisión del dueño): Montserrat, verde oliva `#556b2f`, beige, blanco. Mejorar el uso, no rediseñar la identidad, salvo que Nahuel lo pida.
- **Cuentas de clientas: sí, opcionales.** Se desaconsejó y el dueño decidió tenerlas igual. No volver a discutirlo. Pedir sin cuenta tiene que seguir funcionando siempre.
- **Español rioplatense** en toda la UI y en los comentarios ("tocá", "elegí", "tu WhatsApp").
- **Sin frameworks ni build.** HTML + CSS + JavaScript vanilla. Se publica tal cual (Netlify, más adelante).

## Arquitectura

```
Clientas (celular) ──► index.html + script.js + style.css   (sitio estático)
                          │  lee productos:  planilla de PRODUCTOS (CSV público, /export?format=csv)
                          │  lee config:     API ?accion=config  (pestañas Config y Puntos)
                          └► registra pedidos / cuentas: API (Apps Script, apps-script/api/Api.gs)
                                                     └► planilla PRIVADA "Pedidos y clientas"
Hermana (celular) ──► Panel "Mi catálogo" (Apps Script, apps-script/panel/)
                          ├► edita la planilla de PRODUCTOS y las pestañas Config y Puntos
                          ├► sube fotos a su Drive (se achican en el celular antes de subir)
                          └► cambia el estado de los pedidos en la planilla privada
```

- **Planilla de productos:** es PÚBLICA (cualquiera con el link), así que nunca puede tener datos de clientas. Columnas por nombre: `id, nombre, categoria, descripcion, medidas, precio_unitario, precio_pack_10, precio_pack_20, imagen_id, activo, destacado`.
- **Planilla privada:** pestañas `Pedidos`, `Clientas` y `Sesiones`. Estados de un pedido: Nuevo → Seña recibida → En preparación → Listo para retirar → Entregado / Cancelado.
- **`API_URL` vacía** (así está hoy en `script.js`): el catálogo funciona sin registro, sin cuentas y con la config de respaldo que está en el código. Todo lo de la API tiene que degradar sin romper nada.
- La instalación de los dos Apps Script está en `guias/PANEL-Y-CUENTAS.md`. **Todavía no se instalaron**: el código Apps Script está escrito y revisado de sintaxis, pero nunca corrió dentro de Google.

## Decisiones técnicas que importan

- **Ids estables:** el id sale de la planilla (número o texto) o del slug del nombre, **nunca de la posición de la fila**. Toda búsqueda por id compara como texto (`buscarProducto`).
- **Todo lo que viene de la planilla se escapa** con `esc()` antes de entrar al HTML.
- **Carrito en localStorage** (`lula.carrito.v1`), re-sincronizado contra la planilla al cargar: nunca confiar en el precio guardado.
- **Catálogo con caché** (5 min) + copia de respaldo embebida (`CSV_EMERGENCIA`) para cuando no hay señal.
- **Mínimo de compra por punto de encuentro** (antes solo existía para Merlo Coppel). Sale de la pestaña Puntos.
- **Número de pedido** `LL-AAMMDD-XXXX`: se genera en el navegador, va en el mensaje de WhatsApp y en la planilla. La API es idempotente, así que reintentar no duplica el pedido.
- **`window.open` a WhatsApp va primero** y el registro después, con `fetch keepalive`. Si se espera a la API, el navegador bloquea el pop-up.
- **POST a Apps Script con `Content-Type: text/plain`**, para evitar el preflight de CORS.
- **PIN de las cuentas:** sha256(sal + PIN + pimienta), la pimienta vive en Script Properties, hay límite de intentos con CacheService y las sesiones se guardan solo como hash del token.
- **Bloqueo de scroll** con `bloquearScroll`/`desbloquearScroll` (position fixed + contador), porque `overflow:hidden` no alcanza en iOS.
- **Atrás del celular:** los paneles (ficha, carrito, cuenta) se agregan al `history` y el botón atrás los cierra.
- **Accesibilidad:** contraste AA (`--clr-beige-strong` y `--clr-accent-text` para texto), campos de 16px en pantallas táctiles (evita el zoom de iOS), áreas de toque de 44px y hovers solo con `(hover: hover) and (pointer: fine)`.

## Trampas conocidas

- **Un contenedor `display:flex/grid` con texto suelto + `<strong>`/`<a>`/`<code>`** convierte cada pedazo en un ítem separado y el texto se desarma. Envolver el contenido en un `<span>`. Ya pasó dos veces.
- **Encapsular `:hover` en media queries** puede partir selectores agrupados (`.a.active, .a:hover`). Revisar que no queden selectores huérfanos.
- El **panel del navegador de las herramientas congela las transiciones** cuando está oculto: medir con `*{transition:none!important}`.
- **gviz de Google Sheets** borra valores si una columna mezcla tipos. Para config se usa la API, no gviz.
- **Abrir `index.html` con doble clic (`file://`)** no puede leer la planilla (CORS) y muestra la copia de respaldo. Probar siempre con un servidor: `python -m http.server 8123`.

## Pendientes (en orden)

1. **Instalar los Apps Script** siguiendo `guias/PANEL-Y-CUENTAS.md`, agregar el mail de la hermana en `ADMINS` y pegar la URL en `API_URL`. Corregir lo que falle en el primer uso real.
2. **Planilla:** corregir las 5 descripciones que dicen "pintada a mano" (Virgen de Luján, Maceta Corazón, Gauchito Gil, Ángel Custodio, Muñequita Quinceañera). Solo 4 de 45 productos tienen foto.
3. **Probar en un iPhone y un Android reales** (scroll bloqueado, notch, zoom, teclado).
4. **Al publicar en Netlify:** poner en `og:image` / `og:url` la URL absoluta (`https://…/og-image.jpg`), o WhatsApp no muestra la vista previa. Dejar afuera `apps-script/`.
5. Revisar si de verdad se aceptan los medios de pago que muestra el inicio (Visa, Mastercard, Mercado Pago).
6. Mejoras propuestas y no hechas: relleno propio por categoría para los productos sin foto, link por producto (`?p=id`), 41% del texto por debajo de 12px (se mantuvo por el look), 65 colores escritos a mano en el CSS.
