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

  /* ---------- Índice: marca la sección que se está leyendo ---------- */
  var enlaces = Array.prototype.slice.call(document.querySelectorAll('.indice a[href^="#"]'));
  if (enlaces.length && 'IntersectionObserver' in window) {
    var porId = {};
    enlaces.forEach(function (a) { porId[a.getAttribute('href').slice(1)] = a; });
    var visibles = {};
    var espia = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) { visibles[e.target.id] = e.isIntersecting; });
      var primero = null;
      enlaces.forEach(function (a) { var id = a.getAttribute('href').slice(1); if (!primero && visibles[id]) primero = id; });
      if (primero) enlaces.forEach(function (a) { a.classList.toggle('activa', a === porId[primero]); });
    }, { rootMargin: '-80px 0px -55% 0px' });
    Object.keys(porId).forEach(function (id) { var el = document.getElementById(id); if (el) espia.observe(el); });
  }

  /* ---------- Animaciones que arrancan al entrar en pantalla (una sola vez) ---------- */
  var animables = Array.prototype.slice.call(document.querySelectorAll('[data-animar], .grado-panel'));
  if (animables.length && 'IntersectionObserver' in window) {
    var vista = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add(e.target.classList.contains('grado-panel') ? 'anudar' : 'en-vista');
        vista.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    animables.forEach(function (el) { vista.observe(el); });
  }

  /* ---------- Grados interactivos en la portada ---------- */
  var panel = document.getElementById('grado-panel');
  var datosEl = document.getElementById('datos-grados');
  if (panel && datosEl) {
    var datos = JSON.parse(datosEl.textContent);
    var botones = Array.prototype.slice.call(document.querySelectorAll('.escalera button[data-kyu]'));
    var mostrar = function (n) {
      var g = datos.filter(function (d) { return d.n === n; })[0];
      if (!g) return;
      botones.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.dataset.kyu === n)); });
      panel.style.setProperty('--cinta', 'var(--c-' + g.c + ')');
      document.getElementById('gp-titulo').textContent = g.n + '° kyu, cinturón ' + g.nombre;
      document.getElementById('gp-texto').textContent = g.texto;
      document.getElementById('gp-enlace').setAttribute('href', 'grados.html#kyu-' + g.n);
      var pista = panel.querySelector('.lances-pista');
      pista.setAttribute('aria-label', g.acumulados + ' de ' + g.total + ' lances');
      pista.firstElementChild.style.width = (g.acumulados / g.total * 100).toFixed(1) + '%';
      var p = panel.querySelector('.lances p');
      p.textContent = '';
      if (g.lances) {
        var fuerte = document.createElement('strong');
        fuerte.textContent = g.lances + ' lances nuevos';
        p.appendChild(fuerte);
        p.appendChild(document.createTextNode(', ' + g.acumulados + ' de ' + g.total + ' en total'));
      } else {
        p.textContent = 'Todavía sin lances: se empieza por las caídas';
      }
    };
    botones.forEach(function (b) { b.addEventListener('click', function () { mostrar(+b.dataset.kyu); }); });
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
      var sede = form.elements.sede ? form.elements.sede.value : '';
      url.searchParams.append('message', (sede ? '[Sede: ' + sede + '] ' : '') + form.elements.mensaje.value.trim());
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
