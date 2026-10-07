/**
 * ================================================================
 * LULA LUJÁN CREACIONES — API PÚBLICA (Google Apps Script)
 *
 * Va pegado en la planilla PRIVADA "Lula – Pedidos y clientas"
 * (Extensiones → Apps Script). La usa el catálogo para:
 *   · registrar cada pedido enviado por WhatsApp
 *   · crear cuentas de clientas (WhatsApp + PIN), ingresar y cerrar sesión
 *   · mostrarle a cada clienta SUS pedidos y en qué estado están
 *   · leer la configuración (Config y Puntos) de la planilla de productos
 *
 * Implementación: App web · Ejecutar como: YO · Acceso: Cualquier persona.
 * Ver guias/PANEL-Y-CUENTAS.md.
 *
 * SEGURIDAD
 *   · El PIN nunca se guarda: se guarda sha256(sal + PIN + pimienta).
 *     La pimienta vive en las propiedades del script, no en la planilla.
 *   · La sesión es un token al azar; en la planilla se guarda solo su hash.
 *   · Límite de intentos por teléfono (5 cada 15 min y 20 por día) y de pedidos por hora.
 *   · PIN de 6 números. Si Lula reinicia un PIN, la clienta necesita el código que ella le pasa.
 *   · Esta planilla NO se comparte "con cualquiera que tenga el link".
 * ================================================================
 */

/** ID de la planilla de PRODUCTOS (la que lee el catálogo). */
const ID_PLANILLA_PRODUCTOS = '1as8bSvyKVq1srya6G9uGmjshHArxB4D_32bFb96bn5E';

const ESTADOS = ['Nuevo', 'Seña recibida', 'En preparación', 'Listo para retirar', 'Entregado', 'Cancelado'];

const HOJA_PEDIDOS  = 'Pedidos';
const HOJA_CLIENTAS = 'Clientas';
const HOJA_SESIONES = 'Sesiones';

const COLS_PEDIDOS = ['numero', 'fecha', 'estado', 'cliente_id', 'nombre', 'telefono', 'punto',
  'detalle', 'items_json', 'total', 'sena', 'resto', 'total_verificado', 'notas', 'actualizado'];
const COLS_CLIENTAS = ['id', 'telefono', 'nombre', 'sal', 'pin_hash', 'creada', 'ultimo_acceso', 'reinicio'];
const COLS_SESIONES = ['token_hash', 'cliente_id', 'expira'];

const DIAS_SESION = 90;

/** Claves de la pestaña Config que se publican. Lo demás que alguien escriba ahí NO sale a internet. */
const CLAVES_PUBLICAS = ['whatsapp', 'sena_porcentaje', 'tienda_abierta', 'mensaje_pausa', 'aviso_superior', 'cuentas_clientas'];

/** Cuántos segundos se guarda la config en caché (el panel avisa "hasta 2 minutos"). */
const SEGUNDOS_CACHE_CONFIG = 120;

/** Intentos fallidos de PIN: tope corto (por 15 minutos) y tope por día. */
const MAX_FALLOS_15MIN = 5;
const MAX_FALLOS_DIA = 20;

/* ================================================================
   INSTALACIÓN — correr UNA vez desde el editor (botón ▶ con "configurar")
================================================================ */
function configurar() {
  const ss = SpreadsheetApp.getActive();
  // Se guarda el ID: en una web app instalada getActive() puede venir vacío,
  // así que todo lo demás abre la planilla por ID (ver ss_).
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());
  crearHoja_(ss, HOJA_PEDIDOS, COLS_PEDIDOS);
  crearHoja_(ss, HOJA_CLIENTAS, COLS_CLIENTAS);
  crearHoja_(ss, HOJA_SESIONES, COLS_SESIONES);

  // Desplegable de estados: tu hermana también puede cambiarlos a mano acá
  const hp = ss.getSheetByName(HOJA_PEDIDOS);
  const regla = SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).build();
  hp.getRange(2, COLS_PEDIDOS.indexOf('estado') + 1, hp.getMaxRows() - 1, 1).setDataValidation(regla);

  // Toda planilla nueva trae una hoja vacía ("Hoja 1" / "Sheet1"): sobra
  const vacia = ss.getSheets().find(h => /^(Hoja 1|Sheet ?1)$/.test(h.getName()) && h.getLastRow() === 0);
  if (vacia && ss.getSheets().length > 1) ss.deleteSheet(vacia);

  // Las columnas técnicas de Clientas y Sesiones se ocultan para no tocarlas por error
  const hc = ss.getSheetByName(HOJA_CLIENTAS);
  hc.hideColumns(COLS_CLIENTAS.indexOf('sal') + 1, 2);
  hc.hideColumns(COLS_CLIENTAS.indexOf('reinicio') + 1);
  ss.getSheetByName(HOJA_SESIONES).hideSheet();

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('PIMIENTA')) props.setProperty('PIMIENTA', Utilities.getUuid() + Utilities.getUuid());

  Logger.log('Listo. Ahora: Implementar → Nueva implementación → App web.');
}

/** La planilla de pedidos, abierta por ID. */
function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActive();
}

function crearHoja_(ss, nombre, columnas) {
  let h = ss.getSheetByName(nombre);
  if (!h) h = ss.insertSheet(nombre);
  if (h.getLastRow() === 0) {
    h.getRange(1, 1, 1, columnas.length).setValues([columnas]).setFontWeight('bold');
    h.setFrozenRows(1);
  }
  return h;
}

/* ================================================================
   PUNTO DE ENTRADA HTTP
   El catálogo manda POST con Content-Type text/plain (así el navegador
   no hace "preflight" CORS, que Apps Script no sabe responder).
================================================================ */
function doGet(e) {
  const accion = (e && e.parameter && e.parameter.accion) || '';
  try {
    if (accion === 'config') return json_(leerConfig_());
    return json_({ ok: true, servicio: 'Lula API' });
  } catch (err) {
    return json_({ ok: false, error: 'Error interno' });
  }
}

function doPost(e) {
  let datos;
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Pedido mal formado' });
  }
  try {
    switch (datos.accion) {
      case 'registrarPedido': return json_(registrarPedido_(datos));
      case 'crearCuenta':     return json_(crearCuenta_(datos));
      case 'ingresar':        return json_(ingresar_(datos));
      case 'misPedidos':      return json_(misPedidos_(datos));
      case 'cerrarSesion':    return json_(cerrarSesion_(datos));
      default:                return json_({ ok: false, error: 'Acción desconocida' });
    }
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'No pudimos procesarlo. Probá de nuevo en un rato.' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ================================================================
   CONFIGURACIÓN (pestañas Config y Puntos de la planilla de productos)
   Se cachea 2 minutos: el catálogo la pide en cada visita.
================================================================ */
function leerConfig_() {
  const cache = CacheService.getScriptCache();
  const guardada = cache.get('config');
  if (guardada) return JSON.parse(guardada);

  const ss = SpreadsheetApp.openById(ID_PLANILLA_PRODUCTOS);
  const config = {};
  const hc = ss.getSheetByName('Config');
  if (hc && hc.getLastRow() > 1) {
    hc.getRange(2, 1, hc.getLastRow() - 1, 2).getValues().forEach(([k, v]) => {
      const clave = String(k).trim();
      if (CLAVES_PUBLICAS.indexOf(clave) !== -1) config[clave] = v;
    });
  }

  const puntos = [];
  const hp = ss.getSheetByName('Puntos');
  if (hp && hp.getLastRow() > 1) {
    hp.getRange(2, 1, hp.getLastRow() - 1, 4).getValues().forEach(([nombre, minimo, activo, detalle]) => {
      if (!String(nombre).trim()) return;
      puntos.push({
        nombre:  String(nombre).trim(),
        minimo:  Number(minimo) || 0,
        activo:  esSi_(activo, true),
        detalle: String(detalle || '').trim(),
      });
    });
  }

  const salida = { ok: true, config: config, puntos: puntos };
  cache.put('config', JSON.stringify(salida), SEGUNDOS_CACHE_CONFIG);
  return salida;
}

function esSi_(v, siVacio) {
  const s = String(v).trim().toLowerCase();
  if (s === '') return siVacio;
  return ['si', 'sí', 'true', 'verdadero', 'x', '1'].indexOf(s) !== -1;
}

/* ================================================================
   PEDIDOS
================================================================ */
function registrarPedido_(d) {
  const p = d.pedido || {};
  const tel = normalizarTelefono_(p.telefono);

  // Validación básica: esto llega desde internet, no confiar en nada
  if (!/^LL-\d{6}-[A-Z0-9]{4}$/.test(String(p.numero || ''))) return { ok: false, error: 'Número inválido' };
  if (!Array.isArray(p.items) || !p.items.length || p.items.length > 60) return { ok: false, error: 'Pedido vacío' };
  if (tel.length < 8 || tel.length > 15) return { ok: false, error: 'Teléfono inválido' };

  // "Intentar de nuevo" reenvía el MISMO número: se reconoce antes de contar el
  // límite, para que reintentar no le gaste a la clienta sus pedidos de la hora.
  if (buscarFila_(ss_().getSheetByName(HOJA_PEDIDOS), 'numero', p.numero, COLS_PEDIDOS)) {
    return { ok: true, numero: p.numero, repetido: true };
  }

  // Anti-abuso: 5 pedidos por teléfono por hora y 200 en total por hora (el tope
  // global es alto a propósito: uno bajo dejaba a un solo abusador sin pedidos para todas)
  if (!permitir_('ped:' + tel, 5, 3600) || !permitir_('ped:global', 200, 3600)) {
    return { ok: false, error: 'Demasiados pedidos seguidos. Escribinos por WhatsApp.' };
  }

  const clienteId = d.token ? clienteDeToken_(d.token) : '';
  const items = p.items.map(i => ({
    id:       texto_(i.id, 60),
    nombre:   texto_(i.nombre, 120),
    tipo:     ['unidad', 'pack10', 'pack20'].indexOf(i.tipo) !== -1 ? i.tipo : 'unidad',
    cantidad: Math.max(1, Math.min(99, Math.floor(Number(i.cantidad) || 1))),
    precio:   Math.max(0, Math.floor(Number(i.precio) || 0)),
  }));

  const total = items.reduce((a, i) => a + i.precio * i.cantidad, 0);
  const verificado = totalSegunPlanilla_(items);
  const etiquetas = { unidad: 'Unidad', pack10: 'Pack x10', pack20: 'Pack x20' };
  const detalle = items.map(i => `${i.cantidad} × ${i.nombre} (${etiquetas[i.tipo]})`).join('\n');
  const sena = calcularSena_(total, (leerConfig_().config || {}).sena_porcentaje);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const h = ss_().getSheetByName(HOJA_PEDIDOS);
    // Idempotente: si el mismo número ya está (reintento), no se duplica
    if (buscarFila_(h, 'numero', p.numero, COLS_PEDIDOS)) return { ok: true, numero: p.numero, repetido: true };

    const fila = {
      numero: p.numero, fecha: new Date(), estado: 'Nuevo', cliente_id: clienteId,
      nombre: texto_(p.nombre, 80), telefono: tel, punto: texto_(p.punto, 80),
      detalle: detalle, items_json: JSON.stringify(items), total: total, sena: sena, resto: total - sena,
      total_verificado: verificado === null ? '' : verificado,
      notas: verificado !== null && verificado !== total ? '⚠ El total no coincide con los precios actuales de la planilla' : '',
      actualizado: new Date(),
    };
    h.appendRow(COLS_PEDIDOS.map(c => fila[c]));
  } finally {
    lock.releaseLock();
  }
  return { ok: true, numero: p.numero };
}

/** Recalcula el total con los precios de la planilla (null si no se puede). */
function totalSegunPlanilla_(items) {
  try {
    // La hoja que lee el catálogo es la de gid=0, no "la primera pestaña"
    const hojas = SpreadsheetApp.openById(ID_PLANILLA_PRODUCTOS).getSheets();
    const h = hojas.find(x => x.getSheetId() === 0) || hojas[0];
    const v = h.getDataRange().getValues();
    const enc = v[0].map(x => String(x).trim().toLowerCase());
    const col = (n) => enc.indexOf(n);
    const campo = { unidad: 'precio_unitario', pack10: 'precio_pack_10', pack20: 'precio_pack_20' };
    let total = 0;
    for (const it of items) {
      const fila = v.slice(1).find(r => slug_(r[col('id')]) === slug_(it.id) || String(r[col('nombre')]).trim() === it.nombre);
      if (!fila) return null;
      const precio = numero_(fila[col(campo[it.tipo])]) || numero_(fila[col('precio_unitario')]) * ({ unidad: 1, pack10: 10, pack20: 20 }[it.tipo]);
      total += precio * it.cantidad;
    }
    return total;
  } catch (err) {
    return null;
  }
}

function misPedidos_(d) {
  const clienteId = clienteDeToken_(d.token);
  if (!clienteId) return { ok: false, error: 'Tu sesión venció. Volvé a ingresar.', sesion: false };

  const h = ss_().getSheetByName(HOJA_PEDIDOS);
  const v = h.getDataRange().getValues();
  const c = (n) => COLS_PEDIDOS.indexOf(n);
  const pedidos = v.slice(1)
    .filter(r => r[c('cliente_id')] === clienteId)
    .map(r => ({
      numero: r[c('numero')], fecha: r[c('fecha')] instanceof Date ? r[c('fecha')].toISOString() : '',
      estado: r[c('estado')], detalle: r[c('detalle')], total: Number(r[c('total')]) || 0,
      sena: Number(r[c('sena')]) || 0, punto: r[c('punto')],
    }))
    .reverse()
    .slice(0, 30);

  const cli = buscarFila_(ss_().getSheetByName(HOJA_CLIENTAS), 'id', clienteId, COLS_CLIENTAS);
  return { ok: true, pedidos: pedidos, nombre: cli ? cli.valores.nombre : '', telefono: cli ? String(cli.valores.telefono) : '' };
}

/* ================================================================
   CUENTAS (WhatsApp + PIN)
================================================================ */
function crearCuenta_(d) {
  const tel = normalizarTelefono_(d.telefono);
  const pin = String(d.pin || '');
  const nombre = texto_(d.nombre, 80);
  if (tel.length < 8 || tel.length > 15) return { ok: false, error: 'Revisá el número de WhatsApp.' };
  if (!/^\d{6}$/.test(pin)) return { ok: false, error: 'El PIN tiene que tener 6 números.' };
  if (!nombre) return { ok: false, error: 'Contanos tu nombre.' };
  if (!permitir_('alta:' + tel, 5, 3600)) return { ok: false, error: 'Demasiados intentos. Probá en una hora.' };

  let resultado;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const h = ss_().getSheetByName(HOJA_CLIENTAS);
    const existente = buscarFila_(h, 'telefono', tel, COLS_CLIENTAS);
    if (existente && existente.valores.pin_hash) {
      // Mensaje que no confirma de quién es cada número.
      return { ok: false, error: 'No pudimos crear la cuenta con ese WhatsApp. Si ya tenés una, ingresá con tu PIN; si no, escribile a Lula.' };
    }
    const sal = Utilities.getUuid();
    const hash = hashPin_(sal, pin);
    if (existente) {
      // Cuenta con el PIN reiniciado desde el panel: sin el código que le pasó Lula,
      // cualquiera que supiera el número podría quedarse con la cuenta y su historial.
      const v = verificarCodigoReinicio_(existente, d.codigo, tel);
      if (!v.ok) return v;
      const fila = existente.fila;
      h.getRange(fila, COLS_CLIENTAS.indexOf('nombre') + 1).setValue(nombre);
      h.getRange(fila, COLS_CLIENTAS.indexOf('sal') + 1, 1, 2).setValues([[sal, hash]]);
      h.getRange(fila, COLS_CLIENTAS.indexOf('reinicio') + 1).setValue('');
      borrarSesionesDe_(existente.valores.id);   // una sesión vieja no sobrevive al PIN nuevo
      resultado = { ok: true, token: crearSesion_(existente.valores.id), nombre: nombre };
    } else {
      const id = 'C' + Utilities.getUuid().slice(0, 8).toUpperCase();
      h.appendRow([id, "'" + tel, nombre, sal, hash, new Date(), new Date(), '']);
      resultado = { ok: true, token: crearSesion_(id), nombre: nombre };
    }
  } finally {
    lock.releaseLock();
  }
  limpiarFallos_(tel);
  return resultado;
}

/**
 * El código de reinicio lo genera el panel (Panel.gs → reiniciarPin) y se guarda
 * como sha256('reinicio:' + id + ':' + código) + '|' + vencimiento en milisegundos.
 */
function verificarCodigoReinicio_(cli, codigoIngresado, tel) {
  const pide = (error) => ({ ok: false, pideCodigo: true, error: error });
  const codigo = soloDigitos_(codigoIngresado);
  if (!codigo) return pide('Lula te tiene que pasar un código para reactivar tu cuenta. Pedíselo por WhatsApp.');

  const cache = CacheService.getScriptCache();
  const clave = 'cod:' + tel;
  if (Number(cache.get(clave) || 0) >= MAX_FALLOS_15MIN) return pide('Demasiados intentos con el código. Probá en 15 minutos.');

  const partes = String(cli.valores.reinicio || '').split('|');
  const valido = partes.length === 2 && Number(partes[1]) > Date.now() &&
    sha256_('reinicio:' + cli.valores.id + ':' + codigo) === partes[0];
  if (!valido) {
    cache.put(clave, String(Number(cache.get(clave) || 0) + 1), 900);
    return pide('El código no es válido o venció. Pedile uno nuevo a Lula.');
  }
  cache.remove(clave);
  return { ok: true };
}

function ingresar_(d) {
  const tel = normalizarTelefono_(d.telefono);
  const pin = String(d.pin || '');
  // Solo los intentos FALLIDOS cuentan: una clienta que entra bien desde su
  // celular y su tablet no debería quedar bloqueada.
  if (bloqueada_(tel)) {
    return { ok: false, error: 'Demasiados intentos. Probá más tarde o pedile a Lula que te reinicie el PIN.' };
  }
  const h = ss_().getSheetByName(HOJA_CLIENTAS);
  const cli = buscarFila_(h, 'telefono', tel, COLS_CLIENTAS);
  if (!cli || !cli.valores.pin_hash || hashPin_(cli.valores.sal, pin) !== cli.valores.pin_hash) {
    registrarFallo_(tel);
    return { ok: false, error: 'WhatsApp o PIN incorrectos.' };
  }
  limpiarFallos_(tel);
  h.getRange(cli.fila, COLS_CLIENTAS.indexOf('ultimo_acceso') + 1).setValue(new Date());
  return { ok: true, token: crearSesion_(cli.valores.id), nombre: cli.valores.nombre };
}

/**
 * Intentos fallidos de PIN por teléfono. Dos topes:
 *  · 5 cada 15 minutos (CacheService, rápido)
 *  · 20 por día (propiedades del script): la caché puede vaciarse sola y, con
 *    solo ese tope, un PIN se podía adivinar con paciencia.
 */
function fallosDelDia_() {
  const hoy = new Date().toISOString().slice(0, 10);
  let mapa = {};
  try { mapa = JSON.parse(PropertiesService.getScriptProperties().getProperty('FALLOS') || '{}'); } catch (err) { mapa = {}; }
  Object.keys(mapa).forEach(t => { if (mapa[t].d !== hoy) delete mapa[t]; });
  return { mapa: mapa, hoy: hoy };
}

function guardarFallos_(mapa) {
  let texto = JSON.stringify(mapa);
  if (texto.length > 8000) texto = '{}';   // el límite de una propiedad es 9 KB
  PropertiesService.getScriptProperties().setProperty('FALLOS', texto);
}

function bloqueada_(tel) {
  if (Number(CacheService.getScriptCache().get('login:' + tel) || 0) >= MAX_FALLOS_15MIN) return true;
  const e = fallosDelDia_().mapa[tel];
  return !!e && e.n >= MAX_FALLOS_DIA;
}

function registrarFallo_(tel) {
  const cache = CacheService.getScriptCache();
  cache.put('login:' + tel, String(Number(cache.get('login:' + tel) || 0) + 1), 900);
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const f = fallosDelDia_();
    f.mapa[tel] = { n: ((f.mapa[tel] || {}).n || 0) + 1, d: f.hoy };
    guardarFallos_(f.mapa);
  } finally {
    lock.releaseLock();
  }
}

function limpiarFallos_(tel) {
  CacheService.getScriptCache().remove('login:' + tel);
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const f = fallosDelDia_();
    if (f.mapa[tel]) { delete f.mapa[tel]; guardarFallos_(f.mapa); }
  } finally {
    lock.releaseLock();
  }
}

function cerrarSesion_(d) {
  const h = ss_().getSheetByName(HOJA_SESIONES);
  const s = buscarFila_(h, 'token_hash', sha256_(String(d.token || '')), COLS_SESIONES);
  if (s) h.deleteRow(s.fila);
  return { ok: true };
}

function crearSesion_(clienteId) {
  const token = Utilities.getUuid() + Utilities.getUuid();
  const expira = new Date(Date.now() + DIAS_SESION * 864e5);
  const h = ss_().getSheetByName(HOJA_SESIONES);
  if (h.getLastRow() > 200) limpiarSesionesVencidas_(h);   // si no, la hoja crece para siempre
  h.appendRow([sha256_(token), clienteId, expira]);
  return token;
}

/** Cierra TODAS las sesiones de una clienta (por ejemplo, al cambiarle el PIN). */
function borrarSesionesDe_(clienteId) {
  const h = ss_().getSheetByName(HOJA_SESIONES);
  const ultima = h.getLastRow();
  if (ultima < 2) return;
  const idx = COLS_SESIONES.indexOf('cliente_id');
  const datos = h.getRange(2, 1, ultima - 1, COLS_SESIONES.length).getValues();
  for (let i = datos.length - 1; i >= 0; i--) {
    if (String(datos[i][idx]) === String(clienteId)) h.deleteRow(i + 2);
  }
}

/** Borra las sesiones vencidas (de abajo hacia arriba, para no correr los índices). */
function limpiarSesionesVencidas_(h) {
  const ultima = h.getLastRow();
  if (ultima < 2) return;
  const idx = COLS_SESIONES.indexOf('expira');
  const hoy = new Date();
  const datos = h.getRange(2, 1, ultima - 1, COLS_SESIONES.length).getValues();
  for (let i = datos.length - 1; i >= 0; i--) {
    if (new Date(datos[i][idx]) < hoy) h.deleteRow(i + 2);
  }
}

function clienteDeToken_(token) {
  if (!token) return '';
  const s = buscarFila_(ss_().getSheetByName(HOJA_SESIONES), 'token_hash', sha256_(String(token)), COLS_SESIONES);
  if (!s || new Date(s.valores.expira) < new Date()) return '';
  return s.valores.cliente_id;
}

/* ================================================================
   UTILIDADES
================================================================ */
function hashPin_(sal, pin) {
  return sha256_(sal + ':' + pin + ':' + PropertiesService.getScriptProperties().getProperty('PIMIENTA'));
}

function sha256_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8)
    .map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

/** Devuelve true si todavía no se superó el límite de `max` en `segundos`. */
function permitir_(clave, max, segundos) {
  const cache = CacheService.getScriptCache();
  // Con candado: dos pedidos a la vez leían el mismo número y los dos pasaban.
  const lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    const n = Number(cache.get(clave) || 0);
    if (n >= max) return false;
    cache.put(clave, String(n + 1), segundos);
    return true;
  } finally {
    lock.releaseLock();
  }
}

function buscarFila_(hoja, columna, valor, cols) {
  const ultima = hoja.getLastRow();
  if (ultima < 2) return null;
  const idx = cols.indexOf(columna);
  const datos = hoja.getRange(2, 1, ultima - 1, cols.length).getValues();
  for (let i = 0; i < datos.length; i++) {
    if (String(datos[i][idx]) === String(valor)) {
      const valores = {};
      cols.forEach((c, j) => { valores[c] = datos[i][j]; });
      return { fila: i + 2, valores: valores };
    }
  }
  return null;
}

function soloDigitos_(v) { return String(v || '').replace(/\D/g, ''); }

/**
 * Deja el teléfono en su forma nacional de 10 dígitos (código de área + número),
 * sin importar cómo lo escribió la clienta. Todas estas son la MISMA persona:
 *   1134501054 · 11 3450-1054 · 011 3450 1054 · 011 15 3450-1054
 *   +54 9 11 3450-1054 · 54 11 3450 1054
 * Sin esto, quien creó la cuenta con una forma no podía ingresar con otra.
 */
function normalizarTelefono_(v) {
  let d = soloDigitos_(v).replace(/^00/, '');
  if (d.startsWith('54') && d.length > 10) d = d.slice(2);        // código de país
  if (d.startsWith('9') && d.length === 11) d = d.slice(1);        // el 9 de los celulares (549…)
  d = d.replace(/^0/, '');                                          // el 0 de larga distancia (011…)
  if (d.length === 12) {                                            // con el "15": AA 15 NNNNNNNN
    for (const area of [2, 3, 4]) {
      if (d.slice(area, area + 2) === '15') { d = d.slice(0, area) + d.slice(area + 2); break; }
    }
  }
  return d;
}

/**
 * Seña en pesos: porcentaje sobre el total, redondeada hacia arriba.
 * Con enteros (centésimas de punto) y no con total * 0.07: esa cuenta da
 * 7.000000000000001 y el redondeo hacia arriba sumaba $1 de más.
 */
function calcularSena_(total, porcentaje) {
  const pct = Number(porcentaje);
  const centesimas = Math.round((pct >= 0 && pct <= 100 ? pct : 20) * 100);
  return Math.ceil((total * centesimas) / 10000);
}
function texto_(v, max) {
  const s = String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  // Una planilla toma como FÓRMULA todo lo que empieza con = + - @. Como esto lo
  // escribe cualquiera desde internet, se lo marca como texto con un apóstrofe
  // (la planilla no lo muestra): evita =HYPERLINK(...) / =IMPORTXML(...) en la hoja de la dueña.
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function slug_(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function numero_(v) {
  if (typeof v === 'number') return Math.floor(v);
  let s = String(v || '').replace(/[^\d.,]/g, '');
  const sep = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'));
  if (sep > -1 && s.length - sep - 1 <= 2) s = s.slice(0, sep).replace(/[.,]/g, '') + '.' + s.slice(sep + 1);
  else s = s.replace(/[.,]/g, '');
  return Math.floor(Number(s) || 0);
}
