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

const WHATSAPP = 'https://wa.me/541130594142';
const LOGIN = 'https://jitsuargentina.com.ar/login';
const MENU = [
  ['index.html', 'Sedes y horarios'], ['fundacion.html', 'La Fundación'], ['historia.html', 'Historia'],
  ['filosofia.html', 'Filosofía'], ['grados.html', 'Grados'], ['contacto.html', 'Contacto'],
];

function cabeza({ titulo, descripcion }) {
  return `<title>${titulo}</title>
<meta name="description" content="${descripcion}">
<meta name="theme-color" content="#1A2342">
<meta property="og:site_name" content="Jiu Jitsu Japonés Argentina">
<meta property="og:title" content="${titulo}">
<meta property="og:description" content="${descripcion}">
<meta property="og:locale" content="es_AR">
<link rel="icon" href="assets/img/sol.svg" type="image/svg+xml">
<link rel="stylesheet" href="css/fonts.css">
<link rel="stylesheet" href="css/site.css">`;
}

function cuerpo({ archivo, contenido }) {
  const nav = MENU.map(([href, txt]) =>
    `<li><a href="${href}"${href === archivo ? ' aria-current="page"' : ''}>${txt}</a></li>`).join('');
  return `<div class="obi" aria-hidden="true"></div>
<div class="obi-grado" aria-hidden="true">8° kyu, blanco</div>
<header class="cabecera">
  <div class="caja">
    <a class="marca" href="index.html"><img src="assets/img/sol.svg" alt="" width="40" height="40">Jiu Jitsu Japonés<br>Argentina</a>
    <button class="menu-boton" type="button" aria-expanded="false" aria-controls="nav">Menú</button>
    <nav class="nav" id="nav" aria-label="Principal"><ul>${nav}</ul></nav>
  </div>
</header>
<main>
${contenido}
</main>
<footer class="pie">
  <div class="caja">
    <div>
      <h2>Fundación Jiu Jitsu Argentina</h2>
      <p>Parte de The Jiu Jitsu Foundation. Enseñamos Shorinji Kan Jiu Jitsu en Caballito y Ramos Mejía.</p>
    </div>
    <div>
      <h2>Caballito</h2>
      <ul>
        <li>General Manuel A. Rodríguez 1191</li>
        <li><a href="${WHATSAPP}">WhatsApp +54 11 3059-4142</a></li>
        <li><a href="https://www.instagram.com/caballitojiujitsuclub/">Instagram</a></li>
      </ul>
    </div>
    <div>
      <h2>Ramos Mejía</h2>
      <ul>
        <li>Gabriel Ardoino 430</li>
        <li><a href="https://www.instagram.com/haedojiujitsuclub/">Instagram</a></li>
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
  for (const l of lineas.slice(saltar)) {            // la primera línea es el título de la página
    if (titulos[l] !== undefined) { act = { titulo: titulos[l] || l, parrafos: [] }; res.push(act); }
    else { if (!act) { act = { titulo: null, parrafos: [] }; res.push(act); } act.parrafos.push(l); }
  }
  return res;
}
const parrafos = (ps) => ps.map((p) => `<p>${tipo(p)}</p>`).join('\n');

function titular({ kanji, sol, h1, bajada }) {
  const marca = sol ? `<img class="kanji-sol" src="assets/img/sol.svg" alt="" width="120" height="117">`
    : `<span class="kanji" lang="ja" aria-hidden="true">${kanji}</span>`;
  return `<div class="titular"><div class="caja">${marca}<div><h1>${h1}</h1>${bajada ? `<p>${bajada}</p>` : ''}</div></div></div>`;
}
function articulo(secs, extras = {}) {
  const conTitulo = secs.filter((s) => s.titulo);
  const indice = conTitulo.length > 1 ? `<nav class="indice" aria-label="En esta página"><h2>En esta página</h2><ol>${
    conTitulo.map((s) => `<li><a href="#${slug(s.titulo)}">${tipo(s.titulo)}</a></li>`).join('')}</ol></nav>` : '<div></div>';
  const cuerpo = secs.map((s) => `<section${s.titulo ? ` id="${slug(s.titulo)}"` : ''}>
${s.titulo ? `<h2>${tipo(s.titulo)}</h2>` : ''}
${(extras[s.titulo]?.antes) || ''}
${parrafos(s.parrafos)}
${(extras[s.titulo]?.despues) || ''}
</section>`).join('\n');
  return `<div class="articulo"><div class="caja">${indice}<div class="prosa">${cuerpo}</div></div></div>`;
}

/* ---------- Páginas ---------- */
const paginas = [];

// Portada
paginas.push({
  archivo: 'index.html',
  titulo: 'Jiu Jitsu Japonés Argentina',
  descripcion: 'Jiu Jitsu Japonés en Caballito y Ramos Mejía. Una forma de defensa personal muy efectiva para hombres y mujeres, sin la necesidad de utilizar mucha fuerza.',
  contenido: leer('pages/inicio.html'),
});

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
<section>${parrafos(ps.slice(2))}
<p class="tras-lista"><a class="boton" href="index.html#sedes">Ver sedes y horarios</a></p></section>
</div></div></div>`,
  });
}

// Historia
{
  const T3 = 'La Escuela de Shorinji Kan Jiu Jitsu y The Jiu Jitsu Foundation';
  const secs = secciones('historia', { 'Origenes del Jiu Jitsu': 'Orígenes del Jiu Jitsu', 'Evolución del Jiu Jitsu': '', [T3]: '' }, 0);
  const fig = (img, w, h, alt, pie) => `<figure class="figura"><img src="assets/img/${img}" width="${w}" height="${h}" alt="${alt}" loading="lazy"><figcaption>${pie}</figcaption></figure>`;
  const linaje = `<aside class="linaje" aria-label="Linaje del estilo"><h3>De Tokio a Buenos Aires</h3><ol>
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
    contenido: titular({ kanji: '歴史', h1: 'Historia del Jiu Jitsu', bajada: 'Del campo de batalla de los Samurai al tatami de tu barrio.' }) +
      articulo(secs, {
        'Orígenes del Jiu Jitsu': { despues: fig('samurai-armadura.jpg', 320, 229, 'Samurai con armadura', 'Samurai con armadura.') + fig('jigoro-kano.jpg', 234, 320, 'Retrato de Jigoro Kano', 'Jigoro Kano, fundador del Judo y maestro de Jiu Jitsu.') },
        'Evolución del Jiu Jitsu': { despues: fig('samurai-luchando.jpg', 300, 233, 'Samurai luchando', 'Samurai luchando cuerpo a cuerpo.') },
        [T3]: { antes: linaje.replace('<aside class="linaje"', '<aside class="linaje" style="margin:0 0 2rem"') },
      }),
  });
}

// Filosofía
{
  const secs = secciones('filosofia', {
    'Jiu Jitsu como un sistema de defensa personal': '', '¿Qué son los Artes Marciales?': '¿Qué son las Artes Marciales?',
    'Sistemas de Bugei, Bujutsu y Budo': '', 'Jiu Jitsu como un "Do" (Camino)': '', 'Jiu Jitsu con finalidad no comercial: "On" y "Giri"': '',
  }, 0);
  paginas.push({
    archivo: 'filosofia.html',
    titulo: 'Filosofía | Jiu Jitsu Japonés Argentina',
    descripcion: 'Jiu Jitsu como sistema de defensa personal y como camino: budo, On y Giri, y el respeto mutuo en el dojo.',
    contenido: titular({ kanji: '武道', h1: 'Filosofía', bajada: 'Una forma muy práctica de defensa personal y también un sistema de superación, que une la mente y el cuerpo.' }) + articulo(secs),
  });
}

// Grados
{
  const lineas = leer('content/grados.txt').split('\n').map((l) => l.trim()).filter(Boolean);
  const intro = lineas[1];
  const color = { Blanco: 'blanco', Amarillo: 'amarillo', Anaranjado: 'naranja', Verde: 'verde', Violeta: 'violeta', Celeste: 'celeste', Azul: 'azul', 'Marrón': 'marron' };
  const oscuros = ['verde', 'violeta', 'azul', 'marron'];
  const mons = { amarillo: '#C8301E', naranja: '#21932E' };
  const grados = []; let g = null;
  for (const l of lineas.slice(2)) {
    const m = l.match(/^(\d)° Kyu - Cinturón (.+)$/);
    if (m) { g = { n: m[1], nombre: m[2], c: color[m[2]], ps: [] }; grados.push(g); } else g.ps.push(l);
  }
  const items = grados.map((x) => {
    const [primero, ...resto] = x.ps;
    const tiras = mons[x.c] ? `<span class="mons" style="--mon:${mons[x.c]}" role="img" aria-label="Tres mons">${'<i></i>'.repeat(3)}</span>` : '';
    return `<li class="grado" id="kyu-${x.n}">
<div class="grado-num">${x.n}°<small> kyu</small></div>
<div><div class="cinta" style="--cinta:var(--c-${x.c})">${tiras}</div>
<h2>Cinturón ${x.nombre.toLowerCase()}</h2>
<p>${tipo(primero)}</p>
${resto.map((p) => `<p class="nota">${tipo(p)}</p>`).join('\n')}</div></li>`;
  }).join('\n');
  paginas.push({
    archivo: 'grados.html',
    titulo: 'Grados y cinturones | Jiu Jitsu Japonés Argentina',
    descripcion: 'Los ocho grados Kyu de Shorinji Kan Jiu Jitsu, del cinturón blanco al marrón, y qué se pide en cada examen.',
    contenido: titular({ kanji: '帯', h1: 'Grados y cinturones', bajada: tipo(intro) }) +
      `<div class="articulo"><div class="caja"><nav class="indice" aria-label="Grados"><h2>Los ocho grados</h2><ol>${
        grados.map((x) => `<li><a href="#kyu-${x.n}">${x.n}° kyu, ${x.nombre.toLowerCase()}</a></li>`).join('')}</ol></nav>
<div class="prosa ancha"><ol class="grados">${items}</ol></div></div></div>`,
  });
}

// Contacto
paginas.push({
  archivo: 'contacto.html',
  titulo: 'Contacto | Jiu Jitsu Japonés Argentina',
  descripcion: 'Escribinos para venir a una clase de Jiu Jitsu Japonés en Caballito o Ramos Mejía.',
  contenido: titular({ kanji: '柔術', h1: 'Contacto', bajada: 'Contanos de qué barrio sos y si ya practicaste algún arte marcial. Te decimos a qué clase venir.' }) + leer('pages/contacto.html'),
});

/* ---------- Escritura ---------- */
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
for (const d of ['css', 'js', 'assets']) fs.cpSync(path.join(src, d), path.join(dist, d), { recursive: true });
for (const p of paginas) fs.writeFileSync(path.join(dist, p.archivo), completa(p));
console.log('Listo:', paginas.map((p) => p.archivo).join(', '));
