/**
 * ================================================================
 * LULA LUJÁN CREACIONES — PANEL "MI CATÁLOGO" (Google Apps Script)
 *
 * Va pegado en la planilla de PRODUCTOS (Extensiones → Apps Script),
 * junto con el archivo HTML "panel". Desde el celular, tu hermana:
 *   · crea, edita, pausa, destaca y borra productos
 *   · sube fotos desde el teléfono (van a su Drive y a la planilla solas)
 *   · ve los pedidos y les cambia el estado (Nuevo → … → Entregado)
 *   · cambia la configuración: WhatsApp, seña, puntos de encuentro,
 *     mínimos, aviso superior y "tienda en pausa"
 *   · reinicia el PIN de una clienta que se lo olvidó
 *
 * Implementación: App web · Ejecutar como: USUARIO QUE ACCEDE
 *                 · Acceso: Cualquier usuario con cuenta de Google.
 * Solo entran los mails de ADMINS (además, hacen falta permisos de
 * edición sobre la planilla: Google es la segunda cerradura).
 * ================================================================
 */

/** Cuentas de Google que pueden entrar al panel (en minúscula). */
const ADMINS = [
  'nahuelruizz18@gmail.com',
  'ruiznahirbri@gmail.com',
];

/** Las únicas claves de Config que el panel escribe (y la API publica). */
const CLAVES_CONFIG = ['whatsapp', 'sena_porcentaje', 'tienda_abierta', 'mensaje_pausa', 'aviso_superior', 'cuentas_clientas'];

/** Horas que vale el código con el que una clienta reactiva su cuenta tras un reinicio de PIN. */
const HORAS_CODIGO_REINICIO = 48;

const ESTADOS = ['Nuevo', 'Seña recibida', 'En preparación', 'Listo para retirar', 'Entregado', 'Cancelado'];

const COLUMNAS_PRODUCTO = ['id', 'nombre', 'categoria', 'descripcion', 'medidas', 'precio_unitario',
  'precio_pack_10', 'precio_pack_20', 'imagen_id', 'activo', 'destacado'];

const CONFIG_INICIAL = [
  ['whatsapp',         "'5491134862998", 'Número que recibe los pedidos (con 549, sin + ni espacios)'],
  ['sena_porcentaje',  20,              'Porcentaje de seña para confirmar un pedido'],
  ['tienda_abierta',   'SI',            'NO = pausa: se puede mirar el catálogo pero no enviar pedidos'],
  ['mensaje_pausa',    'Estamos de vacaciones. Volvemos a tomar pedidos pronto.', 'Lo que ven las clientas cuando la tienda está en pausa'],
  ['aviso_superior',   'Figuras de yeso sin pintar, listas para pintar · Pedidos por WhatsApp · Entregas a coordinar', 'Franja de arriba de todo'],
  ['cuentas_clientas', 'SI',            'SI = las clientas pueden crear cuenta para ver sus pedidos'],
];

const PUNTOS_INICIALES = [
  ['Esc 61', 0, 'SI', ''], ['YPF Mariló', 0, 'SI', ''], ['Cruce Castelar', 0, 'SI', ''],
  ['Moreno Hospital', 0, 'SI', ''], ['Barrio Güemes', 0, 'SI', ''], ['San Miguel Catedral', 0, 'SI', ''],
  ['Ex Vea', 0, 'SI', ''], ['Morón Anses', 0, 'SI', ''], ['Merlo Coppel', 12000, 'SI', ''],
  ['Feria del Zanjón', 0, 'SI', ''],
];

/* ================================================================
   INSTALACIÓN — correr UNA vez (▶ "configurar"), idealmente con la
   cuenta de tu hermana para que ella sea la dueña de todo.
================================================================ */
function configurar() {
  const ss = SpreadsheetApp.getActive();
  const props = PropertiesService.getScriptProperties();
  // Se guarda el ID: en una web app instalada getActive() puede venir vacío.
  props.setProperty('SS_ID', ss.getId());

  hojaConfig_();   // las crea si faltan (y las vuelve a crear si alguien las borra)
  hojaPuntos_();

  // Carpeta de fotos en Drive
  let carpetaId = props.getProperty('CARPETA_FOTOS');
  if (!carpetaId) {
    const carpeta = DriveApp.createFolder('Lula – Fotos del catálogo');
    carpetaId = carpeta.getId();
    props.setProperty('CARPETA_FOTOS', carpetaId);
  }

  // Planilla PRIVADA de pedidos y clientas (no se comparte con link público)
  let pedidosId = props.getProperty('PLANILLA_PEDIDOS');
  if (!pedidosId) {
    const nueva = SpreadsheetApp.create('Lula – Pedidos y clientas (PRIVADA)');
    pedidosId = nueva.getId();
    props.setProperty('PLANILLA_PEDIDOS', pedidosId);
  }

  // Los administradores necesitan poder editar todo (el panel corre con SU cuenta)
  const yo = Session.getEffectiveUser().getEmail().toLowerCase();
  ADMINS.filter(m => m && m !== yo).forEach(m => {
    try { ss.addEditor(m); } catch (e) {}
    try { SpreadsheetApp.openById(pedidosId).addEditor(m); } catch (e) {}
    try { DriveApp.getFolderById(carpetaId).addEditor(m); } catch (e) {}
  });

  Logger.log('Planilla de pedidos (pegar ahí Api.gs): https://docs.google.com/spreadsheets/d/' + pedidosId);
  Logger.log('Carpeta de fotos: https://drive.google.com/drive/folders/' + carpetaId);
  Logger.log('Listo. Ahora: Implementar → Nueva implementación → App web.');
}

/* ================================================================
   PÁGINA DEL PANEL
================================================================ */
function doGet() {
  if (!esAdmin_()) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:40px;text-align:center">' +
      '<h2>Esta página es solo para Lula</h2>' +
      '<p>Entraste con ' + html_(Session.getActiveUser().getEmail() || 'una cuenta sin permiso') + '.</p></div>'
    ).setTitle('Mi catálogo');
  }
  return HtmlService.createHtmlOutputFromFile('panel')
    .setTitle('Mi catálogo · Lula')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function esAdmin_() {
  const mail = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  return !!mail && ADMINS.map(m => m.toLowerCase()).indexOf(mail) !== -1;
}

function exigirAdmin_() {
  if (!esAdmin_()) throw new Error('Sin permiso');
}

/* ================================================================
   PRODUCTOS
================================================================ */
/** La planilla de productos, abierta por ID (en una web app getActive() puede venir vacío). */
function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActive();
}

/**
 * La hoja que lee el catálogo es la de gid=0 (la original), NO "la primera
 * pestaña": si alguien arrastra otra pestaña al primer lugar, el panel
 * editaría una hoja distinta de la que ven las clientas.
 */
function hojaProductos_() {
  const hojas = ss_().getSheets();
  return hojas.find(h => h.getSheetId() === 0) || hojas[0];
}

function hojaConfig_() {
  const ss = ss_();
  let h = ss.getSheetByName('Config');
  if (!h) {
    h = ss.insertSheet('Config');
    h.getRange(1, 1, 1, 3).setValues([['clave', 'valor', 'para qué sirve']]).setFontWeight('bold');
    h.getRange(2, 1, CONFIG_INICIAL.length, 3).setValues(CONFIG_INICIAL);
    h.setFrozenRows(1);
    h.autoResizeColumns(1, 3);
  }
  return h;
}

function hojaPuntos_() {
  const ss = ss_();
  let h = ss.getSheetByName('Puntos');
  if (!h) {
    h = ss.insertSheet('Puntos');
    h.getRange(1, 1, 1, 4).setValues([['nombre', 'minimo', 'activo', 'detalle (dirección / horario)']]).setFontWeight('bold');
    h.getRange(2, 1, PUNTOS_INICIALES.length, 4).setValues(PUNTOS_INICIALES);
    h.setFrozenRows(1);
  }
  return h;
}

/** Mapa encabezado → número de columna (1-based). Crea columnas faltantes. */
function columnas_(hoja) {
  const ultima = Math.max(1, hoja.getLastColumn());
  const enc = hoja.getRange(1, 1, 1, ultima).getValues()[0].map(h => String(h).trim().toLowerCase());
  const mapa = {};
  enc.forEach((h, i) => { if (h) mapa[h] = i + 1; });
  let siguiente = ultima + 1;
  COLUMNAS_PRODUCTO.forEach(c => {
    if (!mapa[c]) { hoja.getRange(1, siguiente).setValue(c); mapa[c] = siguiente++; }
  });
  return mapa;
}

function datosIniciales() {
  exigirAdmin_();
  return {
    usuario: Session.getActiveUser().getEmail(),
    productos: listarProductos_(),
    config: leerConfig_(),
    puntos: leerPuntos_(),
    estados: ESTADOS,
    pedidosConfigurado: !!PropertiesService.getScriptProperties().getProperty('PLANILLA_PEDIDOS'),
  };
}

function listarProductos_() {
  const h = hojaProductos_();
  const col = columnas_(h);
  if (h.getLastRow() < 2) return [];
  const v = h.getRange(2, 1, h.getLastRow() - 1, h.getLastColumn()).getValues();
  return v.map((r, i) => {
    const g = (c) => r[col[c] - 1];
    return {
      fila: i + 2,
      id: String(g('id')),
      nombre: String(g('nombre')),
      categoria: String(g('categoria')),
      descripcion: String(g('descripcion')),
      medidas: String(g('medidas')),
      precio_unitario: numero_(g('precio_unitario')),
      precio_pack_10: numero_(g('precio_pack_10')),
      precio_pack_20: numero_(g('precio_pack_20')),
      imagenes: String(g('imagen_id')).split(/\s*[\n;]\s*|\s*,\s*(?=https?:)/).map(s => s.trim()).filter(Boolean),
      activo: esSi_(g('activo'), true),
      destacado: esSi_(g('destacado'), false),
    };
  }).filter(p => p.nombre.trim());
}

/** Crea (sin fila) o actualiza (con fila) un producto. Devuelve la lista nueva. */
function guardarProducto(p) {
  exigirAdmin_();
  const nombre = String(p.nombre || '').trim();
  if (!nombre) throw new Error('El producto necesita un nombre.');
  if (!(numero_(p.precio_unitario) > 0)) throw new Error('Falta el precio por unidad.');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const h = hojaProductos_();
    const col = columnas_(h);
    let fila = Number(p.fila) || 0;

    // Seguridad ante filas corridas: si la fila no tiene ese id, se busca por id
    if (fila && String(h.getRange(fila, col.id).getValue()) !== String(p.id)) fila = buscarFilaPorId_(h, col, p.id);

    let id = String(p.id || '').trim();
    if (!fila) {
      id = siguienteId_(h, col);
      fila = h.getLastRow() + 1;
    }

    const valores = {
      id: id, nombre: seguro_(nombre), categoria: seguro_(p.categoria) || 'Otros',
      descripcion: seguro_(p.descripcion), medidas: seguro_(p.medidas),
      precio_unitario: numero_(p.precio_unitario), precio_pack_10: numero_(p.precio_pack_10) || '',
      precio_pack_20: numero_(p.precio_pack_20) || '',
      imagen_id: (p.imagenes || []).join('\n'),
      activo: p.activo === false ? 'NO' : 'SI', destacado: p.destacado ? 'SI' : 'NO',
    };
    COLUMNAS_PRODUCTO.forEach(c => h.getRange(fila, col[c]).setValue(valores[c]));
  } finally {
    lock.releaseLock();
  }
  return listarProductos_();
}

/** Interruptor rápido de Activo / Destacado. */
function cambiarInterruptor(id, fila, campo, valor) {
  exigirAdmin_();
  if (['activo', 'destacado'].indexOf(campo) === -1) throw new Error('Campo inválido');
  const h = hojaProductos_();
  const col = columnas_(h);
  let f = Number(fila);
  if (String(h.getRange(f, col.id).getValue()) !== String(id)) f = buscarFilaPorId_(h, col, id);
  if (!f) throw new Error('No encontré el producto (¿se borró la fila?). Recargá el panel.');
  h.getRange(f, col[campo]).setValue(valor ? 'SI' : 'NO');
  return true;
}

function borrarProducto(id, fila) {
  exigirAdmin_();
  const h = hojaProductos_();
  const col = columnas_(h);
  let f = Number(fila);
  if (String(h.getRange(f, col.id).getValue()) !== String(id)) f = buscarFilaPorId_(h, col, id);
  if (!f) throw new Error('No encontré el producto.');
  h.deleteRow(f);
  return listarProductos_();
}

function buscarFilaPorId_(h, col, id) {
  if (h.getLastRow() < 2) return 0;
  const ids = h.getRange(2, col.id, h.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return 0;
}

function siguienteId_(h, col) {
  if (h.getLastRow() < 2) return '1';
  const nums = h.getRange(2, col.id, h.getLastRow() - 1, 1).getValues()
    .map(r => parseInt(r[0], 10)).filter(n => !isNaN(n));
  return String((nums.length ? Math.max.apply(null, nums) : 0) + 1);
}

/* ================================================================
   FOTOS — llegan ya achicadas desde el celular (JPEG ~1600px)
================================================================ */
function subirFoto(base64, nombre) {
  exigirAdmin_();
  const carpetaId = PropertiesService.getScriptProperties().getProperty('CARPETA_FOTOS');
  if (!carpetaId) throw new Error('Falta correr "configurar" en el editor de Apps Script.');
  const limpio = String(base64).replace(/^data:image\/\w+;base64,/, '');
  if (limpio.length > 8 * 1024 * 1024) throw new Error('La foto es muy pesada.');
  const blob = Utilities.newBlob(Utilities.base64Decode(limpio), 'image/jpeg', (slug_(nombre) || 'foto') + '-' + Date.now() + '.jpg');
  const archivo = DriveApp.getFolderById(carpetaId).createFile(blob);
  // Pública solo para VER: si no, el catálogo no puede mostrarla
  archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/file/d/' + archivo.getId() + '/view';
}

/* ================================================================
   CONFIG Y PUNTOS
================================================================ */
function leerConfig_() {
  const h = hojaConfig_();
  const c = {};
  if (h && h.getLastRow() > 1) {
    h.getRange(2, 1, h.getLastRow() - 1, 2).getValues().forEach(([k, v]) => { if (String(k).trim()) c[String(k).trim()] = v; });
  }
  return c;
}

function leerPuntos_() {
  const h = hojaPuntos_();
  if (!h || h.getLastRow() < 2) return [];
  return h.getRange(2, 1, h.getLastRow() - 1, 4).getValues()
    .filter(r => String(r[0]).trim())
    .map(r => ({ nombre: String(r[0]).trim(), minimo: numero_(r[1]), activo: esSi_(r[2], true), detalle: String(r[3] || '') }));
}

function guardarConfig(config) {
  exigirAdmin_();
  // Con candado: dos cambios a la vez se pisaban. Y solo se escriben las claves conocidas.
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const h = hojaConfig_();
    const v = h.getRange(2, 1, Math.max(1, h.getLastRow() - 1), 2).getValues();
    Object.keys(config || {}).filter(k => CLAVES_CONFIG.indexOf(k) !== -1).forEach(k => {
      // El WhatsApp se guarda como TEXTO: si no, la planilla lo muestra como 5,49E+12
      let valor = typeof config[k] === 'string' ? seguro_(config[k]) : config[k];
      if (k === 'whatsapp') valor = "'" + String(valor).replace(/\D/g, '');
      const i = v.findIndex(r => String(r[0]).trim() === k);
      if (i !== -1) h.getRange(i + 2, 2).setValue(valor);
      else h.appendRow([k, valor, '']);
    });
  } finally {
    lock.releaseLock();
  }
  return leerConfig_();
}

function guardarPuntos(puntos) {
  exigirAdmin_();
  // Se arma todo ANTES de tocar la planilla: si algo falla, no se pierden los puntos.
  const filas = (puntos || []).filter(p => String(p.nombre || '').trim())
    .map(p => [seguro_(p.nombre), numero_(p.minimo), p.activo === false ? 'NO' : 'SI', seguro_(p.detalle)]);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const h = hojaPuntos_();
    if (h.getLastRow() > 1) h.getRange(2, 1, h.getLastRow() - 1, 4).clearContent();
    if (filas.length) h.getRange(2, 1, filas.length, 4).setValues(filas);
  } finally {
    lock.releaseLock();
  }
  return leerPuntos_();
}

/* ================================================================
   PEDIDOS Y CLIENTAS (planilla privada)
================================================================ */
function planillaPedidos_() {
  const id = PropertiesService.getScriptProperties().getProperty('PLANILLA_PEDIDOS');
  if (!id) throw new Error('Falta correr "configurar".');
  return SpreadsheetApp.openById(id);
}

function listarPedidos(filtroEstado) {
  exigirAdmin_();
  const h = planillaPedidos_().getSheetByName('Pedidos');
  if (!h || h.getLastRow() < 2) return [];
  const v = h.getDataRange().getValues();
  const enc = v[0];
  const c = (n) => enc.indexOf(n);
  return v.slice(1).map((r, i) => ({
    fila: i + 2, numero: r[c('numero')],
    fecha: r[c('fecha')] instanceof Date ? r[c('fecha')].toISOString() : '',
    estado: r[c('estado')], nombre: r[c('nombre')], telefono: String(r[c('telefono')]),
    punto: r[c('punto')], detalle: r[c('detalle')], total: Number(r[c('total')]) || 0,
    sena: Number(r[c('sena')]) || 0, notas: r[c('notas')], cuenta: !!r[c('cliente_id')],
  }))
    .filter(p => !filtroEstado || filtroEstado === 'Todos' || p.estado === filtroEstado ||
                 (filtroEstado === 'Pendientes' && ['Entregado', 'Cancelado'].indexOf(p.estado) === -1))
    .reverse()
    .slice(0, 200);
}

function cambiarEstadoPedido(numero, estado) {
  exigirAdmin_();
  if (ESTADOS.indexOf(estado) === -1) throw new Error('Estado inválido');
  const h = planillaPedidos_().getSheetByName('Pedidos');
  const v = h.getDataRange().getValues();
  const enc = v[0];
  const i = v.findIndex((r, k) => k > 0 && String(r[enc.indexOf('numero')]) === String(numero));
  if (i < 1) throw new Error('No encontré el pedido.');
  h.getRange(i + 1, enc.indexOf('estado') + 1).setValue(estado);
  h.getRange(i + 1, enc.indexOf('actualizado') + 1).setValue(new Date());
  return true;
}

function listarClientas() {
  exigirAdmin_();
  const h = planillaPedidos_().getSheetByName('Clientas');
  if (!h || h.getLastRow() < 2) return [];
  const v = h.getDataRange().getValues();
  const enc = v[0];
  const c = (n) => enc.indexOf(n);
  return v.slice(1).map(r => ({
    id: r[c('id')], nombre: r[c('nombre')], telefono: String(r[c('telefono')]),
    tienePin: !!r[c('pin_hash')],
    ultimo: r[c('ultimo_acceso')] instanceof Date ? r[c('ultimo_acceso')].toISOString() : '',
  })).reverse();
}

/**
 * La clienta se olvidó el PIN (o sospecha que alguien lo conoce): se borra el PIN,
 * se cierran todas sus sesiones y se genera un CÓDIGO de 6 números que Lula le pasa
 * por WhatsApp. Sin ese código nadie puede reactivar la cuenta, aunque sepa el número.
 * Devuelve el código (se muestra una sola vez; si se pierde, se reinicia de nuevo).
 */
function reiniciarPin(clienteId) {
  exigirAdmin_();
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const planilla = planillaPedidos_();
    const h = planilla.getSheetByName('Clientas');
    const v = h.getDataRange().getValues();
    const enc = v[0];
    const i = v.findIndex((r, k) => k > 0 && r[enc.indexOf('id')] === clienteId);
    if (i < 1) throw new Error('No encontré la clienta.');

    // Si la planilla se creó antes de que existiera esta columna, se agrega
    let colReinicio = enc.indexOf('reinicio');
    if (colReinicio === -1) { colReinicio = enc.length; h.getRange(1, colReinicio + 1).setValue('reinicio'); }

    const codigo = ('000000' + (parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 8), 16) % 1000000)).slice(-6);
    const vence = Date.now() + HORAS_CODIGO_REINICIO * 3600 * 1000;
    h.getRange(i + 1, enc.indexOf('pin_hash') + 1).setValue('');
    h.getRange(i + 1, colReinicio + 1).setValue(sha256_('reinicio:' + clienteId + ':' + codigo) + '|' + vence);

    // Las sesiones abiertas (por ejemplo en un celular robado) dejan de valer
    const hs = planilla.getSheetByName('Sesiones');
    if (hs && hs.getLastRow() > 1) {
      const sesiones = hs.getRange(2, 1, hs.getLastRow() - 1, 3).getValues();
      for (let k = sesiones.length - 1; k >= 0; k--) {
        if (String(sesiones[k][1]) === String(clienteId)) hs.deleteRow(k + 2);
      }
    }
    return {
      codigo: codigo,
      horas: HORAS_CODIGO_REINICIO,
      nombre: String(v[i][enc.indexOf('nombre')]),
      telefono: String(v[i][enc.indexOf('telefono')]),
    };
  } finally {
    lock.releaseLock();
  }
}

/* ================================================================
   UTILIDADES
================================================================ */
function esSi_(v, siVacio) {
  const s = String(v).trim().toLowerCase();
  if (s === '') return siVacio;
  return ['si', 'sí', 'true', 'verdadero', 'x', '1'].indexOf(s) !== -1;
}

function numero_(v) {
  if (typeof v === 'number') return Math.floor(v);
  let s = String(v || '').replace(/[^\d.,]/g, '');
  if (!s) return 0;
  const sep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  if (sep > -1 && s.length - sep - 1 <= 2) s = s.slice(0, sep).replace(/[.,]/g, '') + '.' + s.slice(sep + 1);
  else s = s.replace(/[.,]/g, '');
  return Math.floor(Number(s) || 0);
}

/** Un texto que empieza con = + - @ lo toma la planilla como fórmula ("+ Maceta" daba #ERROR!). */
function seguro_(v) {
  const s = String(v == null ? '' : v).trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function html_(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sha256_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function slug_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}
