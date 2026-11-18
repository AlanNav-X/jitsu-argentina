# Jiu Jitsu Japonés Argentina

Sitio web de la Fundación Jiu Jitsu Argentina, el grupo de Shorinji Kan Jiu Jitsu que forma parte de [The Jiu Jitsu Foundation](https://www.jitsufoundation.org/).

**Sitio:** https://alannav-x.github.io/jitsu-argentina/

## Contenido

- **Sedes y horarios:** dojos de Caballito y Ramos Mejía, con sensei, dirección, días de clase y la próxima clase según la hora de Buenos Aires.
- **Cinturones:** carrusel del blanco al marrón en la portada, con flechas, deslizamiento y teclado.
- **Grados:** los ocho grados kyu con los requisitos de cada examen, los conocimientos y defensas que se incorporan, y la explicación de los mon de 7° y 6° kyu.
- **La Fundación, Historia y Filosofía:** el origen del estilo, el linaje de Tokio a Buenos Aires, On y Giri, y un glosario de términos del dojo.
- **Preguntas frecuentes y contacto:** formulario, WhatsApp y redes de cada sede, y las clases en formato de calendario.

## Tecnología

Sitio estático en HTML, CSS y JavaScript, sin dependencias. Un script en Node genera las páginas a partir de los textos y las plantillas de `src/`.

```bash
node build.mjs
```

El resultado queda en `dist/`, listo para cualquier hosting estático. Para publicarlo en otro dominio:

```bash
SITIO=https://ejemplo.com node build.mjs
```

Con `DEMO=1` se agrega `noindex`, para versiones de prueba que no deben aparecer en buscadores.

## Estructura

```
src/
  pages/     portada, contacto y bloques HTML
  content/   textos de Fundación, Historia, Filosofía y Grados
  css/       estilos y tipografías
  js/        menú, próxima clase, grados interactivos y formulario
  assets/    imágenes y fuentes
build.mjs    genera dist/
```

## Edición

| Qué | Dónde |
| --- | --- |
| Horarios de la portada | `src/pages/inicio.html` (`data-dia`, `data-inicio`, `data-fin`, en minutos desde las 00:00) |
| Horarios para Google y el calendario | `SEDES` en `build.mjs` |
| Preguntas frecuentes y glosario | `PREGUNTAS` y `GLOSARIO` en `build.mjs` |
| Textos de las páginas | `src/content/*.txt` |
| Información de los mons | `MONS` en `build.mjs` |
| Kanji de los encabezados | `src/content/trazos.json` (contornos y orden de trazos) |

## Créditos

Textos y fotos: Fundación Jiu Jitsu Argentina, con autorización.
Tipografías: Shippori Mincho B1 y Zen Kaku Gothic New, bajo licencia SIL Open Font License.
Trazos de los kanji: [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data), derivados de las fuentes de Arphic Technology, bajo Arphic Public License (`licencias/ARPHICPL.txt`).
