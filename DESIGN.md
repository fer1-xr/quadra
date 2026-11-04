---
name: Quadra
description: Libro mayor sobre papel milimetrado — conciliación y gestión contable con precisión matemática.
colors:
  ink: "#0b1b33"
  ink-2: "#3a4a63"
  ink-3: "#6b7a90"
  navy-950: "#06111f"
  navy-900: "#0a1a2f"
  navy-800: "#10243f"
  paper: "#f3f5f8"
  surface: "#ffffff"
  surface-2: "#f3f6fa"
  line: "#dce5f0"
  line-2: "#e8eef6"
  brand: "#1747d1"
  accent-bg: "#e8eeff"
  mint: "#7ee8c4"
  emerald: "#12b886"
  ok: "#0b8a63"
  ok-bg: "#e6f7f0"
  ok-line: "#bfe9d8"
  err: "#b4372b"
  err-bg: "#fdecea"
  err-line: "#f5c9c3"
  warn: "#9a6a08"
  dark-ink: "#e7edf5"
  dark-paper: "#071425"
  dark-surface: "#0b182b"
  dark-brand: "#7ee8c4"
  dark-ok: "#43d9a6"
  dark-err: "#f08a7e"
typography:
  page-title:
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "34px"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.032em"
  equation:
    fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1
  article-display:
    fontFamily: "'Instrument Serif', Georgia, serif"
    fontSize: "52px"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.015em"
  card-title:
    fontFamily: "Geist, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.012em"
  body:
    fontFamily: "Geist, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  lede:
    fontFamily: "Geist, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist, sans-serif"
    fontSize: "12.5px"
    fontWeight: 550
  table-head:
    fontFamily: "Geist, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.07em"
  figure:
    fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.03em"
    fontFeature: "'tnum'"
  data:
    fontFamily: "'Geist Mono', ui-monospace, monospace"
    fontSize: "13.5px"
    fontWeight: 400
    fontFeature: "'tnum'"
rounded:
  control: "10px"
  tab: "9px"
  card: "14px"
  hero: "18px"
  pill: "999px"
spacing:
  grid-minor: "8px"
  grid-major: "40px"
  stack: "20px"
  card-pad: "28px"
  page-x: "40px"
  page-y: "32px"
components:
  button-primary:
    backgroundColor: "{colors.navy-900}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    height: "42px"
    padding: "0 18px"
  button-primary-hover:
    backgroundColor: "{colors.brand}"
  button-line:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "42px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "42px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "28px 30px"
  figures-strip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.figure}"
    rounded: "{rounded.card}"
  tab-active:
    backgroundColor: "{colors.navy-900}"
    textColor: "{colors.surface}"
    rounded: "{rounded.tab}"
    height: "36px"
  tag-status:
    textColor: "{colors.warn}"
    rounded: "{rounded.pill}"
    height: "26px"
---

# Design System — Quadra

## Overview

**Libro mayor sobre papel milimetrado.** Quadra es una herramienta de trabajo diario para contadores: conciliación RG90, control de pagos, liquidaciones y cartera de clientes. La interfaz debe sentirse como un instrumento de precisión — matemático, financiero, caro — y nunca como un tablero decorativo.

Tres ideas sostienen todo el sistema:

1. **Papel técnico.** El fondo es un papel frío (`paper`) con cuadrícula fina de 8 px y líneas mayores cada 40 px que se desvanecen hacia abajo. Las hojas de trabajo se apoyan sobre él como fichas blancas.
2. **Cada hoja tiene su ecuación.** El encabezado de cada módulo muestra la ecuación que lo gobierna, tipografiada como notación matemática (variables en itálica serif, operadores en romana): *Σ Libro − Σ RG90 = 0*, *Saldoₙ = Saldoₙ₋₁ − Pagoₙ*, *Neto = Haberes − Deducciones*. Es el sello del producto; no se usa como adorno fuera del encabezado.
3. **Las cifras mandan.** Todo número va en Geist Mono con numerales tabulares, alineado a la derecha en tablas. Los totales cierran con doble raya contable.

Modo: **Operate** en las hojas de trabajo (escaneo rápido, consistencia, densidad); **Read** en Lección del Día (medida de lectura, jerarquía editorial). Existe modo claro y oscuro; el oscuro cambia el papel a navy profundo y el acento a menta.

## Colors

Paleta **restringida**: navy como tinta y acción, un azul de marca para foco y selección, y semánticos de estado. El color nunca decora.

- **Tinta** — `ink` para títulos y cifras, `ink-2` para texto de apoyo y etiquetas, `ink-3` para metadatos, encabezados de tabla y operadores de ecuaciones.
- **Papel y superficies** — `paper` es el fondo de la app; `surface` (blanco) para tarjetas, franjas de cifras y tablas; `surface-2` para zonas de carga y hover de filas.
- **Filetes** — `line` para bordes de tarjeta y controles, `line-2` para separadores internos y filas de tabla, y un filete más oscuro (`rgba(11,27,51,0.16)`, variable `--q-rule`) para reglas estructurales: la regla graduada del encabezado, el borde inferior de los encabezados de tabla y la doble raya de totales.
- **Acción** — `navy-900` en botones primarios y pestaña activa; hover pasa a `brand`. `brand` también es el anillo de foco y el color de constantes numéricas dentro de ecuaciones.
- **Estados** — `ok` / `err` / `warn` con sus fondos `*-bg` y filetes `*-line`. Una cifra se pinta de `ok` solo cuando es mayor que cero; un cero nunca es verde.
- **Oscuro** — `dark-paper` con un leve resplandor esmeralda; superficies `rgba(11,24,43,0.85)`; acción y marca en `mint` con texto `navy-950`.

Los tokens viven en `frontend/src/styles/Dashboard.css` (`.q-app`) y `QuadraLedger.css` (`--q-paper`, `--q-rule`, radios).

## Typography

- **Geist** (sans) lleva toda la interfaz: títulos de hoja (34/600, tracking −0.032em), títulos de tarjeta (15/600), cuerpo (14), descripción (15, máx. 62ch), etiquetas de campo (12.5/550, sin mayúsculas).
- **Instrument Serif** solo en dos lugares: las **ecuaciones** del encabezado (30 px; variables en itálica, operadores en romana y `ink-3`, subíndices al 50%) y la **tipografía editorial** de Lección del Día (título 52 px, h2 32 px).
- **Geist Mono** con `tabular-nums` para cifras: franja de cifras (26/500), importes y RUC en tablas, campos numéricos, fecha y hora. Nunca para texto corrido ni como disfraz "técnico".
- Encabezados de tabla: 11 px, 600, mayúsculas con tracking 0.07em, `ink-3`.
- Escala de producto ajustada (pasos ~1.15–1.2); sin tamaños fluidos.

## Layout

- **Shell**: barra lateral fija + columna principal con barra superior pegajosa (fecha y ruta `Grupo / Hoja`, cuota, salir). Bajo 960 px la barra lateral pasa a cajón.
- **Hoja** (`.q-sheet` y los contenedores de módulo): columna flex con `gap` de 20 px, ancho máximo 1120 px (1320 px para resultados de RG90). Padding de página 32/40 px en escritorio, 18/16 px en móvil.
- **Encabezado de hoja** (`PageHead`): rejilla título+descripción a la izquierda, ecuación alineada a la derecha y abajo; debajo, la **regla graduada** (filete con marcas cada 8 px y marcas mayores cada 40 px). En ≤960 px la ecuación pasa debajo del título, alineada a la izquierda.
- **Franja de cifras** (`Figures`) inmediatamente después del encabezado cuando el módulo tiene totales: columnas `auto-fit minmax(170px, 1fr)` separadas por filetes; 2 columnas en móvil.
- **Formularios**: rejillas `auto-fill minmax(240px, 1fr)`; las secciones se separan con un filete superior, nunca con tarjetas anidadas.

## Elevation & Depth

Casi plano. La profundidad viene de filetes y del contraste papel/superficie, no de sombras.

- `--q-shadow`: `0 1px 2px rgba(10,26,47,.04), 0 14px 34px -18px rgba(10,26,47,.22)` — tarjetas, franja de cifras, tablas.
- `--q-shadow-lift`: para hover de tarjetas navegables (módulos del inicio, tarjetas de metas).
- La barra superior usa el color del papel al 86% con desenfoque; es la única transparencia funcional.
- Nada de halos de color sin desplazamiento ni sombras duras.

## Shapes

- Controles (inputs, selects, botones): 10 px. Pestañas: 9 px dentro de un contenedor de 12 px.
- Tarjetas, franjas de cifras, zonas de carga, tablas: 14 px.
- Hero del inicio: 18 px.
- Etiquetas de estado e insignias: píldora.
- Bordes de 1 px siempre. Las zonas de carga usan borde discontinuo que pasa a sólido `brand` al hover/arrastre y a `ok-line` cuando tienen archivo.
- La **doble raya** (`3px double --q-rule`) cierra la última fila de las tablas de libro y el total de la conciliación bancaria.

## Components

- **PageHead** (`components/PageHead.jsx`) — título, descripción, ecuación (`equation`: lista de `{ v }` variable, `{ op }` operador, `{ n }` número, con `sub` opcional), `caption` bajo la ecuación y `status` de guardado. Toda hoja nueva empieza con él.
- **Figures** — franja de cifras: etiqueta 12.5 px `ink-3` arriba, valor mono 26 px; tono `ok`/`err` opcional; sufijos (`/ 3`, `Gs.`) en `<small>` al 55%.
- **Estado de guardado** (`.q-sync`) — punto + texto bajo la descripción: *Guardado en la nube* (`ok`), *Guardando…* (pulso), *Guardado solo en este equipo* (`warn`), *No se pudo guardar en la nube* (`err`).
- **Botones** — alto 42 px, un único vocabulario: primario navy, línea (blanco con filete), éxito/peligro solo para acciones destructivas o confirmaciones. Íconos Lucide a 16 px, trazo 1.8, separados 8 px del texto. Sin glifos `+`, `✓`, `✕` como íconos.
- **Pestañas segmentadas** — contenedor blanco con filete y 3 px de padding; activa en navy.
- **Tablas de libro** — encabezado sin fondo con filete `--q-rule`; filas de 44 px con filete `line-2`; cifras mono a la derecha; hover `surface-2`; última fila con doble raya. Las filas con discrepancia llevan fondo `err-bg` suave; las filas de clientes se mantienen neutras y el estado lo dicen las insignias.
- **Insignias de estado** — círculos con ícono Check / X sobre `ok-bg` / `err-bg`.
- **Zonas de carga** — cuadrícula de 16 px sobre `surface-2`, ícono en tesela blanca de 48 px.
- **Etiqueta de estado** (`.q-tag`) — píldora con punto, p. ej. "En desarrollo".
- **Lección del Día** — imagen con velo navy en degradado, título serif blanco; metadatos separados por filetes verticales; listas con filetes y guion esmeralda; pie con resumen y acciones en fila.

## Do's and Don'ts

**Do**
- Abrir cada hoja con `PageHead` y una ecuación verdadera del módulo.
- Escribir toda cifra en Geist Mono tabular y alinearla a la derecha.
- Separar secciones con filetes; reservar la tarjeta para la superficie de trabajo.
- Usar `ok` solo para valores positivos reales; los ceros quedan en `ink`.
- Mantener la animación en un asentamiento de 320 ms (solo `transform`, desde un estado visible) y respetar `prefers-reduced-motion`.
- Tematizar las superficies del navegador: selección, cursor de texto, barra de desplazamiento, anillos de foco.

**Don't**
- No usar etiquetas o "eyebrows" sobre los títulos, ni numerar secciones.
- No anidar tarjetas dentro de tarjetas.
- No usar bordes laterales de color de más de 1 px en tarjetas, filas o alertas.
- No pintar filas enteras de rojo para comunicar un estado que ya muestran las insignias.
- No usar texto con degradado, vidrio decorativo ni sombras duras.
- No reintroducir fotos de fondo difusas: el fondo es el papel milimetrado.
- No usar la serif en etiquetas, botones o datos.
