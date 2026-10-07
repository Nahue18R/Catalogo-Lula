/**
 * ================================================================
 * LULA LUJÁN CREACIONES — script.js
 * SPA en Vanilla JavaScript (ES6+) sin dependencias externas.
 *
 * Módulos lógicos:
 *   1. Datos de productos (array de prueba → futuro Google Apps Script)
 *   2. Estado global de la aplicación
 *   3. Helpers (formato de moneda, URL de imagen)
 *   4. Renderizado de productos y chips de filtro
 *   5. Lógica del carrito (agregar, cambiar cantidad, totales)
 *   6. Panel del carrito (abrir, cerrar, renderizar)
 *   7. Checkout y validaciones (incluyendo Regla Merlo)
 *   8. Generación del mensaje de WhatsApp
 *   9. Inicialización de la app
 * ================================================================
 */

'use strict';

/* ================================================================
   1. DATOS DE PRODUCTOS
   PRODUCTOS arranca vacío y se llena desde la planilla de Google
   (ver cargarProductos). CSV_EMERGENCIA es la copia embebida que se
   usa si la planilla no responde y no hay copia guardada.
================================================================ */
/** Se llena al cargar (planilla, copia guardada o respaldo embebido). */
const PRODUCTOS = [];

/* ================================================================
   1 bis. RESPALDO EMBEBIDO DEL CATÁLOGO (copia de la planilla)
   Copia del Google Sheet que viaja dentro del archivo. Se usa cuando
   el fetch a Google Sheets no se puede hacer — por ejemplo al abrir
   index.html desde el disco con doble clic, donde el navegador bloquea
   la lectura por CORS — o cuando no hay copia en localStorage aún.

   Cuando la página corre publicada en internet, SIEMPRE se muestra la
   versión en vivo de la planilla y este respaldo queda sin usar.
=============================================================== */
const CSV_EMERGENCIA = `id,nombre,categoria,descripcion,medidas,precio_unitario,precio_pack_10,precio_pack_20,imagen_id,activo,destacado
BandejaMacetitas,Bandeja + Macetitas/Porta vela + Deco chica,Combo,"Bandeja, Macetitas o Porta vela y Deco chica",,$600,"$5,000","$9,000",https://drive.google.com/file/d/1D76gSCSO3EIQAmS8wV4iAfr_QfZA-56m/view?usp=drive_link,SI,
BandejaFlorero,Bandeja + Florero + Porta sahumerios,Combo,"Bandeja, florero y porta sahumerios",,"$1,200","$10,000","$18,000",https://drive.google.com/file/d/106tq3T2RVXuneWx46uDY9ymULvifbLiJ/view?usp=drive_link,SI,
BandejaPorta,BDJ + mini porta sahumerios,Combo,Bandeja y mini porta sahumerios (Animalitos),"BDJ 11x11cm, PS 4cm",$750,"$6,300","$11,500",https://drive.google.com/file/d/16E-v0oArx0g1RgJFkwOOGdNGVZQp5goQ/view?usp=drive_link,SI,
BandejaMacetitasPorta,Bandeja + Macetitas/Porta vela + Porta sahumerios,Combo,"Bandeja, macetitas/porta vela y porta sahumerios",,$850,"$7,000","$12,500",https://drive.google.com/file/d/1kkxz-qVK7Rm68gZ0fA96wRI5Yhs_9jTw/view?usp=drive_link,SI,
5,Mix Safari,Combo,Bandeja y Porta Sahumerios,"BDJ 11x11 cm, PS 6-7cm",$850,"$7,000","$12,500",,SI,SI
6,Bandeja + Maceta + PS Capibara,Combo,"Bandeja, maceta y porta sahumerio capibara","BDJ 17cm, Mac 5x5cm, PS 5.8cm",$900,"$7,500","$13,500",,SI,
7,Bandeja + Maceta + PS,Combo,"Bandeja, maceta y porta sahumerio","BDJ 18cm, Mac 5x5cm, PS 5cm",$900,"$7,500","$13,500",,SI,
8,Bandeja + Maceta + PS Básicos,Combo,"Bandeja, maceta y porta sahumerios básicos",,$900,"$7,500","$13,500",,SI,
9,Bandeja + PS Nena Vestido,Combo,Bandeja y porta sahumerios nena vestido,"BDJ 11x11cm, PS 9cm",$950,"$8,000","$14,500",,SI,
10,Bandeja Corazón + Alajeros Corazón Rosa,Combo,Bandeja corazón línea y alajeros corazón rosa,,$950,"$8,000","$14,500",,SI,
11,Bandeja + Caracol,Combo,Bandeja y caracol,"BDJ 11x11cm, Caracol 11x4.5cm","$1,000","$8,500","$15,500",,SI,
12,Bandeja + Floreros,Combo,Bandeja y floreros lisos/rayados,"BDJ 11x11cm, Florero 10cm","$1,000","$8,500","$15,500",,SI,
13,Bandeja Perla + Contenedor Burbuja,Combo,Bandeja perla y contenedor burbuja,"BDJ 13cm, Contenedor 5.6x8cm","$1,000","$8,500","$15,500",,SI,
14,Bandeja Perla + Loto Pétalo,Combo,Bandeja perla y loto pétalo,,"$1,000","$8,500","$15,500",,SI,
15,Bandeja Perla + Alajeros Corazón,Combo,Bandeja perla y alajeros corazón rosa,,"$1,000","$8,500","$15,500",,SI,
16,Bandeja + Entramado,Combo,Bandeja y entramado,"BDJ 13cm, Entramado 7cm","$1,000","$8,500","$15,500",,SI,
17,Bandeja Ovalada + Maceta/Vela + PS Mariposa,Combo,"Bandeja ovalada, macetita o porta vela y porta sahumerio mariposa",,"$1,000","$8,500","$15,500",,SI,
18,Bandejitas + PS Seleccionados,Combo,Bandejitas y PS elefante o mujer,"BDJ 11x11cm, PS elefante 8.5cm o mujer 9.5cm","$1,100","$9,000","$16,500",,SI,
19,Bandeja + Maceta Surtida + PS Conejo,Combo,"Bandeja, macetas surtidas y PS conejo silueta","BDJ 18cm, PS 12x8cm","$1,150","$9,500","$17,500",,SI,
20,Bandeja Ovalada + Loto Pétalos + PS,Combo,"Bandeja ovalada, loto pétalos y PS básicos",,"$1,200","$10,000","$18,000",,SI,SI
21,Bandeja Ovalada + PS Conejo + Maceta Rombo,Combo,"Bandeja ovalada, PS conejo silueta y porta vela/maceta rombo",,"$1,200","$10,000","$18,000",,SI,
22,Bandeja + Maceta Rombo + PS Conejito,Combo,"Bandeja, maceta rombo y PS conejito flores","BDJ 18cm, Mac 3x8cm, PS 7x8cm","$1,200","$10,000","$18,000",,SI,
23,Bandeja + Florero Gordito,Combo,Bandeja y florero gordito,"BDJ 11x11cm, Florero 10cm","$1,200","$10,000","$18,000",,SI,
24,Bandeja + Caramelera + PS Stich,Combo,"Bandeja, caramelera y PS Stich","BDJ 17cm, Caramelera 10x8cm, PS 5cm","$1,200","$10,000","$18,000",,SI,
25,Box para pintar,Box,Cuenco y 5 figuras surtidas para pintar,,"$1,200","$10,000","$18,000",,SI,
26,Bandeja + Caracol + Sirena,Combo,"Bandeja, caracol, deco sirena mediana y deco chica","BDJ 18cm, Caracol 11x4.5cm, Sirena 8.5cm, Deco 5cm","$1,250","$10,500","$19,000",,SI,
27,Bandeja Ovalada + Carameleras + PS Kitty,Combo,"Bandeja ovalada lisa, carameleras y PS Kittys surtidas",,"$1,300","$11,000","$20,000",,SI,
28,Bandeja Ovalada + Loto + Floreros,Combo,"Bandeja ovalada, loto y floreros",,"$1,300","$11,000","$20,000",,SI,SI
29,Bandeja + PS + Florero,Combo,"Bandeja, porta sahumerio y florero","BDJ 17/18cm, PS 6.5x5cm, Florero 10cm","$1,450","$12,000","$22,000",,SI,
30,Bandeja + Maceta Cruz + Florero Cruz,Combo,"Bandeja, maceta con cruz y florero con cruz","BDJ 18cm, Mac 5x5cm, Florero 10cm","$1,550","$13,000","$24,000",,SI,
31,Bandeja + Alajero Ángeles + PS Angelito,Combo,"Bandeja, alajero ángeles y PS angelito","BDJ 17cm, Alajero 7.8x8cm, PS 5x5cm","$1,550","$13,000","$24,000",,SI,
32,Bandeja Loto + Caramelera + Caracol + Florero,Combo,"Bandeja redonda loto, caramelera, caracol y florero gordito","BDJ 19cm, Caramelera 10x8cm, Caracol 11x4.5cm, Florero 10cm","$2,500","$23,000","$42,000",,SI,
33,Bandeja Loto + Florero + Arcoíris + PS,Combo,"Bandeja redonda loto, florero gordito, deco arcoíris XL y PS loto mediano","BDJ 19cm, Florero 10cm, Arcoíris 14.5cm","$2,600","$24,000","$44,000",,SI,
34,Virgen de Luján,Santería,"Virgen de Luján en yeso, lista para pintar con los colores tradicionales celeste y blanco.",20 cm,"$2,800","$24,000","$44,000",,SI,SI
35,San Expedito,Santería,Figura de yeso de San Expedito con base decorada en rojo y detalles dorados.,18 cm,"$2,500","$22,000","$40,000",,SI,SI
36,Maceta Rústica,Macetas,"Maceta de yeso texturizada estilo rústico, ideal para plantas de interior.",15 cm de diámetro,"$1,800","$15,500","$28,000",,SI,NO
37,Maceta Corazón,Macetas,"Maceta de yeso con forma de corazón, lista para pintar en los colores que quieras. Ideal para regalar.",12 cm,"$2,200","$19,000","$35,000",,SI,NO
38,Souvenir Mini Novia,Souvenirs,"Figura de novia en miniatura, ideal para bodas y 15 años. Personalizable.",8 cm,$900,"$7,500","$13,000",,SI,SI
39,Souvenir Mini Novio,Souvenirs,Figura de novio en miniatura para souvenirs de bodas y 15 años.,8 cm,$900,"$7,500","$13,000",,SI,NO
40,Gauchito Gil,Santería,"Figura del Gauchito Gil en yeso, lista para pintar: la bandera roja y los detalles los elegís vos.",22 cm,"$3,200","$28,000","$52,000",,SI,NO
41,Marco Floral Vintage,Decoración,Marco decorativo con relieve floral vintage. Ideal para fotos o espejos.,25 x 30 cm,"$3,500","$30,000","$56,000",,NO,NO
42,Ángel Custodio,Santería,"Ángel de la guarda en yeso con relieve, listo para pintar y dorar a tu gusto.",16 cm,"$2,600","$23,000","$42,000",,SI,NO
43,Souvenir Cigüeña,Souvenirs,Cigüeña decorativa para baby shower y recuerditos de nacimiento. Personalizable.,10 cm,"$1,100","$9,000","$16,500",,SI,NO
44,Maceta Elefante,Macetas,"Maceta con forma de elefante, símbolo de buena suerte y abundancia.",14 cm,"$2,400","$21,000","$38,000",,NO,NO
45,Muñequita Quinceañera,Souvenirs,"Figura de 15 años en yeso, lista para pintar. El color del vestido lo elegís vos.",9 cm,"$1,000","$8,500","$15,000",,SI,SI`;

/* ================================================================
   2. ESTADO GLOBAL DE LA APLICACIÓN
   Centraliza toda la información mutable en un único objeto.
================================================================ */
const state = {
  /**
   * Array de items en el carrito.
   * Cada item: { productoId, nombre, tipo, tipoLabel, precio, cantidad, imagen_id }
   *   tipo      → 'unidad' | 'pack10' | 'pack20'
   *   tipoLabel → etiqueta legible para el usuario
   */
  carrito: [],

  /** Texto ingresado en la barra de búsqueda */
  textoBusqueda: '',

  /** Criterio del selector de orden del catálogo */
  orden: 'destacados',

  /**
   * Tipo de compra elegido en cada card: { [productoId]: 'unidad'|'pack10'|'pack20' }
   * Vive acá y no en el DOM para que no se pierda al re-renderizar la grilla
   * (buscar o cambiar de categoría regenera todo el HTML).
   */
  seleccion: {},

  /** Vista activa: 'home' (inicio con destacados) | 'catalogo' (lista de compra) */
  vista: 'home',

  /** Página actual de la grilla del catálogo (1..N) */
  pagina: 1,

  /**
   * Filtros del sidebar (estilo The Ancient Home).
   *   categorias      → categorías tildadas; vacío = todas
   *   precioMin/Max   → acotan precio_unitario (0..Infinity = sin límite)
   *   soloDisponibles → oculta los productos sin stock
   *   soloDestacados  → muestra solo los destacados
   *   umbrales        → { min, max } reales del catálogo (para el slider)
   */
  filtros: {
    categorias: [],
    precioMin: 0,
    precioMax: Infinity,
    soloDisponibles: false,
    soloDestacados: false,
    umbrales: null,
  },

  /** Vista del catálogo: 'large' (grande) | 'small' (compacta) | 'list' (lista) */
  vistaCatalogo: 'large',

  /** Id del producto abierto en la ficha (null si está cerrada) */
  productoActivo: null,

  /** Cantidad elegida en la ficha antes de agregar al carrito */
  cantidadDetalle: 1,
};

/* ================================================================
   3. CONSTANTES DE NEGOCIO
================================================================ */
/* Estos valores son el RESPALDO. Los reales se leen de las pestañas
   Config y Puntos de la planilla (ver cargarConfig), que tu hermana
   edita desde su panel. Si la API no responde, se usan estos. */

/** Porcentaje de seña al confirmar el pedido (0.10 = 10%) */
let PORCENTAJE_SENA = 0.10;

/** Número de WhatsApp al que se envía el pedido (código país + número) */
let WHATSAPP_NUMBER = '5491134862998';

/** Interruptores de la tienda (pestaña Config) */
const CONFIG = {
  tiendaAbierta: true,
  mensajePausa:  'Estamos de vacaciones. Volvemos a tomar pedidos pronto.',
  cuentas:       true,
};

/** Mapa tipo de compra → campo de precio en el objeto producto */
const PRECIO_POR_TIPO = {
  unidad: 'precio_unitario',
  pack10: 'precio_pack_10',
  pack20: 'precio_pack_20',
};

/** Etiquetas legibles de cada tipo de compra */
const TIPO_LABELS = {
  unidad: 'Unidad',
  pack10: 'Pack ×10',
  pack20: 'Pack ×20',
};

/** Productos por página en la grilla del catálogo (como la referencia: 12) */
const PAGINACION_POR_PAGINA = 12;

/* ----------------------------------------------------------------
   CONFIGURACIÓN — los dos únicos valores que hay que tocar
   para conectar la planilla y las fotos. Ver guias/PANEL-Y-CUENTAS.md.
---------------------------------------------------------------- */

/**
 * URL de la planilla de Google como CSV.
 * Usamos el endpoint /export?format=csv (envía CORS y siempre trae los
 * datos más recientes, sin necesidad de "publicar en la web").
 * ¡LISTO! Tu familia editará esto directamente desde Sheets.
 */
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1as8bSvyKVq1srya6G9uGmjshHArxB4D_32bFb96bn5E/export?format=csv&gid=0';

/**
 * Base URL para imágenes desde Google Drive.
 * ¡LISTO! Las fotos están en tu Drive y se cargarán automáticamente.
 */
const DRIVE_IMAGE_BASE = 'https://drive.google.com/thumbnail?id';

/** Cada cuánto se vuelve a consultar la planilla (5 minutos) */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Claves de localStorage (versionadas: si cambia la forma del dato, subir a v2) */
const STORAGE_CARRITO = 'lula.carrito.v1';
const STORAGE_DATOS   = 'lula.datos.v1';
const STORAGE_CATALOGO = 'lula.catalogo.v1';
const STORAGE_UI      = 'lula.ui.v1';

/** IDs de los campos del formulario de checkout que se persisten */
const CAMPOS_FORM = ['campo-nombre', 'campo-telefono', 'campo-punto'];

/**
 * Puntos de encuentro (respaldo de la pestaña Puntos).
 * Cada punto puede tener su propio pedido mínimo: la vieja "Regla Merlo"
 * ahora es un dato más, no una excepción escrita en el código.
 */
let PUNTOS_ENTREGA = [
  'Esc 61', 'YPF Mariló', 'Cruce Castelar', 'Moreno Hospital', 'Barrio Güemes',
  'San Miguel Catedral', 'Ex Vea', 'Morón Anses', 'Merlo Coppel', 'Feria del Zanjón',
].map(nombre => ({ nombre, minimo: nombre === 'Merlo Coppel' ? 12000 : 0, activo: true, detalle: '' }));

/**
 * URL de la API de pedidos y cuentas (Apps Script "Lula API").
 * Vacía = el catálogo funciona igual, pero sin registro de pedidos,
 * sin cuentas y sin configuración remota. Ver guias/PANEL-Y-CUENTAS.md.
 */
const API_URL = '';

const STORAGE_CONFIG = 'lula.config.v1';
const STORAGE_SESION = 'lula.sesion.v1';

/** Porcentaje de seña como texto ("10%") */
const pctSena = () => `${(PORCENTAJE_SENA * 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;

/**
 * Seña en pesos: porcentaje sobre el total, redondeada hacia arriba.
 * Con enteros (centésimas de punto) y no con total * 0.07: esa cuenta da
 * 7.000000000000001 y el redondeo hacia arriba sumaba $1 de más.
 */
const calcularSena = (total) =>
  Math.ceil((total * Math.round(PORCENTAJE_SENA * 10000)) / 10000);

/** Datos del punto de encuentro elegido (o null) */
const buscarPunto = (nombre) => PUNTOS_ENTREGA.find(p => p.nombre === nombre) || null;

/* ================================================================
   4. HELPERS
================================================================ */

/**
 * Devuelve una versión de `fn` que espera `ms` sin nuevas llamadas antes
 * de ejecutarse. Para no redibujar la grilla en cada tecla o cada pixel
 * de arrastre del slider.
 * @param {Function} fn
 * @param {number} ms
 */
const debounce = (fn, ms) => {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};

/**
 * Formatea un número como moneda argentina (ARS).
 * @param {number} n - Monto a formatear
 * @returns {string} Ej: "$2.800"
 */
const formatCurrency = (n) =>
  new Intl.NumberFormat('es-AR', {
    style:                 'currency',
    currency:              'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Escapa texto antes de inyectarlo en HTML.
 *
 * Obligatorio ahora que los datos vienen de una planilla: un producto llamado
 * Maceta 15" corazón rompía el atributo title y desarmaba la tarjeta entera.
 * @param {*} s
 * @returns {string}
 */
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Formatea el número de WhatsApp para mostrarlo legible (p. ej. "11 3450-1054"). */
const formatearTelefono = () => {
  let n = String(WHATSAPP_NUMBER).replace(/\D/g, '');
  if (n.startsWith('54')) n = n.slice(2);
  if (n.length === 11 && n.startsWith('9')) n = n.slice(1);
  if (n.length === 10) return `${n.slice(0, 2)} ${n.slice(2, 6)}-${n.slice(6)}`;
  return n;
};

/** Imagen de reemplazo cuando la foto real no carga (SVG gris, sin pedido de red) */
const IMG_FALLBACK =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E" +
  "%3Crect width='100' height='100' fill='%23f2f2f2'/%3E" +
  "%3Ccircle cx='37' cy='38' r='7' fill='%23dcdcdc'/%3E" +
  "%3Cpath d='M22 70l18-22 12 14 10-11 16 19z' fill='%23dcdcdc'/%3E%3C/svg%3E";

/* ----------------------------------------------------------------
   RELLENO DE FOTOS POR CATEGORÍA
   Mientras un producto no tiene foto, en vez de un cuadrado gris
   se muestra un dibujo de su rubro y "Foto próximamente".
   Son SVG armados acá (sin pedidos de red, funcionan sin conexión).
---------------------------------------------------------------- */
const ICONOS_CATEGORIA = {
  // bandeja con maceta y porta sahumerio
  combo: '<rect x="20" y="58" width="60" height="8" rx="4"/><path d="M33 58l2-14h12l2 14"/><path d="M41 44c0-8-4-10-6-12M41 44c0-8 4-10 6-12"/><rect x="58" y="47" width="12" height="11" rx="2"/><path d="M64 47l3-14"/>',
  // caja con tapa y moño
  box: '<rect x="26" y="42" width="48" height="26" rx="3"/><rect x="21" y="33" width="58" height="10" rx="3"/><path d="M50 33v35"/><path d="M50 33c-4-8-12-8-12-3s8 3 12 3zM50 33c4-8 12-8 12-3s-8 3-12 3z"/>',
  // figura con aureola sobre una base
  santeria: '<circle cx="50" cy="29" r="6.5"/><ellipse cx="50" cy="29" rx="13" ry="13" stroke-dasharray="2 3"/><path d="M39 66c0-15 4-23 11-23s11 8 11 23z"/><rect x="33" y="66" width="34" height="5" rx="2.5"/>',
  // maceta con planta
  macetas: '<rect x="30" y="44" width="40" height="7" rx="2.5"/><path d="M34 51h32l-4 19H38z"/><path d="M50 44V26M50 40c0-8-6-12-11-14M50 40c0-8 6-12 11-14"/>',
  // corazón
  souvenirs: '<path d="M50 70C28 54 28 36 40 32c6-2 10 3 10 6 0-3 4-8 10-6 12 4 12 22-10 38z"/>',
  // marco con paisaje
  decoracion: '<rect x="26" y="28" width="48" height="42" rx="2"/><rect x="33" y="35" width="34" height="28" rx="1"/><path d="M35 58l9-10 7 7 5-5 9 8"/><circle cx="58" cy="43" r="3"/>',
  // figura genérica: un jarrón
  generico: '<path d="M42 30h16M44 30c0 6-8 8-8 20 0 12 5 20 14 20s14-8 14-20c0-12-8-14-8-20"/>',
};

const _cachePlaceholder = {};

/**
 * Dibujo de relleno para un producto sin foto.
 * @param {string} categoria
 * @param {boolean} conTexto - "Foto próximamente" (se omite en miniaturas, donde no se lee)
 */
const placeholderCategoria = (categoria, conTexto = true) => {
  const clave = norm(categoria);
  const icono = ICONOS_CATEGORIA[clave] ? clave : 'generico';
  const k = icono + (conTexto ? '+t' : '');
  if (_cachePlaceholder[k]) return _cachePlaceholder[k];

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<rect width="100" height="100" fill="#f4eee6"/>` +
    `<g transform="translate(0 ${conTexto ? -4 : 0})" fill="none" stroke="#a38358" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONOS_CATEGORIA[icono]}</g>` +
    (conTexto ? `<text x="50" y="86" text-anchor="middle" font-family="Montserrat,Arial,sans-serif" font-size="6.2" font-weight="600" letter-spacing=".6" fill="#7a5a30">FOTO PRÓXIMAMENTE</text>` : '') +
    `</svg>`;
  return (_cachePlaceholder[k] = 'data:image/svg+xml,' + encodeURIComponent(svg));
};

/** ¿El producto tiene al menos una foto cargada? */
const tieneFoto = (p) => (String(p?.imagen_id ?? '').trim() ? 1 : 0);

/**
 * Foto de un producto, o el relleno de su categoría si todavía no tiene.
 * Sirve también para los ítems del carrito (tienen imagen_id y categoria).
 */
const imagenProducto = (p, ancho = 400) =>
  tieneFoto(p) ? getImageUrl(p.imagen_id, ancho) : placeholderCategoria(p?.categoria, ancho >= 300);

/**
 * Construye la URL de la foto de un producto.
 *
 * Acepta en la columna imagen_id de la planilla:
 *   1. Un enlace "compartir" de Drive (drive.google.com/file/d/ID/view…)
 *   2. Un enlace de Drive con ?id=FILE_ID (o el ID suelto de 28–44 caracteres)
 *   3. Cualquier otra URL completa externa → se usa tal cual
 *   4. Vacío o texto no reconocido → imagen de reemplazo local
 *
 * @param {string} imagenId
 * @returns {string} URL de la imagen
 */
const getImageUrl = (imagenId, ancho = 400) => {
  const id = String(imagenId ?? '').trim();
  if (!id) return IMG_FALLBACK;

  // 1. URL de Google Drive en formato "compartir" (https://drive.google.com/file/d/FILE_ID/view...)
  //    → la convertimos a thumbnail directo, que es lo que un <img> puede mostrar.
  const driveFileMatch = id.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveFileMatch) {
    return `${DRIVE_IMAGE_BASE}=${driveFileMatch[1]}&sz=w${ancho}`;
  }

  // 2. URL de Drive con ?id=FILE_ID (https://drive.google.com/uc?export=view&id=FILE_ID)
  const idParamMatch = id.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) {
    return `${DRIVE_IMAGE_BASE}=${idParamMatch[1]}&sz=w${ancho}`;
  }

  // 3. ID de archivo de Drive directo (ej: 1abc123...) — solo si tiene el
  //    largo típico de un ID de Drive (28–44 caracteres). Así un nombre
  //    común (p. ej. un public_id de Cloudinary) no se confunde con un ID.
  if (/^[a-zA-Z0-9_-]{28,44}$/.test(id)) {
    return `${DRIVE_IMAGE_BASE}=${id}&sz=w${ancho}`;
  }

  // 4. Cualquier otra URL completa externa → se usa tal cual
  if (/^https?:\/\//i.test(id)) return id;

  // 5. Placeholder por defecto (local, sin pedido de red)
  return IMG_FALLBACK;
};

/**
 * Pone una imagen de reemplazo si la foto real falla.
 * Se hace por JS y no con el atributo onerror para no pelear con las comillas
 * del data-URI dentro del HTML.
 * @param {ParentNode} contenedor
 */
const activarFallbackImagenes = (contenedor) => {
  contenedor.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => {
      const ancho = Number(img.getAttribute('width')) || 0;
      img.src = img.dataset.cat !== undefined
        ? placeholderCategoria(img.dataset.cat, ancho >= 150)
        : IMG_FALLBACK;
    }, { once: true });
  });
};

/**
 * Normaliza texto para búsquedas: minúsculas y SIN acentos ni diéresis.
 * Sin esto, buscar "angel" no encuentra "Ángel Custodio" ni "ciguena" a "Cigüeña".
 * NFD separa la letra de su tilde y el regex elimina los diacríticos sueltos.
 * @param {string} s
 * @returns {string}
 */
const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

/**
 * Devuelve el precio de un producto según el tipo de compra.
 * Fuente de verdad: el array PRODUCTOS (nunca el DOM), para que un refresco
 * de precios desde el backend no quede desincronizado con lo que se cobra.
 * @param {Object} producto
 * @param {string} tipo - 'unidad' | 'pack10' | 'pack20'
 * @returns {number}
 */
const getPrecio = (producto, tipo) => {
  // Precio del tipo elegido; si no está o es 0, se cae al precio unitario
  // para que un pack sin precio nunca quede en $0 en el carrito.
  const val = Number(producto?.[PRECIO_POR_TIPO[tipo]]);
  if (Number.isFinite(val) && val > 0) return val;
  const unit = Number(producto?.precio_unitario);
  return Number.isFinite(unit) && unit > 0 ? unit : 0;
};

/**
 * Convierte un id o un nombre en una clave estable y segura para el DOM:
 * minúsculas, sin acentos, solo letras/números/guiones.
 * "Bandeja + Maceta" → "bandeja-maceta", "5" → "5".
 * @param {*} s
 * @returns {string}
 */
const aSlug = (s) =>
  norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/**
 * Busca un producto por id comparando como TEXTO.
 * Los ids pueden venir de la planilla como número ("5") o como palabra
 * ("bandeja-florero"), y del DOM siempre llegan como string: comparar
 * con === sin normalizar era una fuente de "producto no encontrado".
 * @param {*} id
 * @returns {Object|null}
 */
const buscarProducto = (id) => {
  const clave = String(id ?? '');
  return PRODUCTOS.find(p => String(p.id) === clave) || null;
};

/**
 * Rango real de precios unitarios del catálogo (para el slider de precio).
 * @returns {{ min: number, max: number }}
 */
const leerUmbralesPrecio = () => {
  const precios = PRODUCTOS
    .map(p => p.precio_unitario)
    .filter(n => Number.isFinite(n) && n > 0);
  if (!precios.length) return { min: 0, max: 0 };
  return { min: Math.min(...precios), max: Math.max(...precios) };
};

/** Texto del breadcrumb / título: categoría única, todas o varias. */
const textoFiltroActual = () => {
  const cats = state.filtros.categorias;
  if (!cats.length) return 'Todos los productos';
  if (cats.length === 1) return cats[0];
  return 'Varias categorías';
};

/** Filtros "en limpio": ni categorías, ni precio, ni disponibilidad. */
const limpiarFiltros = () => ({
  categorias: [],
  precioMin: 0,
  precioMax: Infinity,
  soloDisponibles: false,
  soloDestacados: false,
  umbrales: state.filtros ? state.filtros.umbrales : null,
});

/* ================================================================
   4 bis. PERSISTENCIA (localStorage)

   El flujo real del negocio es: el cliente arma el pedido, toca "Enviar",
   sale a WhatsApp y vuelve al navegador. Sin esto, al volver encontraba
   el carrito vacío y perdíamos la venta.

   Todo va envuelto en try/catch: en modo incógnito o con el storage lleno
   localStorage lanza excepción, y la app tiene que seguir funcionando
   igual, solo que sin recordar nada.
================================================================ */

/**
 * Guarda el carrito y las selecciones de tipo de compra.
 * Se llama en cada cambio del carrito desde actualizarUIGlobal().
 */
const guardarCarrito = () => {
  try {
    localStorage.setItem(STORAGE_CARRITO, JSON.stringify({
      carrito:   state.carrito,
      seleccion: state.seleccion,
    }));
  } catch (err) {
    /* Sin persistencia: la app sigue andando normalmente. */
  }
};

/**
 * Restaura el carrito guardado y lo re-sincroniza contra PRODUCTOS.
 *
 * La re-sincronización es importante: entre una visita y otra un producto
 * pudo cambiar de precio, de nombre o darse de baja. Nunca confiamos en el
 * precio guardado en el storage, siempre lo releemos del catálogo actual.
 */
/** Lo que cambió en el carrito guardado desde la última visita (para avisarle a la clienta). */
const avisoCarrito = { quitados: 0, precios: 0 };

const cargarCarrito = () => {
  let guardado = null;
  avisoCarrito.quitados = 0;
  avisoCarrito.precios  = 0;

  try {
    guardado = JSON.parse(localStorage.getItem(STORAGE_CARRITO) || 'null');
  } catch (err) {
    return; // JSON corrupto o storage bloqueado → arrancamos vacíos
  }

  if (!guardado || !Array.isArray(guardado.carrito)) return;

  state.carrito = guardado.carrito.reduce((acc, item) => {
    const producto = buscarProducto(item.productoId);

    // Descartamos productos borrados, pausados o con un tipo desconocido
    if (!producto || !producto.activo || !PRECIO_POR_TIPO[item.tipo]) {
      avisoCarrito.quitados++;
      return acc;
    }

    // Tope de 99 también acá: un storage alterado no puede traer 1.000.000 de unidades
    const cantidad = Math.min(99, Math.max(1, Math.floor(Number(item.cantidad) || 1)));
    const precio   = getPrecio(producto, item.tipo);   // precio actual
    if (Number(item.precio) > 0 && Number(item.precio) !== precio) avisoCarrito.precios++;

    acc.push({
      productoId: producto.id,
      nombre:     producto.nombre,              // nombre actual
      tipo:       item.tipo,
      tipoLabel:  TIPO_LABELS[item.tipo],
      precio,
      cantidad,
      imagen_id:  producto.imagen_id,
      categoria:  producto.categoria,
    });
    return acc;
  }, []);

  if (guardado.seleccion && typeof guardado.seleccion === 'object') {
    state.seleccion = guardado.seleccion;
  }
};

/**
 * Guarda nombre, teléfono y punto de encuentro para no hacer que el
 * cliente los reescriba en cada pedido.
 */
const guardarDatosCliente = () => {
  try {
    const datos = {};
    CAMPOS_FORM.forEach(id => {
      const el = document.getElementById(id);
      if (el) datos[id] = el.value;
    });
    localStorage.setItem(STORAGE_DATOS, JSON.stringify(datos));
  } catch (err) {
    /* Silencioso a propósito. */
  }
};

/** Rellena el formulario de checkout con los datos de la visita anterior. */
const cargarDatosCliente = () => {
  try {
    const datos = JSON.parse(localStorage.getItem(STORAGE_DATOS) || 'null');
    if (!datos) return;

    CAMPOS_FORM.forEach(id => {
      const el = document.getElementById(id);
      // Si el punto guardado ya no existe como <option>, el select queda vacío solo
      if (el && typeof datos[id] === 'string') el.value = datos[id];
    });
  } catch (err) {
    /* Silencioso a propósito. */
  }
};

/* ================================================================
   BLOQUEO DE SCROLL DEL FONDO
   body{overflow:hidden} no frena el scroll en iOS Safari: con el carrito
   abierto la página de atrás se seguía moviendo. Se fija el body en su
   posición actual y al cerrar se devuelve el scroll donde estaba.
   Con contador, porque carrito, ficha y filtros pueden anidarse.
================================================================ */
let bloqueosScroll = 0;
let scrollGuardado = 0;

const bloquearScroll = () => {
  if (bloqueosScroll++ > 0) return;
  scrollGuardado = window.scrollY;
  const b = document.body.style;
  b.position = 'fixed';
  b.top      = `-${scrollGuardado}px`;
  b.left     = '0';
  b.right    = '0';
  b.width    = '100%';
};

const desbloquearScroll = () => {
  if (bloqueosScroll === 0 || --bloqueosScroll > 0) return;
  const b = document.body.style;
  b.position = b.top = b.left = b.right = b.width = '';
  window.scrollTo(0, scrollGuardado);
};

/* ================================================================
   BOTÓN "ATRÁS" DEL CELULAR
   Al abrir la ficha o el carrito se agrega una entrada al historial:
   el gesto/botón atrás los cierra en vez de sacar a la clienta del sitio.
================================================================ */
const abrirEnHistorial = (modal) => {
  // Siempre se agrega una entrada. Antes se omitía si el estado "ya decía" lo
  // mismo, y un estado viejo (por recargar la página con un panel abierto)
  // hacía que cerrar el panel retrocediera de página en vez de cerrarlo.
  history.pushState({ modal }, '');
};

const cerrarEnHistorial = (modal) => {
  if (history.state && history.state.modal === modal) history.back();
};

/**
 * Espera a que el navegador termine de procesar un "atrás" antes de abrir otro
 * panel (ficha → carrito, carrito → cuenta). Antes se esperaban 60 ms a ojo.
 */
const esperarHistorial = () => new Promise((resolver) => {
  const listo = () => { window.removeEventListener('popstate', listo); clearTimeout(t); resolver(); };
  const t = setTimeout(listo, 150);   // por si no hay "atrás" que esperar
  window.addEventListener('popstate', listo);
});

const PANEL_DE = { ficha: 'product-detail', carrito: 'cart-panel', cuenta: 'cuenta-panel' };
const panelAbierto = (id) => !!document.getElementById(id)?.classList.contains('open');

/** El historial manda: se cierra todo panel que no sea el de la entrada actual. */
window.addEventListener('popstate', () => {
  const m = history.state && history.state.modal;
  if (m !== 'ficha'   && panelAbierto(PANEL_DE.ficha))   cerrarProducto(true);
  if (m !== 'carrito' && panelAbierto(PANEL_DE.carrito)) cerrarCarrito(true);
  if (m !== 'cuenta'  && panelAbierto(PANEL_DE.cuenta))  cerrarCuenta(true);
  // Entrada "fantasma" (se avanzó hacia un panel que ya no está abierto): se
  // limpia, si no el próximo cierre sacaría a la clienta de la página.
  if (m && PANEL_DE[m] && !panelAbierto(PANEL_DE[m])) history.replaceState(null, '');
});

/* ================================================================
   AISLAR EL FONDO MIENTRAS HAY UN PANEL ABIERTO
   Con el atributo "inert" el resto de la página no se puede tabular, ni
   leer con lector de pantalla, ni tocar con el teclado: sin esto, con el
   carrito abierto el Tab se escapaba a los productos de atrás. Al cerrar,
   el foco vuelve al botón que abrió el panel.
================================================================ */
let focoPrevio = null;

const aislarFondo = (panel) => {
  focoPrevio = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.querySelectorAll('body > *').forEach((el) => {
    const conservar = el === panel || el.contains(panel) ||
      ['cart-overlay', 'filtros-overlay', 'toast'].includes(el.id) ||
      el.tagName === 'SCRIPT';
    el.toggleAttribute('inert', !conservar);
  });
};

const restaurarFondo = () => {
  document.querySelectorAll('body > [inert]').forEach((el) => el.removeAttribute('inert'));
  if (focoPrevio && document.contains(focoPrevio)) focoPrevio.focus({ preventScroll: true });
  focoPrevio = null;
};

/* ================================================================
   4 bis. VISTA INICIO Y NAVEGACIÓN (home estilo The Ancient Home)
   Hero + carrusel de destacados + tiles de categorías + cómo comprar.
   La SPA alterna entre las vistas #view-home y #view-catalogo.
   ================================================================ */

/** Corrige el padding-top del main según la altura real del header fijo. */
const ajustarPaddingMain = () => {
  const header = document.getElementById('main-header');
  const main   = document.getElementById('main-content');
  if (!main) return;
  const altura = header ? header.getBoundingClientRect().height : 0;
  main.style.paddingTop = `${altura + 8}px`;
};

/** Alterna la vista visible (home | catalogo) y el estado del menú. */
const mostrarVista = (vista) => {
  state.vista = vista;

  const home     = document.getElementById('view-home');
  const catalogo = document.getElementById('view-catalogo');
  const chips    = document.querySelector('.filter-chips-wrapper');

  if (home)     home.classList.toggle('hidden', vista !== 'home');
  if (catalogo) catalogo.classList.toggle('hidden', vista !== 'catalogo');
  if (chips)    chips.classList.toggle('hidden', vista !== 'catalogo');

  document.querySelectorAll('.nav-link').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.vista === vista)
  );

  ajustarPaddingMain();
  window.scrollTo({ top: 0 });
};

/** Limpia búsqueda y filtros y muestra la vista de inicio. */
const irAInicio = () => {
  state.filtros = limpiarFiltros();
  state.textoBusqueda = '';
  state.pagina = 1;
  const search = document.getElementById('search-input');
  if (search) search.value = '';

  const cbStock = document.getElementById('filtro-disponibles');
  const cbDest  = document.getElementById('filtro-destacados');
  if (cbStock) cbStock.checked = false;
  if (cbDest)  cbDest.checked  = false;

  sincronizarInputsPrecio();
  renderFilterChips();
  renderChecksCategorias();
  renderActiveFilters();
  contarFiltrosActivos();
  mostrarVista('home');
};

/** Va a la tienda opcionalmente filtrada por categoría. */
const irALaTienda = (categoria = 'Todas') => {
  // Al entrar a la tienda se limpian precio y disponibilidad: solo se
  // conserva la categoría pedida (chip o tile del home). Así el botón
  // "Tienda" siempre arranca en limpio aunque hubiera filtros previos.
  const umb = state.filtros ? state.filtros.umbrales : null;
  state.filtros = {
    categorias: categoria === 'Todas' ? [] : [categoria],
    precioMin: 0,
    precioMax: Infinity,
    soloDisponibles: false,
    soloDestacados: false,
    umbrales: umb || leerUmbralesPrecio(),
  };
  state.textoBusqueda = '';
  state.pagina = 1;
  const search = document.getElementById('search-input');
  if (search) search.value = '';

  const cbStock = document.getElementById('filtro-disponibles');
  const cbDest  = document.getElementById('filtro-destacados');
  if (cbStock) cbStock.checked = false;
  if (cbDest)  cbDest.checked  = false;

  sincronizarInputsPrecio();
  renderFilterChips();
  renderChecksCategorias();
  renderActiveFilters();
  contarFiltrosActivos();
  mostrarVista('catalogo');
  renderProductos();
};

/** Card compacta del carrusel de la vista de inicio. */
const tarjetaInicio = (p) => {
  const nom    = esc(p.nombre);
  const badge  = (p.destacado && p.activo)
    ? '<span class="badge-destacado">Destacado</span>'
    : '';
  const overlay = !p.activo
    ? '<span class="home-card-stock">Sin stock</span>'
    : '';
  return `
    <article class="home-card ${p.activo ? '' : 'agotado'}">
      <button type="button" class="home-card-open" data-abrir="${p.id}" aria-label="Ver detalle de ${nom}">
        <span class="home-card-img-wrap">
          ${badge}
          <img src="${esc(imagenProducto(p))}" data-cat="${esc(p.categoria)}" alt="Foto de ${nom}" loading="lazy" width="400" height="400" />
          ${overlay}
        </span>
        <span class="home-card-category">${esc(p.categoria)}</span>
        <span class="home-card-name">${nom}</span>
        ${p.medidas ? `<span class="home-card-measures">${esc(p.medidas)}</span>` : ''}
        <span class="home-card-price">${formatCurrency(p.precio_unitario)}</span>
      </button>
    </article>
  `;
};

/** Renderiza el carrusel "Destacados" de la vista de inicio. */
const renderHomeDestacados = () => {
  const cont = document.getElementById('home-destacados');
  if (!cont) return;

  const destacados = PRODUCTOS.filter(p => p.activo && p.destacado);
  // Los que ya tienen foto van primero: el inicio es lo primero que se ve
  const lista = (destacados.length ? destacados : PRODUCTOS.filter(p => p.activo))
    .slice()
    .sort((a, b) => tieneFoto(b) - tieneFoto(a))
    .slice(0, 8);

  cont.innerHTML = lista.map(tarjetaInicio).join('');
  activarFallbackImagenes(cont);
};

/** Renderiza los tiles de categorías de la vista de inicio. */
const renderHomeCategorias = () => {
  const cont = document.getElementById('home-categories');
  if (!cont) return;

  const secciones = [...new Set(PRODUCTOS.map(p => p.categoria))];

  cont.innerHTML = secciones.map(cat => {
    const items   = PRODUCTOS.filter(p => p.categoria === cat);
    const conFoto = items.find(p => p.activo && String(p.imagen_id).trim()) || items[0];
    return `
      <button type="button" class="home-cat" data-cat="${esc(cat)}" aria-label="Ver categoría ${esc(cat)}">
        <span class="home-cat-img">
          <img src="${esc(imagenProducto(conFoto || { categoria: cat }))}" data-cat="${esc(cat)}" alt="" loading="lazy" width="400" height="300" />
        </span>
        <span class="home-cat-body">
          <strong>${esc(cat)}</strong>
          <small>${items.length} producto${items.length === 1 ? '' : 's'}</small>
        </span>
      </button>
    `;
  }).join('');

  activarFallbackImagenes(cont);

  cont.querySelectorAll('.home-cat').forEach(btn =>
    btn.addEventListener('click', () => irALaTienda(btn.dataset.cat))
  );
};

/** Llena el select del checkout y la lista de puntos del home con PUNTOS_ENTREGA. */
const poblarPuntosEntrega = () => {
  const activos = PUNTOS_ENTREGA.filter(p => p.activo);
  const select = document.getElementById('campo-punto');
  if (select) {
    // Se reconstruye cada vez (la config puede llegar después), sin perder la elección
    const elegido = select.value;
    select.innerHTML = '<option value="">— Seleccioná tu punto —</option>';
    activos.forEach(p => {
      const op = document.createElement('option');
      op.value = p.nombre;
      // El mínimo se avisa ANTES de elegir, no después
      op.textContent = p.minimo > 0 ? `${p.nombre} (mínimo ${formatCurrency(p.minimo)})` : p.nombre;
      select.appendChild(op);
    });
    if (activos.some(p => p.nombre === elegido)) select.value = elegido;
  }

  const lista = document.getElementById('contacto-puntos');
  if (lista) {
    lista.innerHTML = activos.map(p =>
      `<li>${esc(p.nombre)}${p.detalle ? ` <small>· ${esc(p.detalle)}</small>` : ''}</li>`).join('');
  }
};

/** Dibuja el bloque de contacto del home (enlace y teléfono de WhatsApp). */
const renderHomeContacto = () => {
  const enlace = document.getElementById('contacto-whatsapp');
  if (enlace) {
    enlace.href =
      'https://api.whatsapp.com/send?phone=' + WHATSAPP_NUMBER +
      '&text=' + encodeURIComponent('¡Hola Lula! Quiero hacer una consulta sobre sus figuras de yeso.');
  }
  const tel = document.getElementById('contacto-telefono');
  if (tel) tel.textContent = formatearTelefono();
};

/** Dibuja toda la vista de inicio (destacados + categorías + contacto). */
const renderHome = () => {
  renderHomeDestacados();
  renderHomeCategorias();
  renderHomeContacto();
};

/** Delegación de clics de la vista de inicio: abrir ficha del producto. */
const manejarClickHome = (e) => {
  const abrir = e.target.closest('.home-card-open');
  if (abrir) abrirProducto(abrir.dataset.abrir);
};

/* ================================================================
   5. RENDERIZADO DE PRODUCTOS Y FILTROS
   ================================================================ */

/**
 * Devuelve los productos filtrados y ordenados según el estado actual:
 *   Orden: 1) destacados activos → 2) activos normales → 3) agotados/pausados
 *   Filtro: por categoría activa y texto de búsqueda.
 * @returns {Array} productos filtrados y ordenados
 */
const getProductosFiltrados = () => {
  const texto  = norm(state.textoBusqueda);
  const cats   = state.filtros.categorias;
  const pMin   = state.filtros.precioMin;
  const pMax   = state.filtros.precioMax;

  return PRODUCTOS
    .filter(p => {
      // Categorías tildadas en el sidebar (vacío = todas)
      const matchCat = !cats.length || cats.includes(p.categoria);

      // norm() a ambos lados: así "angel" encuentra "Ángel" y "ciguena" a "Cigüeña"
      const matchTexto = !texto
        || norm(p.nombre).includes(texto)
        || norm(p.categoria).includes(texto)
        || norm(p.descripcion).includes(texto);

      // Rango de precio unitario ajustado con el slider
      const matchPrecio = p.precio_unitario >= pMin && p.precio_unitario <= pMax;

      // Disponibilidad (filtrar por stock / destacados)
      const matchStock = !state.filtros.soloDisponibles || p.activo;
      const matchDest  = !state.filtros.soloDestacados  || p.destacado;

      return matchCat && matchTexto && matchPrecio && matchStock && matchDest;
    })
    .sort((a, b) => {
      // Los pausados van al final siempre, sea cual sea el orden elegido
      if (a.activo !== b.activo) return Number(b.activo) - Number(a.activo);

      // sort() es estable: ante un empate se respeta el orden del catálogo
      switch (state.orden) {
        case 'precio-asc':  return a.precio_unitario - b.precio_unitario;
        case 'precio-desc': return b.precio_unitario - a.precio_unitario;
        case 'nombre':      return a.nombre.localeCompare(b.nombre, 'es');
        default:            return (Number(b.destacado) - Number(a.destacado)) || (tieneFoto(b) - tieneFoto(a));
      }
    });
};

/**
 * Sincroniza el breadcrumb con la categoría activa.
 */
const renderBreadcrumb = () => {
  const el = document.getElementById('breadcrumb-current');
  if (!el) return;

  const texto = textoFiltroActual();
  el.textContent = texto;

  // El título grande de la página repite la categoría activa
  const titulo = document.getElementById('catalog-title');
  if (titulo) titulo.textContent = texto;
};

/**
 * Actualiza el contador "N productos" bajo el título del catálogo.
 * @param {number} n
 */
const renderContador = (n) => {
  const el = document.getElementById('catalog-count');
  if (el) el.textContent = `${n} producto${n === 1 ? '' : 's'}`;
};

/**
 * Dibuja los botones de paginación tipo "1 2 Siguiente" (como la referencia).
 * @param {number} total - cantidad total de productos filtrados
 */
const renderPaginacion = (total) => {
  const cont = document.getElementById('catalog-pagination');
  if (!cont) return;

  const totalPaginas = Math.max(1, Math.ceil(total / PAGINACION_POR_PAGINA));

  if (totalPaginas <= 1) {
    cont.classList.add('hidden');
    cont.innerHTML = '';
    return;
  }

  cont.classList.remove('hidden');

  const pag = Math.min(state.pagina, totalPaginas);
  let html = `
    <button type="button" class="page-btn" data-pag="${pag - 1}" ${pag === 1 ? 'disabled' : ''} aria-label="Página anterior">‹</button>`;
  for (let i = 1; i <= totalPaginas; i++) {
    html += `
    <button type="button" class="page-btn ${i === pag ? 'active' : ''}" data-pag="${i}" ${i === pag ? 'aria-current="page"' : ''}>${i}</button>`;
  }
  html += `
    <button type="button" class="page-btn" data-pag="${pag + 1}" ${pag === totalPaginas ? 'disabled' : ''} aria-label="Página siguiente">›</button>`;

  cont.innerHTML = html;

  cont.querySelectorAll('.page-btn').forEach(btn => {
    if (btn.disabled) return;
    btn.addEventListener('click', () => {
      state.pagina = Math.max(1, Number(btn.dataset.pag));
      renderProductos();
    });
  });
};

/**
 * Genera y monta en el DOM las tarjetas de producto.
 * Delega los event listeners a los elementos generados.
 */
/**
 * Tarjeta estándar del catálogo (vistas "large" y "small").
 * Todo lo que viene de la planilla se escapa antes de entrar al HTML.
 * @param {Object} p - producto
 */
const tarjetaCompra = (p) => {
  const clases = ['product-card'];
  if (!p.activo)               clases.push('agotado');
  if (p.destacado && p.activo) clases.push('destacado');

  const nom   = esc(p.nombre);
  const badge = (p.destacado && p.activo)
    ? '<span class="badge-destacado">Destacado</span>'
    : '';

  // Los pausados no llevan select ni botón: el cartel SIN STOCK ya lo dice todo
  const overlay = !p.activo
    ? '<div class="stock-overlay"><span>Sin stock</span></div>'
    : '';

  // Recuperamos el tipo elegido antes del último re-render (o 'unidad' por defecto)
  const tipoSel = state.seleccion[p.id] || 'unidad';

  return `
    <article class="${clases.join(' ')}" data-id="${p.id}">
      <button
        type="button"
        class="product-img-wrapper card-open"
        data-abrir="${p.id}"
        aria-label="Ver detalle de ${nom}"
      >
        ${badge}
        <img
          src="${esc(imagenProducto(p))}"
          data-cat="${esc(p.categoria)}"
          alt="Foto de ${nom}"
          class="product-img"
          loading="lazy"
          width="400"
          height="400"
        />
        ${overlay}
      </button>
      <div class="product-info">
        <span class="product-category">${esc(p.categoria)}</span>
        <button type="button" class="product-name card-open" data-abrir="${p.id}" title="${nom}">${nom}</button>
        <span class="product-measures">${esc(p.medidas)}</span>

        <!-- Precio que se actualiza al cambiar el select -->
        <span class="product-price" id="price-${p.id}">${formatCurrency(getPrecio(p, tipoSel))}</span>
        <span class="product-note" id="note-${p.id}">${esc(infoPack(p, tipoSel))}</span>

        ${p.activo ? `
        <div class="product-actions">
          <select
            class="product-select"
            id="select-${p.id}"
            data-id="${p.id}"
            aria-label="Tipo de compra para ${nom}"
          >
            ${opcionesTipo(p, tipoSel)}
          </select>

          <button
            class="btn-agregar"
            data-id="${p.id}"
            aria-label="Agregar ${nom} al carrito"
          >Comprar</button>
        </div>` : ''}
      </div>
    </article>
  `;
};

/** Tarjeta de la vista "lista" (imagen chica a la izquierda + info). */
const tarjetaLista = (p) => {
  const nom   = esc(p.nombre);
  const badge = (p.destacado && p.activo)
    ? '<span class="badge-destacado">Destacado</span>'
    : '';
  const overlay = !p.activo
    ? '<div class="stock-overlay"><span>Sin stock</span></div>'
    : '';
  const tipoSel = state.seleccion[p.id] || 'unidad';

  return `
    <article class="product-card product-card-list ${p.activo ? '' : 'agotado'}" data-id="${p.id}">
      <button
        type="button"
        class="product-img-wrapper card-open list-img"
        data-abrir="${p.id}"
        aria-label="Ver detalle de ${nom}"
      >
        ${badge}
        <img
          src="${esc(imagenProducto(p))}"
          data-cat="${esc(p.categoria)}"
          alt="Foto de ${nom}"
          class="product-img"
          loading="lazy"
          width="160"
          height="160"
        />
        ${overlay}
      </button>
      <div class="product-info list-info">
        <div class="list-info-main">
          <span class="product-category">${esc(p.categoria)}</span>
          <button type="button" class="product-name card-open" data-abrir="${p.id}" title="${nom}">${nom}</button>
          <span class="product-measures">${esc(p.medidas)}</span>
          <span class="product-price" id="price-${p.id}">${formatCurrency(getPrecio(p, tipoSel))}</span>
          <span class="product-note" id="note-${p.id}">${esc(infoPack(p, tipoSel))}</span>
        </div>

        ${p.activo ? `
        <div class="product-actions list-actions">
          <select
            class="product-select"
            id="select-${p.id}"
            data-id="${p.id}"
            aria-label="Tipo de compra para ${nom}"
          >
            ${opcionesTipo(p, tipoSel)}
          </select>
          <button
            class="btn-agregar"
            data-id="${p.id}"
            aria-label="Agregar ${nom} al carrito"
          >Comprar</button>
        </div>` : ''}
      </div>
    </article>
  `;
};

/**
 * Genera y monta en el DOM las tarjetas de producto.
 * Respeta la vista elegida (grande / compacta / lista) y delega los
 * event listeners a los elementos generados.
 */
const renderProductos = () => {
  const grid      = document.getElementById('product-grid');
  const noResults = document.getElementById('no-results');
  const status    = document.getElementById('results-status');
  const filtrados = getProductosFiltrados();
  const total     = filtrados.length;

  renderBreadcrumb();
  renderContador(total);

  // Marca la vista activa en la grilla (large / small / list)
  grid.classList.remove('vista-large', 'vista-small', 'vista-list');
  grid.classList.add(`vista-${state.vistaCatalogo}`);

  // Anuncio corto para lectores de pantalla (antes se releía toda la grilla)
  if (status) {
    const n = total;
    status.textContent = n === 0
      ? 'No se encontraron productos.'
      : `${n} producto${n === 1 ? '' : 's'} encontrado${n === 1 ? '' : 's'}.`;
  }

  if (total === 0) {
    grid.innerHTML = '';
    noResults.classList.remove('hidden');
    renderPaginacion(0);
    return;
  }

  noResults.classList.add('hidden');

  // Paginación: se pagina siempre sobre la lista filtrada
  const totalPaginas = Math.max(1, Math.ceil(total / PAGINACION_POR_PAGINA));
  if (state.pagina > totalPaginas) state.pagina = totalPaginas;
  const desde     = (state.pagina - 1) * PAGINACION_POR_PAGINA;
  const productos = filtrados.slice(desde, desde + PAGINACION_POR_PAGINA);

  // Vista lista usa su propia tarjeta; las otras dos comparten la misma
  const tarjeta = state.vistaCatalogo === 'list' ? tarjetaLista : tarjetaCompra;
  grid.innerHTML = productos.map(tarjeta).join('');

  // Delegamos en el grid para eficiencia (evita N listeners por render)
  activarFallbackImagenes(grid);

  grid.querySelectorAll('.product-select').forEach(sel =>
    sel.addEventListener('change', actualizarPrecioEnCard)
  );

  grid.querySelectorAll('.btn-agregar').forEach(btn =>
    btn.addEventListener('click', agregarAlCarrito)
  );

  grid.querySelectorAll('.card-open').forEach(el =>
    el.addEventListener('click', () => abrirProducto(el.dataset.abrir))
  );

  renderPaginacion(total);
};

/**
 * Actualiza el precio visible en la card cuando el usuario cambia
 * el selector de tipo (unidad / pack10 / pack20).
 * Esto es solo visual; el precio real se lee al agregar al carrito.
 * @param {Event} e
 */
const actualizarPrecioEnCard = (e) => {
  const sel      = e.target;
  const producto = buscarProducto(sel.dataset.id);
  if (!producto) return;
  const id       = producto.id;

  // Persistimos la elección para que sobreviva a un filtro o una búsqueda
  state.seleccion[id] = sel.value;
  guardarCarrito();

  document.getElementById(`price-${id}`).textContent =
    formatCurrency(getPrecio(producto, sel.value));
  const nota = document.getElementById(`note-${id}`);
  if (nota) nota.textContent = infoPack(producto, sel.value);
};

/* ================================================================
   CHIPS DE CATEGORÍAS
================================================================ */

/**
 * Genera los chips de filtro a partir de las categorías únicas
 * presentes en el array PRODUCTOS. El chip "Todas" va siempre primero.
 */
const renderFilterChips = () => {
  const categoriasUnicas = [...new Set(PRODUCTOS.map(p => p.categoria))];
  const todasLasCats     = ['Todas', ...categoriasUnicas];
  const container        = document.getElementById('filter-chips');
  const activas          = state.filtros.categorias;

  container.innerHTML = todasLasCats.map(cat => {
    // "Todas" está activa solo si no hay ninguna categoría tildada
    const activa = cat === 'Todas'
      ? activas.length === 0
      : activas.includes(cat);

    return `
    <button
      class="chip ${activa ? 'active' : ''}"
      data-cat="${esc(cat)}"
      aria-pressed="${activa}"
    >${esc(cat)}</button>
  `;
  }).join('');

  container.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const cat = chip.dataset.cat;
      state.filtros.categorias = cat === 'Todas' ? [] : [cat];
      state.pagina = 1;
      aplicarFiltros();
    });
  });
};

/* ================================================================
   5 bis. FILTROS LATERALES Y VISTAS DEL CATÁLOGO
   (estilo The Ancient Home: sidebar con checkboxes + precio,
   y botones "Large / Small / List" para cambiar la vista)
   ================================================================ */

/**
 * Texto de ayuda bajo el precio según la presentación elegida.
 *   unidad → invita al pack que más ahorra ("Pack ×20: ahorrás 25%")
 *   pack   → cuánto sale cada figura y cuánto se ahorra
 * Sin descuento real (pack vacío en la planilla = unidad ×N) no promete ahorro.
 */
const infoPack = (p, tipo) => {
  const unit = getPrecio(p, 'unidad');
  const datos = { pack10: 10, pack20: 20 };
  const ahorro = (t) => {
    const lista = unit * datos[t];
    return lista > 0 ? Math.round((1 - getPrecio(p, t) / lista) * 100) : 0;
  };
  if (tipo === 'unidad') {
    const a20 = ahorro('pack20'), a10 = ahorro('pack10');
    if (a20 > 0) return `Pack ×20: ahorrás ${a20}%`;
    if (a10 > 0) return `Pack ×10: ahorrás ${a10}%`;
    return '';
  }
  const cu = Math.floor(getPrecio(p, tipo) / datos[tipo]);
  const a = ahorro(tipo);
  return `${formatCurrency(cu)} c/u${a > 0 ? ` · ahorrás ${a}%` : ''}`;
};

/** Opciones de presentación (unidad / pack10 / pack20) para las cards. */
const opcionesTipo = (p, tipoSel) =>
  ['unidad', 'pack10', 'pack20'].map(t =>
    `<option value="${t}" ${tipoSel === t ? 'selected' : ''}>
       ${TIPO_LABELS[t]} — ${formatCurrency(getPrecio(p, t))}
     </option>`
  ).join('');

/** Renderiza los checkboxes de categoría del sidebar (con contador). */
const renderChecksCategorias = () => {
  const cont = document.getElementById('filtro-categorias');
  if (!cont) return;

  const categorias = [...new Set(PRODUCTOS.map(p => p.categoria))]
    .sort((a, b) => a.localeCompare(b, 'es'));

  cont.innerHTML = categorias.map(cat => {
    const n       = PRODUCTOS.filter(p => p.categoria === cat).length;
    const checked = state.filtros.categorias.includes(cat);
    return `
      <label class="checkbox-row">
        <input type="checkbox" value="${esc(cat)}" ${checked ? 'checked' : ''} />
        <span>${esc(cat)}</span>
        <span class="count">${n}</span>
      </label>`;
  }).join('');

  cont.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const cat = cb.value;
      if (cb.checked) {
        state.filtros.categorias.push(cat);
      } else {
        state.filtros.categorias = state.filtros.categorias.filter(c => c !== cat);
      }
      state.pagina = 1;
      aplicarFiltros();
      cerrarFiltrosMovilesSiCorresponde();
    });
  });
};

/** Pinta el relleno del slider doble según los valores actuales. */
const actualizarVisualPrecio = () => {
  const range = document.getElementById('price-range');
  const min   = document.getElementById('filtro-precio-min-range');
  const max   = document.getElementById('filtro-precio-max-range');
  if (!range || !min || !max) return;

  const lo = Number(min.min);
  const hi = Number(max.max);
  const pct = (v) => (hi > lo ? ((v - lo) / (hi - lo)) * 100 : 100);

  range.style.setProperty('--fill-from', `${pct(Number(min.value))}%`);
  range.style.setProperty('--fill-to',   `${pct(Number(max.value))}%`);

  // Si los dos pulgares quedan juntos del lado derecho, el de "máximo" tapa al
  // de "mínimo" y no se podía volver a agarrar. Se pasa el de mínimo al frente.
  min.style.zIndex = Number(min.value) > (lo + hi) / 2 ? '3' : '2';
  max.style.zIndex = '2';
};

/** Sincroniza inputs y sliders de precio con el estado actual. */
const sincronizarInputsPrecio = () => {
  const umb = state.filtros.umbrales || leerUmbralesPrecio();
  const minRange = document.getElementById('filtro-precio-min-range');
  const maxRange = document.getElementById('filtro-precio-max-range');
  const minInput = document.getElementById('filtro-precio-min');
  const maxInput = document.getElementById('filtro-precio-max');
  if (!minRange || !maxRange) return;

  const pMin = Math.max(umb.min, state.filtros.precioMin);
  const pMax = Math.min(umb.max, Number.isFinite(state.filtros.precioMax) ? state.filtros.precioMax : umb.max);

  minRange.min = umb.min; minRange.max = umb.max;
  maxRange.min = umb.min; maxRange.max = umb.max;
  minRange.value = pMin;
  maxRange.value = pMax;
  if (minInput) minInput.value = pMin;
  if (maxInput) maxInput.value = pMax;

  actualizarVisualPrecio();
};

/** Pills de filtros activos (categorías, precio, disponibilidad). */
const renderActiveFilters = () => {
  const cont = document.getElementById('active-filters');
  if (!cont) return;

  const umb   = state.filtros.umbrales || leerUmbralesPrecio();
  const pills = [];

  state.filtros.categorias.forEach(cat =>
    pills.push({ clave: `cat:${cat}`, texto: cat })
  );

  if (state.filtros.soloDisponibles) pills.push({ clave: 'stock', texto: 'Solo con stock' });
  if (state.filtros.soloDestacados)  pills.push({ clave: 'dest',  texto: 'Solo destacados' });

  const rangoActivo = state.filtros.precioMin > umb.min || state.filtros.precioMax < umb.max;
  if (rangoActivo) {
    pills.push({
      clave: 'precio',
      texto: `Precio ${formatCurrency(state.filtros.precioMin)} – ${formatCurrency(state.filtros.precioMax)}`,
    });
  }

  cont.classList.toggle('hidden', pills.length === 0);
  if (!pills.length) { cont.innerHTML = ''; return; }

  cont.innerHTML = `
    <span class="active-filters-label">Filtros:</span>
    ${pills.map(pill => `
      <button
        type="button"
        class="filter-pill"
        data-clave="${esc(pill.clave)}"
        aria-label="Quitar filtro ${esc(pill.texto)}"
      >
        ${esc(pill.texto)}
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>`).join('')}
  `;

  cont.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const clave = pill.dataset.clave;
      if (clave.startsWith('cat:')) {
        state.filtros.categorias = state.filtros.categorias.filter(c => c !== clave.slice(4));
      } else if (clave === 'stock') {
        state.filtros.soloDisponibles = false;
        const cb = document.getElementById('filtro-disponibles');
        if (cb) cb.checked = false;
      } else if (clave === 'dest') {
        state.filtros.soloDestacados = false;
        const cb = document.getElementById('filtro-destacados');
        if (cb) cb.checked = false;
      } else if (clave === 'precio') {
        state.filtros.precioMin = umb.min;
        state.filtros.precioMax = umb.max;
        sincronizarInputsPrecio();
      }
      state.pagina = 1;
      aplicarFiltros();
      cerrarFiltrosMovilesSiCorresponde();
    });
  });
};

/** Número de filtros activos (badge del botón "Filtros" en móvil). */
const contarFiltrosActivos = () => {
  const cont = document.getElementById('filtros-contador');
  if (!cont) return;

  const umb = state.filtros.umbrales || leerUmbralesPrecio();
  let n = state.filtros.categorias.length;
  if (state.filtros.soloDisponibles) n++;
  if (state.filtros.soloDestacados)  n++;
  if (state.filtros.precioMin > umb.min || state.filtros.precioMax < umb.max) n++;

  cont.textContent = n;
  cont.classList.toggle('hidden', n === 0);
  cont.setAttribute('aria-hidden', String(n === 0));
};

/**
 * Reacciona a cualquier cambio de filtro: actualiza chips, sidebar,
 * pills y vuelve a dibujar la grilla.
 */
const aplicarFiltros = () => {
  renderFilterChips();
  renderChecksCategorias();
  renderActiveFilters();
  contarFiltrosActivos();
  renderProductos();
};

/* --- Persistencia de la vista elegida (large / small / list) --- */
const guardarUIPreferencia = () => {
  try {
    localStorage.setItem(STORAGE_UI, JSON.stringify({
      vistaCatalogo: state.vistaCatalogo,
    }));
  } catch (err) { /* sin storage, la app sigue igual */ }
};

const cargarUIPreferencia = () => {
  try {
    const guardado = JSON.parse(localStorage.getItem(STORAGE_UI) || 'null');
    if (guardado && ['large', 'small', 'list'].includes(guardado.vistaCatalogo)) {
      state.vistaCatalogo = guardado.vistaCatalogo;
    }
  } catch (err) { /* silencioso */ }
};

/** Marca el botón activo de la vista (grande / compacta / lista). */
const renderVistaButtons = () => {
  document.querySelectorAll('.vista-btn').forEach(btn => {
    const activo = btn.dataset.vista === state.vistaCatalogo;
    btn.classList.toggle('active', activo);
    btn.setAttribute('aria-pressed', String(activo));
  });
};

/* --- Panel de filtros en pantallas chicas --- */
const cerrarFiltrosMovilesSiCorresponde = () => {
  if (window.innerWidth < 1024) cerrarFiltrosMovil();
};

const abrirFiltrosMovil = () => {
  if (window.innerWidth >= 1024) return;
  const sb  = document.getElementById('catalog-sidebar');
  const ov  = document.getElementById('filtros-overlay');
  const btn = document.getElementById('btn-filtros-movil');

  if (!sb || sb.classList.contains('open')) return;
  sb.classList.add('open');
  if (ov)  { ov.classList.add('visible'); ov.setAttribute('aria-hidden', 'false'); }
  if (btn) btn.setAttribute('aria-expanded', 'true');
  bloquearScroll();
};

const cerrarFiltrosMovil = () => {
  const sb  = document.getElementById('catalog-sidebar');
  const ov  = document.getElementById('filtros-overlay');
  const btn = document.getElementById('btn-filtros-movil');

  if (!sb || !sb.classList.contains('open')) return;
  sb.classList.remove('open');
  if (ov)  { ov.classList.remove('visible'); ov.setAttribute('aria-hidden', 'true'); }
  if (btn) btn.setAttribute('aria-expanded', 'false');
  desbloquearScroll();
};

const toggleFiltrosMovil = () => {
  const sb = document.getElementById('catalog-sidebar');
  if (!sb) return;
  if (sb.classList.contains('open')) cerrarFiltrosMovil();
  else abrirFiltrosMovil();
};

/** Botón "Limpiar todo" del sidebar. */
const limpiarTodosLosFiltros = () => {
  state.filtros = limpiarFiltros();
  state.filtros.umbrales = state.filtros.umbrales || leerUmbralesPrecio();

  const cbStock = document.getElementById('filtro-disponibles');
  const cbDest  = document.getElementById('filtro-destacados');
  if (cbStock) cbStock.checked = false;
  if (cbDest)  cbDest.checked  = false;

  sincronizarInputsPrecio();
  state.pagina = 1;
  aplicarFiltros();
  cerrarFiltrosMovilesSiCorresponde();
};

/** Cambios en los checkboxes estáticos de disponibilidad. */
const aplicarCheckboxesDisponibilidad = () => {
  state.filtros.soloDisponibles = document.getElementById('filtro-disponibles').checked;
  state.filtros.soloDestacados  = document.getElementById('filtro-destacados').checked;
  state.pagina = 1;
  aplicarFiltros();
  cerrarFiltrosMovilesSiCorresponde();
};

/** Bindings de los inputs de precio (sliders + campos numéricos). */
const inicializarBindingPrecio = () => {
  const minRange = document.getElementById('filtro-precio-min-range');
  const maxRange = document.getElementById('filtro-precio-max-range');
  const minInput = document.getElementById('filtro-precio-min');
  const maxInput = document.getElementById('filtro-precio-max');
  if (!minRange || !maxRange) return;

  // Mientras se arrastra un slider solo se actualiza lo visual (relleno y
  // números); la grilla se redibuja recién cuando el dedo se detiene.
  // Antes se re-renderizaba todo el catálogo en cada pixel de arrastre.
  const aplicarFiltrosDebounced = debounce(aplicarFiltros, 150);

  const proyectarDesdeSliders = () => {
    let vMin = Number(minRange.value);
    let vMax = Number(maxRange.value);
    if (vMin > vMax) vMin = vMax;
    if (vMax < vMin) vMax = vMin;

    state.filtros.precioMin = vMin;
    state.filtros.precioMax = vMax;
    state.pagina = 1;
    if (minInput) minInput.value = vMin;
    if (maxInput) maxInput.value = vMax;

    actualizarVisualPrecio();
    aplicarFiltrosDebounced();
  };

  minRange.addEventListener('input', proyectarDesdeSliders);
  maxRange.addEventListener('input', proyectarDesdeSliders);
  minRange.addEventListener('change', aplicarFiltros);
  maxRange.addEventListener('change', aplicarFiltros);

  const aplicarDesdeInputMin = () => {
    const umb = state.filtros.umbrales || leerUmbralesPrecio();
    let v = aNumero(minInput.value);
    if (!v && v !== 0) v = umb.min;
    v = Math.max(umb.min, Math.min(v, Number(maxInput.value)));
    state.filtros.precioMin = v;
    sincronizarInputsPrecio();
    aplicarFiltros();
    cerrarFiltrosMovilesSiCorresponde();
  };

  const aplicarDesdeInputMax = () => {
    const umb = state.filtros.umbrales || leerUmbralesPrecio();
    let v = aNumero(maxInput.value);
    if (!v && v !== 0) v = umb.max;
    v = Math.max(Number(minInput.value), Math.min(v, umb.max));
    state.filtros.precioMax = v;
    sincronizarInputsPrecio();
    aplicarFiltros();
    cerrarFiltrosMovilesSiCorresponde();
  };

  minInput.addEventListener('change', aplicarDesdeInputMin);
  maxInput.addEventListener('change', aplicarDesdeInputMax);
};

/* ================================================================
   6. LÓGICA DEL CARRITO
================================================================ */

/**
 * Calcula el total del carrito sumando precio × cantidad de cada item.
 * @returns {number} Total en pesos
 */
const calcularTotal = () =>
  state.carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

/**
 * Agrega un producto al carrito.
 * Regla de agrupación: si ya existe un item con el mismo productoId Y tipo,
 * incrementa la cantidad en lugar de crear un duplicado.
 * @param {Event} e - Click en el botón "Agregar al carrito"
 */
/**
 * Agrega items al carrito. Es la única función que toca state.carrito.
 * Compartida por las tarjetas del catálogo y por la vista de producto.
 * @param {object} producto
 * @param {string} tipo - 'unidad' | 'pack10' | 'pack20'
 * @param {number} cantidad
 */
const pushAlCarrito = (producto, tipo, cantidad = 1) => {
  state.seleccion[producto.id] = tipo;
  const precio = getPrecio(producto, tipo);

  // Si ya existe el mismo producto con el mismo tipo → aumentar cantidad
  const itemExistente = state.carrito.find(
    i => String(i.productoId) === String(producto.id) && i.tipo === tipo
  );

  if (itemExistente) {
    // Tope de 99 por item, igual que la ficha y el control del carrito
    itemExistente.cantidad = Math.min(99, itemExistente.cantidad + cantidad);
  } else {
    state.carrito.push({
      productoId: producto.id,
      nombre:     producto.nombre,
      tipo,
      tipoLabel:  TIPO_LABELS[tipo],
      precio,
      cantidad,
      imagen_id:  producto.imagen_id,
      categoria:  producto.categoria,
    });
  }

  actualizarUIGlobal();
};

/**
 * Botón "Comprar" de las tarjetas del catálogo: agrega 1 unidad.
 */
const agregarAlCarrito = (e) => {
  const btn      = e.currentTarget;
  const producto = buscarProducto(btn.dataset.id);

  if (!producto || !producto.activo) return;

  // El select vive en la misma tarjeta que el botón. Si por un re-render
  // no estuviera, vale la última elección guardada en el estado.
  const sel  = btn.closest('.product-card')?.querySelector('.product-select');
  const tipo = (sel && PRECIO_POR_TIPO[sel.value]) ? sel.value
             : (state.seleccion[producto.id] || 'unidad');

  pushAlCarrito(producto, tipo, 1);

  // Feedback visual: cambia temporalmente el texto y color del botón
  // Feedback sin deshabilitar: una revendedora que toca dos veces
  // seguidas quiere sumar dos, no que el segundo toque se pierda.
  btn.textContent = '¡Listo!';
  btn.classList.add('added');
  clearTimeout(btn._t);
  btn._t = setTimeout(() => {
    btn.textContent = 'Comprar';
    btn.classList.remove('added');
  }, 900);

  mostrarToast(`"${producto.nombre}" agregado al carrito`);
};

/**
 * Incrementa o decrementa la cantidad de un item del carrito.
 * Si la cantidad llega a 0, elimina el item del array.
 * @param {number} productoId
 * @param {string} tipo - 'unidad' | 'pack10' | 'pack20'
 * @param {number} delta - +1 o -1
 */
const cambiarCantidad = (productoId, tipo, delta) => {
  const clave = String(productoId);
  const idx = state.carrito.findIndex(
    i => String(i.productoId) === clave && i.tipo === tipo
  );
  if (idx === -1) return;

  const nueva = state.carrito[idx].cantidad + delta;

  if (nueva <= 0) {
    state.carrito.splice(idx, 1);
  } else {
    // Tope igual que en la ficha (99) para no permitir cantidades absurdas
    state.carrito[idx].cantidad = Math.min(99, nueva);
  }

  actualizarUIGlobal();

  // Si el panel del carrito está abierto, actualizamos su contenido en vivo
  if (document.getElementById('cart-panel').classList.contains('open')) {
    renderCarrito();
  }
};

/* ================================================================
   ACTUALIZACIÓN DE UI GLOBAL
   Refresca la sticky bar y el badge del carrito.
================================================================ */
/**
 * Actualiza la barra sticky inferior (total y badge de cantidad).
 * Se llama cada vez que el carrito cambia.
 */
const actualizarUIGlobal = () => {
  const total       = calcularTotal();
  const cantItems   = state.carrito.reduce((acc, i) => acc + i.cantidad, 0);

  // Actualizar total en sticky bar
  document.getElementById('sticky-total').textContent = formatCurrency(total);

  // Actualizar badge de cantidad
  const badge = document.getElementById('cart-badge');
  if (cantItems > 0) {
    badge.textContent = cantItems > 99 ? '99+' : cantItems;
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }

  // Nombre accesible: un aria-label sobre el numerito (un <span>) no lo lee nadie
  const etiquetaCarrito = cantItems > 0
    ? `Ver carrito, ${cantItems} producto${cantItems === 1 ? '' : 's'}, total ${formatCurrency(total)}`
    : 'Ver carrito, vacío';
  document.getElementById('btn-ver-carrito')?.setAttribute('aria-label', etiquetaCarrito);
  document.getElementById('btn-ver-carrito-top')?.setAttribute('aria-label', etiquetaCarrito);

  // Total y badge en el acceso al carrito del header
  const totTop = document.getElementById('cart-total-top');
  if (totTop) totTop.textContent = formatCurrency(total);

  const badgeTop = document.getElementById('cart-badge-top');
  if (badgeTop) {
    if (cantItems > 0) {
      badgeTop.textContent = cantItems > 99 ? '99+' : cantItems;
      badgeTop.classList.remove('hidden');
    } else {
      badgeTop.classList.add('hidden');
    }
  }

  const cntDet = document.getElementById('detail-cart-count');
  if (cntDet) {
    cntDet.textContent = cantItems > 99 ? '99+' : cantItems;
    cntDet.classList.toggle('hidden', cantItems === 0);
  }

  // Único punto de guardado: todo cambio del carrito pasa por acá
  guardarCarrito();
};

/* ================================================================
   7. PANEL DEL CARRITO
================================================================ */

/**
 * Renderiza el contenido del panel del carrito:
 * lista de items, resumen de totales/seña, formulario de checkout.
 * Gestiona visibilidad de secciones según si el carrito está vacío o no.
 */
const renderCarrito = () => {
  const total  = calcularTotal();
  const sena   = calcularSena(total);
  const resto  = total - sena;

  const itemsContainer   = document.getElementById('cart-items-container');
  const cartSummary      = document.getElementById('cart-summary');
  const checkoutWrapper  = document.getElementById('checkout-form-wrapper');
  const cartEmpty        = document.getElementById('cart-empty');

  // Estado vacío
  if (state.carrito.length === 0) {
    itemsContainer.innerHTML = '';
    cartSummary.classList.add('hidden');
    checkoutWrapper.classList.add('hidden');
    cartEmpty.classList.remove('hidden');
    // Sin items el envío no puede quedar habilitado ni campos en rojo
    validarFormulario();
    desmarcarErroresFormulario();
    return;
  }

  cartEmpty.classList.add('hidden');
  cartSummary.classList.remove('hidden');
  checkoutWrapper.classList.remove('hidden');

  // Render de items
  itemsContainer.innerHTML = state.carrito.map(item => {
    const nom = esc(item.nombre);
    return `
    <div class="cart-item">
      <img
        src="${esc(imagenProducto(item, 160))}"
        data-cat="${esc(item.categoria || '')}"
        alt="${nom}"
        class="cart-item-img"
        loading="lazy"
        width="48"
        height="48"
      />
      <div class="cart-item-info">
        <p class="cart-item-name" title="${nom}">${nom}</p>
        <span class="cart-item-tipo">${esc(item.tipoLabel)}</span>
      </div>
      <div class="cart-item-qty">
        <button
          class="qty-btn"
          data-action="dec"
          data-id="${item.productoId}"
          data-tipo="${item.tipo}"
          aria-label="Quitar uno de ${nom}"
        >−</button>
        <span class="qty-value" aria-label="Cantidad: ${item.cantidad}">${item.cantidad}</span>
        <button
          class="qty-btn"
          data-action="inc"
          data-id="${item.productoId}"
          data-tipo="${item.tipo}"
          aria-label="Agregar otro ${nom}"
        >+</button>
      </div>
      <span class="cart-item-precio">${formatCurrency(item.precio * item.cantidad)}</span>
      <button
        type="button"
        class="cart-item-remove"
        data-id="${esc(item.productoId)}"
        data-tipo="${item.tipo}"
        aria-label="Quitar ${nom} del carrito"
      ><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>
  `;
  }).join('');

  // Quitar el ítem entero de una (antes había que bajar con − hasta 0)
  itemsContainer.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = state.carrito.find(i => String(i.productoId) === btn.dataset.id && i.tipo === btn.dataset.tipo);
      if (item) cambiarCantidad(item.productoId, item.tipo, -item.cantidad);
    });
  });

  activarFallbackImagenes(itemsContainer);

  // Listeners en los botones +/−
  itemsContainer.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const delta = btn.dataset.action === 'inc' ? 1 : -1;
      cambiarCantidad(btn.dataset.id, btn.dataset.tipo, delta);
    });
  });

  // Actualizar sección de resumen
  document.getElementById('summary-total').textContent = formatCurrency(total);
  document.getElementById('summary-sena').textContent  = formatCurrency(sena);
  document.getElementById('summary-resto').textContent = formatCurrency(resto);
  actualizarBotonCuenta();

  // El total también en el botón: la clienta ve qué confirma sin volver arriba
  const txtEnviar = document.getElementById('btn-enviar-texto');
  if (txtEnviar) txtEnviar.textContent = `Enviar pedido · ${formatCurrency(total)}`;

  // Revalidar formulario (Regla Merlo + campos vacíos)
  validarFormulario();
};

/**
 * Abre el panel del carrito deslizándolo hacia arriba.
 * Bloquea el scroll del fondo mientras está abierto.
 */
const abrirCarrito = () => {
  const panel   = document.getElementById('cart-panel');
  const overlay = document.getElementById('cart-overlay');
  const btnVer  = document.getElementById('btn-ver-carrito');

  renderCarrito();
  if (panel.classList.contains('open')) return;

  aislarFondo(panel);
  panel.classList.add('open');
  overlay.classList.add('visible');
  bloquearScroll();
  abrirEnHistorial('carrito');
  btnVer.setAttribute('aria-expanded', 'true');

  // Foco accesible al primer elemento interactivo del panel
  setTimeout(() => {
    document.getElementById('btn-cerrar-carrito').focus();
  }, 420); // después de la animación
};

/**
 * Cierra el panel del carrito y restaura el scroll del fondo.
 */
const cerrarCarrito = (desdeHistorial = false) => {
  const panel   = document.getElementById('cart-panel');
  const overlay = document.getElementById('cart-overlay');
  const btnVer  = document.getElementById('btn-ver-carrito');

  if (!panel.classList.contains('open')) return;
  panel.classList.remove('open');
  overlay.classList.remove('visible');
  desbloquearScroll();
  restaurarFondo();
  if (desdeHistorial !== true) cerrarEnHistorial('carrito');
  btnVer.setAttribute('aria-expanded', 'false');
};

/* ================================================================
   7 bis. VISTA DE PRODUCTO (detalle a pantalla completa)
   Imita la ficha de la tienda de referencia: imagen + info en dos
   columnas, selector de presentación, cantidad y relacionados.
=============================================================== */

/** Productos relacionados: misma categoría, hasta `limite` */
const obtenerRelacionados = (producto, limite = 4) => {
  const misma = PRODUCTOS
    .filter(p => p.activo && p.id !== producto.id && p.categoria === producto.categoria)
    .slice(0, limite);

  if (misma.length) return misma;

  return PRODUCTOS
    .filter(p => p.activo && p.id !== producto.id)
    .sort((a, b) => Number(b.destacado) - Number(a.destacado))
    .slice(0, limite);
};

/** Tarjeta mini para la sección "También te puede gustar" */
const relucharCard = (p) => {
  const nom = esc(p.nombre);
  return `
    <article class="product-card rel-card ${p.activo ? '' : 'agotado'}">
      <button type="button" class="card-open rel-open" data-abrir="${p.id}" aria-label="Ver detalle de ${nom}">
        <span class="rel-img-wrap">
          <img src="${esc(imagenProducto(p))}" data-cat="${esc(p.categoria)}" alt="Foto de ${nom}" loading="lazy" width="400" height="400" />
        </span>
        <span class="rel-name">${nom}</span>
        <span class="detail-price rel-price">${formatCurrency(p.precio_unitario)}</span>
      </button>
    </article>
  `;
};

/**
 * Dibuja la ficha del producto activo dentro del overlay.
 */
const renderDetalle = () => {
  const cont     = document.getElementById('detail-content');
  const producto = buscarProducto(state.productoActivo);
  if (!cont || !producto) return;

  const nom     = esc(producto.nombre);
  const cats    = esc(producto.categoria);
  const desc    = esc(producto.descripcion);
  const med     = esc(producto.medidas);
  const tipoSel = state.seleccion[producto.id] || 'unidad';

  const badge   = (producto.destacado && producto.activo)
    ? '<span class="badge-destacado">Destacado</span>'
    : '';

  const overlay = !producto.activo
    ? '<div class="stock-overlay"><span>Sin stock</span></div>'
    : '';

  const opciones = opcionesTipo(producto, tipoSel);

  const relacionados = obtenerRelacionados(producto);

  // Galería: si el producto tiene varias fotos se muestran como miniaturas
  const fotos = (producto.imagenes && producto.imagenes.length
    ? producto.imagenes
    : [producto.imagen_id]).filter(Boolean);

  const sinFoto = fotos.length === 0;
  const fotoPrincipal = sinFoto ? imagenProducto(producto, 1000) : getImageUrl(fotos[0], 1000);

  const miniaturas = fotos.length > 1
    ? `<div class="detail-thumbs" role="group" aria-label="Galería de fotos del producto">
        ${fotos.map((f, i) => `
          <button type="button" class="detail-thumb ${i === 0 ? 'active' : ''}" data-img="${esc(getImageUrl(f, 1000))}" aria-label="Ver foto ${i + 1}">
            <img src="${esc(getImageUrl(f, 160))}" alt="" loading="lazy" width="64" height="64" />
          </button>`).join('')}
       </div>`
    : '';

  cont.innerHTML = `
    <div class="detail-container">
      <div class="detail-grid">
        <div class="detail-images">
          <div class="detail-image-wrap">
            ${badge}
            <img src="${esc(fotoPrincipal)}" data-cat="${esc(producto.categoria)}" alt="Foto de ${nom}" class="detail-img" id="detail-img" width="520" height="520" />
            ${overlay}
            ${miniaturas}
          </div>
          ${sinFoto ? `<p class="detail-sinfoto">Todavía no tenemos foto de este producto. <a href="https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${encodeURIComponent(`Hola Lula! ¿Me mandás una foto de "${producto.nombre}"?`)}" target="_blank" rel="noopener noreferrer">Pedila por WhatsApp</a></p>` : ''}
        </div>

        <div class="detail-info">
          <span class="detail-category">${cats}</span>
          <h1 class="detail-name">${nom}</h1>
          <p class="detail-sinpintar">Figura de yeso sin pintar, lista para pintar</p>
          <button type="button" class="detail-share" id="btn-compartir">
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>
            Compartir este producto
          </button>
          ${med ? `<p class="detail-measures"><strong>Medidas:</strong> ${med}</p>` : ''}

          <div class="detail-price-row">
            <span class="detail-price" id="detail-price">${formatCurrency(getPrecio(producto, tipoSel))}</span>
            <span class="detail-note" id="detail-note">${esc(infoPack(producto, tipoSel))}</span>
          </div>
          <p class="detail-condition">Seña mínima del ${pctSena()} al confirmar tu pedido. El resto se abona al retirar.</p>

          <div class="detail-variants">
            <label for="detail-select">Presentación</label>
            <div class="select-wrapper">
              <select id="detail-select" class="detail-select form-select">
                ${opciones}
              </select>
              <svg class="select-arrow" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          ${producto.activo ? `
          <div class="detail-buy">
            <div class="detail-qty-row">
              <label class="detail-qty-label" for="detail-qty-value">Cantidad</label>
              <div class="detail-qty">
                <button type="button" class="detail-qty-btn" data-delta="-1" aria-label="Restar uno">−</button>
                <input type="number" class="detail-qty-value" id="detail-qty-value" value="${state.cantidadDetalle}" min="1" max="99" inputmode="numeric" enterkeyhint="done" />
                <button type="button" class="detail-qty-btn" data-delta="1" aria-label="Sumar uno">+</button>
              </div>
            </div>
            <button type="button" id="btn-detail-add" class="btn-agregar detail-add" data-id="${esc(producto.id)}">Agregar al carrito</button>
          </div>
          ` : ''}

          <ul class="detail-badges">
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span>Seña del <strong>${pctSena()}</strong> para confirmar tu pedido</span>
            </li>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              <span>Entregas los <strong>sábados</strong> en los puntos de encuentro</span>
            </li>
            <li>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7" r="1.2"/><circle cx="16" cy="10" r="1.2"/><path d="M12 22a2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2v-1"/></svg>
              <span>Figuras de yeso <strong>sin pintar</strong>, listas para pintar</span>
            </li>
          </ul>
        </div>
      </div>

      ${desc ? `
      <div class="detail-description">
        <h2 class="detail-description-title">Descripción del producto</h2>
        <div class="detail-description-text">${String(producto.descripcion).split(/\n/).map(esc).join('<br/>')}</div>
      </div>` : ''}

      ${relacionados.length ? `
      <section class="related-products" aria-label="También te puede gustar">
        <h2 class="related-title">También te puede gustar</h2>
        <div class="product-grid related-grid">
          ${relacionados.map(relucharCard).join('')}
        </div>
      </section>` : ''}
    </div>
  `;

  // Los relacionados también abren la ficha
  cont.querySelectorAll('.card-open').forEach(el =>
    el.addEventListener('click', () => abrirProducto(el.dataset.abrir))
  );

  // La foto principal y las miniaturas también tienen imagen de reemplazo
  activarFallbackImagenes(cont);
};

/** Abre el detalle del producto indicado. */
const abrirProducto = (id) => {
  const producto = buscarProducto(id);
  if (!producto) return;

  state.productoActivo   = producto.id;
  state.cantidadDetalle  = 1;

  renderDetalle();

  const overlay = document.getElementById('product-detail');
  if (!overlay.classList.contains('open')) {
    aislarFondo(overlay);
    overlay.classList.add('open');
    bloquearScroll();
    abrirEnHistorial('ficha');
  }

  const scroll = document.getElementById('detail-scroll');
  if (scroll) scroll.scrollTop = 0;

  // Foco accesible al cierre, esperando a que termine la animación
  setTimeout(() => {
    const cierre = document.getElementById('btn-cerrar-detalle');
    if (cierre) cierre.focus();
  }, 350);
};

/** Link directo a un producto: el catálogo + ?p=id (se abre la ficha al entrar). */
const urlDeProducto = (p) => {
  const u = new URL(location.href);
  u.search = '';
  u.hash = '';
  u.searchParams.set('p', String(p.id));
  return u.toString();
};

/** Comparte el producto: hoja de compartir del celular o, si no hay, copia el link. */
const compartirProducto = async () => {
  const p = buscarProducto(state.productoActivo);
  if (!p) return;
  const url    = urlDeProducto(p);
  const titulo = `${p.nombre} · Lula Luján Creaciones`;

  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, text: titulo, url });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;   // la clienta cerró la hoja
    }
  }

  try {
    await navigator.clipboard.writeText(url);
  } catch (err) {
    // Sin permiso de portapapeles (http o navegador viejo): copia con un campo temporal
    const t = document.createElement('textarea');
    t.value = url;
    t.setAttribute('readonly', '');
    t.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(t);
    t.select();
    try { document.execCommand('copy'); } catch (e2) { /* nada más que hacer */ }
    t.remove();
  }
  mostrarToast('Link copiado. Pegalo donde quieras.');
};

let enlaceProductoAtendido = false;

/** Si la página se abrió con ?p=id, muestra esa ficha apenas hay catálogo. */
const abrirProductoDesdeURL = () => {
  if (enlaceProductoAtendido) return;
  const id = new URLSearchParams(location.search).get('p');
  if (!id) { enlaceProductoAtendido = true; return; }
  const p = buscarProducto(id);
  // Si todavía no está (copia guardada vieja), se reintenta cuando llegue la planilla
  if (!p) return;
  enlaceProductoAtendido = true;
  abrirProducto(p.id);
};

/** Cierra el detalle y restaura el scroll del fondo. */
const cerrarProducto = (desdeHistorial = false) => {
  const overlay = document.getElementById('product-detail');
  if (!overlay.classList.contains('open')) return;
  overlay.classList.remove('open');
  desbloquearScroll();
  restaurarFondo();
  if (desdeHistorial !== true) cerrarEnHistorial('ficha');
  state.productoActivo = null;
};

/** Clics dentro del contenido del detalle (galería, cantidad, agregar). */
const manejarClickDetalle = (e) => {
  // Cambiar la foto principal tocando una miniatura
  const thumb = e.target.closest('.detail-thumb');
  if (thumb) {
    const main = document.getElementById('detail-img');
    if (main) main.src = thumb.dataset.img;

    const cont = e.currentTarget;
    cont.querySelectorAll('.detail-thumb').forEach(t =>
      t.classList.toggle('active', t === thumb)
    );
    return;
  }

  const qtyBtn = e.target.closest('.detail-qty-btn');
  if (qtyBtn) {
    const v = state.cantidadDetalle + Number(qtyBtn.dataset.delta);
    state.cantidadDetalle = Math.max(1, Math.min(99, v));
    const el = document.getElementById('detail-qty-value');
    if (el) el.value = state.cantidadDetalle;
    return;
  }

  const addBtn = e.target.closest('#btn-detail-add');
  if (addBtn) {
    agregarDetalleAlCarrito();
    return;
  }

  if (e.target.closest('#btn-compartir')) {
    compartirProducto();
    return;
  }
};

/** Cambios dentro del contenido del detalle (selector de presentación). */
const manejarCambioDetalle = (e) => {
  // Cantidad escrita a mano (revendedoras: 15 de una, sin tocar + 14 veces)
  if (e.target.id === 'detail-qty-value') {
    const n = Math.floor(Number(e.target.value)) || 1;
    state.cantidadDetalle = Math.max(1, Math.min(99, n));
    e.target.value = state.cantidadDetalle;
    return;
  }
  if (e.target.id !== 'detail-select') return;

  const producto = buscarProducto(state.productoActivo);
  if (!producto) return;

  state.seleccion[producto.id] = e.target.value;

  const precio = document.getElementById('detail-price');
  if (precio) precio.textContent = formatCurrency(getPrecio(producto, e.target.value));
  const nota = document.getElementById('detail-note');
  if (nota) nota.textContent = infoPack(producto, e.target.value);
};

/** Botón "Agregar al carrito" de la ficha (con cantidad elegida). */
const agregarDetalleAlCarrito = () => {
  const producto = buscarProducto(state.productoActivo);
  if (!producto || !producto.activo) return;

  const sel  = document.getElementById('detail-select');
  const tipo = sel ? sel.value : (state.seleccion[producto.id] || 'unidad');
  const cant = state.cantidadDetalle || 1;

  pushAlCarrito(producto, tipo, cant);

  const btn = document.getElementById('btn-detail-add');
  if (btn) {
    btn.textContent = '¡Listo!';
    btn.classList.add('added');
    clearTimeout(btn._t);
    btn._t = setTimeout(() => {
      btn.textContent = 'Agregar al carrito';
      btn.classList.remove('added');
    }, 900);
  }

  mostrarToast(`"${producto.nombre}" agregado al carrito`);
};

/* ================================================================
   8. CHECKOUT, VALIDACIONES Y REGLA MERLO
================================================================ */

/**
 * Valida el estado del formulario de checkout en tiempo real:
 *   - Habilita/deshabilita el botón de envío.
 *   - Aplica la REGLA MERLO: si el punto de encuentro es "Merlo Coppel"
 *     y el total es menor a MERLO_MINIMO, deshabilita el envío y
 *     muestra el cartel de advertencia en rojo.
 */
const validarFormulario = () => {
  const total       = calcularTotal();
  const punto       = document.getElementById('campo-punto').value;
  const merloAlert  = document.getElementById('merlo-warning');
  const btnEnviar   = document.getElementById('btn-enviar-pedido');
  const pausa       = document.getElementById('pausa-warning');

  // Tienda en pausa (Config → tienda_abierta = NO): se mira, no se pide
  if (pausa) pausa.classList.toggle('hidden', CONFIG.tiendaAbierta);
  if (!CONFIG.tiendaAbierta) {
    merloAlert.classList.add('hidden');
    btnEnviar.disabled = true;
    btnEnviar.setAttribute('aria-disabled', 'true');
    return;
  }

  // Mínimo del punto de encuentro (antes solo existía para Merlo Coppel)
  const datosPunto = buscarPunto(punto);
  const minimo = datosPunto ? datosPunto.minimo : 0;
  const bloqueoPorMerlo = minimo > 0 && total < minimo;

  if (bloqueoPorMerlo) {
    const txt = document.getElementById('merlo-texto');
    if (txt) {
      txt.innerHTML = `En <strong>${esc(punto)}</strong> el pedido mínimo es de <strong>${formatCurrency(minimo)}</strong>. ` +
        `Te faltan <strong>${formatCurrency(minimo - total)}</strong>, o elegí otro punto de encuentro.`;
    }
    merloAlert.classList.remove('hidden');
    btnEnviar.disabled = true;
    btnEnviar.setAttribute('aria-disabled', 'true');
  } else {
    merloAlert.classList.add('hidden');
    // El botón se habilita solo si hay items en el carrito
    const tieneItems = state.carrito.length > 0;
    btnEnviar.disabled = !tieneItems;
    btnEnviar.setAttribute('aria-disabled', String(!tieneItems));
  }
};

/**
 * Valida todos los campos del formulario antes de enviar.
 * Marca en rojo los campos inválidos y muestra mensajes de error.
 * @returns {boolean} true si todos los campos son válidos
 */
const validarCampos = () => {
  let valido = true;

  const campos = [
    { input: document.getElementById('campo-nombre'),   error: document.getElementById('error-nombre') },
    { input: document.getElementById('campo-telefono'),  error: document.getElementById('error-telefono') },
    { input: document.getElementById('campo-punto'),    error: document.getElementById('error-punto') },
  ];

  // Limpiar errores anteriores
  campos.forEach(({ input, error }) => {
    input.classList.remove('error');
    error.classList.add('hidden');
  });

  // Validar cada campo
  campos.forEach(({ input, error }) => {
    if (!input.value.trim()) {
      input.classList.add('error');
      error.classList.remove('hidden');
      valido = false;
    }
  });

  // Teléfono: "no vacío" no alcanza, un pedido con un teléfono de 3 cifras
  // es un pedido que no se puede confirmar. Se piden al menos 8 dígitos.
  const tel      = document.getElementById('campo-telefono');
  const errorTel = document.getElementById('error-telefono');
  const digitos  = tel.value.replace(/\D/g, '');
  if (tel.value.trim() && digitos.length < 8) {
    tel.classList.add('error');
    errorTel.textContent = 'Revisá el teléfono: tiene que tener al menos 8 números.';
    errorTel.classList.remove('hidden');
    valido = false;
  } else if (!tel.value.trim()) {
    errorTel.textContent = 'Por favor ingresá tu teléfono.';
  }

  return valido;
};

/** Quita el estado de error de todos los campos del formulario de checkout. */
const desmarcarErroresFormulario = () => {
  ['error-nombre', 'error-telefono', 'error-punto'].forEach(id => {
    const err = document.getElementById(id);
    if (err) err.classList.add('hidden');
  });
  ['campo-nombre', 'campo-telefono', 'campo-punto'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('error');
  });
};

/* ================================================================
   9. GENERACIÓN DEL MENSAJE DE WHATSAPP
================================================================ */

/**
 * Construye el texto estructurado del pedido para enviarlo por WhatsApp.
 * Separa unidades sueltas de packs para mayor claridad.
 *
 * Estructura del mensaje:
 * - Encabezado con datos del cliente
 * - Sección "Unidades sueltas" (tipo: 'unidad')
 * - Sección "Packs" (tipo: 'pack10' | 'pack20')
 * - Resumen de totales, seña y resto
 * - Punto de encuentro
 * - Aviso de entrega
 *
 * @param {string} nombre   - Nombre y apellido del cliente
 * @param {string} telefono - Teléfono del cliente
 * @param {string} punto    - Punto de encuentro seleccionado
 * @returns {string}        - Texto CRUDO (sin codificar)
 */
const generarNumeroPedido = () => {
  const d = new Date();
  const fecha = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // sin 0/O ni 1/I: se dictan por teléfono
  const azar = Array.from(crypto.getRandomValues(new Uint8Array(4)), b => letras[b % letras.length]).join('');
  return `LL-${fecha}-${azar}`;
};

/**
 * WhatsApp pone en negrita lo que va entre *asteriscos*, en cursiva entre _guiones_,
 * tachado con ~ y monoespaciado con `. Sacarlos de los textos de la clienta y de
 * los nombres de la planilla evita que el mensaje se arme raro.
 */
const sinFormatoWA = (s) => String(s ?? '').replace(/[*_~`]/g, '').replace(/\s+/g, ' ').trim();

const generarMensajeWhatsApp = (nombre, telefono, punto, numero = '') => {
  nombre = sinFormatoWA(nombre); telefono = sinFormatoWA(telefono); punto = sinFormatoWA(punto);
  const total = calcularTotal();
  const sena  = calcularSena(total);
  const resto = total - sena;

  // Separar items en dos grupos para el mensaje
  const unidades = state.carrito.filter(i => i.tipo === 'unidad');
  const packs    = state.carrito.filter(i => i.tipo !== 'unidad');

  let msg = '';
  // 🌸 NUEVO PEDIDO — Lula Luján Creaciones 🌸
  msg += `\u{1F338} *NUEVO PEDIDO \u2014 Lula Luj\u00E1n Creaciones* \u{1F338}\n\n`;
  // 👤 Cliente:
  msg += `\u{1F464} *Cliente:* ${nombre}\n`;
  // 📱 Teléfono:
  msg += `\u{1F4F1} *Tel\u00E9fono:* ${telefono}\n`;
  // 📍 Punto de encuentro:
  msg += `\u{1F4CD} *Punto de encuentro:* ${punto}\n`;
  // 🧾 N° de pedido:
  if (numero) msg += `\u{1F9FE} *Pedido N\u00B0:* ${numero}\n`;

  // Sección unidades sueltas
  if (unidades.length > 0) {
    // 📦 UNIDADES SUELTAS:
    msg += `\n\u{1F4E6} *UNIDADES SUELTAS:*\n`;
    unidades.forEach(i => {
      // • Nombre × cantidad → precio
      msg += `   \u2022 ${sinFormatoWA(i.nombre)} \u00D7 ${i.cantidad} \u2192 ${formatCurrency(i.precio * i.cantidad)}\n`;
    });
  }

  // Sección packs
  if (packs.length > 0) {
    // 🎁 PACKS:
    msg += `\n\u{1F381} *PACKS:*\n`;
    packs.forEach(i => {
      msg += `   \u2022 ${sinFormatoWA(i.nombre)} (${i.tipoLabel}) \u00D7 ${i.cantidad} \u2192 ${formatCurrency(i.precio * i.cantidad)}\n`;
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━
  msg += `\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n`;
  // 💰 Total del pedido:
  msg += `\u{1F4B0} *Total del pedido:* ${formatCurrency(total)}\n`;
  // ✅ Seña para confirmar (10%):
  msg += `\u2705 *Se\u00F1a para confirmar (${pctSena()}):* ${formatCurrency(sena)}\n`;
  // 🔄 Resto a abonar al retirar:
  msg += `\u{1F504} *Resto a abonar al retirar:* ${formatCurrency(resto)}\n`;
  msg += `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n\n`;
  // 📅 Las entregas son los sábados...
  msg += `Las entregas son los s\u00E1bados. Te enviamos el horario exacto una vez confirmado.`;

  return msg;
};

/**
 * Handler del botón "Enviar Pedido por WhatsApp".
 * Valida el formulario, aplica reglas de negocio y abre WhatsApp.
 */
const enviarPedido = () => {
  // Validación de campos del formulario
  if (!validarCampos()) return;

  const nombre    = document.getElementById('campo-nombre').value.trim();
  const telefono  = document.getElementById('campo-telefono').value.trim();
  const punto     = document.getElementById('campo-punto').value;
  const total     = calcularTotal();

  // Doble check: carrito vacío
  if (state.carrito.length === 0) return;

  // Doble check: tienda en pausa y mínimo del punto
  if (!CONFIG.tiendaAbierta) return;
  const datosPunto = buscarPunto(punto);
  if (datosPunto && datosPunto.minimo > 0 && total < datosPunto.minimo) return;

  // Número de pedido: el mismo va en el mensaje y en la planilla, así tu
  // hermana los cruza. Si la clienta reintenta sin cambiar el carrito,
  // se reusa el número (la API ignora el duplicado).
  const firma = JSON.stringify([state.carrito, nombre, telefono, punto]);
  if (!state.ultimoPedido || state.ultimoPedido.firma !== firma) {
    state.ultimoPedido = { firma, numero: generarNumeroPedido() };
  }
  const numero = state.ultimoPedido.numero;

  // 1. Generamos el texto crudo del pedido
  const textoCrudo = generarMensajeWhatsApp(nombre, telefono, punto, numero);
  
  // 2. Codificamos para la URL
  const textoCodificado = encodeURIComponent(textoCrudo);

  // 3. Usamos api.whatsapp.com en lugar de wa.me (más tolerante entre navegadores).
  //    El número sale de WHATSAPP_NUMBER: un solo lugar para cambiarlo.
  const urlWhatsApp = `https://api.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${textoCodificado}`;
  
  // window.open tiene que ser lo PRIMERO después del toque: si antes
  // esperáramos a la API, el navegador lo bloquearía como pop-up.
  window.open(urlWhatsApp, '_blank', 'noopener,noreferrer');

  registrarPedido({ numero, nombre, telefono, punto });

  // Al volver de WhatsApp la clienta encuentra la pregunta, no el
  // mismo carrito lleno sin saber si el pedido salió.
  const enviado = document.getElementById('cart-sent');
  if (enviado) {
    enviado.classList.remove('hidden');
    enviado.scrollIntoView({ block: 'nearest' });
  }
};

/** "Sí, vaciar carrito": cierra el ciclo del pedido. */
const confirmarPedidoEnviado = () => {
  state.carrito = [];
  state.ultimoPedido = null;
  document.getElementById('cart-sent-numero')?.classList.add('hidden');
  actualizarUIGlobal();
  document.getElementById('cart-sent').classList.add('hidden');
  renderCarrito();
  cerrarCarrito();
  mostrarToast('¡Gracias! Te respondemos por WhatsApp.', 3200);
};

/* ================================================================
   10. BÚSQUEDA
================================================================ */

/**
 * Handler del input de búsqueda.
 * Actualiza el estado y re-renderiza la grilla filtrada.
 * @param {Event} e
 */
const aplicarBusqueda = (valor) => {
  state.textoBusqueda = valor;
  state.pagina        = 1;
  // Si el usuario busca desde el home, pasamos directo a la tienda
  if (state.textoBusqueda.trim() && state.vista !== 'catalogo') {
    mostrarVista('catalogo');
  }
  renderProductos();
};

const aplicarBusquedaDebounced = debounce(aplicarBusqueda, 120);

const manejarBusqueda = (e) => {
  aplicarBusquedaDebounced(e.target.value);
};

/* ================================================================
   10 bis. CAT\u00c1LOGO DESDE GOOGLE SHEETS

   La planilla se publica como CSV (Archivo -> Compartir -> Publicar en la
   web -> CSV) y esta secci\u00f3n la lee, la valida y la convierte en productos.

   Estrategia de carga, pensada para que el cat\u00e1logo abra r\u00e1pido en un
   celular con se\u00f1al mala:
     1. Si hay copia guardada, se muestra YA (aunque est\u00e9 vencida).
     2. En paralelo se consulta la planilla y, si cambi\u00f3, se redibuja.
     3. Si la consulta falla pero hab\u00eda copia, el cliente ni se entera.
     4. Si falla y no hay copia, se ofrece reintentar.
================================================================ */

/**
 * Parser de CSV.
 *
 * No alcanza con separar por comas: las descripciones traen comas adentro y
 * Sheets las exporta entre comillas, con las comillas internas duplicadas.
 * @param {string} texto - contenido CSV
 * @returns {string[][]} filas de celdas
 */
const parseCSV = (texto) => {
  const filas = [];
  let fila = [];
  let campo = '';
  let enComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];

    if (enComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++; }  // comilla escapada ("")
        else enComillas = false;
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"')       { enComillas = true; }
    else if (c === ',')  { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (c !== '\r') { campo += c; }
  }

  if (campo !== '' || fila.length > 0) { fila.push(campo); filas.push(fila); }
  return filas;
};

/**
 * Interpreta un precio escrito como lo escribiría una persona:
 * "2800", "2.800", "$ 2.800", "2.800,50" → 2800.
 * @param {*} v
 * @returns {number} pesos enteros
 */
const aNumero = (v) => {
  let s = String(v ?? '').trim().replace(/[^\d.,-]/g, '');
  if (!s) return 0;

  const sep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  // Solo es separador decimal si deja 1 o 2 dígitos a la derecha;
  // si deja 3, era separador de miles ("2.800").
  if (sep > -1 && s.length - sep - 1 <= 2) {
    s = s.slice(0, sep).replace(/[.,]/g, '') + '.' + s.slice(sep + 1);
  } else {
    s = s.replace(/[.,]/g, '');
  }

  const n = Number(s);
  // Precios en pesos enteros: se conserva la parte entera y nunca se
  // redondea para arriba (una celda con "2.800,50" no debe cobrar $2.801).
  return Number.isFinite(n) ? Math.floor(n) : 0;
};

/**
 * Interpreta un sí/no tolerando cómo lo escriba cada persona.
 * Acepta la casilla de verificación de Sheets (TRUE) y también
 * "si", "sí", "x", "1", "activo".
 * @param {*} v
 * @returns {boolean}
 */
const aBooleano = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  return ['true', 'verdadero', 'si', 's\u00ed', 'x', '1', 'activo'].includes(s);
};

/**
 * Convierte las filas del CSV en objetos producto.
 * Las columnas se ubican por NOMBRE de encabezado, no por posición: así
 * tu hermana puede reordenar o agregar columnas sin romper nada.
 * @param {string[][]} filas
 * @returns {Array} productos válidos
 */
/**
 * Problemas encontrados al leer la planilla. Antes solo iban a la consola,
 * que tu hermana nunca abre. Se ven abriendo el catálogo con ?revisar al
 * final del link (ej: lulalujan.netlify.app/?revisar).
 */
const AVISOS_PLANILLA = [];

const filasAProductos = (filas) => {
  AVISOS_PLANILLA.length = 0;
  if (!filas.length) return [];

  const encabezados = filas[0].map(h => norm(h).replace(/\s+/g, '_'));
  const col = (fila, nombre) => {
    const i = encabezados.indexOf(nombre);
    return i === -1 ? '' : (fila[i] ?? '');
  };

  const idsVistos = new Set();

  return filas.slice(1).reduce((acc, fila) => {
    // Fila totalmente vacía (pasa seguido al final de una planilla)
    if (fila.every(c => String(c).trim() === '')) return acc;

    const nombre = String(col(fila, 'nombre')).trim();
    const precio = aNumero(col(fila, 'precio_unitario'));

    // Sin nombre o sin precio no es un producto: se ignora la fila
    if (!nombre || precio <= 0) {
      // Solo se avisa si la fila parece un producto a medio cargar. Las filas
      // vacías con casillas o fórmulas (muy comunes al final) no son errores.
      if (nombre) AVISOS_PLANILLA.push(`"${nombre}" no aparece: le falta el precio unitario.`);
      else if (precio > 0) AVISOS_PLANILLA.push(`Hay una fila con precio ${formatCurrency(precio)} pero sin nombre: no aparece en el catálogo.`);
      return acc;
    }

    // ID ESTABLE: lo que diga la planilla (número o texto) o, si está vacío,
    // un slug del nombre. NUNCA la posición de la fila: con ids por posición,
    // insertar una fila arriba corría todos los ids y el carrito guardado de
    // una clienta pasaba a apuntar a otro producto.
    let id = aSlug(col(fila, 'id')) || aSlug(nombre) || `producto-${acc.length + 1}`;
    if (idsVistos.has(id)) {
      // Dos filas con el mismo id: la segunda recibe un sufijo en vez de
      // pisar a la primera (y se avisa en consola para corregir la planilla).
      let n = 2;
      while (idsVistos.has(`${id}-${n}`)) n++;
      console.warn(`Planilla: id repetido "${id}" en "${nombre}"; se usa "${id}-${n}".`);
      AVISOS_PLANILLA.push(`El id "${id}" está repetido ("${nombre}"). Poné un id distinto en cada fila.`);
      id = `${id}-${n}`;
    }
    idsVistos.add(id);

    // Varias fotos por producto: se juntan de la celda "imagen_id"
    // (puede tener varios links, uno por línea o separados por coma)
    // y de las columnas opcionales imagen_2 / imagen_3 / imagen_4.
    // Se corta por salto de línea o ";" siempre, y por "," solo cuando lo que
    // sigue es otro link o un ID de Drive (una URL de Cloudinary lleva comas
    // en sus transformaciones y no hay que partirla).
    const cortarImagenes = (v) => String(v ?? '')
      .split(/\s*[\n;]\s*|\s*,\s*(?=https?:\/\/|[A-Za-z0-9_-]{28,44}\s*(?:,|$))/)
      .map(s => s.trim())
      .filter(Boolean);

    const imgs = [...new Set([
      ...cortarImagenes(col(fila, 'imagen_id')),
      ...cortarImagenes(col(fila, 'imagen_2')),
      ...cortarImagenes(col(fila, 'imagen_3')),
      ...cortarImagenes(col(fila, 'imagen_4')),
    ])];

    if (!aNumero(col(fila, 'precio_pack_10')) || !aNumero(col(fila, 'precio_pack_20'))) {
      AVISOS_PLANILLA.push(`"${nombre}": falta el precio de algún pack; se cobra el precio por unidad sin descuento.`);
    }

    acc.push({
      id,
      nombre,
      categoria:       String(col(fila, 'categoria')).trim() || 'Otros',
      descripcion:     String(col(fila, 'descripcion')).trim(),
      medidas:         String(col(fila, 'medidas')).trim(),
      precio_unitario: precio,
      // Si no cargaron precio de pack, se cae al precio por unidad
      precio_pack_10:  aNumero(col(fila, 'precio_pack_10')) || precio * 10,
      precio_pack_20:  aNumero(col(fila, 'precio_pack_20')) || precio * 20,
      imagen_id:       imgs[0] || '',   // primera foto (para grilla y carrito)
      imagenes:        imgs,            // todas las fotos (galería en la ficha)
      // "activo" vacío = activo: si la familia agrega un producto y se le
      // olvida el "SI", la figura igual aparece en el catálogo.
      activo:          col(fila, 'activo').trim() === '' ? true : aBooleano(col(fila, 'activo')),
      destacado:       aBooleano(col(fila, 'destacado')),
    });
    return acc;
  }, []);
};

/** Reemplaza el contenido de PRODUCTOS conservando la referencia del array */
const reemplazarProductos = (nuevos) => {
  PRODUCTOS.length = 0;
  PRODUCTOS.push(...nuevos);
};

/** Guarda una copia del catálogo para el próximo arranque */
const guardarCatalogoEnCache = (productos) => {
  try {
    localStorage.setItem(STORAGE_CATALOGO, JSON.stringify({
      guardadoEn: Date.now(),
      productos,
    }));
  } catch (err) { /* sin caché, la página igual funciona */ }
};

/** Lee la copia guardada del catálogo, si existe */
const leerCatalogoDeCache = () => {
  try {
    const c = JSON.parse(localStorage.getItem(STORAGE_CATALOGO) || 'null');
    if (!c || !Array.isArray(c.productos) || !c.productos.length) return null;
    return c;
  } catch (err) {
    return null;
  }
};

/** Descarga la planilla y devuelve los productos ya convertidos */
const traerProductosDeLaPlanilla = async () => {
  // cache-busting: sin esto Google devuelve una versión vieja del CSV
  const url  = `${SHEET_CSV_URL}${SHEET_CSV_URL.includes('?') ? '&' : '?'}_=${Date.now()}`;
  const resp = await fetch(url, { cache: 'no-store' });

  if (!resp.ok) throw new Error(`La planilla respondi\u00f3 ${resp.status}`);

  const productos = filasAProductos(parseCSV(await resp.text()));
  if (!productos.length) throw new Error('La planilla no tiene productos v\u00e1lidos');

  return productos;
};

/** Muestra u oculta los estados de carga y error del catálogo */
const mostrarEstadoCatalogo = (estado) => {
  const cargando = document.getElementById('catalog-loading');
  const error    = document.getElementById('catalog-error');
  const grid     = document.getElementById('product-grid');
  const toolbar  = document.querySelector('.catalog-toolbar');

  if (cargando) cargando.classList.toggle('hidden', estado !== 'cargando');
  if (error)    error.classList.toggle('hidden',    estado !== 'error');
  if (grid)     grid.classList.toggle('hidden',     estado !== 'listo');
  if (toolbar)  toolbar.classList.toggle('hidden',  estado !== 'listo');

  const pag = document.getElementById('catalog-pagination');
  if (pag) pag.classList.toggle('hidden', estado !== 'listo');

  // Si el catálogo no pudo cargar y está abierto desde el disco,
  // el mensaje genérico de conexión es confuso: se explica la causa real.
  if (estado === 'error' && window.location.protocol === 'file:') {
    const sub = document.getElementById('catalog-error-sub');
    if (sub) {
      sub.textContent =
        'Est\u00e1s abriendo el archivo desde tu computadora y el navegador no deja ' +
        'leer Google Sheets en ese modo. Ten\u00e9s que publicar esta carpeta en la web ' +
        'o abrirla con un servidor (mir\u00e1 guias/PUBLICAR-CATALOGO.md).';
    }
  }
};

/**
 * Muestra la franja que avisa que se está viendo una copia de respaldo
 * del catálogo porque la planilla no se pudo leer.
 */
const mostrarAvisoOffline = () => {
  const franja = document.getElementById('catalog-offline');
  if (!franja) return;

  const detalle = document.getElementById('offline-detalle');
  if (detalle) {
    detalle.textContent = window.location.protocol === 'file:'
      ? 'Est\u00e1s abriendo el archivo desde tu computadora y el navegador no permite leer Google Sheets en ese modo. Mostramos una copia guardada del cat\u00e1logo. Para ver los cambios de la planilla: public\u00e1 esta carpeta en internet (mir\u00e1 guias/PUBLICAR-CATALOGO.md).'
      : 'No se pudo conectar con la planilla. Se muestra una copia guardada del cat\u00e1logo.';
  }

  franja.classList.remove('hidden');
};

/** Oculta la franja de modo respaldo cuando la planilla vuelve a responder. */
const ocultarAvisoOffline = () => {
  const franja = document.getElementById('catalog-offline');
  if (franja) franja.classList.add('hidden');
};

/** Dibuja el catálogo con lo que haya en PRODUCTOS */
const montarCatalogo = () => {
  cargarCarrito();          // necesita PRODUCTOS cargado para re-sincronizar

  // Umbrales reales de precio del catálogo (para el slider)
  state.filtros.umbrales = leerUmbralesPrecio();

  // Si una categoría del sidebar fue renombrada o borrada en la planilla,
  // se descarta del filtro activo para no dejar pills huérfanas.
  const catsActuales = new Set(PRODUCTOS.map(p => p.categoria));
  state.filtros.categorias = state.filtros.categorias.filter(c => catsActuales.has(c));

  // Primera vez → rango completo; después ajustamos a los nuevos umbrales
  if (!Number.isFinite(state.filtros.precioMin) ||
      !Number.isFinite(state.filtros.precioMax)) {
    state.filtros.precioMin = state.filtros.umbrales.min;
    state.filtros.precioMax = state.filtros.umbrales.max;
  } else {
    state.filtros.precioMin = Math.max(state.filtros.precioMin, state.filtros.umbrales.min);
    state.filtros.precioMax = Math.min(state.filtros.precioMax, state.filtros.umbrales.max);
  }

  sincronizarInputsPrecio();
  renderChecksCategorias();
  renderActiveFilters();
  renderFilterChips();
  renderProductos();
  renderHome();             // el home muestra destacados y categorías
  actualizarUIGlobal();
  mostrarEstadoCatalogo('listo');
  mostrarAvisosPlanilla();
  abrirProductoDesdeURL();
  avisarCambiosCarrito();
};

/**
 * Si desde la última visita un producto del carrito se pausó o cambió de precio,
 * se le dice a la clienta. Antes se corregía en silencio y el carrito
 * aparecía distinto sin explicación.
 */
const avisarCambiosCarrito = () => {
  const { quitados, precios } = avisoCarrito;
  avisoCarrito.quitados = 0;
  avisoCarrito.precios  = 0;
  if (!quitados && !precios) return;

  const partes = [];
  if (quitados) partes.push(`${quitados} producto${quitados === 1 ? '' : 's'} de tu carrito ya no ${quitados === 1 ? 'está disponible' : 'están disponibles'}`);
  if (precios)  partes.push(`cambió el precio de ${precios === 1 ? 'un producto' : precios + ' productos'}`);
  const texto = partes.join(' y ');
  mostrarToast(texto.charAt(0).toUpperCase() + texto.slice(1) + '.', 5500);
};

/** Panel de avisos de la planilla (solo con ?revisar en el link). */
const mostrarAvisosPlanilla = () => {
  if (!new URLSearchParams(location.search).has('revisar')) return;
  let caja = document.getElementById('avisos-planilla');
  if (!caja) {
    caja = document.createElement('section');
    caja.id = 'avisos-planilla';
    caja.className = 'avisos-planilla';
    document.getElementById('main-content').prepend(caja);
  }
  caja.innerHTML = AVISOS_PLANILLA.length
    ? `<h2>Revisar la planilla (${AVISOS_PLANILLA.length})</h2><ul>${AVISOS_PLANILLA.map(a => `<li>${esc(a)}</li>`).join('')}</ul>`
    : '<h2>La planilla está perfecta</h2><p>No encontramos problemas.</p>';
};

/**
 * Punto de entrada de los datos. Ver la estrategia al inicio de la sección.
 */
const cargarProductos = async () => {
  // Sin planilla configurada: se usa el respaldo embebido del archivo
  if (!SHEET_CSV_URL) {
    reemplazarProductos(filasAProductos(parseCSV(CSV_EMERGENCIA)));
    montarCatalogo();
    return;
  }

  const cache = leerCatalogoDeCache();

  if (cache) {
    reemplazarProductos(cache.productos);
    montarCatalogo();                       // el cliente ya puede comprar
    if (Date.now() - cache.guardadoEn < CACHE_TTL_MS) return;  // copia fresca
  } else {
    mostrarEstadoCatalogo('cargando');
  }

  try {
    const productos = await traerProductosDeLaPlanilla();
    reemplazarProductos(productos);
    guardarCatalogoEnCache(productos);
    montarCatalogo();
    ocultarAvisoOffline();
  } catch (err) {
    console.error('No se pudo leer la planilla:', err);
    // Con copia guardada el cliente sigue comprando y no ve ningún error.
    // Sin copia: se monta el respaldo embebido y se avisa con la franja,
    // para que el catálogo funcione incluso abierto desde el disco.
    if (!cache) {
      const respaldo = filasAProductos(parseCSV(CSV_EMERGENCIA));
      if (respaldo.length) {
        reemplazarProductos(respaldo);
        montarCatalogo();
        mostrarAvisoOffline();
      } else {
        mostrarEstadoCatalogo('error');
      }
    }
  }
};


/* ================================================================
   12. CONFIGURACIÓN REMOTA, REGISTRO DE PEDIDOS Y CUENTAS
   Todo depende de API_URL. Sin ella el catálogo funciona como siempre.
================================================================ */

/** POST a la API. text/plain para que el navegador no haga "preflight". */
const apiPost = async (accion, datos = {}, opciones = {}) => {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ accion, ...datos }),
    ...opciones,
  });
  return resp.json();
};

/* ---------- Config (pestañas Config y Puntos) ---------- */
const aplicarConfig = (datos) => {
  if (!datos || !datos.config) return;
  const c = datos.config;
  const si = (v, def) => {
    const s = String(v ?? '').trim().toLowerCase();
    return s === '' ? def : ['si', 'sí', 'true', 'verdadero', 'x', '1'].includes(s);
  };

  const wa = String(c.whatsapp ?? '').replace(/\D/g, '');
  if (wa.length >= 10) WHATSAPP_NUMBER = wa;
  const pct = Number(c.sena_porcentaje);
  if (Number.isFinite(pct) && pct >= 0 && pct <= 100) PORCENTAJE_SENA = pct / 100;

  CONFIG.tiendaAbierta = si(c.tienda_abierta, true);
  CONFIG.cuentas       = si(c.cuentas_clientas, true);
  if (String(c.mensaje_pausa ?? '').trim()) CONFIG.mensajePausa = String(c.mensaje_pausa).trim();

  if (Array.isArray(datos.puntos) && datos.puntos.length) {
    PUNTOS_ENTREGA = datos.puntos
      .filter(p => String(p.nombre || '').trim())
      .map(p => ({ nombre: String(p.nombre).trim(), minimo: Number(p.minimo) || 0, activo: p.activo !== false, detalle: String(p.detalle || '') }));
  }

  const adbar = document.querySelector('.header-adbar');
  if (adbar && String(c.aviso_superior ?? '').trim()) adbar.textContent = String(c.aviso_superior).trim();

  // Todos los "10%" escritos en la página siguen al porcentaje real
  document.querySelectorAll('.pct-sena').forEach(el => { el.textContent = pctSena(); });

  const banner = document.getElementById('banner-pausa');
  if (banner) {
    banner.classList.toggle('hidden', CONFIG.tiendaAbierta);
    const t = document.getElementById('banner-pausa-texto');
    if (t) t.textContent = CONFIG.mensajePausa;
  }
  const pausaTxt = document.getElementById('pausa-texto');
  if (pausaTxt) pausaTxt.textContent = CONFIG.mensajePausa;

  poblarPuntosEntrega();
  renderHomeContacto();
  actualizarBotonCuenta();
  if (document.getElementById('cart-panel').classList.contains('open')) renderCarrito();
};

const cargarConfig = async () => {
  try {
    const guardada = JSON.parse(localStorage.getItem(STORAGE_CONFIG) || 'null');
    if (guardada) aplicarConfig(guardada);
  } catch (err) { /* sin copia */ }

  if (!API_URL) return;
  try {
    const r = await fetch(`${API_URL}?accion=config&_=${Date.now()}`, { cache: 'no-store' });
    const datos = await r.json();
    if (datos && datos.ok) {
      aplicarConfig(datos);
      try { localStorage.setItem(STORAGE_CONFIG, JSON.stringify(datos)); } catch (err) {}
    }
  } catch (err) {
    console.warn('No se pudo leer la configuración:', err);
  }
};

/* ---------- Registro del pedido en la planilla privada ---------- */
const registrarPedido = ({ numero, nombre, telefono, punto }) => {
  if (!API_URL) return;
  const nota = document.getElementById('cart-sent-numero');
  const sesion = leerSesion();
  const pedido = {
    numero, nombre, telefono, punto,
    items: state.carrito.map(i => ({ id: i.productoId, nombre: i.nombre, tipo: i.tipo, cantidad: i.cantidad, precio: i.precio })),
  };
  // keepalive: el pedido se registra aunque el celular salte a WhatsApp
  apiPost('registrarPedido', { pedido, token: sesion ? sesion.token : '' }, { keepalive: true })
    .then(r => {
      if (!nota) return;
      if (r && r.ok) {
        nota.innerHTML = `Pedido <strong>${esc(numero)}</strong> registrado.` +
          (sesion ? ' Lo vas a ver en <strong>Mi cuenta</strong>.' : '');
        nota.classList.remove('hidden');
      }
    })
    .catch(() => { /* el pedido igual viaja por WhatsApp */ });
};

/* ---------- Sesión de la clienta ---------- */
const leerSesion = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_SESION) || 'null'); } catch (err) { return null; }
};
const guardarSesion = (s) => {
  try { s ? localStorage.setItem(STORAGE_SESION, JSON.stringify(s)) : localStorage.removeItem(STORAGE_SESION); } catch (err) {}
};

const cuentasDisponibles = () => !!API_URL && CONFIG.cuentas;

const actualizarBotonCuenta = () => {
  const btn = document.getElementById('btn-cuenta');
  if (btn) btn.classList.toggle('hidden', !cuentasDisponibles());
  const s = leerSesion();
  const etiqueta = document.getElementById('btn-cuenta-texto');
  if (etiqueta) etiqueta.textContent = s && s.nombre ? s.nombre.split(' ')[0] : 'Mi cuenta';

  // Línea del checkout: con cuenta, el pedido queda asociado; sin cuenta, se invita (sin obligar)
  const linea = document.getElementById('checkout-cuenta');
  if (linea) {
    if (!cuentasDisponibles()) { linea.classList.add('hidden'); return; }
    linea.classList.remove('hidden');
    linea.innerHTML = s
      ? `Este pedido se guarda en tu cuenta, <strong>${esc(s.nombre)}</strong>.`
      : `¿Querés seguir el estado de tus pedidos? <button type="button" class="link-btn" data-abrir-cuenta>Creá tu cuenta</button> (opcional).`;
  }
};

const ESTADO_CLASE = {
  'Nuevo': 'nuevo', 'Seña recibida': 'sena', 'En preparación': 'prep',
  'Listo para retirar': 'listo', 'Entregado': 'entregado', 'Cancelado': 'cancelado',
};

let modoCuenta = 'ingresar';

const renderCuenta = async () => {
  const cuerpo = document.getElementById('cuenta-body');
  const s = leerSesion();

  if (!s) {
    const crear = modoCuenta === 'crear';
    cuerpo.innerHTML = `
      <div class="segmentado" role="tablist">
        <button type="button" role="tab" aria-selected="${!crear}" data-modo="ingresar">Ingresar</button>
        <button type="button" role="tab" aria-selected="${crear}" data-modo="crear">Crear cuenta</button>
      </div>
      <p class="cuenta-intro">${crear
        ? 'Con tu cuenta ves todos tus pedidos y en qué estado están. Es opcional: podés pedir sin cuenta.'
        : 'Ingresá con tu WhatsApp y tu PIN para ver tus pedidos.'}</p>
      <form id="form-cuenta" class="form-cuenta" novalidate>
        ${crear ? `<div class="form-group"><label for="cta-nombre">Nombre y apellido</label>
          <input id="cta-nombre" class="form-input" autocomplete="name" autocapitalize="words" enterkeyhint="next" required></div>` : ''}
        <div class="form-group"><label for="cta-tel">Tu WhatsApp</label>
          <input id="cta-tel" class="form-input" type="tel" inputmode="tel" autocomplete="tel" placeholder="Ej: 1134501054" enterkeyhint="next" required></div>
        <div class="form-group"><label for="cta-pin">${crear ? 'Elegí un PIN de 6 números' : 'PIN'}</label>
          <input id="cta-pin" class="form-input" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6"
                 autocomplete="${crear ? 'new-password' : 'current-password'}" enterkeyhint="go" required></div>
        ${crear ? `<div class="form-group hidden" id="grupo-codigo"><label for="cta-codigo">Código que te pasó Lula</label>
          <input id="cta-codigo" class="form-input" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="one-time-code" enterkeyhint="go"></div>` : ''}
        ${crear ? '<p class="cuenta-legal">Usamos tu nombre y WhatsApp solo para gestionar tus pedidos. Podés pedir que borremos tu cuenta cuando quieras.</p>' : ''}
        <p class="cuenta-error hidden" id="cta-error" role="alert"></p>
        <button type="submit" class="btn-agregar cuenta-submit">${crear ? 'Crear mi cuenta' : 'Ingresar'}</button>
        ${!crear ? '<p class="cuenta-ayuda">¿Te olvidaste el PIN? Escribile a Lula por WhatsApp: te pasa un código y con él creás uno nuevo en «Crear cuenta».</p>' : ''}
      </form>`;
    const tel = document.getElementById('campo-telefono');
    if (tel && tel.value) document.getElementById('cta-tel').value = tel.value;
    const nom = document.getElementById('campo-nombre');
    if (crear && nom && nom.value) document.getElementById('cta-nombre').value = nom.value;
    return;
  }

  cuerpo.innerHTML = `
    <div class="cuenta-hola">
      <p>Hola, <strong>${esc(s.nombre)}</strong></p>
      <button type="button" class="link-btn" id="btn-salir">Cerrar sesión</button>
    </div>
    <h3 class="checkout-title">Mis pedidos</h3>
    <div id="mis-pedidos" class="mis-pedidos"><p class="cuenta-intro">Cargando tus pedidos…</p></div>`;

  try {
    const r = await apiPost('misPedidos', { token: s.token });
    const cont = document.getElementById('mis-pedidos');
    if (!cont) return;
    if (!r.ok) {
      if (r.sesion === false) { guardarSesion(null); actualizarBotonCuenta(); return renderCuenta(); }
      cont.innerHTML = `<p class="cuenta-error">${esc(r.error || 'No pudimos cargar tus pedidos.')}</p>`;
      return;
    }
    cont.innerHTML = r.pedidos.length ? r.pedidos.map(p => `
      <article class="mi-pedido">
        <div class="mi-pedido-head">
          <strong>${esc(p.numero)}</strong>
          <span class="estado estado-${ESTADO_CLASE[p.estado] || 'nuevo'}">${esc(p.estado || 'Nuevo')}</span>
        </div>
        <p class="mi-pedido-fecha">${p.fecha ? new Date(p.fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : ''} · ${esc(p.punto)}</p>
        <p class="mi-pedido-detalle">${esc(p.detalle)}</p>
        <p class="mi-pedido-total">Total ${formatCurrency(p.total)} · Seña ${formatCurrency(p.sena)}</p>
      </article>`).join('')
      : '<p class="cuenta-intro">Todavía no hiciste pedidos con esta cuenta.</p>';
  } catch (err) {
    const cont = document.getElementById('mis-pedidos');
    if (cont) cont.innerHTML = '<p class="cuenta-error">Sin conexión. Probá de nuevo en un rato.</p>';
  }
};

const enviarFormCuenta = async (e) => {
  e.preventDefault();
  const crear = modoCuenta === 'crear';
  const err = document.getElementById('cta-error');
  const btn = e.target.querySelector('.cuenta-submit');
  const tel = document.getElementById('cta-tel').value.replace(/\D/g, '');
  const pin = document.getElementById('cta-pin').value.trim();
  const nombre = crear ? document.getElementById('cta-nombre').value.trim() : '';

  const mostrarError = (m) => { err.textContent = m; err.classList.remove('hidden'); };
  if (crear && !nombre) return mostrarError('Contanos tu nombre.');
  if (tel.length < 8) return mostrarError('Revisá tu WhatsApp: tiene que tener al menos 8 números.');
  if (!/^\d{6}$/.test(pin)) return mostrarError('El PIN tiene que tener 6 números.');

  err.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = crear ? 'Creando…' : 'Ingresando…';
  try {
    const codigo = crear ? (document.getElementById('cta-codigo')?.value || '').replace(/\D/g, '') : '';
    const r = await apiPost(crear ? 'crearCuenta' : 'ingresar', { telefono: tel, pin, nombre, codigo });
    if (!r.ok) {
      mostrarError(r.error || 'No pudimos hacerlo.');
      // Cuenta con el PIN reiniciado por Lula: hace falta el código que ella le pasó
      if (r.pideCodigo) {
        const g = document.getElementById('grupo-codigo');
        if (g) { g.classList.remove('hidden'); document.getElementById('cta-codigo').focus(); }
      }
      return;
    }
    guardarSesion({ token: r.token, nombre: r.nombre, telefono: tel });
    // Se completan los datos del checkout para el próximo pedido
    const cn = document.getElementById('campo-nombre');
    const ct = document.getElementById('campo-telefono');
    if (cn && !cn.value) cn.value = r.nombre;
    if (ct && !ct.value) ct.value = tel;
    guardarDatosCliente();
    actualizarBotonCuenta();
    mostrarToast(crear ? '¡Cuenta creada!' : `¡Hola, ${r.nombre}!`);
    renderCuenta();
  } catch (e2) {
    mostrarError('Sin conexión. Probá de nuevo en un rato.');
  } finally {
    if (document.body.contains(btn)) { btn.disabled = false; btn.textContent = crear ? 'Crear mi cuenta' : 'Ingresar'; }
  }
};

const abrirCuenta = async () => {
  const panel = document.getElementById('cuenta-panel');
  if (!panel || panel.classList.contains('open')) return;
  if (panelAbierto(PANEL_DE.carrito)) { cerrarCarrito(); await esperarHistorial(); }
  renderCuenta();
  aislarFondo(panel);
  panel.classList.add('open');
  document.getElementById('cart-overlay').classList.add('visible');
  bloquearScroll();
  abrirEnHistorial('cuenta');
  setTimeout(() => document.getElementById('btn-cerrar-cuenta').focus(), 350);
};

const cerrarCuenta = (desdeHistorial = false) => {
  const panel = document.getElementById('cuenta-panel');
  if (!panel || !panel.classList.contains('open')) return;
  panel.classList.remove('open');
  document.getElementById('cart-overlay').classList.remove('visible');
  desbloquearScroll();
  restaurarFondo();
  modoCuenta = 'ingresar';
  if (desdeHistorial !== true) cerrarEnHistorial('cuenta');
};

const inicializarCuentas = () => {
  document.getElementById('btn-cuenta')?.addEventListener('click', abrirCuenta);
  document.getElementById('btn-cerrar-cuenta')?.addEventListener('click', cerrarCuenta);
  document.getElementById('cart-overlay').addEventListener('click', () => cerrarCuenta());

  const cuerpo = document.getElementById('cuenta-body');
  cuerpo?.addEventListener('click', async (e) => {
    const modo = e.target.closest('[data-modo]');
    if (modo) { modoCuenta = modo.dataset.modo; renderCuenta(); return; }
    if (e.target.closest('#btn-salir')) {
      const s = leerSesion();
      guardarSesion(null);
      modoCuenta = 'ingresar';   // quien sale ya tiene cuenta: lo próximo es volver a ingresar
      actualizarBotonCuenta();
      renderCuenta();
      if (s) apiPost('cerrarSesion', { token: s.token }).catch(() => {});
    }
  });
  cuerpo?.addEventListener('submit', enviarFormCuenta);

  // "Creá tu cuenta" desde el checkout
  document.getElementById('checkout-cuenta')?.addEventListener('click', (e) => {
    if (!e.target.closest('[data-abrir-cuenta]')) return;
    modoCuenta = 'crear';
    abrirCuenta();   // cierra el carrito y espera al historial por su cuenta
  });

  actualizarBotonCuenta();
};

/* ================================================================
   11. INICIALIZACIÓN DE LA APP
================================================================ */

/**
 * Punto de entrada principal.
 * Configura todos los listeners y renderiza el estado inicial.
 */
const init = () => {
  /* --- Al recargar con un panel abierto, el navegador conserva su entrada del
     historial pero el panel ya no está: se limpia para que cerrar no retroceda. --- */
  if (history.state && history.state.modal) history.replaceState(null, '');

  /* --- Datos del cliente (no dependen del catálogo) --- */
  poblarPuntosEntrega();
  inicializarCuentas();
  cargarConfig();
  renderHomeContacto();
  cargarDatosCliente();

  /* --- Catálogo: planilla o productos de ejemplo ---
     cargarProductos() se encarga de restaurar el carrito y renderizar
     cuando los datos están listos (ver montarCatalogo). */
  cargarProductos();

  /* --- Reintentar si la planilla no cargó --- */
  document.getElementById('btn-reintentar')
    .addEventListener('click', cargarProductos);

  /* --- Reintentar desde el aviso de modo respaldo --- */
  const reintentarOffline = document.getElementById('btn-reintentar-offline');
  if (reintentarOffline) reintentarOffline.addEventListener('click', cargarProductos);

  /* --- Búsqueda --- */
  document.getElementById('search-input')
    .addEventListener('input', manejarBusqueda);

  /* --- Orden del catálogo --- */
  document.getElementById('campo-orden')
    .addEventListener('change', (e) => {
      state.orden = e.target.value;
      state.pagina = 1;
      renderProductos();
    });

  /* --- Preferencia guardada del usuario: vista del catálogo --- */
  cargarUIPreferencia();

  /* --- Cambiar vista del catálogo (grande / compacta / lista) --- */
  document.querySelectorAll('.vista-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.vistaCatalogo = btn.dataset.vista;
      guardarUIPreferencia();
      renderVistaButtons();
      renderProductos();
    });
  });
  renderVistaButtons();

  /* --- Panel de filtros en móvil --- */
  const btnFiltrosMovil = document.getElementById('btn-filtros-movil');
  if (btnFiltrosMovil) btnFiltrosMovil.addEventListener('click', toggleFiltrosMovil);

  const btnCerrarFiltros = document.getElementById('btn-cerrar-filtros');
  if (btnCerrarFiltros) btnCerrarFiltros.addEventListener('click', cerrarFiltrosMovil);

  const filtrosOverlay = document.getElementById('filtros-overlay');
  if (filtrosOverlay) filtrosOverlay.addEventListener('click', cerrarFiltrosMovil);

  const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');
  if (btnLimpiarFiltros) btnLimpiarFiltros.addEventListener('click', limpiarTodosLosFiltros);

  /* --- Checkboxes estáticos de disponibilidad --- */
  const cbDisponibles = document.getElementById('filtro-disponibles');
  if (cbDisponibles) cbDisponibles.addEventListener('change', aplicarCheckboxesDisponibilidad);

  const cbDestacados = document.getElementById('filtro-destacados');
  if (cbDestacados) cbDestacados.addEventListener('change', aplicarCheckboxesDisponibilidad);

  /* --- Inputs de precio (sliders + campos numéricos) --- */
  inicializarBindingPrecio();

  /* --- "Inicio" del breadcrumb: vuelve a la vista home y limpia todo --- */
  document.getElementById('breadcrumb-home')
    .addEventListener('click', irAInicio);

  /* --- Navegación principal Inicio / Tienda --- */
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.vista === 'home') irAInicio();
      else irALaTienda('Todas');
    });
  });

  /* --- Clic en el logo también vuelve al inicio --- */
  const brandHome = document.getElementById('brand-home');
  if (brandHome) {
    brandHome.addEventListener('click', (e) => { e.preventDefault(); irAInicio(); });
  }

  /* --- Botones del hero y "Ver todos" de la vista de inicio --- */
  const heroCatalogo = document.getElementById('hero-ver-catalogo');
  if (heroCatalogo) heroCatalogo.addEventListener('click', () => irALaTienda('Todas'));

  const heroDestacados = document.getElementById('hero-ver-destacados');
  if (heroDestacados) {
    heroDestacados.addEventListener('click', () => {
      const sec = document.getElementById('home-destacados-section');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  const verTodos = document.getElementById('ver-todos-destacados');
  if (verTodos) verTodos.addEventListener('click', () => irALaTienda('Todas'));

  /* --- Clics dentro de la vista de inicio (abrir fichas) --- */
  const homeView = document.getElementById('view-home');
  if (homeView) homeView.addEventListener('click', manejarClickHome);

  /* --- Abrir / cerrar carrito --- */
  document.getElementById('btn-ver-carrito')
    .addEventListener('click', abrirCarrito);

  // Acceso al carrito desde el header (además de la barra sticky)
  const btnCarritoTop = document.getElementById('btn-ver-carrito-top');
  if (btnCarritoTop) btnCarritoTop.addEventListener('click', abrirCarrito);

  document.getElementById('btn-cerrar-carrito')
    .addEventListener('click', cerrarCarrito);

  // Clic en el overlay también cierra el carrito
  document.getElementById('cart-overlay')
    .addEventListener('click', cerrarCarrito);

  /* --- Cerrar con tecla Escape (detalle primero, después filtros/carrito) --- */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    const detalle = document.getElementById('product-detail');
    if (detalle && detalle.classList.contains('open')) {
      cerrarProducto();
      return;
    }

    const filtros = document.getElementById('catalog-sidebar');
    if (filtros && filtros.classList.contains('open')) {
      cerrarFiltrosMovil();
      return;
    }

    if (document.getElementById('cart-panel').classList.contains('open')) {
      cerrarCarrito();
      return;
    }

    cerrarCuenta();
  });

  /* --- Vista de producto: cerrar / volver / interacciones --- */
  document.getElementById('btn-cerrar-detalle')
    .addEventListener('click', cerrarProducto);

  const btnVolverDetalle = document.getElementById('btn-volver-catalogo');
  if (btnVolverDetalle) btnVolverDetalle.addEventListener('click', cerrarProducto);

  const detalleContenido = document.getElementById('detail-content');
  detalleContenido.addEventListener('click', manejarClickDetalle);
  detalleContenido.addEventListener('change', manejarCambioDetalle);

  /* --- Validación en tiempo real + guardado de los datos del cliente ---
     El 'change' del select es clave para la Regla Merlo. */
  CAMPOS_FORM.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input',  validarFormulario);
    el.addEventListener('change', validarFormulario);
    el.addEventListener('input',  guardarDatosCliente);
    el.addEventListener('change', guardarDatosCliente);
  });

  /* --- Después de enviar: confirmar o reintentar --- */
  document.getElementById('btn-pedido-ok')?.addEventListener('click', confirmarPedidoEnviado);
  document.getElementById('btn-pedido-reintentar')?.addEventListener('click', enviarPedido);

  /* --- Carrito desde la ficha --- */
  document.getElementById('btn-detalle-carrito')?.addEventListener('click', async () => {
    cerrarProducto();
    await esperarHistorial();   // que el navegador termine el "atrás" de la ficha
    abrirCarrito();
  });

  /* --- Envío del pedido --- */
  document.getElementById('btn-enviar-pedido')
    .addEventListener('click', enviarPedido);

  /* --- Ajuste dinámico del padding-top del main ---
     Necesario porque la altura del header varía en distintos viewports.
     Sin esto, el contenido queda tapado por el header fijo. */
  ajustarPaddingMain();
  window.addEventListener('resize', ajustarPaddingMain);
  // El alto del header cambia cuando carga la tipografía o se parte una
  // línea: sin esto, unos píxeles del contenido quedaban tapados.
  if ('ResizeObserver' in window) {
    new ResizeObserver(ajustarPaddingMain).observe(document.getElementById('main-header'));
  }

  /* --- Vista inicial: la pantalla de inicio con los destacados --- */
  mostrarVista('home');
};

/* ================================================================
   NOTIFICACIONES (toast de feedback)
   ================================================================ */

/**
 * Muestra una notificación flotante tipo "toast" cuando se agrega al carrito.
 * Aparece en la esquina inferior derecha y desaparece automáticamente.
 */
let toastTimer = null;

const mostrarToast = (mensaje, duracion = 2500) => {
  // Un único elemento que se reutiliza: varios clics seguidos no apilan
  // toasts uno arriba del otro, actualizan el mismo.
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');      // lo anuncia el lector de pantalla
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }

  toast.textContent = mensaje;
  clearTimeout(toastTimer);

  // Reiniciar la animación aunque el toast ya estuviera visible
  toast.classList.remove('visible');
  void toast.offsetWidth;
  toast.classList.add('visible');

  toastTimer = setTimeout(() => toast.classList.remove('visible'), duracion);
};

/* ================================================================
   PUNTO DE ENTRADA DE LA APP
   ================================================================ */

/* Esperamos al DOM antes de arrancar */
document.addEventListener('DOMContentLoaded', init);
