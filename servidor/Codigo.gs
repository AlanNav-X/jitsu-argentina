/**
 * Servidor del panel de clases (Google Apps Script vinculado a una hoja de cálculo).
 *
 * Guarda, por fecha y sede, si hay clase o no. El sitio lo lee para mostrar los horarios
 * y el administrador lo usa para cambiarlos (por ejemplo, para confirmar una clase en un feriado).
 *
 * Usuario y contraseña NO están en este archivo: se cargan como propiedades del script
 * (ADMIN_USUARIO y ADMIN_CLAVE). Ver servidor/LEEME.md.
 */

var HOJA = 'clases';
var SEDES = ['caballito', 'ramos-mejia'];
var ZONA = 'America/Argentina/Buenos_Aires';
var DURACION_SESION = 6 * 60 * 60;   // segundos
var MAX_FALLOS = 10;                  // intentos fallidos antes de bloquear el ingreso
var BLOQUEO = 15 * 60;                // segundos de bloqueo

/** Lectura pública: cambios desde hace una semana en adelante. */
function doGet(e) {
  var accion = (e && e.parameter && e.parameter.accion) || 'leer';
  if (accion !== 'leer') return responder({ ok: false, error: 'accion' });
  return responder({ ok: true, cambios: leerCambios() });
}

/** Escritura: ingresar y guardar. El cuerpo es JSON enviado como text/plain. */
function doPost(e) {
  var datos;
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return responder({ ok: false, error: 'formato' });
  }
  if (datos.accion === 'ingresar') return responder(ingresar(datos));
  if (datos.accion === 'guardar') return responder(guardar(datos));
  return responder({ ok: false, error: 'accion' });
}

function ingresar(datos) {
  var cache = CacheService.getScriptCache();
  var fallos = Number(cache.get('fallos') || 0);
  if (fallos >= MAX_FALLOS) return { ok: false, error: 'bloqueado' };

  var props = PropertiesService.getScriptProperties();
  var usuario = props.getProperty('ADMIN_USUARIO');
  var clave = props.getProperty('ADMIN_CLAVE');
  if (!usuario || !clave) return { ok: false, error: 'sin-configurar' };

  if (datos.usuario === usuario && datos.clave === clave) {
    var token = Utilities.getUuid();
    cache.put('sesion:' + token, usuario, DURACION_SESION);
    return { ok: true, token: token };
  }
  cache.put('fallos', String(fallos + 1), BLOQUEO);
  return { ok: false, error: 'credenciales' };
}

function guardar(datos) {
  var cache = CacheService.getScriptCache();
  var usuario = datos.token ? cache.get('sesion:' + datos.token) : null;
  if (!usuario) return { ok: false, error: 'sesion' };

  var fecha = String(datos.fecha || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || SEDES.indexOf(datos.sede) < 0 || typeof datos.hay_clase !== 'boolean') {
    return { ok: false, error: 'datos' };
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var hoja = obtenerHoja();
    var filas = hoja.getDataRange().getValues();
    var fila = -1;
    for (var i = 1; i < filas.length; i++) {
      if (normalizarFecha(filas[i][0]) === fecha && filas[i][1] === datos.sede) { fila = i + 1; break; }
    }
    var valores = [fecha, datos.sede, datos.hay_clase, new Date(), usuario];
    if (fila > 0) hoja.getRange(fila, 1, 1, valores.length).setValues([valores]);
    else hoja.appendRow(valores);
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

function leerCambios() {
  var desde = Utilities.formatDate(new Date(Date.now() - 7 * 864e5), ZONA, 'yyyy-MM-dd');
  var filas = obtenerHoja().getDataRange().getValues();
  var cambios = [];
  for (var i = 1; i < filas.length; i++) {
    var fecha = normalizarFecha(filas[i][0]);
    if (!fecha || fecha < desde || SEDES.indexOf(filas[i][1]) < 0) continue;
    cambios.push({ fecha: fecha, sede: filas[i][1], hay_clase: filas[i][2] === true });
  }
  return cambios;
}

function obtenerHoja() {
  var libro = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = libro.getSheetByName(HOJA);
  if (!hoja) {
    hoja = libro.insertSheet(HOJA);
    hoja.appendRow(['fecha', 'sede', 'hay_clase', 'actualizado', 'por']);
    hoja.getRange('A:A').setNumberFormat('@');   // la fecha se guarda como texto AAAA-MM-DD
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function normalizarFecha(valor) {
  if (valor instanceof Date) return Utilities.formatDate(valor, ZONA, 'yyyy-MM-dd');
  var texto = String(valor || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : '';
}

function responder(objeto) {
  return ContentService.createTextOutput(JSON.stringify(objeto)).setMimeType(ContentService.MimeType.JSON);
}
