// Genera el sitio estático en dist/ a partir de src/.  Uso: node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(raiz, 'src');
const dist = path.join(raiz, 'dist');
const leer = (f) => fs.readFileSync(path.join(src, f), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// comillas rectas del texto original -> comillas tipográficas
const tipo = (s) => esc(s).replace(/"([^"]+)"/g, '“$1”').replace(/'(On|Giri)'/g, '‘$1’');
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9 ]/g, '').trim().replace(/\s+/g, '-').slice(0, 40);

// SITIO: dominio donde se publica (para enlaces canónicos y la imagen al compartir).
// Para una demo: SITIO=https://usuario.github.io/repo DEMO=1 node build.mjs
const SITIO = (process.env.SITIO || 'https://jitsuargentina.com.ar').replace(/\/$/, '');
const DEMO = process.env.DEMO === '1';
const WA_TEXTO = encodeURIComponent('Hola, quiero probar una clase de Jiu Jitsu en Caballito.');
const WHATSAPP = `https://wa.me/541130594142?text=${WA_TEXTO}`;
const WHATSAPP_RAMOS = `https://wa.me/5491163781362?text=${encodeURIComponent('Hola, quiero probar una clase de Jiu Jitsu en Ramos Mejía.')}`;
const LOGIN = 'https://jitsuargentina.com.ar/login';
const TJJF = 'https://www.jitsufoundation.org/';
const MENU = [
  ['index.html', 'Sedes y horarios'], ['fundacion.html', 'La Fundación'], ['historia.html', 'Historia'],
  ['filosofia.html', 'Filosofía'], ['grados.html', 'Grados'], ['contacto.html', 'Contacto'],
];

/* ---------- Datos de las sedes (una sola fuente para portada, calendario y Google) ---------- */
const SEDES = [
  { id: 'caballito', nombre: 'Sede Caballito', calle: 'General Manuel A. Rodríguez 1191', localidad: 'Caballito', region: 'Ciudad Autónoma de Buenos Aires',
    clases: [['MO', 'Mo', '19:00', '20:30'], ['WE', 'We', '18:30', '20:00'], ['FR', 'Fr', '19:00', '20:30']],
    redes: ['https://www.instagram.com/buenosairesjiujitsuclub/', 'https://www.facebook.com/share/19qRqyU3RX/'], telefono: '+541130594142' },
  { id: 'ramos-mejia', nombre: 'Sede Ramos Mejía', calle: 'Gabriel Ardoino 430', localidad: 'Ramos Mejía', region: 'Buenos Aires',
    clases: [['TU', 'Tu', '19:30', '21:00'], ['TH', 'Th', '19:30', '21:00']],
    redes: ['https://www.instagram.com/nishidojojiujitsu/', 'https://www.facebook.com/p/Haedo-Jiu-Jitsu-Club-100057642211295/'], telefono: '+5491163781362' },
];

function calendario(sede) {
  // Semana de referencia: lunes 2 de noviembre de 2026
  const base = { MO: 2, TU: 3, WE: 4, TH: 5, FR: 6 };
  const hora = (h) => h.replace(':', '') + '00';
  const eventos = sede.clases.map(([dia, , ini, fin]) => [
    'BEGIN:VEVENT', `UID:${sede.id}-${dia.toLowerCase()}@jitsuargentina.com.ar`, 'DTSTAMP:20261101T000000Z',
    `DTSTART;TZID=America/Argentina/Buenos_Aires:202611${String(base[dia]).padStart(2, '0')}T${hora(ini)}`,
    `DTEND;TZID=America/Argentina/Buenos_Aires:202611${String(base[dia]).padStart(2, '0')}T${hora(fin)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${dia}`, `SUMMARY:Jiu Jitsu Japonés (${sede.nombre})`,
    `LOCATION:${sede.calle}\\, ${sede.localidad}\\, ${sede.region}`, `URL:${SITIO}/`, 'END:VEVENT',
  ].join('\r\n'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Jiu Jitsu Japones Argentina//Clases//ES', 'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:Jiu Jitsu ${sede.nombre}`,
    'BEGIN:VTIMEZONE', 'TZID:America/Argentina/Buenos_Aires', 'BEGIN:STANDARD', 'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0300', 'TZOFFSETTO:-0300', 'TZNAME:-03', 'END:STANDARD', 'END:VTIMEZONE',
    ...eventos, 'END:VCALENDAR', ''].join('\r\n');
}

const ldSedes = SEDES.map((s) => ({
  '@context': 'https://schema.org', '@type': 'SportsActivityLocation',
  name: `Jiu Jitsu Japonés Argentina, ${s.nombre}`, url: `${SITIO}/`, image: `${SITIO}/assets/img/${s.id}.jpg`,
  sport: 'Jiu Jitsu', ...(s.telefono ? { telephone: s.telefono } : {}), sameAs: s.redes,
  parentOrganization: { '@type': 'Organization', name: 'The Jiu Jitsu Foundation', url: TJJF },
  address: { '@type': 'PostalAddress', streetAddress: s.calle, addressLocality: s.localidad, addressRegion: s.region, addressCountry: 'AR' },
  openingHoursSpecification: s.clases.map(([, d, ini, fin]) => ({
    '@type': 'OpeningHoursSpecification', opens: ini, closes: fin,
    dayOfWeek: `https://schema.org/${{ Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday' }[d]}`,
  })),
}));

/* ---------- Preguntas frecuentes (respuestas tomadas del texto del sitio) ---------- */
const PREGUNTAS = [
  ['¿Hace falta ser fuerte o tener buen estado físico?', 'No. No es un sistema que se base en la fuerza física y por lo tanto es adecuado para personas de muy diferentes estaturas.'],
  ['¿Es un deporte de competencia?', 'No es el objetivo. Las aplicaciones deportivas permiten practicar contra alguien que resiste, pero el objetivo primordial de quienes practican Jiu Jitsu no es ganar combates deportivos entre ellos. Nuestro estilo se clasifica como un sistema de Budo: defensa personal y también superación personal.'],
  ['¿Qué se aprende?', 'Bloqueos, golpes, lances y retenciones, así como sus contraataques, para defenderse de una amplia variedad de ataques: desde un agarre de muñeca hasta un palo o un cuchillo.'],
  ['Vengo de otra arte marcial, ¿puedo sumarme?', 'Sí. Muchos principiantes empiezan como una forma de defensa personal y otros provienen de otras artes marciales y quieren ver en qué consiste nuestro estilo.'],
  ['¿Qué cubre el arancel?', 'Los gastos de funcionamiento del dojo, del club y de la organización, y los gastos del Sensei para llegar al dojo y viajar a eventos. La instrucción no se paga: todos los Sensei dan su tiempo libremente.'],
  ['¿Cómo se pasa de grado?', 'Con un examen. Hay ocho grados Kyu, del cinturón blanco al marrón. En los dos primeros exámenes se puede aprobar con 0, 1, 2 o 3 mons; desde el 5° kyu solo se aprueba o no.'],
];
const ldFaq = { '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: PREGUNTAS.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };

/* ---------- Glosario ---------- */
const GLOSARIO = [
  ['dojo', 'Dojo', 'Sala de entrenamiento.'],
  ['Sensei', 'Sensei', 'Instructor o maestro.'],
  ['sempai', 'Sempai', 'Miembros destacados del dojo, con más experiencia.'],
  ['kohai', 'Kohai', 'Miembros más jóvenes del dojo.'],
  ['Kyu', 'Kyu', 'Grado de alumno. Son ocho, del 8° al 1°.'],
  ['Dan', 'Dan', 'Grado de maestro: el cinturón negro.'],
  ['Kata', 'Kata', 'Forma: una secuencia fija de técnicas.'],
  ['mons', 'Mon', 'Cinta que va en el cinturón y muestra la nota del examen.'],
  ['bokken', 'Bokken', 'Espada de madera.'],
  ['tatame', 'Tatame o tatami', 'Colchoneta sobre la que se entrena.'],
  ['Bushido', 'Bushido', 'El camino del guerrero.'],
  ['budo|Budo', 'Budo', 'Artes marciales entendidas como camino de superación personal.'],
  ['katana', 'Katana', 'Sable largo del Samurai.'],
];
// Aclaraciones que se muestran subrayadas en el texto pero no forman parte de "Palabras del dojo"
const ACLARACIONES = [
  ['Empi Kata', '', 'Kata de codo.'],
  ['Do', '', 'Camino.'],
  ['pequeña inclinación', '', 'El saludo del dojo. Equivale en occidente a darse la mano.'],
  ['Nihon Jiu Jitsu', '', 'Jiu Jitsu Japonés.'],
  ['Goshin Jiu Jitsu', '', 'Jiu Jitsu para defensa personal.'],
  ['Wrestling', '', 'Lucha.'],
];
function glosador() {
  const usados = new Set();
  return (html) => {
    for (const [palabra, , def] of [...ACLARACIONES, ...GLOSARIO]) {
      if (usados.has(palabra)) continue;
      const re = new RegExp(`(^|[\\s(“])(${palabra})(?=[\\s.,;)”:]|$)`);
      if (re.test(html)) {
        usados.add(palabra);
        html = html.replace(re, (_, a, b) => `${a}<span class="glosa" tabindex="0" data-def="${def}">${b}</span>`);
      }
    }
    return html;
  };
}

/* ---------- Plantilla ---------- */
function cabeza({ archivo, titulo, descripcion, ld = [] }) {
  return `<title>${titulo}</title>
<meta name="description" content="${descripcion}">
<meta name="theme-color" content="#1A2342">${DEMO ? '\n<meta name="robots" content="noindex, nofollow">' : ''}
<link rel="canonical" href="${SITIO}/${archivo === 'index.html' ? '' : archivo}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Jiu Jitsu Japonés Argentina">
<meta property="og:title" content="${titulo}">
<meta property="og:description" content="${descripcion}">
<meta property="og:url" content="${SITIO}/${archivo === 'index.html' ? '' : archivo}">
<meta property="og:image" content="${SITIO}/assets/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="es_AR">
<meta name="twitter:card" content="summary_large_image">
<script>document.documentElement.classList.add('js')</script>
<link rel="icon" href="assets/img/sol.svg" type="image/svg+xml">
<link rel="stylesheet" href="css/fonts.css">
<link rel="stylesheet" href="css/site.css">
${ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n')}`;
}

function cuerpo({ archivo, contenido }) {
  const nav = MENU.map(([href, txt]) =>
    `<li><a href="${href}"${href === archivo ? ' aria-current="page"' : ''}>${txt}</a></li>`).join('');
  const i = MENU.findIndex(([h]) => h === archivo);
  const paso = (j, clase, rotulo) => MENU[j] ? `<a class="${clase}" href="${MENU[j][0]}"><span>${rotulo}</span>${MENU[j][1]}</a>` : '<span></span>';
  const seguir = i > 0 ? `<nav class="seguir" aria-label="Seguir leyendo"><div class="caja">${paso(i - 1, 'antes', 'Anterior')}${paso(i + 1, 'despues', 'Siguiente')}</div></nav>` : '';
  const barra = archivo === 'contacto.html' ? '' : `<details class="barra-wa">
<summary>Escribir por WhatsApp</summary>
<div class="barra-wa-opciones" role="group" aria-label="Elegí la sede">
<a href="${WHATSAPP}">Caballito<span>Lunes, miércoles y viernes</span></a>
<a href="${WHATSAPP_RAMOS}">Ramos Mejía<span>Martes y jueves</span></a>
</div>
</details>`;
  return `<a class="saltar" href="#contenido">Ir al contenido</a>
<header class="cabecera">
  <div class="caja">
    <a class="marca" href="index.html"><img src="assets/img/sol.svg" alt="" width="40" height="40">Jiu Jitsu Japonés<br>Argentina</a>
    <button class="menu-boton" type="button" aria-expanded="false" aria-controls="nav">Menú</button>
    <nav class="nav" id="nav" aria-label="Principal"><ul>${nav}</ul></nav>
  </div>
</header>
<main id="contenido">
${contenido}
${seguir}
</main>
<footer class="pie">
  <div class="caja">
    <div>
      <h2>Fundación Jiu Jitsu Argentina</h2>
      <p>Parte de <a href="${TJJF}">The Jiu Jitsu Foundation</a>. Enseñamos Shorinji Kan Jiu Jitsu en Caballito y Ramos Mejía.</p>
    </div>
    <div>
      <h2>Caballito</h2>
      <ul>
        <li>General Manuel A. Rodríguez 1191</li>
        <li><a href="${WHATSAPP}">WhatsApp +54 11 3059-4142</a></li>
        <li><a href="https://www.instagram.com/buenosairesjiujitsuclub/">Instagram</a></li>
        <li><a href="https://www.facebook.com/share/19qRqyU3RX/">Facebook</a></li>
      </ul>
    </div>
    <div>
      <h2>Ramos Mejía</h2>
      <ul>
        <li>Gabriel Ardoino 430</li>
        <li><a href="${WHATSAPP_RAMOS}">WhatsApp +54 9 11 6378-1362</a></li>
        <li><a href="https://www.instagram.com/nishidojojiujitsu/">Instagram</a></li>
        <li><a href="https://www.facebook.com/p/Haedo-Jiu-Jitsu-Club-100057642211295/">Facebook</a></li>
      </ul>
    </div>
    <div>
      <h2>Alumnos</h2>
      <ul>
        <li><a href="${LOGIN}">Ingresar a tu cuenta</a></li>
        <li><a href="contacto.html">Contacto</a></li>
      </ul>
    </div>
  </div>
</footer>
${barra}
<script src="js/site.js"></script>`;
}

const completa = (p) => `<!doctype html>
<html lang="es-AR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${cabeza(p)}
</head>
<body>
${cuerpo(p)}
</body>
</html>
`;

/* ---------- Texto original -> secciones ---------- */
function secciones(archivo, titulos, saltar = 1) {
  const lineas = leer(`content/${archivo}.txt`).split('\n').map((l) => l.trim()).filter(Boolean);
  const res = []; let act = null;
  for (const l of lineas.slice(saltar)) {       // en algunas páginas la primera línea es el título
    if (titulos[l] !== undefined) { act = { titulo: titulos[l] || l, parrafos: [] }; res.push(act); }
    else { if (!act) { act = { titulo: null, parrafos: [] }; res.push(act); } act.parrafos.push(l); }
  }
  return res;
}
const parrafos = (ps, g = (x) => x) => ps.map((p) => `<p>${g(tipo(p))}</p>`).join('\n');

/* ---------- Kanji a pincel ----------
   Contornos y orden de trazos: hanzi-writer-data (Arphic Public License, ver licencias/).
   Cada trazo es un pincel grueso que recorre la línea media del trazo, recortado por el contorno caligráfico;
   un filtro agrega borde irregular, absorción en el papel y grano seco. */
const TRAZOS = JSON.parse(leer('content/trazos.json'));
let pincelN = 0;
let pincelFin = 0; // segundo en que termina el último kanji generado
function pincel(texto, inicio = 0.15, clase = '', ritmo = 1) {
  let t = inicio;
  const html = `<span class="kanji${clase ? ` ${clase}` : ''}" lang="ja" aria-hidden="true">${[...texto].map((c) => {
    const d = TRAZOS[c];
    if (!d) throw new Error(`Faltan los trazos de ${c} en src/content/trazos.json`);
    const id = `k${++pincelN}`;
    const clips = d.strokes.map((s, i) => `<clipPath id="${id}c${i}"><path d="${s}"/></clipPath>`).join('');
    const trazos = d.medians.map((m, i) => {
      let L = 0;
      for (let j = 1; j < m.length; j++) L += Math.hypot(m[j][0] - m[j - 1][0], m[j][1] - m[j - 1][1]);
      L = Math.round(L);
      const dur = (0.09 + L / 3000) * ritmo;
      const estilo = `--da:${L} ${L + 700};--o:${L + 260};--d:${dur.toFixed(2)}s;--i:${t.toFixed(2)}s`;
      t += dur + 0.035 * ritmo;
      return `<path class="trazo" clip-path="url(#${id}c${i})" style="${estilo}" d="M${m.map((q) => q.join(' ')).join('L')}"/>`;
    }).join('');
    t += 0.12 * ritmo;
    return `<svg class="pincel" viewBox="0 0 1024 1024" width="1024" height="1024"><defs>${clips}
<filter id="${id}f" x="-8%" y="-8%" width="116%" height="116%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="${pincelN * 7}" result="ondas"/>
<feDisplacementMap in="SourceGraphic" in2="ondas" scale="16" xChannelSelector="R" yChannelSelector="G" result="borde"/>
<feGaussianBlur in="borde" stdDeviation="5" result="difuso"/>
<feComponentTransfer in="difuso" result="halo"><feFuncA type="linear" slope="0.32"/></feComponentTransfer>
<feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="${pincelN * 3}" result="grano"/>
<feColorMatrix in="grano" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.15 1.55" result="poros"/>
<feComposite in="borde" in2="poros" operator="in" result="seco"/>
<feMerge><feMergeNode in="halo"/><feMergeNode in="seco"/></feMerge>
</filter></defs><g filter="url(#${id}f)"><g transform="scale(1,-1) translate(0,-900)">${trazos}</g></g></svg>`;
  }).join('')}</span>`;
  pincelFin = t;
  return html;
}

function titular({ kanji, sol, h1, bajada }) {
  const marca = sol ? `<img class="kanji-sol" src="assets/img/sol.svg" alt="" width="120" height="117">` : pincel(kanji);
  return `<div class="titular"><div class="caja">${marca}<div><h1>${h1}</h1>${bajada ? `<p>${bajada}</p>` : ''}</div></div></div>`;
}
function articulo(secs, extras = {}, cola = '') {
  const g = glosador();
  const conTitulo = secs.filter((s) => s.titulo);
  const indice = conTitulo.length > 1 ? `<nav class="indice" aria-label="En esta página"><h2>En esta página</h2><ol>${
    conTitulo.map((s) => `<li><a href="#${slug(s.titulo)}">${tipo(s.titulo)}</a></li>`).join('')}</ol></nav>` : '<div></div>';
  const texto = secs.map((s) => `<section${s.titulo ? ` id="${slug(s.titulo)}"` : ''}>
${s.titulo ? `<h2>${tipo(s.titulo)}</h2>` : ''}
${(extras[s.titulo]?.antes) || ''}
${parrafos(s.parrafos, g)}
${(extras[s.titulo]?.despues) || ''}
</section>`).join('\n');
  return `<div class="articulo"><div class="caja">${indice}<div class="prosa">${texto}${cola}</div></div></div>`;
}

/* ---------- Grados: una sola lectura del texto para la página y la portada ---------- */
const NUDO = leer('pages/nudo.svg');
const COLOR = { Blanco: 'blanco', Amarillo: 'amarillo', Anaranjado: 'naranja', Verde: 'verde', Violeta: 'violeta', Celeste: 'celeste', Azul: 'azul', 'Marrón': 'marron' };
const IC = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONOS = {
  botella: IC('<path d="M10 2h4v4l2.5 3.5V21a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1V9.500L10 6z"/><path d="M7.500 14h9"/>'),
  rota: IC('<path d="M10 22h4v-4l2.500-3.500V7l-2 2.500L12.500 6 11 9.500 9 6.500 7.500 9v5.500L10 18z"/>'),
  palo: IC('<path d="M4.500 19.500l15-15"/><path d="M3.500 18.500l2 2"/>'),
  cuchillo: IC('<path d="M3 21l5.500-5.500"/><path d="M7 14l2.800 2.800"/><path d="M8.500 15.500C13 14 18.500 9 21 3c-6 2.500-11 8-12.500 12.500z"/>'),
  bokken: IC('<path d="M3 21C8 18 16 11 21.500 3"/><path d="M5.200 17.200l2.400 2.400"/>'),
  cadena: IC('<rect x="2.500" y="9" width="8" height="6" rx="3"/><rect x="8" y="9" width="8" height="6" rx="3"/><rect x="13.500" y="9" width="8" height="6" rx="3"/>'),
  auxilios: IC('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 7.500v9M7.500 12h9"/>'),
  multiples: IC('<circle cx="12" cy="6.500" r="2.500"/><path d="M7.500 20v-3a4.500 4.500 0 0 1 9 0v3"/><circle cx="4.500" cy="9.500" r="1.800"/><path d="M1.500 20v-2.200a3 3 0 0 1 4-2.800"/><circle cx="19.500" cy="9.500" r="1.800"/><path d="M22.500 20v-2.200a3 3 0 0 0-4-2.800"/>'),
};
const DEFENSAS = {
  7: [['botella', 'Defensa contra botella']], 6: [['palo', 'Defensa contra palo']],
  5: [['cuchillo', 'Defensa contra cuchillo'], ['rota', 'Defensa contra botella rota']],
  4: [['bokken', 'Defensa contra bokken'], ['cadena', 'Defensa contra cadena']],
  3: [['multiples', 'Defensa contra atacantes múltiples']],
  2: [['auxilios', 'Conocimientos de primeros auxilios']],
};
const GRADOS = (() => {
  const lineas = leer('content/grados.txt').split('\n').map((l) => l.trim()).filter(Boolean);
  const lista = []; let g = null;
  for (const l of lineas.slice(2)) {
    const m = l.match(/^(\d)° Kyu - Cinturón (.+)$/);
    if (m) { g = { n: +m[1], nombre: m[2].toLowerCase(), c: COLOR[m[2]], ps: [] }; lista.push(g); } else g.ps.push(l);
  }
  lista.intro = lineas[1];
  return lista;
})();
const chips = (n) => (DEFENSAS[n] || []).length ? `<ul class="defensas">${DEFENSAS[n].map(([i, t]) => `<li>${ICONOS[i]}${t}</li>`).join('')}</ul>` : '';

/* ---------- Mons (solo 7° y 6° kyu) ----------
   Fuente: texto de grados del sitio de la Fundación Jiu Jitsu Argentina.
   El 7° kyu nombra dos colores posibles (rojos o anaranjados), por eso la muestra es mitad y mitad. */
const MONS = {
  7: { color: 'rojos o anaranjados', tono: 'linear-gradient(#C8301E 50%, #DD792F 50%)' },
  6: { color: 'verdes', tono: '#21932E' },
};
const NOTAS = [['Bueno', 0], ['Muy bueno', 1], ['Excelente', 2], ['Excepcional', 3]];
function panelMons(n) {
  const m = MONS[n];
  return `<aside class="mons-panel" id="mons-${n}" aria-label="Mons del ${n}° kyu" hidden>
<h3>Mons del ${n}° kyu</h3>
<p>Los mons son cintas que se colocan en el cinturón al aprobar el examen y muestran la nota. En este grado son <span class="color-mon" style="--mon:${m.tono}"></span>${m.color}.</p>
<ul class="mons-lista">${NOTAS.map(([nota, k]) => `<li><span class="tiras${k ? '' : ' ninguna'}" style="--mon:${m.tono}">${'<i></i>'.repeat(k)}</span><strong>${k} ${k === 1 ? 'mon' : 'mons'}</strong><span>${nota}</span></li>`).join('')}</ul>
<p>Desde el 5° kyu no hay mons: el examen se aprueba o no.</p>
</aside>`;
}

/* ---------- Páginas ---------- */
const paginas = [];

// Portada
{
  const flecha = (d) => `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const gc = glosador();
  const carrusel = `<div class="carrusel" data-carrusel role="region" aria-roledescription="carrusel" aria-label="Cinturones, del blanco al marrón">
<div class="carrusel-pista" id="carrusel-pista" tabindex="0" aria-label="Cinturones. Usá las flechas del teclado para cambiar de grado.">
${GRADOS.map((x, i) => `<article class="diapo" id="cinturon-${x.n}" data-kyu="${x.n}" style="--cinta:var(--c-${x.c})" role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${GRADOS.length}: ${x.n}° kyu, cinturón ${x.nombre}">
<div class="diapo-nudo">${NUDO}</div>
<div class="diapo-texto"><p class="diapo-kyu">${x.n}° kyu</p><h3>Cinturón ${x.nombre}</h3><p>${gc(tipo(x.ps[0]))}</p><p><a href="grados.html#kyu-${x.n}">Ver el examen completo</a></p></div>
</article>`).join('\n')}
</div>
<div class="carrusel-controles">
<button type="button" class="carrusel-flecha" data-paso="-1" aria-controls="carrusel-pista" aria-label="Cinturón anterior">${flecha('M15 5l-7 7 7 7')}</button>
<ol class="carrusel-puntos">${GRADOS.map((x, i) => `<li><button type="button" data-ir="${i}" style="--cinta:var(--c-${x.c})" aria-controls="carrusel-pista" aria-label="${x.n}° kyu, cinturón ${x.nombre}"${i === 0 ? ' aria-current="true"' : ''}></button></li>`).join('')}</ol>
<button type="button" class="carrusel-flecha" data-paso="1" aria-controls="carrusel-pista" aria-label="Cinturón siguiente">${flecha('M9 5l7 7-7 7')}</button>
</div>
</div>`;
  const faq = PREGUNTAS.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('\n');
  paginas.push({
    archivo: 'index.html',
    titulo: 'Jiu Jitsu Japonés Argentina',
    descripcion: 'Jiu Jitsu Japonés en Caballito y Ramos Mejía. Una forma de defensa personal muy efectiva para hombres y mujeres, sin la necesidad de utilizar mucha fuerza.',
    ld: [...ldSedes, ldFaq],
    contenido: leer('pages/inicio.html').replace('<!--KANJI-->', pincel('柔術')).replace('<!--CARRUSEL-->', carrusel)
      .replace('<!--FAQ-->', faq).replaceAll('{{WHATSAPP}}', WHATSAPP).replaceAll('{{WHATSAPP_RAMOS}}', WHATSAPP_RAMOS).replaceAll('{{TJJF}}', TJJF),
  });
}

// La Fundación
{
  const secs = secciones('fundacion', {});
  const ps = secs[0].parrafos;
  const paises = ['Argentina', 'Australia', 'Canadá', 'Dinamarca', 'Escocia', 'España', 'Estados Unidos', 'Gales', 'Inglaterra', 'Islas Vírgenes Británicas', 'Japón', 'Kenia', 'Sudáfrica', 'Nueva Zelanda'];
  const lista = `<ul class="lista-paises">${paises.map((p, i) => `<li${i === 0 ? ' class="aca"' : ''}>${p}</li>`).join('')}</ul>`;
  paginas.push({
    archivo: 'fundacion.html',
    titulo: 'La Fundación | Jiu Jitsu Japonés Argentina',
    descripcion: 'La Fundación Jiu Jitsu Argentina es parte de The Jiu Jitsu Foundation, que enseña el estilo de Jiu Jitsu conocido como Shorinji Kan.',
    contenido: titular({ sol: true, h1: 'Fundación Jiu Jitsu Argentina', bajada: tipo(ps[0]) }) +
      `<div class="articulo"><div class="caja"><div></div><div class="prosa">
<section><p class="entrada">${tipo(ps[1])}</p>${lista}</section>
<section>${parrafos(ps.slice(2))}</section>
${leer('pages/tjjf.html').replaceAll('{{TJJF}}', TJJF)}
<section><p class="tras-lista" style="margin-top:0"><a class="boton" href="index.html#sedes">Ver sedes y horarios</a></p></section>
</div></div></div>`,
  });
}

// Historia
{
  const T3 = 'La Escuela de Shorinji Kan Jiu Jitsu y The Jiu Jitsu Foundation';
  const secs = secciones('historia', { 'Origenes del Jiu Jitsu': 'Orígenes del Jiu Jitsu', 'Evolución del Jiu Jitsu': '', [T3]: '' }, 0);
  const fig = (img, w, h, alt, pie) => `<figure class="figura"><img src="assets/img/${img}" width="${w}" height="${h}" alt="${alt}" loading="lazy"><figcaption>${pie}</figcaption></figure>`;
  const linaje = `<aside class="linaje" style="margin:0 0 2rem" aria-label="Linaje del estilo"><h3>De Tokio a Buenos Aires</h3><ol>
<li><span class="cuando">Fines de la década de 1940, Tokio</span><span class="quien">Riukiu Myura</span><span class="que">Jefe instructor de combate sin armas en la Academia de Policía de Tokio.</span></li>
<li><span class="cuando">Década de 1950, Footscray, Australia</span><span class="quien">Matthew Komp</span><span class="que">Alumno de Myura. Funda una escuela cerca de Melbourne.</span></li>
<li><span class="cuando">1967, Yorkshire, Reino Unido</span><span class="quien">Brian Graham</span><span class="que">Alumno de Komp. Abre su primer club y da forma al Shorinji Kan Jiu Jitsu.</span></li>
<li><span class="cuando">Hasta 1997</span><span class="quien">Peter Farrar</span><span class="que">Uno de los primeros alumnos de Graham. Conduce la expansión inicial de The Jiu Jitsu Foundation.</span></li>
<li><span class="cuando">Hoy</span><span class="quien">Clubes en 14 países</span><span class="que">Entre ellos, los dojos de Caballito y Ramos Mejía.</span></li>
</ol></aside>`;
  paginas.push({
    archivo: 'historia.html',
    titulo: 'Historia | Jiu Jitsu Japonés Argentina',
    descripcion: 'Los orígenes del Jiu Jitsu en el Japón feudal, su evolución y la historia de la escuela Shorinji Kan y The Jiu Jitsu Foundation.',
    contenido: titular({ kanji: '史', h1: 'Historia del Jiu Jitsu', bajada: 'Del campo de batalla de los Samurai al tatami de tu barrio.' }) +
      articulo(secs, {
        'Orígenes del Jiu Jitsu': { despues: fig('samurai-armadura.jpg', 320, 229, 'Samurai con armadura', 'Samurai con armadura.') + fig('jigoro-kano.jpg', 234, 320, 'Retrato de Jigoro Kano', 'Jigoro Kano, fundador del Judo y maestro de Jiu Jitsu.') },
        'Evolución del Jiu Jitsu': { despues: fig('samurai-luchando.jpg', 300, 233, 'Samurai luchando', 'Samurai luchando cuerpo a cuerpo.') },
        [T3]: { antes: linaje },
      }),
  });
}

// Filosofía
{
  const TOG = 'Jiu Jitsu con finalidad no comercial: "On" y "Giri"';
  const secs = secciones('filosofia', {
    'Jiu Jitsu como un sistema de defensa personal': '', '¿Qué son los Artes Marciales?': '¿Qué son las Artes Marciales?',
    'Sistemas de Bugei, Bujutsu y Budo': '', 'Jiu Jitsu como un "Do"': '', [TOG]: '',
  }, 0);
  // On y Giri: la deuda se recibe de quien enseña y se devuelve enseñando a otros, hacia adelante
  const kOn = pincel('恩', 0.1, 'en-espera', 0.6);
  const kGiri = pincel('義理', pincelFin + 0.2, 'en-espera', 0.6);
  const onGiri = `<figure class="on-giri" data-dibujar>
<ol class="og-cadena">
<li class="og-persona"><strong>Tus Sensei</strong><span>Te enseñan dando su tiempo libremente.</span></li>
<li class="og-paso">${kOn}<p><b>On</b><br>La deuda que se genera con quienes te enseñan.</p></li>
<li class="og-persona og-vos"><strong>Vos</strong><span>Practicás y aprendés.</span></li>
<li class="og-paso">${kGiri}<p><b>Giri</b><br>La forma de pagarla: enseñar a otros.</p></li>
<li class="og-persona"><strong>Tus alumnos</strong><span>Con el tiempo, ellos también van a enseñar.</span></li>
</ol>
<figcaption>La deuda no vuelve hacia atrás: pasa hacia adelante, de cada Sensei a sus alumnos.</figcaption>
</figure>`;
  const glosario = `<section id="palabras-del-dojo"><h2>Palabras del dojo</h2><dl class="glosario">${
    GLOSARIO.map(([, t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join('')}</dl></section>`;
  secs.push({ titulo: null, parrafos: [] });
  let html = articulo(secs.slice(0, -1), { [TOG]: { antes: onGiri } }, glosario);
  html = html.replace('</ol></nav>', '<li><a href="#palabras-del-dojo">Palabras del dojo</a></li></ol></nav>');
  paginas.push({
    archivo: 'filosofia.html',
    titulo: 'Filosofía | Jiu Jitsu Japonés Argentina',
    descripcion: 'Jiu Jitsu como sistema de defensa personal y como camino: budo, On y Giri, y el respeto mutuo en el dojo.',
    contenido: titular({ kanji: '武道', h1: 'Filosofía', bajada: 'Una forma muy práctica de defensa personal y también un sistema de superación, que une la mente y el cuerpo.' }) + html,
  });
}

// Grados
{
  const g = glosador();
  const items = GRADOS.map((x) => {
    const [primero, ...resto] = x.ps;
    const mons = MONS[x.n];
    return `<li class="grado" id="kyu-${x.n}" data-kyu="${x.n}">
<div class="grado-cabeza"><div class="grado-num">${x.n}°<small> kyu</small></div><div class="grado-nudo" style="--cinta:var(--c-${x.c})">${NUDO}</div></div>
<div class="grado-cuerpo">
<h2>Cinturón ${x.nombre}</h2>
<p>${g(tipo(primero))}</p>
${chips(x.n)}
${resto.map((p) => p.replace(/^(Al pasar el examen te serán otorgados 0, 1, 2 o 3 "mons").*$/, '$1.')).map((p) => `<p class="nota">${g(tipo(p))}</p>`).join('\n')}
${mons ? `<button type="button" class="mons-boton" aria-expanded="false" aria-controls="mons-${x.n}">Qué significan los mons</button>` : ''}
</div>
${mons ? panelMons(x.n) : ''}
</li>`;
  }).join('\n');
  paginas.push({
    archivo: 'grados.html',
    titulo: 'Grados y cinturones | Jiu Jitsu Japonés Argentina',
    descripcion: 'Los ocho grados Kyu de Shorinji Kan Jiu Jitsu, del cinturón blanco al marrón, y qué se pide en cada examen.',
    contenido: titular({ kanji: '級', h1: 'Grados y cinturones', bajada: g(tipo(GRADOS.intro)) }) +
      `<div class="articulo grados-pagina"><div class="caja"><nav class="indice" aria-label="Grados"><ol>${
        GRADOS.map((x) => `<li><a href="#kyu-${x.n}">${x.n}° kyu, ${x.nombre}</a></li>`).join('')}</ol></nav>
<div class="prosa ancha" style="max-width:none"><ol class="grados" data-kyus>${items}</ol></div></div></div>`,
  });
}

// Contacto
paginas.push({
  archivo: 'contacto.html',
  titulo: 'Contacto | Jiu Jitsu Japonés Argentina',
  descripcion: 'Escribinos para venir a una clase de Jiu Jitsu Japonés en Caballito o Ramos Mejía.',
  contenido: titular({ kanji: '柔術', h1: 'Contacto', bajada: 'Contanos de qué barrio sos y si ya practicaste algún arte marcial. Te decimos a qué clase venir.' }) +
    leer('pages/contacto.html').replaceAll('{{WHATSAPP}}', WHATSAPP).replaceAll('{{WHATSAPP_RAMOS}}', WHATSAPP_RAMOS),
});

/* ---------- Escritura ---------- */
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'calendario'), { recursive: true });
for (const d of ['css', 'js', 'assets']) fs.cpSync(path.join(src, d), path.join(dist, d), { recursive: true });
for (const s of SEDES) fs.writeFileSync(path.join(dist, 'calendario', `${s.id}.ics`), calendario(s));
for (const p of paginas) fs.writeFileSync(path.join(dist, p.archivo), completa(p));
console.log('Listo:', paginas.map((p) => p.archivo).join(', '));
