# Ver y publicar el catálogo

El catálogo lee la planilla de Google desde el navegador, y Google solo lo permite cuando la página está servida por **http/https**. Si abrís `index.html` con doble clic (`file://`), la lectura se bloquea y el sitio muestra una **copia de respaldo** con un aviso.

## Verlo en tu computadora

En una terminal, dentro de la carpeta del proyecto:

```bash
python -m http.server 8123
```

Después abrí `http://localhost:8123` en el navegador.

Para probarlo en tu celular, conectado al mismo wifi, abrí `http://IP-DE-TU-PC:8123`. La IP de la PC la ves con `ipconfig`.

## Publicarlo (cuando esté terminado)

**Netlify, conectado al repositorio de GitHub** (recomendado):

1. Entrá a app.netlify.com → **Add new site → Import an existing project → GitHub** y elegí el repositorio (puede ser privado).
2. Build command: vacío. Publish directory: `.` (la raíz).
3. Cada cambio que subas a GitHub se publica solo.

Antes de la primera publicación:
- En `index.html`, cambiá `og:image` por la dirección completa, por ejemplo `https://lulalujan.netlify.app/og-image.jpg`. Con una ruta relativa, WhatsApp no muestra la vista previa del link.
- Pegá la URL de la API en `API_URL` (ver `PANEL-Y-CUENTAS.md`).

## Recordá

- La planilla de productos tiene que estar compartida como "**Cualquier persona con el enlace**", en modo lector.
- La planilla de **pedidos y clientas es privada**: no se comparte con link.
