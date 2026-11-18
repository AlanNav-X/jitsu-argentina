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
  if (enlaces.length && !document.querySelector('[data-kyus]') && 'IntersectionObserver' in window) {
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

  var sinMovimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Obi: aparece solo en la sección de grados y marca el kyu activo ---------- */
  var obi = document.querySelector('.obi');
  var obiRotulo = document.querySelector('.obi-grado');
  var obiEnlaces = obi ? Array.prototype.slice.call(obi.querySelectorAll('a[data-kyu]')) : [];
  function marcarObi(kyu) {
    obiEnlaces.forEach(function (a) {
      var activo = a.dataset.kyu === String(kyu);
      a.classList.toggle('activa', activo);
      if (activo) {
        a.setAttribute('aria-current', 'true');
        if (obiRotulo) obiRotulo.textContent = a.getAttribute('aria-label');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }
  function vigilarZona(zona) {
    if (!obi || !zona) return;
    if (!('IntersectionObserver' in window)) { obi.classList.add('visible'); return; }
    new IntersectionObserver(function (e) {
      obi.classList.toggle('visible', e[0].isIntersecting);
    }, { rootMargin: '-15% 0px -15% 0px' }).observe(zona);
  }

  /* ---------- Página de grados: obi e índice sincronizados con el kyu en pantalla ---------- */
  var listaKyus = document.querySelector('[data-kyus]');
  if (listaKyus) {
    vigilarZona(listaKyus);
    var kyus = Array.prototype.slice.call(listaKyus.querySelectorAll('.grado[data-kyu]'));
    var indiceKyu = Array.prototype.slice.call(document.querySelectorAll('.indice a[href^="#kyu-"]'));
    var marcarKyu = function (kyu) {
      marcarObi(kyu);
      indiceKyu.forEach(function (a) { a.classList.toggle('activa', a.getAttribute('href') === '#kyu-' + kyu); });
    };
    marcarKyu(kyus[0].dataset.kyu);
    if ('IntersectionObserver' in window) {
      var enPantalla = {};
      var vigia = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) { enPantalla[e.target.dataset.kyu] = e.isIntersecting; });
        for (var i = 0; i < kyus.length; i++) {
          if (enPantalla[kyus[i].dataset.kyu]) { marcarKyu(kyus[i].dataset.kyu); break; }
        }
      }, { rootMargin: '-35% 0px -60% 0px' });
      kyus.forEach(function (k) { vigia.observe(k); });
    }
    // Al tocar un tramo del obi o del índice, marcarlo enseguida (el scroll lo confirma)
    obiEnlaces.concat(indiceKyu).forEach(function (a) {
      a.addEventListener('click', function () { marcarKyu(a.getAttribute('href').replace(/.*#kyu-/, '')); });
    });
  }

  /* ---------- Mons: panel a la derecha del kyu ---------- */
  Array.prototype.slice.call(document.querySelectorAll('.mons-boton')).forEach(function (b) {
    var panel = document.getElementById(b.getAttribute('aria-controls'));
    if (!panel) return;
    b.addEventListener('click', function () {
      var abrir = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(abrir));
      panel.hidden = !abrir;
    });
  });

  /* ---------- Carrusel de cinturones (portada) ---------- */
  var carrusel = document.querySelector('[data-carrusel]');
  if (carrusel) {
    var pista = carrusel.querySelector('.carrusel-pista');
    var diapos = Array.prototype.slice.call(pista.querySelectorAll('.diapo'));
    var puntos = Array.prototype.slice.call(carrusel.querySelectorAll('[data-ir]'));
    var anterior = carrusel.querySelector('[data-paso="-1"]');
    var siguiente = carrusel.querySelector('[data-paso="1"]');
    var actual = -1;
    var mostrar = function (i) {
      if (i === actual) return;
      actual = i;
      puntos.forEach(function (p, j) { if (j === i) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current'); });
      diapos.forEach(function (d, j) {
        d.setAttribute('aria-hidden', String(j !== i));
        Array.prototype.slice.call(d.querySelectorAll('a')).forEach(function (a) { a.tabIndex = j === i ? 0 : -1; });
      });
      anterior.disabled = i === 0;
      siguiente.disabled = i === diapos.length - 1;
      var d = diapos[i];
      d.classList.remove('anudar'); void d.offsetWidth; d.classList.add('anudar');
      marcarObi(d.dataset.kyu);
    };
    var ir = function (i) {
      i = Math.max(0, Math.min(diapos.length - 1, i));
      pista.scrollTo({ left: diapos[i].offsetLeft - pista.offsetLeft, behavior: sinMovimiento ? 'auto' : 'smooth' });
      mostrar(i);
    };
    var esperando = false;
    pista.addEventListener('scroll', function () {
      if (esperando) return;
      esperando = true;
      requestAnimationFrame(function () {
        esperando = false;
        mostrar(Math.round(pista.scrollLeft / pista.clientWidth));
      });
    }, { passive: true });
    anterior.addEventListener('click', function () { ir(actual - 1); });
    siguiente.addEventListener('click', function () { ir(actual + 1); });
    puntos.forEach(function (p, j) { p.addEventListener('click', function () { ir(j); }); });
    carrusel.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); ir(actual + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); ir(actual - 1); }
      else if (e.key === 'Home') { e.preventDefault(); ir(0); }
      else if (e.key === 'End') { e.preventDefault(); ir(diapos.length - 1); }
    });
    // El obi de la portada maneja el carrusel en vez de cambiar de página
    obiEnlaces.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var j = diapos.findIndex(function (d) { return d.dataset.kyu === a.dataset.kyu; });
        if (j < 0) return;
        e.preventDefault();
        ir(j);
      });
    });
    mostrar(0);
    vigilarZona(carrusel.closest('[data-zona-obi]'));
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
