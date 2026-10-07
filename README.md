# Lula Luján Creaciones · Catálogo online

Catálogo web de figuras de yeso **sin pintar**. Las clientas arman su pedido desde el celular y lo envían por WhatsApp; la dueña administra todo desde un panel propio, sin tocar código.

## Qué hace

**Para las clientas**
- Inicio con destacados y categorías, y tienda con buscador (sin importar los acentos), filtros, orden y paginación
- Ficha de producto con galería, presentación (unidad, pack ×10, pack ×20, con el ahorro del pack) y cantidad
- Carrito que se conserva al salir y volver
- Pedido por WhatsApp con número de pedido, seña y resto calculados, y punto de encuentro
- Mínimo de compra por punto de encuentro
- Cuenta opcional (WhatsApp + PIN) para ver sus pedidos y en qué estado están

**Para la dueña (panel "Mi catálogo")**
- Cargar, editar, pausar y destacar productos desde el celular
- Subir fotos: se achican solas y quedan en su Drive
- Ver los pedidos y cambiarles el estado (Nuevo → … → Entregado)
- Ajustes sin tocar código: WhatsApp, % de seña, puntos de encuentro y sus mínimos, aviso superior y modo vacaciones

## Estructura

```
index.html            Página (vistas Inicio y Tienda, carrito, ficha y cuenta)
style.css             Estilos, mobile-first
script.js             Toda la lógica (vanilla JS, sin dependencias)
netlify.toml          Qué archivos se publican en Netlify (solo los del sitio)
logo-header.png       Logo del header (versión liviana)
favicon.png           Ícono de la pestaña
og-image.jpg          Vista previa al compartir el link
Logo.png              Logo original en alta resolución (fuente de los anteriores)
apps-script/
  panel/              Panel de administración (Apps Script, en la planilla de productos)
  api/                API de pedidos, cuentas y configuración (Apps Script, en la planilla privada)
tests/
  apps-script-harness.js  Prueba la lógica de los Apps Script sin Google (node tests/apps-script-harness.js)
  panel-preview.html      Muestra el panel con datos de ejemplo (sin Google)
guias/
  PANEL-Y-CUENTAS.md  Instalación del panel y la API, paso a paso
  PUBLICAR-CATALOGO.md Cómo verlo en local y cómo publicarlo
CLAUDE.md             Contexto y decisiones del proyecto (lo lee Claude Code)
```

## Probarlo en la computadora

```bash
python -m http.server 8123
```

y abrir `http://localhost:8123`. Con doble clic sobre `index.html` no funciona: el navegador no deja leer Google Sheets desde un archivo local, así que se ve la copia de respaldo.

## Configuración

En `script.js`, bloque **CONFIGURACIÓN**:

| Constante | Qué es |
|---|---|
| `SHEET_CSV_URL` | Planilla de productos exportada como CSV |
| `API_URL` | URL de la API de Apps Script. Vacía = sin pedidos registrados, sin cuentas y sin config remota |

Todo lo demás (WhatsApp, seña, puntos, pausa) se edita desde el panel.
