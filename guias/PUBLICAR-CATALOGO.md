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
2. No hace falta completar nada: el comando de build y la carpeta a publicar ya están en `netlify.toml`. Solo se publican los archivos del sitio (quedan afuera `apps-script/`, las guías y el logo original de 6 MB).
3. Cada cambio que subas a GitHub se publica solo.

Si más adelante el sitio usa un archivo nuevo (otra imagen, otro `.js`), hay que sumarlo al comando `cp` de `netlify.toml`, o no se publica.

Antes de la primera publicación:
- En `index.html`, cambiá `og:image` por la dirección completa, por ejemplo `https://lulalujan.netlify.app/og-image.jpg`. Con una ruta relativa, WhatsApp no muestra la vista previa del link.
- Pegá la URL de la API en `API_URL` (ver `PANEL-Y-CUENTAS.md`).

## Recordá

- La planilla de productos tiene que estar compartida como "**Cualquier persona con el enlace**", en modo lector.
- La planilla de **pedidos y clientas es privada**: no se comparte con link.
