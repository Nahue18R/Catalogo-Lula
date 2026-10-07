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
- **Productos sin foto:** `imagenProducto(p)` devuelve el dibujo de su categoría con "Foto próximamente" (`placeholderCategoria`, SVG en el código). Toda `<img>` de producto lleva `data-cat` para que, si la foto falla, `activarFallbackImagenes` ponga ese mismo dibujo. En la ficha, un producto sin foto ofrece pedirla por WhatsApp.
- **Link por producto:** `?p=<id>` abre la ficha (`abrirProductoDesdeURL`); el botón "Compartir este producto" de la ficha lo genera. Ojo: la vista previa del link en WhatsApp es siempre la del catálogo, no la del producto (el sitio es estático y no puede cambiar el `og:` por producto).
- **Publicación:** `netlify.toml` copia solo los archivos del sitio a `dist/`. Si se suma un archivo que el sitio usa (otra imagen, otro .js), **hay que agregarlo al comando**, o no se publica.
- **Verde de WhatsApp** `#168043`: el oficial `#25d366` con texto blanco da 1.98:1. No volver a ese.
- **Seña con enteros:** `calcularSena` / `calcularSena_` usan centésimas de punto. `Math.ceil(total * 0.07)` daba $1 de más en 12 de los 100 porcentajes posibles (el % se edita desde el panel).
- **Teléfonos:** la API los guarda en forma nacional de 10 dígitos (`normalizarTelefono_`): `011 15 3450-1054`, `+54 9 11 3450-1054` y `1134501054` son la misma clienta. Si no, quien creó la cuenta de una forma no podía ingresar de otra.
- **Texto de clientes en la planilla:** `texto_()` antepone `'` a todo lo que empiece con `= + - @` (una planilla lo toma como fórmula). Lo mismo hace `seguro_()` en el panel con lo que escribe la dueña.
- **Apps Script abre las planillas por ID** (`ss_()`, guardado en Script Properties al correr `configurar`), no con `getActive()`, que en una web app puede venir vacío. El panel edita la hoja de `gid=0` (la que lee el catálogo), no "la primera pestaña".
- **Historial de los paneles:** `abrirEnHistorial` siempre hace `pushState`; el `popstate` es la única autoridad para cerrar paneles y limpia entradas fantasma; `init` limpia el estado heredado de una recarga. Para encadenar paneles (ficha → carrito) se usa `await esperarHistorial()`, no `setTimeout`.
- **Foco:** mientras hay un panel abierto, el resto de `body` queda `inert` (`aislarFondo`/`restaurarFondo`); al cerrar, el foco vuelve a quien lo abrió.
- **Imágenes:** toda URL de foto va con `esc()` dentro del `src`. Se acepta cualquier URL completa, así que sin escapar era una puerta a inyectar código.
- **Aviso de cambios en el carrito:** si desde la última visita un producto se pausó o cambió de precio, `avisarCambiosCarrito` se lo dice a la clienta (antes lo corregía en silencio).
- **Bloqueo de scroll** con `bloquearScroll`/`desbloquearScroll` (position fixed + contador), porque `overflow:hidden` no alcanza en iOS.
- **Atrás del celular:** los paneles (ficha, carrito, cuenta) se agregan al `history` y el botón atrás los cierra.
- **Accesibilidad:** contraste AA (`--clr-beige-strong` y `--clr-accent-text` para texto), campos de 16px en pantallas táctiles (evita el zoom de iOS), áreas de toque de 44px y hovers solo con `(hover: hover) and (pointer: fine)`.

## Cómo probar

- **Sitio:** `python -m http.server 8123` y abrir `http://localhost:8123`. Medir en 320, 375, 768, 1024 y también **apaisado (667×375)**.
- **Apps Script sin Google:** `node tests/apps-script-harness.js` corre `Api.gs` y `Panel.gs` contra un simulador de planillas, caché, candados y Drive (152 comprobaciones). Imita rarezas reales: un teléfono escrito como texto se guarda como número, `getRange` con 0 filas lanza error, `=...` se vuelve fórmula. **Correrlo después de tocar cualquier `.gs`.** No reemplaza instalarlo en Google (permisos, cuotas y CORS solo se ven ahí).
- **Panel sin Google:** `http://localhost:8123/tests/panel-preview.html` carga el `panel.html` real con un servidor falso en memoria y datos de ejemplo. Para retocar su diseño.
- `tests/` no se publica (`netlify.toml` solo copia los archivos del sitio).

## Trampas conocidas

- **Un contenedor `display:flex/grid` con texto suelto + `<strong>`/`<a>`/`<code>`** convierte cada pedazo en un ítem separado y el texto se desarma. Envolver el contenido en un `<span>`. Ya pasó dos veces.
- **Encapsular `:hover` en media queries** puede partir selectores agrupados (`.a.active, .a:hover`). Revisar que no queden selectores huérfanos.
- El **panel del navegador de las herramientas congela las transiciones** cuando está oculto: medir con `*{transition:none!important}`.
- **gviz de Google Sheets** borra valores si una columna mezcla tipos. Para config se usa la API, no gviz.
- **Header en anchos intermedios (640–1100):** entre tablets y celulares acostados la fila no entraba (marca cortada, buscador aplastado). Por eso `.header-nav` se oculta bajo 900 px, las etiquetas "Mi pedido"/"Mi cuenta" bajo 1100 px, y en celular apaisado (alto ≤ 520) el header deja de ser fijo.
- **`aria-label` sobre un `<span>` no lo lee nadie.** El nombre accesible del carrito se pone en el botón (`actualizarUIGlobal`).
- **Abrir `index.html` con doble clic (`file://`)** no puede leer la planilla (CORS) y muestra la copia de respaldo. Probar siempre con un servidor: `python -m http.server 8123`.

## Pendientes (en orden)

0. **Antes de instalar:** correr `node tests/apps-script-harness.js` (debe dar 0 fallas).
1. **Instalar los Apps Script** siguiendo `guias/PANEL-Y-CUENTAS.md`, agregar el mail de la hermana en `ADMINS` y pegar la URL en `API_URL`. Corregir lo que falle en el primer uso real.
2. **Planilla:** corregir las 5 descripciones que dicen "pintada a mano" (Virgen de Luján, Maceta Corazón, Gauchito Gil, Ángel Custodio, Muñequita Quinceañera). Solo 4 de 45 productos tienen foto.
3. **Probar en un iPhone y un Android reales** (scroll bloqueado, notch, zoom, teclado).
4. **Al publicar en Netlify** (conectado al repo; `netlify.toml` ya filtra los archivos): poner en `og:image` / `og:url` la URL absoluta (`https://…/og-image.jpg`), o WhatsApp no muestra la vista previa.
5. Revisar si de verdad se aceptan los medios de pago que muestra el inicio (Visa, Mastercard, Mercado Pago).
6. Mejoras propuestas y no hechas: 41% del texto por debajo de 12px (se mantuvo por el look), 65 colores escritos a mano en el CSS.
