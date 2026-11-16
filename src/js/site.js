(function () {
  'use strict';

  /* ---------- Menú en pantallas chicas ---------- */
  var boton = document.querySelector('.menu-boton');
  var nav = document.getElementById('nav');
  if (boton && nav) {
    boton.addEventListener('click', function () {
      var abierta = nav.classList.toggle('abierta');
      boton.setAttribute('aria-expanded', abierta ? 'true' : 'false');
      boton.textContent = abierta ? 'Cerrar' : 'Menú';
    });
  }

  /* ---------- El obi cambia de grado al avanzar la página ---------- */
  var GRADOS = [
    ['8° kyu, blanco', '--c-blanco'], ['7° kyu, amarillo', '--c-amarillo'],
    ['6° kyu, anaranjado', '--c-naranja'], ['5° kyu, verde', '--c-verde'],
    ['4° kyu, violeta', '--c-violeta'], ['3° kyu, celeste', '--c-celeste'],
    ['2° kyu, azul', '--c-azul'], ['1° kyu, marrón', '--c-marron']
  ];
  var etiqueta = document.querySelector('.obi-grado');
  var actual = -1;
  function medirObi() {
    var doc = document.documentElement;
    var total = doc.scrollHeight - window.innerHeight;
    var avance = total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0;
    var i = Math.min(GRADOS.length - 1, Math.floor(avance * GRADOS.length));
    if (i === actual) return;
    actual = i;
    doc.style.setProperty('--grado', 'var(' + GRADOS[i][1] + ')');
    if (etiqueta) etiqueta.textContent = GRADOS[i][0];
  }
  var pendiente = false;
  window.addEventListener('scroll', function () {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(function () { pendiente = false; medirObi(); });
  }, { passive: true });
  window.addEventListener('resize', medirObi);
  medirObi();

  /* ---------- Próxima clase (hora de Buenos Aires) ---------- */
  function ahoraEnBuenosAires() {
    var partes = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    var v = {};
    partes.forEach(function (p) { v[p.type] = p.value; });
    var dia = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(v.weekday);
    return { dia: dia, minutos: parseInt(v.hour, 10) * 60 + parseInt(v.minute, 10) };
  }
  function proximaClase(filas, ahora) {
    // filas: [{dia: 1..5, inicio: min, fin: min}] — devuelve índice y estado
    var mejor = null;
    filas.forEach(function (f, i) {
      var dias = (f.dia - ahora.dia + 7) % 7;
      var enCurso = dias === 0 && ahora.minutos >= f.inicio && ahora.minutos < f.fin;
      if (dias === 0 && ahora.minutos >= f.fin) dias = 7;
      var falta = enCurso ? 0 : dias * 1440 + f.inicio - ahora.minutos;
      if (!mejor || falta < mejor.falta) mejor = { i: i, falta: falta, dias: dias, enCurso: enCurso };
    });
    return mejor;
  }
  var lista = document.querySelector('[data-semana]');
  if (lista) {
    try {
      var items = Array.prototype.slice.call(lista.querySelectorAll('li'));
      var filas = items.map(function (li) {
        return { dia: +li.dataset.dia, inicio: +li.dataset.inicio, fin: +li.dataset.fin };
      });
      var p = proximaClase(filas, ahoraEnBuenosAires());
      if (p) {
        var li = items[p.i];
        li.classList.add('proxima');
        var aviso = document.createElement('span');
        aviso.className = 'aviso';
        aviso.textContent = p.enCurso ? 'En clase ahora' : p.dias === 0 ? 'Próxima clase: hoy' : p.dias === 1 ? 'Próxima clase: mañana' : 'Próxima clase';
        li.insertBefore(aviso, li.firstChild);
      }
    } catch (e) { /* sin Intl: la grilla queda completa igual */ }
  }

  /* ---------- Formulario de contacto ---------- */
  var form = document.getElementById('form-contacto');
  if (form) {
    var DESTINO = 'https://script.google.com/macros/s/AKfycbxPJVti72ODTcOGo2GvrHeY28xd44hUoZ7uGIYQz5gSo6E2O7OC/exec';
    var estado = document.getElementById('form-estado');
    var enviar = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (form.elements.sitio.value) return; // trampa para bots
      var url = new URL(DESTINO);
      url.searchParams.append('name', form.elements.nombre.value.trim());
      url.searchParams.append('email', form.elements.email.value.trim());
      url.searchParams.append('message', form.elements.mensaje.value.trim());
      enviar.disabled = true;
      enviar.textContent = 'Enviando…';
      estado.hidden = true;
      fetch(url, { method: 'POST', mode: 'no-cors' }).then(function () {
        estado.className = 'estado';
        estado.textContent = 'Mensaje enviado. Te respondemos al email que dejaste.';
        estado.hidden = false;
        form.reset();
      }).catch(function () {
        estado.className = 'estado error';
        estado.textContent = 'El mensaje no salió. Revisá tu conexión y probá de nuevo, o escribinos por WhatsApp al +54 11 3059-4142.';
        estado.hidden = false;
      }).then(function () {
        enviar.disabled = false;
        enviar.textContent = 'Enviar mensaje';
      });
    });
  }
})();
