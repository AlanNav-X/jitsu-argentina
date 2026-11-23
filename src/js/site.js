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

  /* ---------- Clases: fechas reales, feriados y cambios del panel ---------- */
  var datosEl = document.getElementById('datos-clases');
  var DATOS = { api: '', sedes: [], feriados: {} };
  try { if (datosEl) DATOS = JSON.parse(datosEl.textContent); } catch (e) { /* sin datos: se usa la grilla fija */ }
  var cambios = {};   // 'AAAA-MM-DD|sede' -> true / false
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var NOMBRE_SEDE = {};
  DATOS.sedes.forEach(function (s) { NOMBRE_SEDE[s.id] = s.nombre; });

  // Fecha y hora actuales en Buenos Aires, sin depender de la zona horaria del dispositivo
  function hoyBA() {
    var v = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).forEach(function (p) { v[p.type] = p.value; });
    return { fecha: v.year + '-' + v.month + '-' + v.day, minutos: +v.hour * 60 + +v.minute };
  }
  function sumarDias(fecha, n) {
    var d = new Date(fecha + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function diaSemana(fecha) { return new Date(fecha + 'T12:00:00Z').getUTCDay(); }   // 0 = domingo
  function corta(fecha) { return fecha.slice(8, 10) + '/' + fecha.slice(5, 7); }
  function aMinutos(h) { return +h.slice(0, 2) * 60 + +h.slice(3, 5); }
  function estado(fecha, sede) {
    var f = DATOS.feriados[fecha];
    var feriado = f && f.sedes.indexOf(sede) >= 0 ? f.nombre : null;
    var cambio = cambios[fecha + '|' + sede];
    return { hay: typeof cambio === 'boolean' ? cambio : !feriado, feriado: feriado, cambio: typeof cambio === 'boolean' };
  }

  var lista = document.querySelector('[data-semana]');
  var tituloSemana = document.querySelector('.semana-cabeza h2');
  function pintarSemana() {
    if (!lista) return;
    try {
      var ahora = hoyBA();
      var dow = diaSemana(ahora.fecha);
      var finDeSemana = dow === 0 || dow === 6;
      var lunes = sumarDias(ahora.fecha, finDeSemana ? (dow === 6 ? 2 : 1) : 1 - dow);
      if (tituloSemana) tituloSemana.textContent = finDeSemana ? 'La semana que viene en el tatami' : 'Esta semana en el tatami';
      var proxima = null;
      Array.prototype.slice.call(lista.querySelectorAll('li')).forEach(function (li) {
        var fecha = sumarDias(lunes, +li.dataset.dia - 1);
        var est = estado(fecha, li.dataset.sede);
        var dia = li.querySelector('.dia');
        if (!dia.dataset.nombre) dia.dataset.nombre = dia.textContent;
        dia.textContent = dia.dataset.nombre + ' ' + corta(fecha);
        li.classList.remove('proxima', 'sin-clase');
        Array.prototype.slice.call(li.querySelectorAll('.aviso, .nota-feriado')).forEach(function (n) { n.remove(); });
        if (!est.hay) {
          li.classList.add('sin-clase');
          var aviso = document.createElement('span');
          aviso.className = 'nota-feriado';
          aviso.textContent = est.feriado ? 'Feriado: ' + est.feriado + '. No hay clase.' : 'Esta fecha no hay clase.';
          li.appendChild(aviso);
          return;
        }
        if (est.feriado) {
          var nota = document.createElement('span');
          nota.className = 'nota-feriado';
          nota.textContent = 'Feriado, pero hay clase.';
          li.appendChild(nota);
        }
        var termino = fecha < ahora.fecha || (fecha === ahora.fecha && ahora.minutos >= +li.dataset.fin);
        if (!termino && !proxima) proxima = { li: li, fecha: fecha };
      });
      if (proxima) {
        var li = proxima.li;
        li.classList.add('proxima');
        var enCurso = proxima.fecha === ahora.fecha && ahora.minutos >= +li.dataset.inicio;
        var aviso = document.createElement('span');
        aviso.className = 'aviso';
        aviso.textContent = enCurso ? 'En clase ahora'
          : proxima.fecha === ahora.fecha ? 'Próxima clase: hoy'
          : proxima.fecha === sumarDias(ahora.fecha, 1) ? 'Próxima clase: mañana' : 'Próxima clase';
        li.insertBefore(aviso, li.firstChild);
      }
    } catch (e) { /* sin Intl: la grilla queda completa igual */ }
  }
  pintarSemana();

  function api(metodo, cuerpo) {
    var opciones = { method: metodo, redirect: 'follow' };
    var url = DATOS.api;
    if (metodo === 'GET') url += (url.indexOf('?') < 0 ? '?' : '&') + 'accion=leer';
    else { opciones.body = JSON.stringify(cuerpo); opciones.headers = { 'Content-Type': 'text/plain;charset=utf-8' }; }
    return fetch(url, opciones).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }
  function cargarCambios() {
    if (!DATOS.api) return Promise.resolve();
    return api('GET').then(function (r) {
      if (!r.ok) return;
      cambios = {};
      r.cambios.forEach(function (c) { cambios[c.fecha + '|' + c.sede] = c.hay_clase; });
      pintarSemana();
    }).catch(function () { /* sin conexión: quedan los feriados oficiales */ });
  }
  cargarCambios();

  /* ---------- Panel de clases (administración) ---------- */
  var panel = document.getElementById('panel-admin');
  if (panel) {
    var formIngreso = document.getElementById('panel-ingreso');
    var estadoIngreso = document.getElementById('panel-estado-ingreso');
    var vistaClases = document.getElementById('panel-clases');
    var listaPanel = document.getElementById('panel-lista');
    var estadoPanel = document.getElementById('panel-estado');
    var CLAVE_TOKEN = 'jja-panel-token';
    var leerToken = function () { try { return sessionStorage.getItem(CLAVE_TOKEN); } catch (e) { return null; } };
    var guardarToken = function (t) { try { if (t) sessionStorage.setItem(CLAVE_TOKEN, t); else sessionStorage.removeItem(CLAVE_TOKEN); } catch (e) { /* sin almacenamiento: dura mientras la página esté abierta */ } };
    var tokenActual = leerToken();
    var avisar = function (el, texto, error) { el.textContent = texto; el.hidden = !texto; el.classList.toggle('error', !!error); };

    var mostrarIngreso = function (mensaje) {
      vistaClases.hidden = true;
      formIngreso.hidden = false;
      avisar(estadoIngreso, mensaje || '', !!mensaje);
    };
    var mostrarClases = function () {
      formIngreso.hidden = true;
      vistaClases.hidden = false;
      avisar(estadoPanel, '');
      armarLista();
    };
    var abrir = function () {
      if (!DATOS.api) {
        mostrarIngreso('El panel todavía no está conectado al servidor de clases.');
      } else if (tokenActual) {
        mostrarClases();
        cargarCambios().then(armarLista);
      } else {
        mostrarIngreso('');
      }
      if (typeof panel.showModal === 'function') panel.showModal(); else panel.setAttribute('open', '');
      var primero = panel.querySelector(formIngreso.hidden ? '.interruptor' : 'input');
      if (primero) primero.focus();
    };
    var cerrar = function () { if (typeof panel.close === 'function') panel.close(); else panel.removeAttribute('open'); };
    Array.prototype.slice.call(document.querySelectorAll('[data-abrir-panel]')).forEach(function (b) {
      b.addEventListener('click', function (e) { e.preventDefault(); abrir(); });
    });
    panel.querySelector('[data-cerrar]').addEventListener('click', cerrar);
    panel.addEventListener('click', function (e) { if (e.target === panel) cerrar(); });

    var ERRORES = {
      credenciales: 'Usuario o contraseña incorrectos.',
      bloqueado: 'Demasiados intentos fallidos. Esperá 15 minutos y volvé a probar.',
      'sin-configurar': 'El servidor todavía no tiene usuario y contraseña configurados.',
    };
    formIngreso.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!DATOS.api) { mostrarIngreso('El panel todavía no está conectado al servidor de clases.'); return; }
      var boton = formIngreso.querySelector('button[type="submit"]');
      boton.disabled = true;
      avisar(estadoIngreso, 'Ingresando…');
      api('POST', { accion: 'ingresar', usuario: formIngreso.elements.usuario.value.trim(), clave: formIngreso.elements.clave.value })
        .then(function (r) {
          if (!r.ok) { mostrarIngreso(ERRORES[r.error] || 'No se pudo ingresar.'); return; }
          tokenActual = r.token;
          guardarToken(r.token);
          formIngreso.reset();
          return cargarCambios().then(mostrarClases);
        })
        .catch(function () { mostrarIngreso('No hay conexión con el servidor. Revisá tu conexión y probá de nuevo.'); })
        .then(function () { boton.disabled = false; });
    });
    document.getElementById('panel-salir').addEventListener('click', function () {
      tokenActual = null;
      guardarToken(null);
      mostrarIngreso('');
    });

    // Lista de clases de las próximas cuatro semanas, agrupadas por semana
    function armarLista() {
      var hoy = hoyBA().fecha;
      var html = '';
      var semana = -1;
      for (var i = 0; i < 28; i++) {
        var fecha = sumarDias(hoy, i);
        var dow = diaSemana(fecha) || 7;
        var semanaActual = Math.floor((i + (diaSemana(hoy) || 7) - 1) / 7);
        DATOS.sedes.forEach(function (s) {
          s.clases.forEach(function (c) {
            if (c[0] !== dow) return;
            if (semanaActual !== semana) {
              if (semana >= 0) html += '</ul>';
              semana = semanaActual;
              html += '<h3>' + (semana === 0 ? 'Esta semana' : 'Semana del ' + corta(sumarDias(fecha, 1 - dow))) + '</h3><ul class="panel-semana">';
            }
            var est = estado(fecha, s.id);
            var id = 'i-' + fecha + '-' + s.id;
            html += '<li class="' + (est.hay ? '' : 'sin-clase') + '">' +
              '<div class="panel-fecha"><strong>' + DIAS[diaSemana(fecha)] + ' ' + corta(fecha) + '</strong>' +
              '<span>' + s.nombre + ', ' + c[1] + ' a ' + c[2] + '</span>' +
              (est.feriado ? '<span class="nota-feriado">Feriado: ' + est.feriado + '</span>' : '') + '</div>' +
              '<button type="button" class="interruptor" role="switch" id="' + id + '" aria-checked="' + est.hay + '"' +
              ' data-fecha="' + fecha + '" data-sede="' + s.id + '" aria-label="Hay clase el ' + DIAS[diaSemana(fecha)] + ' ' + corta(fecha) + ' en ' + s.nombre + '">' +
              '<span class="interruptor-texto">' + (est.hay ? 'Hay clase' : 'Sin clase') + '</span></button></li>';
          });
        });
      }
      listaPanel.innerHTML = html + (semana >= 0 ? '</ul>' : '');
    }
    listaPanel.addEventListener('click', function (e) {
      var b = e.target.closest('.interruptor');
      if (!b || b.disabled) return;
      var nuevo = b.getAttribute('aria-checked') !== 'true';
      var fila = b.closest('li');
      var pintar = function (valor) {
        b.setAttribute('aria-checked', String(valor));
        b.querySelector('.interruptor-texto').textContent = valor ? 'Hay clase' : 'Sin clase';
        fila.classList.toggle('sin-clase', !valor);
      };
      pintar(nuevo);
      b.disabled = true;
      avisar(estadoPanel, 'Guardando…');
      api('POST', { accion: 'guardar', token: tokenActual, fecha: b.dataset.fecha, sede: b.dataset.sede, hay_clase: nuevo })
        .then(function (r) {
          if (r.ok) {
            cambios[b.dataset.fecha + '|' + b.dataset.sede] = nuevo;
            pintarSemana();
            avisar(estadoPanel, 'Guardado: ' + NOMBRE_SEDE[b.dataset.sede] + ', ' + corta(b.dataset.fecha) + (nuevo ? ', hay clase.' : ', sin clase.'));
            return;
          }
          pintar(!nuevo);
          if (r.error === 'sesion') { tokenActual = null; guardarToken(null); mostrarIngreso('La sesión venció. Volvé a ingresar.'); return; }
          avisar(estadoPanel, 'No se pudo guardar. Probá de nuevo.', true);
        })
        .catch(function () { pintar(!nuevo); avisar(estadoPanel, 'No hay conexión con el servidor. El cambio no se guardó.', true); })
        .then(function () { b.disabled = false; });
    });
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

  /* ---------- Página de grados: el índice marca el kyu en pantalla ---------- */
  var listaKyus = document.querySelector('[data-kyus]');
  if (listaKyus) {
    var kyus = Array.prototype.slice.call(listaKyus.querySelectorAll('.grado[data-kyu]'));
    var indiceKyu = Array.prototype.slice.call(document.querySelectorAll('.indice a[href^="#kyu-"]'));
    var marcarKyu = function (kyu) {
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
    // Al tocar un kyu del índice, marcarlo enseguida (el scroll lo confirma)
    indiceKyu.forEach(function (a) {
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
        Array.prototype.slice.call(d.querySelectorAll('a, .glosa')).forEach(function (a) { a.tabIndex = j === i ? 0 : -1; });
      });
      anterior.disabled = i === 0;
      siguiente.disabled = i === diapos.length - 1;
      var d = diapos[i];
      d.classList.remove('anudar'); void d.offsetWidth; d.classList.add('anudar');
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
    mostrar(0);
  }

  /* ---------- Kanji que se dibujan al entrar en pantalla ---------- */
  var porDibujar = Array.prototype.slice.call(document.querySelectorAll('[data-dibujar]'));
  if (porDibujar.length) {
    var dibujar = function (el) {
      Array.prototype.slice.call(el.querySelectorAll('.en-espera')).forEach(function (k) { k.classList.remove('en-espera'); });
    };
    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) { if (e.isIntersecting) { dibujar(e.target); obs.unobserve(e.target); } });
      }, { threshold: 0.35 });
      porDibujar.forEach(function (el) { obs.observe(el); });
    } else {
      porDibujar.forEach(dibujar);
    }
  }

  /* ---------- Aclaraciones subrayadas: se abren al tocar (o con Enter) y se cierran al tocar afuera ---------- */
  var glosas = Array.prototype.slice.call(document.querySelectorAll('.glosa'));
  var cerrarGlosas = function (salvo) { glosas.forEach(function (x) { if (x !== salvo) x.classList.remove('abierta'); }); };
  glosas.forEach(function (gl) {
    gl.setAttribute('role', 'button');
    gl.setAttribute('aria-label', gl.textContent + ': ' + gl.getAttribute('data-def'));
    var alternar = function (e) {
      e.preventDefault();
      e.stopPropagation();
      cerrarGlosas(gl);
      gl.classList.toggle('abierta');
    };
    gl.addEventListener('click', alternar);
    gl.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') alternar(e); });
  });

  /* ---------- Barra de WhatsApp: elegir sede ---------- */
  var barraWa = document.querySelector('.barra-wa');
  document.addEventListener('click', function (e) {
    cerrarGlosas(null);
    if (barraWa && barraWa.open && !barraWa.contains(e.target)) barraWa.open = false;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    cerrarGlosas(null);
    if (barraWa) barraWa.open = false;
  });

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
        estado.textContent = 'El mensaje no salió. Revisá tu conexión y probá de nuevo, o escribinos por WhatsApp: Caballito +54 11 3059-4142, Ramos Mejía +54 9 11 6378-1362.';
        estado.hidden = false;
      }).then(function () {
        enviar.disabled = false;
        enviar.textContent = 'Enviar mensaje';
      });
    });
  }
})();
