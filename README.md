# 🧭 Expedición Atlas: Los Diarios Perdidos

Plataforma educativa gamificada de aventura arqueológica para primaria (8–10 años).
PWA sin dependencias: HTML + CSS + JavaScript vanilla, funciona offline y se instala en tablet.

> El diseño completo está en [`docs/PRD.md`](docs/PRD.md). Este repositorio implementa el **MVP (Fase T1)** del roadmap.

## Qué incluye el MVP

| Área | Implementado |
|---|---|
| **Yacimiento** | Ruinas de Kaldros (Matemáticas) con 3 pozos: Numeración, Sumas con llevada y Fracciones |
| **Estratos de Bloom 1–4** | Recordar · Comprender · Aplicar · Analizar, con desbloqueo por mastery ≥80% del estrato superior |
| **Economía doble** | Puntos de Expedición (PE, curva `100 × n^1.55`) + Doblones con fuentes y sumideros del PRD §2.4–2.5 |
| **Anti-grinding** | PE solo por primer acierto · contenido dominado ≥90% da 10% de PE · fatiga narrativa desde la 6ª misión (50% PE) · auditoría silenciosa de respuestas <2 s |
| **Personajes** | Bruno Ocaña (modela el error sin vergüenza), Kira (pistas graduadas: 1 gratis + 1 a 10 🪙), Tobías y Vera Kovak (en los retos de "encontrar el error") |
| **Metacognición** | «Restaurar hallazgo»: corregir el propio error da +5 🪙 (máx. 5/día) |
| **Motor adaptativo** | Precisión móvil de las últimas 10 respuestas; sube/baja la dificultad para mantener el canal de flujo 0.70–0.85 |
| **Repaso espaciado** | Los estratos se «cubren de arena» con los días; el Encargo del Bazar los redescubre (máx. 4/día) |
| **Bitácora semanal** | Sello por semana con ≥3 días activos; los sellos nunca se borran; cuerda de rescate gratuita semanal |
| **Campamento Base** | Avatar con equipo cosmético, decoración del campamento y golosinas para Tobías (nada da ventaja pedagógica) |
| **Dashboard docente** | KPIs de cabecera: tiempo de excavación, zona de flujo, autocorrección, mastery por estrato, señales de alerta |

## Cómo ejecutarlo

Es un sitio estático. Sirve la carpeta raíz con cualquier servidor:

```bash
# opción 1: Python
python3 -m http.server 8080

# opción 2: Node
npx serve .
```

Abre `http://localhost:8080`. Para instalarlo como app en tablet, usa «Añadir a pantalla de inicio» desde el navegador.

> El service worker requiere servirse por HTTP(S); abrir `index.html` con `file://` funciona pero sin modo offline.

## Estructura

```
index.html            App shell (todas las pantallas)
css/styles.css        Estética pergamino/latón, apta para tablet
js/content.js         Generadores procedurales de retos por estrato y tier
js/state.js           Estado user_state (PRD §5), economía y persistencia (localStorage)
js/game.js            Motor de misiones, recompensas y anti-grinding
js/app.js             Interfaz, navegación y arranque
sw.js                 Caché offline (network-first)
manifest.webmanifest  Instalación PWA
docs/PRD.md           Documento de diseño completo
```

## Restricciones éticas (PRD §0.2)

- Sin compras reales ni economía convertible a dinero.
- Todo lo comprable es cosmético; nunca da ventaja pedagógica.
- Sin rankings públicos entre alumnos; la competición es contra NPC.
- Nada se pierde por ausentarse: los sellos jamás se resetean a cero.
- El fracaso siempre es cómico (Bruno cayó antes y peor), nunca humillante.

## Próximas fases (roadmap PRD §7)

- **v1.1** — Cámaras del Guardián (jefes/evaluación sumativa), fragmentos del Atlas, motor adaptativo v1 refinado.
- **v1.5** — Resto de yacimientos (Lengua, Naturales, Sociales), Grandes Excavaciones de clase, Museo personal, Cofre del Naufragio.
- **v2** — Taller de Cartografía (Bloom 5–6), Saqueadores del Cuervo, informes a familias, editor docente.
