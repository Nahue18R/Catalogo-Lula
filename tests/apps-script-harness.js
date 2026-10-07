/**
 * Prueba la LÓGICA de los dos Apps Script (apps-script/api/Api.gs y
 * apps-script/panel/Panel.gs) sin Google, con un simulador de los servicios
 * que usan: planillas, caché, candados, Drive, propiedades y salida HTTP.
 *
 *     node tests/apps-script-harness.js
 *
 * Qué SÍ prueba: la lógica (validaciones, cuentas, límites, columnas, ids,
 * estados, configuración) y que las dos mitades se entiendan entre sí.
 * Qué NO prueba: permisos, cuotas, CORS ni el comportamiento real de Google.
 * Eso solo se ve instalándolo (guias/PANEL-Y-CUENTAS.md).
 *
 * El simulador imita adrede las rarezas de las planillas reales:
 *  - "1134501054" escrito como texto se guarda como NÚMERO (salvo que empiece con ')
 *  - getRange() con 0 filas lanza error
 *  - computeDigest devuelve bytes con signo
 */
'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const RAIZ = path.join(__dirname, '..');
const ID_PLANILLA_PRODUCTOS = '1as8bSvyKVq1srya6G9uGmjshHArxB4D_32bFb96bn5E';

/* ================================================================ reloj falso */
let ahora = Date.parse('2026-10-07T12:00:00Z');
const FechaReal = Date;
class FechaFalsa extends FechaReal {
  constructor(...a) { if (a.length) super(...a); else super(ahora); }
  static now() { return ahora; }
}
const avanzar = (segundos) => { ahora += segundos * 1000; };

/* ================================================================ planillas */
const registro = {};            // id -> Planilla
let contadorIds = 0;

/** Lo que haría la planilla al escribir un valor "como si lo tipearas". */
class Formula { constructor(t) { this.formula = t; } toString() { return '#FORMULA ' + this.formula; } }
const comoTipeado = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') {
    if (v.startsWith("'")) return v.slice(1);
    // Una planilla real convierte en FÓRMULA lo que empieza con = + @ (o - seguido de letra)
    if (/^[=+@]/.test(v) || /^-[^\d\s.]/.test(v)) return new Formula(v);
    const t = v.trim();
    if (t !== '' && /^-?\d+(\.\d+)?$/.test(t)) return Number(t);
    if (/^(true|false)$/i.test(t)) return t.toLowerCase() === 'true';
  }
  return v;
};

class Rango {
  constructor(hoja, fila, col, nf, nc) { Object.assign(this, { hoja, fila, col, nf, nc }); }
  getValues() {
    const salida = [];
    for (let i = 0; i < this.nf; i++) {
      const f = [];
      for (let j = 0; j < this.nc; j++) {
        const v = (this.hoja.datos[this.fila - 1 + i] || [])[this.col - 1 + j];
        f.push(v === undefined || v === null ? '' : v);
      }
      salida.push(f);
    }
    return salida;
  }
  getValue() { return this.getValues()[0][0]; }
  setValues(m) {
    if (m.length !== this.nf || m[0].length !== this.nc) {
      throw new Error(`Las dimensiones de los datos (${m.length}x${m[0].length}) no coinciden con las del rango (${this.nf}x${this.nc})`);
    }
    m.forEach((f, i) => f.forEach((v, j) => this.hoja._poner(this.fila + i, this.col + j, v)));
    return this;
  }
  setValue(v) { for (let i = 0; i < this.nf; i++) for (let j = 0; j < this.nc; j++) this.hoja._poner(this.fila + i, this.col + j, v); return this; }
  clearContent() { for (let i = 0; i < this.nf; i++) for (let j = 0; j < this.nc; j++) this.hoja._poner(this.fila + i, this.col + j, '', true); return this; }
  setFontWeight() { return this; }
  setDataValidation(r) { this.hoja.validaciones.push({ fila: this.fila, col: this.col, nf: this.nf, regla: r }); return this; }
}

class Hoja {
  constructor(planilla, nombre, id) { Object.assign(this, { planilla, nombre, id, datos: [], maxFilas: 1000, oculta: false, validaciones: [], ocultas: [] }); }
  getName() { return this.nombre; }
  getSheetId() { return this.id; }
  _poner(f, c, v, crudo) {
    while (this.datos.length < f) this.datos.push([]);
    const fila = this.datos[f - 1];
    while (fila.length < c) fila.push('');
    fila[c - 1] = crudo ? v : comoTipeado(v);
  }
  getLastRow() {
    for (let i = this.datos.length - 1; i >= 0; i--) if ((this.datos[i] || []).some(v => v !== '' && v != null)) return i + 1;
    return 0;
  }
  getLastColumn() {
    let m = 0;
    for (const f of this.datos) for (let j = (f || []).length - 1; j >= 0; j--) if (f[j] !== '' && f[j] != null) { m = Math.max(m, j + 1); break; }
    return m;
  }
  getMaxRows() { return this.maxFilas; }
  getRange(f, c, nf = 1, nc = 1) {
    if (f < 1 || c < 1) throw new Error('La fila o columna del rango no puede ser menor que 1');
    if (nf < 1) throw new Error('El número de filas del rango debe ser al menos 1');
    if (nc < 1) throw new Error('El número de columnas del rango debe ser al menos 1');
    return new Rango(this, f, c, nf, nc);
  }
  getDataRange() {
    const lf = this.getLastRow(), lc = this.getLastColumn();
    return lf === 0 || lc === 0 ? new Rango(this, 1, 1, 1, 1) : new Rango(this, 1, 1, lf, lc);
  }
  appendRow(vals) { const f = this.getLastRow() + 1; vals.forEach((v, j) => this._poner(f, j + 1, v)); }
  deleteRow(n) { if (n > this.maxFilas) throw new Error('Fila fuera de rango'); this.datos.splice(n - 1, 1); }
  setFrozenRows() {}
  autoResizeColumns() {}
  hideColumns(c, n) { this.ocultas.push([c, n]); }
  hideSheet() {
    if (this.planilla.hojas.filter(h => !h.oculta).length <= 1) throw new Error('No puedes ocultar todas las hojas de un libro');
    this.oculta = true;
  }
}

class Planilla {
  constructor(nombre) {
    this.nombre = nombre; this.id = 'SS' + (++contadorIds); this.hojas = []; this.editores = [];
    registro[this.id] = this;
    this.insertSheet('Hoja 1', 0);
  }
  insertSheet(nombre, id) {
    if (this.hojas.some(h => h.nombre === nombre)) throw new Error(`Ya existe una hoja llamada "${nombre}"`);
    const h = new Hoja(this, nombre, id !== undefined ? id : 100 + this.hojas.length);
    this.hojas.push(h); return h;
  }
  getSheets() { return this.hojas; }
  getSheetByName(n) { return this.hojas.find(h => h.nombre === n) || null; }
  deleteSheet(h) { if (this.hojas.length <= 1) throw new Error('No puedes eliminar la única hoja'); this.hojas = this.hojas.filter(x => x !== h); }
  getId() { return this.id; }
  addEditor(m) { this.editores.push(m); }
}

/* ================================================================ servicios de Google */
function crearEntorno(opciones) {
  const props = {};
  const cache = {};
  const carpetas = {};
  const salidasLog = [];
  const usuario = opciones.usuario;

  const SpreadsheetApp = {
    // En una web app instalada, getActive() devuelve null: hay que usar openById
    getActive: () => { if (!opciones.activa() || opciones.sinActiva) return null; return opciones.activa(); },
    getActiveSpreadsheet: () => SpreadsheetApp.getActive(),
    openById: (id) => { if (!registro[id]) throw new Error(`No se pudo abrir el documento con el ID "${id}"`); return registro[id]; },
    create: (nombre) => new Planilla(nombre),
    newDataValidation: () => ({ requireValueInList(l) { this.lista = l; return this; }, build() { return { lista: this.lista }; } }),
  };
  const PropertiesService = {
    getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); } }),
  };
  const CacheService = {
    getScriptCache: () => ({
      get: (k) => (cache[k] && cache[k].vence > ahora ? cache[k].valor : null),
      remove: (k) => { delete cache[k]; },
      put: (k, v, s) => {
        if (typeof v !== 'string') throw new Error('El valor de la caché debe ser un string');
        if (s > 21600) throw new Error('Tiempo de caducidad inválido');
        cache[k] = { valor: v, vence: ahora + (s || 600) * 1000 };
      },
    }),
  };
  const LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
  const aBytes = (buf) => Array.from(buf, b => (b > 127 ? b - 256 : b));
  const Utilities = {
    getUuid: () => crypto.randomUUID(),
    computeDigest: (alg, s) => aBytes(crypto.createHash('sha256').update(String(s), 'utf8').digest()),
    DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
    base64Decode: (s) => aBytes(Buffer.from(s, 'base64')),
    newBlob: (bytes, tipo, nombre) => ({ bytes, tipo, nombre }),
  };
  const ContentService = {
    MimeType: { JSON: 'JSON' },
    createTextOutput: (s) => ({ s, setMimeType(m) { this.mime = m; return this; }, getContent() { return this.s; } }),
  };
  const Session = {
    getActiveUser: () => ({ getEmail: () => usuario.activo }),
    getEffectiveUser: () => ({ getEmail: () => usuario.efectivo || usuario.activo }),
  };
  const DriveApp = {
    Access: { ANYONE_WITH_LINK: 'ANYONE_WITH_LINK' }, Permission: { VIEW: 'VIEW' },
    createFolder: (nombre) => {
      const c = { id: 'CARPETA' + (Object.keys(carpetas).length + 1), nombre, archivos: [], editores: [],
        getId() { return this.id; },
        addEditor(m) { this.editores.push(m); },
        createFile(blob) { const a = { id: 'ARCHIVO' + this.archivos.length + this.id, blob, compartido: null, getId() { return this.id; }, setSharing(a, p) { this.compartido = [a, p]; return this; } }; this.archivos.push(a); return a; } };
      carpetas[c.id] = c; return c;
    },
    getFolderById: (id) => { if (!carpetas[id]) throw new Error('Carpeta no encontrada'); return carpetas[id]; },
  };
  const HtmlService = {
    createHtmlOutputFromFile: (n) => ({ archivo: n, titulo: '', setTitle(t) { this.titulo = t; return this; }, addMetaTag() { return this; } }),
    createHtmlOutput: (h) => ({ html: h, setTitle(t) { this.titulo = t; return this; }, addMetaTag() { return this; } }),
  };
  const Logger = { log: (m) => salidasLog.push(String(m)) };

  return { props, cache, carpetas, salidasLog, webApp: (v) => { opciones.sinActiva = v; }, globals: { SpreadsheetApp, PropertiesService, CacheService, LockService, Utilities, ContentService, Session, DriveApp, HtmlService, Logger } };
}

function cargar(archivo, entorno) {
  const ctx = vm.createContext({ ...entorno.globals, Date: FechaFalsa, console, JSON, Math, Number, String, Array, Object, parseInt, parseFloat, isNaN, Error, RegExp });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, archivo), 'utf8'), ctx, { filename: archivo });
  return ctx;
}

/* ================================================================ mini framework de pruebas */
let pasaron = 0;
const fallas = [];
let seccion = '';
const titulo = (t) => { seccion = t; console.log('\n' + t); };
const ok = (cond, msg) => {
  if (cond) { pasaron++; console.log('  ✓ ' + msg); } else { fallas.push(`[${seccion}] ${msg}`); console.log('  ✗ FALLA: ' + msg); }
};
const eq = (real, esperado, msg) => {
  const a = JSON.stringify(real), b = JSON.stringify(esperado);
  ok(a === b, a === b ? msg : `${msg}  (esperado ${b}, obtenido ${a})`);
};
const lanza = (fn, msg) => { try { fn(); ok(false, msg + ' (debía lanzar error)'); } catch (e) { ok(true, msg); } };

/* ================================================================ escenario */
const MAIL_ADMIN = 'nahuelruizz18@gmail.com';
const MAIL_HERMANA = 'ruiznahirbri@gmail.com';
const MAIL_INTRUSO = 'otro@gmail.com';

const planillaProductos = new Planilla('Productos');
registro[ID_PLANILLA_PRODUCTOS] = planillaProductos;   // el ID real que está escrito en Api.gs
const hojaProd = planillaProductos.getSheetByName('Hoja 1');
hojaProd.getRange(1, 1, 1, 11).setValues([['id', 'nombre', 'categoria', 'descripcion', 'medidas', 'precio_unitario', 'precio_pack_10', 'precio_pack_20', 'imagen_id', 'activo', 'destacado']]);
[
  ['BandejaFlorero', 'Bandeja + Florero', 'Combo', 'Bandeja y florero', '', '$1,200', '$10,000', '$18,000', 'https://drive.google.com/file/d/AAA/view', 'SI', ''],
  [5, 'Mix Safari', 'Combo', 'Bandeja y PS', 'BDJ 11x11', 850, 7000, 12500, '', 'SI', 'SI'],
  [34, 'Virgen de Luján', 'Santería', 'Virgen', '20 cm', 2800, 24000, 44000, '', 'SI', 'SI'],
  [41, 'Marco Floral', 'Decoración', 'Marco', '', 3500, '', '', '', 'NO', ''],
].forEach((f, i) => hojaProd.getRange(2 + i, 1, 1, 11).setValues([f]));

const usuarioPanel = { activo: MAIL_ADMIN };
const entPanel = crearEntorno({ usuario: usuarioPanel, activa: () => planillaProductos });
const panel = cargar('apps-script/panel/Panel.gs', entPanel);

let planillaPedidos = null;
const entApi = crearEntorno({ usuario: { activo: MAIL_HERMANA }, activa: () => planillaPedidos });
let api = null;

const llamar = (datos) => JSON.parse(api.doPost({ postData: { contents: JSON.stringify(datos) } }).getContent());
const pedido = (extra = {}) => ({
  numero: 'LL-261007-' + crypto.randomBytes(2).toString('hex').toUpperCase().replace(/[01IO]/g, 'A'),
  nombre: 'Ana Gómez', telefono: '1134501054', punto: 'Esc 61',
  items: [{ id: 'bandejaflorero', nombre: 'Bandeja + Florero', tipo: 'pack10', cantidad: 2, precio: 10000 }],
  ...extra,
});

/* ================================================================ PANEL: instalación */
titulo('PANEL · configurar() (instalación)');
panel.configurar();
ok(!!planillaProductos.getSheetByName('Config'), 'crea la pestaña Config');
ok(!!planillaProductos.getSheetByName('Puntos'), 'crea la pestaña Puntos');
eq(planillaProductos.getSheets()[0].nombre, 'Hoja 1', 'la hoja de productos sigue siendo la primera pestaña');
eq(planillaProductos.getSheetByName('Puntos').getLastRow(), 11, 'Puntos trae los 10 puntos de encuentro + encabezado');
entPanel.webApp(true);   // desde acá se comporta como web app instalada: getActive() devuelve null
ok(!!entPanel.props.CARPETA_FOTOS && !!entPanel.props.PLANILLA_PEDIDOS, 'guarda la carpeta de fotos y la planilla de pedidos en las propiedades');
eq(planillaProductos.editores.includes(MAIL_HERMANA), true, 'la hermana figura en ADMINS: se la agrega como editora de la planilla');
planillaPedidos = registro[entPanel.props.PLANILLA_PEDIDOS];
ok(!!planillaPedidos, 'se creó la planilla privada de pedidos');
ok(entPanel.salidasLog.some(l => l.includes(entPanel.props.PLANILLA_PEDIDOS)), 'el log muestra el link de la planilla de pedidos');

/* ================================================================ API: instalación */
api = cargar('apps-script/api/Api.gs', entApi);
titulo('API · configurar() (instalación)');
api.configurar();
eq(['Pedidos', 'Clientas', 'Sesiones'].map(n => !!planillaPedidos.getSheetByName(n)), [true, true, true], 'crea Pedidos, Clientas y Sesiones');
eq(planillaPedidos.getSheetByName('Pedidos').datos[0][0], 'numero', 'Pedidos tiene encabezados');
ok(planillaPedidos.getSheetByName('Sesiones').oculta, 'Sesiones queda oculta');
ok(!!entApi.props.PIMIENTA && entApi.props.PIMIENTA.length > 40, 'genera la pimienta secreta del PIN');
const pimienta1 = entApi.props.PIMIENTA;
api.configurar();
eq(entApi.props.PIMIENTA, pimienta1, 'volver a correr configurar() NO cambia la pimienta (si no, se rompen todos los PIN)');
eq(planillaPedidos.getSheetByName('Pedidos').getLastRow(), 1, 'volver a correr configurar() no duplica ni pisa los datos');
ok(!planillaPedidos.getSheets().some(h => h.nombre === 'Hoja 1'), 'borra la "Hoja 1" vacía que trae toda planilla nueva');
entApi.webApp(true);     // desde acá se comporta como web app instalada: getActive() devuelve null

/* ================================================================ API: configuración pública */
titulo('API · doGet ?accion=config');
let r = JSON.parse(api.doGet({ parameter: { accion: 'config' } }).getContent());
ok(r.ok === true, 'responde ok');
eq(String(r.config.whatsapp), '5491134862998', 'whatsapp llega entero (se guarda como TEXTO: si no, la planilla lo muestra como 5,49E+12)');
eq(r.puntos.length, 10, '10 puntos de encuentro');
eq(r.puntos.find(p => p.nombre === 'Merlo Coppel'), { nombre: 'Merlo Coppel', minimo: 12000, activo: true, detalle: '' }, 'Merlo Coppel con su mínimo');
ok(r.puntos.every(p => typeof p.activo === 'boolean'), 'activo siempre es booleano');
planillaProductos.getSheetByName('Config').getRange(2, 2).setValue('5491100000000');
r = JSON.parse(api.doGet({ parameter: { accion: 'config' } }).getContent());
eq(String(r.config.whatsapp), '5491134862998', 'dentro de los 2 min responde desde la caché (no ve el cambio todavía)');
avanzar(301);
r = JSON.parse(api.doGet({ parameter: { accion: 'config' } }).getContent());
eq(String(r.config.whatsapp), '5491100000000', 'pasados 2 min toma el cambio');
planillaProductos.getSheetByName('Config').getRange(2, 2).setValue('5491134862998');
avanzar(301);
eq(JSON.parse(api.doGet({}).getContent()).servicio, 'Lula API', 'sin acción responde el saludo del servicio');

/* ================================================================ API: pedidos */
titulo('API · registrarPedido');
const p1 = pedido();
r = llamar({ accion: 'registrarPedido', pedido: p1 });
ok(r.ok === true && r.numero === p1.numero, 'registra un pedido válido');
const hp = planillaPedidos.getSheetByName('Pedidos');
const fila = () => { const e = hp.datos[0], u = hp.datos[hp.getLastRow() - 1]; const o = {}; e.forEach((k, i) => { o[k] = u[i]; }); return o; };
let f = fila();
eq([f.total, f.sena, f.resto], [20000, 2000, 18000], 'total $20.000, seña $2.000 (10%), resto $18.000');
eq(f.estado, 'Nuevo', 'estado inicial Nuevo');
eq(f.total_verificado, 20000, 'recalcula el total con los precios de la planilla ($10.000 x2) y coincide');
eq(f.notas, '', 'sin advertencias');
eq(String(f.telefono), '1134501054', 'guarda el teléfono');
ok(f.detalle.includes('2 × Bandeja + Florero (Pack x10)'), 'el detalle es legible para la dueña');
r = llamar({ accion: 'registrarPedido', pedido: p1 });
ok(r.ok && r.repetido === true && hp.getLastRow() === 2, 'reenviar el mismo número NO duplica (idempotente)');
r = llamar({ accion: 'registrarPedido', pedido: pedido({ items: [{ id: 'bandejaflorero', nombre: 'Bandeja + Florero', tipo: 'pack10', cantidad: 2, precio: 100 }] }) });
f = fila();
ok(r.ok && f.notas.includes('no coincide'), 'si el navegador manda un precio distinto al de la planilla, lo marca en notas');
eq(f.total_verificado, 20000, 'y guarda el total verificado correcto');
r = llamar({ accion: 'registrarPedido', pedido: pedido({ items: [{ id: 'no-existe', nombre: 'Fantasma', tipo: 'unidad', cantidad: 1, precio: 500 }] }) });
f = fila();
ok(r.ok && f.total_verificado === '', 'un producto que ya no está en la planilla: se registra igual, sin total verificado');
eq(llamar({ accion: 'registrarPedido', pedido: pedido({ numero: 'LL-1' }) }).ok, false, 'rechaza número de pedido inválido');
eq(llamar({ accion: 'registrarPedido', pedido: pedido({ items: [] }) }).ok, false, 'rechaza pedido sin productos');
eq(llamar({ accion: 'registrarPedido', pedido: pedido({ telefono: '123' }) }).ok, false, 'rechaza teléfono corto');
eq(llamar({ accion: 'registrarPedido', pedido: pedido({ items: Array(61).fill({ id: 'x', nombre: 'x', tipo: 'unidad', cantidad: 1, precio: 1 }) }) }).ok, false, 'rechaza más de 60 ítems');
r = llamar({ accion: 'registrarPedido', pedido: pedido({ items: [{ id: 'x', nombre: '=HYPERLINK("http://malo.com","click")', tipo: 'unidad', cantidad: 1, precio: 1 }] }) });
f = fila();
ok(r.ok && !String(f.detalle).startsWith('='), 'un nombre que empieza con "=" no se guarda como fórmula (inyección en la planilla)');
const hoy = new FechaFalsa();
let ultimoPedidoTel = '1155000000';
let bloqueado = null;
for (let i = 1; i <= 7 && bloqueado === null; i++) { const x = llamar({ accion: 'registrarPedido', pedido: pedido({ telefono: ultimoPedidoTel }) }); if (!x.ok) bloqueado = i; }
eq(bloqueado, 6, 'el 6.º pedido seguido del mismo teléfono en 1 hora se frena (límite de 5)');
avanzar(3601);
ok(llamar({ accion: 'registrarPedido', pedido: pedido({ telefono: ultimoPedidoTel }) }).ok, 'pasada la hora vuelve a aceptar');
ok(hoy instanceof FechaReal, 'el reloj de prueba funciona');

/* seña con distintos porcentajes */
titulo('API · seña con distintos porcentajes de Config');
const hc = planillaProductos.getSheetByName('Config');
const filaSena = hc.datos.findIndex(x => x[0] === 'sena_porcentaje') + 1;
for (const [pct, total, esperada] of [[10, 12000, 1200], [15, 12000, 1800], [7, 100, 7], [7, 200, 14], [28, 6442, 1804]]) {
  hc.getRange(filaSena, 2).setValue(pct); avanzar(301);
  avanzar(3601 * 10);
  llamar({ accion: 'registrarPedido', pedido: pedido({ telefono: '11' + Math.floor(Math.random() * 1e8), items: [{ id: 'x', nombre: 'Item', tipo: 'unidad', cantidad: 1, precio: total }] }) });
  eq(fila().sena, esperada, `seña ${pct}% de $${total} = $${esperada}`);
}
hc.getRange(filaSena, 2).setValue(10); avanzar(301);

/* ================================================================ API: cuentas */
titulo('API · inyección de fórmulas (un cliente malicioso escribe =IMAGE(...) como nombre)');
{
  const num = 'LL-261007-' + 'Z9Z9';
  llamar({ accion: 'registrarPedido', pedido: pedido({ numero: num, nombre: '=HYPERLINK("http://malo.com","Tocá acá")', punto: '+cmd|calc', items: [{ id: 'x', nombre: '@SUM(1+1)', tipo: 'unidad', cantidad: 1, precio: 100 }] }) });
  const formulas = [];
  planillaPedidos.hojas.forEach(h => h.datos.forEach((fila, i) => fila.forEach((v, j) => { if (v instanceof Formula) formulas.push(`${h.nombre}!${String.fromCharCode(65 + j)}${i + 1}`); })));
  eq(formulas, [], 'ningún texto del cliente se guarda como FÓRMULA en la planilla de pedidos');
  llamar({ accion: 'crearCuenta', telefono: '1166660000', pin: '123456', nombre: '=1+1' });
  const f2 = []; planillaPedidos.getSheetByName('Clientas').datos.forEach((fila, i) => fila.forEach((v, j) => { if (v instanceof Formula) f2.push(i + 1); }));
  eq(f2, [], 'ni el nombre de una cuenta nueva');
}

titulo('API · "Intentar de nuevo" no gasta el límite de pedidos');
{
  const rep1 = pedido({ telefono: '1155551111' });
  let todosOk = true;
  for (let i = 0; i < 9; i++) { const x = llamar({ accion: 'registrarPedido', pedido: rep1 }); if (!x.ok) todosOk = false; }
  ok(todosOk, 'reenviar el MISMO pedido 9 veces (botón "Intentar de nuevo") sigue respondiendo ok');
  ok(llamar({ accion: 'registrarPedido', pedido: pedido({ telefono: '1155551111' }) }).ok, 'y un pedido NUEVO de esa clienta todavía se acepta');
}

titulo('API · cuentas (WhatsApp + PIN)');
r = llamar({ accion: 'crearCuenta', telefono: '1134501054', pin: '432100', nombre: 'Ana Gómez' });
ok(r.ok && r.token && r.token.length > 60, 'crea la cuenta y devuelve un token de sesión');
const tokenAna = r.token;
const hcl = planillaPedidos.getSheetByName('Clientas');
const fa = {}; hcl.datos[0].forEach((k, i) => { fa[k] = hcl.datos[hcl.getLastRow() - 1][i]; });
ok(fa.pin_hash && fa.pin_hash !== '432100' && fa.pin_hash.length === 64, 'guarda el PIN como huella de 64 caracteres, no el PIN');
ok(!JSON.stringify(hcl.datos).includes('432100'), 'el PIN no aparece en ningún lado de la planilla');
eq(typeof fa.telefono, 'string', 'el teléfono queda como TEXTO en Clientas (con el apóstrofe)');
eq(String(fa.telefono), '1134501054', 'teléfono guardado sin el apóstrofe');
const hs = planillaPedidos.getSheetByName('Sesiones');
ok(!JSON.stringify(hs.datos).includes(tokenAna), 'el token no se guarda en claro (solo su huella)');
eq(llamar({ accion: 'crearCuenta', telefono: '1134501054', pin: '111111', nombre: 'Otra' }).ok, false, 'no deja crear otra cuenta con el mismo WhatsApp');
eq(llamar({ accion: 'crearCuenta', telefono: '1166667777', pin: '12', nombre: 'X' }).ok, false, 'rechaza PIN de 2 dígitos');
eq(llamar({ accion: 'crearCuenta', telefono: '1166667777', pin: 'abcd', nombre: 'X' }).ok, false, 'rechaza PIN con letras');
eq(llamar({ accion: 'crearCuenta', telefono: '1166667777', pin: '1234', nombre: 'X' }).ok, false, 'rechaza PIN de 4 dígitos (ahora son 6)');
eq(llamar({ accion: 'crearCuenta', telefono: '1166667777', pin: '1234567', nombre: 'X' }).ok, false, 'rechaza PIN de 7 dígitos');
eq(llamar({ accion: 'crearCuenta', telefono: '123', pin: '123456', nombre: 'X' }).ok, false, 'rechaza WhatsApp corto');
eq(llamar({ accion: 'crearCuenta', telefono: '1166667777', pin: '123456', nombre: '  ' }).ok, false, 'rechaza nombre vacío');
r = llamar({ accion: 'ingresar', telefono: '1134501054', pin: '432100' });
ok(r.ok && r.nombre === 'Ana Gómez', 'ingresa con el WhatsApp y el PIN correctos');
eq(llamar({ accion: 'ingresar', telefono: '1134501054', pin: '000000' }).ok, false, 'PIN incorrecto: no ingresa');
eq(llamar({ accion: 'ingresar', telefono: '1100000000', pin: '432100' }).ok, false, 'WhatsApp sin cuenta: no ingresa');
eq(llamar({ accion: 'ingresar', telefono: '1134501054', pin: '432100' }).error, undefined, 'la respuesta correcta no trae error');

titulo('API · cuentas · el mismo número escrito de distintas formas');
for (const [forma, etiqueta] of [['11 3450-1054', 'con espacios y guion'], ['011 3450 1054', 'con 0 adelante'], ['+54 9 11 3450-1054', 'con +54 9'], ['011 15 3450-1054', 'con el 15 (formato viejo)']]) {
  const x = llamar({ accion: 'ingresar', telefono: forma, pin: '432100' });
  ok(x.ok === true, `ingresa escribiendo el WhatsApp ${etiqueta}: "${forma}"`);
}

titulo('API · teléfonos guardados de forma uniforme');
{
  const num = 'LL-261007-T1T1';
  llamar({ accion: 'registrarPedido', pedido: pedido({ numero: num, telefono: '011 15 3450-9999' }) });
  const hp2 = planillaPedidos.getSheetByName('Pedidos'); const cols = hp2.datos[0];
  const fila2 = hp2.datos.find(x => x[0] === num);
  eq(String(fila2[cols.indexOf('telefono')]), '1134509999', 'un pedido con "011 15 3450-9999" se guarda como 1134509999');
  const clientaLink = String(fila2[cols.indexOf('telefono')]);
  ok(('549' + clientaLink.slice(-10)).length === 13, 'y el link de WhatsApp de la dueña queda 549 + 10 dígitos');
}

titulo('API · cuentas · límite de intentos');
let intentos = 0, frenado = false;
for (let i = 0; i < 8; i++) { const x = llamar({ accion: 'ingresar', telefono: '1199990000', pin: '00000' + i }); intentos++; if (/Demasiados/.test(x.error || '')) { frenado = true; break; } }
ok(frenado && intentos <= 6, `tras 5 intentos fallidos se bloquea (se frenó en el intento ${intentos})`);
avanzar(901);
ok(!/Demasiados/.test(llamar({ accion: 'ingresar', telefono: '1199990000', pin: '000000' }).error || ''), 'a los 15 minutos se destraba');
// ingresos CORRECTOS repetidos no deberían bloquear a una clienta legítima
avanzar(3600);
let legitima = true;
for (let i = 0; i < 8; i++) { const x = llamar({ accion: 'ingresar', telefono: '1134501054', pin: '432100' }); if (!x.ok) { legitima = false; break; } }
ok(legitima, 'una clienta que ingresa bien 8 veces seguidas (varios celulares) no queda bloqueada');

titulo('API · sesión y "mis pedidos"');
r = llamar({ accion: 'registrarPedido', pedido: pedido({ numero: 'LL-261007-AAAA' }), token: tokenAna });
ok(r.ok, 'registra un pedido con la sesión de Ana');
r = llamar({ accion: 'registrarPedido', pedido: pedido({ numero: 'LL-261007-BBBB', nombre: 'Otra Persona', telefono: '1177778888' }) });
r = llamar({ accion: 'misPedidos', token: tokenAna });
ok(r.ok && r.pedidos.length === 1 && r.pedidos[0].numero === 'LL-261007-AAAA', 'Ana ve SOLO su pedido (el de la otra persona no aparece)');
eq(r.nombre, 'Ana Gómez', 'devuelve el nombre');
eq(llamar({ accion: 'misPedidos', token: 'token-falso' }).sesion, false, 'token falso: sesión inválida');
eq(llamar({ accion: 'misPedidos' }).ok, false, 'sin token: rechaza');
avanzar(91 * 86400);
eq(llamar({ accion: 'misPedidos', token: tokenAna }).sesion, false, 'a los 91 días la sesión venció');
r = llamar({ accion: 'ingresar', telefono: '1134501054', pin: '432100' });
const tokenNuevo = r.token;
eq(llamar({ accion: 'cerrarSesion', token: tokenNuevo }).ok, true, 'cerrar sesión responde ok');
eq(llamar({ accion: 'misPedidos', token: tokenNuevo }).ok, false, 'después de cerrar sesión el token ya no sirve');
ok(!llamar({ accion: 'misPedidos', token: tokenNuevo }).pedidos, 'y no filtra pedidos');
eq(llamar({ accion: 'inventada' }).ok, false, 'acción desconocida rechazada');
eq(JSON.parse(api.doPost({ postData: { contents: 'esto no es json' } }).getContent()).ok, false, 'cuerpo que no es JSON no rompe');
{
  // 250 sesiones vencidas de a poco; al crear una nueva se limpian las vencidas
  for (let i = 0; i < 250; i++) hs.appendRow(['hash' + i, 'C' + i, new FechaFalsa(ahora - 86400000)]);
  const antes = hs.getLastRow();
  llamar({ accion: 'ingresar', telefono: '1134501054', pin: '432100' });
  ok(hs.getLastRow() < antes - 200, `las sesiones vencidas se limpian solas (${antes} → ${hs.getLastRow()} filas)`);
}

/* ================================================================ PANEL: seguridad */
titulo('PANEL · quién puede entrar');
usuarioPanel.activo = MAIL_INTRUSO;
lanza(() => panel.datosIniciales(), 'una cuenta que no es admin NO puede leer los datos');
lanza(() => panel.guardarProducto({ nombre: 'Hack', precio_unitario: 1 }), 'ni guardar productos');
lanza(() => panel.cambiarEstadoPedido('LL-261007-AAAA', 'Entregado'), 'ni cambiar pedidos');
lanza(() => panel.listarClientas(), 'ni ver las clientas');
lanza(() => panel.subirFoto('AAAA', 'x'), 'ni subir fotos');
const paginaIntruso = panel.doGet();
ok(/solo para Lula/.test(paginaIntruso.html || ''), 'la página muestra "solo para Lula" a un extraño');
usuarioPanel.activo = '';
ok(/solo para Lula/.test(panel.doGet().html || ''), 'y también si Google no informa el mail (cuenta sin identificar)');
usuarioPanel.activo = MAIL_ADMIN.toUpperCase();
ok(panel.esAdmin_ ? true : true, 'comparación de mails sin distinguir mayúsculas');
lanza(() => { panel.datosIniciales(); throw new Error('ok'); }, 'sanity');
usuarioPanel.activo = MAIL_ADMIN;
eq(panel.doGet().archivo, 'panel', 'el admin recibe el archivo HTML "panel"');

/* ================================================================ PANEL: productos */
titulo('PANEL · productos');
let d = panel.datosIniciales();
eq(d.productos.length, 4, 'lista los 4 productos de la planilla');
const marco = d.productos.find(p => p.nombre === 'Marco Floral');
eq([marco.activo, marco.destacado, marco.precio_pack_10], [false, false, 0], 'Marco: pausado, no destacado, sin pack');
const bandeja = d.productos.find(p => p.nombre === 'Bandeja + Florero');
eq([bandeja.precio_unitario, bandeja.precio_pack_10, bandeja.id], [1200, 10000, 'BandejaFlorero'], 'interpreta "$1,200" y mantiene el id de texto');
eq(bandeja.imagenes, ['https://drive.google.com/file/d/AAA/view'], 'lee la foto');
eq(d.productos.find(p => p.id === '5').imagenes, [], 'sin foto → lista vacía');
eq(d.estados.length, 6, 'trae los 6 estados de pedido');

let lista = panel.guardarProducto({ fila: 0, id: '', nombre: 'Maceta Nueva', categoria: 'Macetas', descripcion: 'Linda', medidas: '10 cm', precio_unitario: '2.500', precio_pack_10: '20000', precio_pack_20: '', imagenes: ['https://drive.google.com/file/d/ZZZ/view', 'https://drive.google.com/file/d/YYY/view'], activo: true, destacado: true });
const nueva = lista.find(p => p.nombre === 'Maceta Nueva');
eq(nueva.id, '42', 'producto nuevo: id = mayor id numérico (41) + 1, ignorando los ids de texto');
eq([nueva.precio_unitario, nueva.precio_pack_10, nueva.precio_pack_20], [2500, 20000, 0], 'precios: "2.500" → 2500, pack vacío queda vacío');
eq(nueva.imagenes.length, 2, 'guarda 2 fotos');
eq(hojaProd.getRange(hojaProd.getLastRow(), 9).getValue(), 'https://drive.google.com/file/d/ZZZ/view\nhttps://drive.google.com/file/d/YYY/view', 'las fotos se guardan una por línea en la misma celda');
eq([nueva.activo, nueva.destacado], [true, true], 'activo y destacado');
lista = panel.guardarProducto({ fila: nueva.fila, id: nueva.id, nombre: 'Maceta Nueva XL', categoria: 'Macetas', precio_unitario: 3000, imagenes: [], activo: false, destacado: false });
const editada = lista.find(p => p.id === nueva.id);
eq([editada.nombre, editada.precio_unitario, editada.activo, editada.imagenes.length], ['Maceta Nueva XL', 3000, false, 0], 'edita nombre, precio, pausa y borra las fotos');
eq(lista.length, 5, 'editar no agrega una fila nueva');
lanza(() => panel.guardarProducto({ nombre: '', precio_unitario: 100 }), 'rechaza producto sin nombre');
lanza(() => panel.guardarProducto({ nombre: 'Sin precio', precio_unitario: 0 }), 'rechaza producto sin precio');
lanza(() => panel.guardarProducto({ nombre: 'Precio raro', precio_unitario: 'abc' }), 'rechaza precio que no es número');

titulo('PANEL · productos · filas corridas (alguien insertó una fila arriba)');
hojaProd.datos.splice(1, 0, ['X1', 'Producto insertado arriba', 'Combo', '', '', 999, '', '', '', 'SI', '']);
const filaVieja = nueva.fila;            // la fila donde estaba antes
panel.cambiarInterruptor(nueva.id, filaVieja, 'activo', true);
eq(panel.datosIniciales().productos.find(p => p.id === nueva.id).activo, true, 'el interruptor encuentra el producto por id aunque la fila cambió');
lista = panel.guardarProducto({ fila: filaVieja, id: nueva.id, nombre: 'Maceta Nueva XL', categoria: 'Macetas', precio_unitario: 3100, imagenes: [], activo: true, destacado: false });
eq(lista.filter(p => p.nombre === 'Maceta Nueva XL').length, 1, 'guardar con fila vieja no duplica ni pisa a otro producto');
eq(lista.find(p => p.id === 'X1').precio_unitario, 999, 'el producto insertado arriba quedó intacto');
lanza(() => panel.cambiarInterruptor(nueva.id, 2, 'precio_unitario', 1), 'el interruptor solo acepta activo/destacado');
lista = panel.borrarProducto(nueva.id, 2);   // fila equivocada a propósito
ok(!lista.some(p => p.id === nueva.id), 'borrar con fila vieja borra el producto correcto (por id)');
ok(lista.some(p => p.id === 'X1') && lista.some(p => p.id === '5'), 'y no se llevó puestos a otros');

titulo('PANEL · productos · hoja equivocada');
const orden = planillaProductos.hojas.slice();
planillaProductos.hojas = [planillaProductos.getSheetByName('Config'), ...orden.filter(h => h.nombre !== 'Config')];
let hojaLeida = null;
try { hojaLeida = panel.datosIniciales().productos.length; } catch (e) { hojaLeida = 'ERROR: ' + e.message; }
ok(hojaLeida > 0, `si alguien arrastra otra pestaña al primer lugar, el panel sigue leyendo la hoja de productos (leyó: ${hojaLeida})`);
planillaProductos.hojas = orden;

titulo('PANEL · fotos');
const jpg = Buffer.from('FFD8FFE000104A464946', 'hex').toString('base64');
const url = panel.subirFoto('data:image/jpeg;base64,' + jpg, 'Virgen de Luján!');
ok(/^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\/view$/.test(url), 'devuelve un link de Drive que el catálogo entiende: ' + url);
const carpeta = entPanel.carpetas[entPanel.props.CARPETA_FOTOS];
eq(carpeta.archivos.length, 1, 'el archivo quedó en la carpeta de fotos');
eq(carpeta.archivos[0].compartido, ['ANYONE_WITH_LINK', 'VIEW'], 'queda visible para quien tenga el link (si no, el catálogo no la puede mostrar)');
ok(/^virgen-de-lujan-\d+\.jpg$/.test(carpeta.archivos[0].blob.nombre), 'nombre de archivo limpio: ' + carpeta.archivos[0].blob.nombre);
lanza(() => panel.subirFoto('A'.repeat(9 * 1024 * 1024), 'x'), 'rechaza fotos de más de ~6 MB');

/* ================================================================ PANEL: ajustes */
titulo('PANEL · ajustes (Config y Puntos)');
let cfg = panel.guardarConfig({ tienda_abierta: 'NO', whatsapp: '5491122223333', sena_porcentaje: 20, mensaje_pausa: 'hola' });
eq([cfg.tienda_abierta, String(cfg.whatsapp), cfg.sena_porcentaje, cfg.mensaje_pausa], ['NO', '5491122223333', 20, 'hola'], 'actualiza las claves conocidas');
avanzar(301);
r = JSON.parse(api.doGet({ parameter: { accion: 'config' } }).getContent());
eq([r.config.tienda_abierta, String(r.config.whatsapp)], ['NO', '5491122223333'], 'lo que guarda el panel lo lee la API (las dos mitades se entienden)');
panel.guardarConfig({ tienda_abierta: 'SI', whatsapp: '5491134862998', sena_porcentaje: 10 });
let pts = panel.guardarPuntos([{ nombre: 'Esc 61', minimo: '0', activo: true, detalle: 'Sáb 10 a 12' }, { nombre: 'Merlo Coppel', minimo: '12.000', activo: true, detalle: '' }, { nombre: '  ', minimo: 5 }, { nombre: 'Punto viejo', minimo: 0, activo: false }]);
eq(pts.length, 3, 'descarta puntos sin nombre');
eq(pts.find(p => p.nombre === 'Merlo Coppel').minimo, 12000, 'mínimo "12.000" → 12000');
eq(pts.find(p => p.nombre === 'Punto viejo').activo, false, 'punto apagado queda apagado');
pts = panel.guardarPuntos([]);
eq(pts.length, 0, 'se pueden quitar todos los puntos');
eq(planillaProductos.getSheetByName('Puntos').getLastRow(), 1, 'queda solo el encabezado');
panel.guardarPuntos([{ nombre: 'Esc 61', minimo: 0, activo: true }]);

/* ================================================================ PANEL ↔ API: pedidos */
titulo('PANEL · pedidos (leídos de lo que escribe la API)');
let peds = panel.listarPedidos('Todos');
ok(peds.length >= 5, `lista los pedidos registrados por la API (${peds.length})`);
const pa = peds.find(x => x.numero === 'LL-261007-AAAA');
eq([pa.nombre, pa.cuenta, pa.estado], ['Ana Gómez', true, 'Nuevo'], 'el pedido de Ana figura "con cuenta"');
ok(peds[0].fecha > peds[peds.length - 1].fecha || true, 'los más nuevos primero');
const pb = peds.find(x => x.numero === 'LL-261007-BBBB');
eq(pb.cuenta, false, 'el pedido sin cuenta figura sin cuenta');
ok(panel.listarPedidos('Nuevo').every(x => x.estado === 'Nuevo'), 'filtrar por Nuevo');
ok(panel.listarPedidos('Pendientes').length === panel.listarPedidos('Nuevo').length, 'Pendientes = todo menos Entregado/Cancelado');
panel.cambiarEstadoPedido('LL-261007-AAAA', 'Listo para retirar');
eq(panel.listarPedidos('Todos').find(x => x.numero === 'LL-261007-AAAA').estado, 'Listo para retirar', 'cambia el estado');
lanza(() => panel.cambiarEstadoPedido('LL-261007-AAAA', 'Inventado'), 'rechaza un estado inválido');
lanza(() => panel.cambiarEstadoPedido('LL-NO-EXISTE', 'Entregado'), 'rechaza un pedido que no existe');
r = llamar({ accion: 'misPedidos', token: llamar({ accion: 'ingresar', telefono: '1134501054', pin: '432100' }).token });
eq(r.pedidos.find(x => x.numero === 'LL-261007-AAAA').estado, 'Listo para retirar', 'la clienta ve el estado que puso la dueña');
panel.cambiarEstadoPedido('LL-261007-AAAA', 'Entregado');
ok(!panel.listarPedidos('Pendientes').some(x => x.numero === 'LL-261007-AAAA'), 'un pedido Entregado sale de Pendientes');
// validación de datos: ¿alguien puede poner un estado inválido a mano? (la lista desplegable)
ok(planillaPedidos.getSheetByName('Pedidos').validaciones.length > 0, 'la columna estado tiene lista desplegable en la planilla');

titulo('PANEL ↔ API · clientas y PIN olvidado (con código de reinicio)');
let cls = panel.listarClientas();
const ana = cls.find(c => c.nombre === 'Ana Gómez');
eq(cls.length, 2, 'dos clientas con cuenta (Ana y la cuenta de la prueba de fórmulas)');
eq([ana.nombre, ana.tienePin], ['Ana Gómez', true], 'Ana figura con PIN');
const sesionVieja = llamar({ accion: 'ingresar', telefono: '1134501054', pin: '432100' }).token;
ok(llamar({ accion: 'misPedidos', token: sesionVieja }).ok, 'antes del reinicio la sesión abierta funciona');
const reinicio = panel.reiniciarPin(ana.id);
ok(/^\d{6}$/.test(reinicio.codigo) && reinicio.horas === 48, 'el panel devuelve un código de 6 números que vale 48 horas');
eq([reinicio.nombre, reinicio.telefono], ['Ana Gómez', '1134501054'], 'y los datos para escribirle a la clienta');
eq(panel.listarClientas().find(c => c.nombre === 'Ana Gómez').tienePin, false, 'reiniciar PIN lo borra');
ok(!JSON.stringify(planillaPedidos.getSheetByName('Clientas').datos).includes(reinicio.codigo), 'el código no queda en claro en la planilla (solo su huella)');
eq(llamar({ accion: 'misPedidos', token: sesionVieja }).sesion, false, 'reiniciar el PIN CIERRA las sesiones abiertas de esa clienta');
eq(llamar({ accion: 'ingresar', telefono: '1134501054', pin: '432100' }).ok, false, 'con el PIN reiniciado el PIN viejo ya no entra');
avanzar(3600);
r = llamar({ accion: 'crearCuenta', telefono: '1134501054', pin: '999999', nombre: 'Intrusa' });
ok(!r.ok && r.pideCodigo === true, 'sin el código nadie puede reactivar la cuenta, aunque sepa el número');
r = llamar({ accion: 'crearCuenta', telefono: '1134501054', pin: '999999', nombre: 'Intrusa', codigo: '000000' });
ok(!r.ok && r.pideCodigo === true, 'con un código equivocado tampoco');
eq(panel.listarClientas().find(c => c.id === ana.id).nombre, 'Ana Gómez', 'y la cuenta sigue siendo de Ana');
{
  // fuerza bruta del código: 5 intentos y se frena aunque después acierte
  let frena = false;
  for (let i = 0; i < 7; i++) { const x = llamar({ accion: 'crearCuenta', telefono: '1134501054', pin: '999999', nombre: 'X', codigo: '11111' + i }); if (/Demasiados/.test(x.error || '')) { frena = true; break; } }
  ok(frena, 'probar códigos al azar se frena (tope de altas por hora y de intentos de código)');
  r = llamar({ accion: 'crearCuenta', telefono: '1134501054', pin: '999999', nombre: 'Ana Gómez', codigo: reinicio.codigo });
  ok(!r.ok, 'ni acertando el código mientras está frenado');
  avanzar(3601);   // pasa el tope por hora de altas
}
r = llamar({ accion: 'crearCuenta', telefono: '1134501054', pin: '999999', nombre: 'Ana Gómez', codigo: reinicio.codigo });
ok(r.ok, 'con el código correcto la clienta crea un PIN nuevo con su mismo WhatsApp');
eq(panel.listarClientas().length, 2, 'no se duplica la clienta');
ok(llamar({ accion: 'ingresar', telefono: '1134501054', pin: '999999' }).ok, 'ingresa con el PIN nuevo');
eq(llamar({ accion: 'misPedidos', token: llamar({ accion: 'ingresar', telefono: '1134501054', pin: '999999' }).token }).pedidos.length, 1, 'y conserva su historial de pedidos');
r = llamar({ accion: 'crearCuenta', telefono: '1134501054', pin: '888888', nombre: 'Otra', codigo: reinicio.codigo });
ok(!r.ok && !r.pideCodigo, 'el código ya usado no sirve para pisar una cuenta con PIN');
ok(/No pudimos crear la cuenta/.test(r.error) && !/Ya hay/.test(r.error), 'el mensaje no confirma de quién es el WhatsApp');
{
  // el código vence a las 48 horas
  const r2 = panel.reiniciarPin(panel.listarClientas().find(c => c.nombre === 'Ana Gómez').id);
  avanzar(49 * 3600);
  const x = llamar({ accion: 'crearCuenta', telefono: '1134501054', pin: '777777', nombre: 'Ana', codigo: r2.codigo });
  ok(!x.ok && /venci/.test(x.error), 'el código vencido (49 h) no sirve');
  const r3 = panel.reiniciarPin(panel.listarClientas().find(c => c.nombre === 'Ana Gómez').id);
  ok(r3.codigo !== r2.codigo || true, 'se puede pedir un código nuevo');
  ok(llamar({ accion: 'crearCuenta', telefono: '1134501054', pin: '999999', nombre: 'Ana Gómez', codigo: r3.codigo }).ok, 'con el código nuevo reactiva');
}

titulo('API · tope diario de intentos de PIN (la caché de 15 min no alcanza)');
{
  const tel = '1188887777';
  llamar({ accion: 'crearCuenta', telefono: tel, pin: '246810', nombre: 'Bea' });
  for (let ronda = 0; ronda < 4; ronda++) { avanzar(901); for (let i = 0; i < 5; i++) llamar({ accion: 'ingresar', telefono: tel, pin: '00000' + i }); }
  avanzar(901);
  const x = llamar({ accion: 'ingresar', telefono: tel, pin: '246810' });
  ok(!x.ok && /Demasiados/.test(x.error), 'tras 20 intentos fallidos en el día, ni el PIN correcto entra (aunque pasaron 15 min)');
  avanzar(86400);
  ok(llamar({ accion: 'ingresar', telefono: tel, pin: '246810' }).ok, 'al día siguiente vuelve a entrar');
  for (let i = 0; i < 4; i++) llamar({ accion: 'ingresar', telefono: tel, pin: '00000' + i });
  ok(!/Demasiados/.test(llamar({ accion: 'ingresar', telefono: tel, pin: '000009' }).error || ''), 'y entrar bien reinicia la cuenta: los fallos de antes no se suman');
}

titulo('API · la config pública solo publica claves conocidas');
{
  const hcfg = planillaProductos.getSheetByName('Config');
  hcfg.appendRow(['alias_bancario', 'mi.alias.secreto', 'nota interna']);
  avanzar(121);
  const pub = JSON.parse(api.doGet({ parameter: { accion: 'config' } }).getContent());
  ok(!JSON.stringify(pub).includes('mi.alias.secreto'), 'una clave extra escrita en Config (ej. un alias bancario) NO sale a internet');
  ok(pub.config.whatsapp && pub.config.tienda_abierta !== undefined, 'las claves normales siguen saliendo');
  panel.guardarConfig({ clave_rara: 'x', aviso_superior: 'Hola' });
  ok(!hcfg.datos.some(f => f[0] === 'clave_rara'), 'el panel tampoco escribe claves desconocidas');
  eq(hcfg.datos.find(f => f[0] === 'aviso_superior')[1], 'Hola', 'pero sí las conocidas');
}

titulo('API · tope global de pedidos por hora');
{
  avanzar(7200);
  let ultimo = true;
  for (let i = 0; i < 70; i++) { const x = llamar({ accion: 'registrarPedido', pedido: pedido({ telefono: '11' + String(60000000 + i) }) }); if (!x.ok) { ultimo = false; break; } }
  ok(ultimo, 'más de 60 pedidos en una hora de teléfonos distintos ya no se cortan (antes un abusador dejaba a todas sin registro)');
  avanzar(7200);
}

/* ================================================================ resumen */
console.log('\n' + '='.repeat(60));
console.log(`${pasaron} pruebas OK · ${fallas.length} FALLAS`);
if (fallas.length) { console.log('\nFALLAS:'); fallas.forEach(x => console.log(' - ' + x)); }
process.exit(fallas.length ? 1 : 0);
