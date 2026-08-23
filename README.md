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
| **Curso completo** | Tres trimestres con fechas configurables; PE, estratos, sellos y méritos se acumulan por trimestre |
| **Cuentas de alumno** | Registro y acceso con usuario y contraseña vía Appwrite; el diario se sincroniza entre clase y casa |
| **Méritos de Campamento** | Doblones por comportamientos (ayudar, cuidar el material, participar…), concedidos por el docente con PIN y topes diarios |

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

## Cuentas de alumno con Appwrite

Sin configurar nada, la app funciona en **modo local**: cada tablet guarda su propio diario en el navegador. Para que un alumno pueda seguir desde casa lo que empezó en clase, configura Appwrite:

### 1. Crear el proyecto

1. Entra en [cloud.appwrite.io](https://cloud.appwrite.io) (o tu Appwrite autoalojado) y crea un proyecto.
2. En **Settings → Platforms**, añade una plataforma **Web** con el dominio donde sirvas la app (para pruebas, `localhost`). Sin esto el navegador rechazará las peticiones por CORS.
3. Copia el **Project ID** y el **API Endpoint**.

### 2. Crear la base de datos

1. **Databases → Create database** (por ejemplo `atlas`). Copia su ID.
2. Dentro, **Create collection** (por ejemplo `diarios`). Copia su ID.
3. Añade dos atributos:

   | Atributo | Tipo   | Tamaño | Obligatorio |
   |----------|--------|--------|-------------|
   | `state`  | String | 100000 | sí          |
   | `name`   | String | 64     | no          |

   > `state` guarda todo el `user_state` serializado. 100 000 caracteres dan margen de sobra para un curso entero.

4. En **Settings** de la colección, activa **Document security**. Cada diario se crea con permisos solo para su dueño, así que ningún alumno puede leer el de otro.
5. En **Permissions** de la colección, da permiso de **Create** al rol `users`. Es lo que permite a un alumno recién registrado crear su propio diario; leer, escribir y borrar quedan restringidos a su dueño por los permisos del documento.

### 3. Rellenar `js/config.js`

```js
appwrite: {
  endpoint: 'https://cloud.appwrite.io/v1',
  projectId: 'TU_PROJECT_ID',
  databaseId: 'TU_DATABASE_ID',
  collectionId: 'TU_COLLECTION_ID'
},
```

Cambia también `teacherPin`. Y ojo: **el PIN es una barrera de aula, no seguridad real** — el código se ejecuta en el navegador y un alumno curioso puede leerlo. Sirve para que no se concedan méritos por accidente, no para resistir a quien quiera saltárselo.

### Cómo entran los alumnos

Los niños escriben **usuario**, no email (más fácil a los 8–10 años). Internamente se convierte en `usuario@` + `usernameDomain`. Appwrite exige contraseñas de 8 caracteres como mínimo.

> **Si el SDK de Appwrite no carga** (centro sin acceso al CDN, red caída), la app muestra un aviso en pantalla y sigue funcionando en modo local. El aviso existe para que nadie crea que se está guardando en la nube cuando no es así.

## El curso: tres trimestres

Las fechas se editan en `js/config.js`. Cada trimestre acumula sus propias cifras (PE, estratos dominados, sellos y méritos), visibles en el cuaderno del docente. Nada se reinicia al cambiar de trimestre: el mapa, el rango y el museo son del curso entero; los trimestres solo dividen el relato del progreso.

## Méritos de Campamento (puntos por comportamiento)

Dos decisiones de diseño, tomadas del propio PRD:

- **Solo dan Doblones, nunca PE** (§2.2). Si los comportamientos subieran el rango, el rango dejaría de ser un indicador limpio de aprendizaje para ti.
- **Solo suman, nunca restan** (§0.2: «nada se pierde nunca»). No hay botón de quitar puntos: castigar con la economía del juego rompe la seguridad emocional en la que se apoya todo el diseño.

Los comportamientos, sus valores y sus topes diarios se editan en `js/config.js`. Los topes evitan que una sesión generosa desequilibre la economía.

## Estructura

```
index.html            App shell (todas las pantallas)
css/styles.css        Estética pergamino/latón, apta para tablet
js/config.js          Configuración del docente: Appwrite, trimestres, méritos, PIN
js/cloud.js           Cuentas y sincronización con Appwrite (degrada a local)
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
