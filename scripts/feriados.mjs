// Descarga los feriados nacionales de argentina.gob.ar y genera src/content/feriados.json.
// Uso: node scripts/feriados.mjs [año ...]   (por defecto, el año actual y el siguiente)
//
// Qué cuenta como día sin clase:
//   - feriados inamovibles, trasladables y turísticos: en las dos sedes;
//   - feriados especiales: solo en la jurisdicción que indica el decreto
//     (Ciudad Autónoma de Buenos Aires -> Caballito; Provincia de Buenos Aires -> Ramos Mejía);
//   - los días no laborables NO se cuentan: son optativos y no suspenden la actividad general.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const destino = path.join(raiz, 'src', 'content', 'feriados.json');
const TODAS = ['caballito', 'ramos-mejia'];
const actual = new Date().getFullYear();
const anios = process.argv.slice(2).map(Number).filter(Boolean);
if (!anios.length) anios.push(actual, actual + 1);

function sedesDe(item, tipo) {
  if (['inamovible', 'trasladable', 'turistico'].includes(tipo)) return TODAS;
  if (tipo !== 'especial') return [];
  const texto = item.name.normalize('NFD').replace(/[̀-ͯ]/g, '');
  const sedes = [];
  if (/Ciudad Autonoma de Buenos Aires/i.test(texto)) sedes.push('caballito');
  if (/Provincia de Buenos Aires/i.test(texto)) sedes.push('ramos-mejia');
  return sedes;
}
function nombreDe(item, tipo) {
  if (tipo === 'turistico') return 'Feriado turístico';
  return item.name
    .replace(/\s*\(\d{1,2}\/\d{1,2}\)\s*$/, '')          // "(20/11)": fecha original de un feriado trasladado
    .replace(/\s+feriado en .*$/i, '')                    // jurisdicción de los feriados especiales
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const dias = new Map();
for (const anio of anios) {
  const url = `https://www.argentina.gob.ar/sites/default/files/holidays-${anio}-es.json`;
  const r = await fetch(url);
  if (!r.ok) { console.log(`${anio}: todavía no publicado (${r.status})`); continue; }
  const datos = await r.json();
  let n = 0;
  for (const { item } of datos.mainEntity.itemListElement) {
    const tipo = item.additionalProperty?.value;
    const sedes = sedesDe(item, tipo);
    if (!sedes.length) continue;
    const fecha = item.startDate;
    const previo = dias.get(fecha);
    if (previo) { previo.sedes = [...new Set([...previo.sedes, ...sedes])]; continue; }
    dias.set(fecha, { fecha, nombre: nombreDe(item, tipo), tipo, sedes });
    n++;
  }
  console.log(`${anio}: ${n} días sin clase`);
}
if (!dias.size) { console.error('No se descargó ningún feriado; se deja el archivo como estaba.'); process.exit(1); }
const salida = {
  fuente: 'https://www.argentina.gob.ar/feriados',
  actualizado: new Date().toISOString().slice(0, 10),
  dias: [...dias.values()].sort((a, b) => a.fecha.localeCompare(b.fecha)),
};
fs.writeFileSync(destino, JSON.stringify(salida, null, 1) + '\n');
console.log(`Guardado en ${path.relative(raiz, destino)}`);
