# 🧭 Expedición Atlas: Los Diarios Perdidos

Plataforma educativa gamificada de aventura arqueológica para **toda la primaria: 1.º a 6.º (6 a 12 años)**.
PWA sin dependencias: HTML + CSS + JavaScript vanilla, funciona offline y se instala en tablet.

> El diseño completo está en [`docs/PRD.md`](docs/PRD.md). Este repositorio implementa el **MVP (Fase T1)** del roadmap.

## Qué incluye el MVP

| Área | Implementado |
|---|---|
| **Yacimientos** | Ruinas de Kaldros (Matemáticas, 5 pozos: Sendero, Numeración, Sumas con llevada, Fracciones y Decimales) y Biblioteca de Arena (Lengua, 3 pozos: vocabulario, ortografía y comprensión lectora) |
| **Cámara del Guardián** | Evaluación sumativa por pozo: se abre con los cuatro estratos dominados, encadena 10 retos de todos ellos y entrega un fragmento del Atlas. Fallar no cuesta nada y el Guardián señala en qué estrato se falló |
| **Fondo de la Sociedad** | Sumidero cooperativo e infinito de Doblones, con hitos de clase, para cuando el almacén se agota |
| **Estratos de Bloom 1–4** | Recordar · Comprender · Aplicar · Analizar, con desbloqueo por mastery ≥80% del estrato superior |
| **Economía doble** | Puntos de Expedición (PE, curva `100 × n^1.55`) + Doblones con fuentes y sumideros del PRD §2.4–2.5 |
| **Anti-grinding** | PE solo por primer acierto · contenido dominado ≥90% da 10% de PE · fatiga narrativa tras 25 min de excavación diaria (50% PE) · auditoría silenciosa de respuestas <2 s |
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
| **Panel de Configuración** | El docente edita en la propia app el curso, los reconocimientos, las cuadrillas, los pozos, el almacén, la economía y el acceso — sin tocar código |
| **Cuadrillas de excavación** | Equipos cooperativos que suman a una meta común de clase; sin ranking entre niños salvo que se active |
| **Portada** | Primera pantalla: la historia contada para el alumnado, cómo se juega, el elenco, y las dos entradas (explorador / docente) |
| **Vista general de la clase** | Todos los alumnos en una pantalla, con alerta de rescate, KPIs del PRD §6 y el total real de cada cuadrilla |

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

## Toda la primaria: 1.º a 6.º

Cada alumno tiene su **curso** (se elige al crear el diario y el docente puede fijarlo en la lista de clase). El curso decide tres cosas:

| | 1.º y 2.º (6–8) | 3.º y 4.º (8–10) | 5.º y 6.º (10–12) |
|---|---|---|---|
| **Números** | hasta 100 / 1000 | hasta 10 000 | hasta 1 000 000 |
| **Pozos** | El Sendero de las Huellas, Bóveda, Reloj | + La Balanza (fracciones) | + La Cámara Decimal |
| **Contenido propio** | contar, series, par/impar, restar | llevadas, valor posicional, fracciones | decimales, porcentajes, comparar fracciones |
| **Enunciados** | una línea, al grano | narrativos | narrativos |
| **Letra** | grande de fábrica | normal | normal |

Tres decisiones que conviene conocer:

- **En 1.º y 2.º los enunciados van al grano.** «5 + 8 = ?» en vez de «El reloj de engranajes pide el resultado de 5 + 8 para girar». Un enunciado largo a los 6 años mide la lectura, no las matemáticas.
- **La letra grande viene puesta en 1.º y 2.º**, y se puede quitar desde el Campamento. Mientras nadie la toque, manda el curso.
- **Los distractores se escalan a la respuesta.** Con desplazamientos fijos, un alumno de 1.º con respuesta 14 veía opciones como 114 o números negativos: absurdos que además delatan cuál es la correcta.

Los pozos que crees tú declaran a qué cursos sirven (casillas en el editor). Si no marcas ninguno en concreto, sirven a todos.

## La portada

Es lo primero que ve cualquiera al abrir la app, y separa los dos caminos:

- **🎒 Soy explorador** → lleva al acceso con cuenta (o a crear el diario, en modo local) y de ahí al juego.
- **🧭 Soy docente** → pide el PIN y entra a la **Sala de mapas**: vista general de la clase y panel de configuración, **sin necesidad de la sesión de ningún alumno**. En ese modo se ocultan el HUD y las pestañas del juego, que ahí no pintan nada.

Además explica la plataforma a sus dos públicos a la vez:

- **Para el alumnado:** la premisa (el Atlas de Ossian roto en fragmentos), la regla de oro (*el mapa solo se dibuja con lo que aprendes de verdad*), cómo se excava en cinco pasos, y el elenco — con Bruno dejando claro desde el principio que equivocarse forma parte de excavar.
- **Para familias y profesorado:** qué es, el criterio pedagógico (estratos de Bloom, 80 % de dominio), la adaptación a cada niño, y las garantías: nada se pierde, sin compras reales, sin rankings entre niños, sin datos personales.

Los yacimientos que aparecen salen de la configuración real: si creas uno de Lengua, se muestra en la portada sin tocar nada.

## Cuentas de alumno con Appwrite

Sin configurar nada, la app funciona en **modo local**: cada tablet guarda su propio diario en el navegador. Para que un alumno pueda seguir desde casa lo que empezó en clase, configura Appwrite:

### 1. Crear el proyecto

1. Entra en [cloud.appwrite.io](https://cloud.appwrite.io) (o tu Appwrite autoalojado) y crea un proyecto.
2. En **Settings → Platforms**, añade una plataforma **Web** con el dominio donde sirvas la app (para pruebas, `localhost`). Sin esto el navegador rechazará las peticiones por CORS.
3. Copia el **Project ID** y el **API Endpoint**.

### 2. Crear la base de datos

1. **Databases → Create database** (por ejemplo `atlas`). Copia su ID.
2. Dentro, **Create collection** (por ejemplo `diarios`). Copia su ID.
3. Añade tres atributos:

   | Atributo  | Tipo   | Tamaño | Obligatorio |
   |-----------|--------|--------|-------------|
   | `state`   | String | 100000 | sí          |
   | `name`    | String | 64     | no          |
   | `summary` | String | 2000   | no          |

   > `state` guarda todo el `user_state` serializado. 100 000 caracteres dan margen de sobra para un curso entero.
   >
   > `summary` es un resumen de menos de 1 KB (medido: 367 B frente a 17,5 KB del diario) que
   > la app recalcula en cada guardado. **La vista de clase lee solo este campo**: en un centro
   > con 300 diarios eso son ~110 KB por consulta en vez de ~5 MB. Si no creas el atributo, la
   > app lo detecta y vuelve a pedir los diarios enteros: funciona igual, solo pesa más.

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

## Panel de Configuración

**Cuaderno del Docente → ⚙️ Configurar la expedición** (pide el PIN). Ocho secciones:

| Sección | Qué puedes cambiar |
|---|---|
| 📅 Curso y trimestres | Nombre del curso y las fechas de los tres trimestres |
| 🏅 Comportamientos, tareas y actividades | Crear, editar y retirar reconocimientos: icono, nombre, Doblones, tope diario y categoría |
| 👥 Alumnado | Tu nombre y el de la clase, la lista de alumnos, y **crear sus cuentas de golpe** |
| 🛖 Cuadrillas de excavación | Crear equipos, **asignar alumnos marcando casillas**, fijar la meta común y la aportación |
| 🏛️ Yacimientos y pozos | **Crear yacimientos y pozos nuevos y escribir los retos de cada estrato**, además de renombrar y ocultar |
| 🏪 Almacén | Añadir, retirar y reajustar precios de los artículos cosméticos |
| ⚖️ Economía | Retos por misión, Doblones de cada fuente, topes diarios, minutos hasta la fatiga, bolsa inicial… |
| 🔐 Acceso y nube | PIN del panel y datos de Appwrite |
| 💾 Copia de seguridad | Exportar los ajustes para llevarlos a otra tablet, importarlos y restaurar los de fábrica |

Los cambios se aplican **al instante**: renombras un pozo y el mapa ya lo muestra así.

> Los diálogos de PIN y de confirmación son propios de la app, no del navegador: dentro de un iframe con `sandbox` sin `allow-modals` (como el visor de Artifacts) `prompt()` devuelve `null` y `confirm()` devuelve `false`, así que el panel no llegaba a abrirse y los borrados se cancelaban solos.

Tres cosas que conviene saber:

- **Los ajustes viven en la tablet donde los haces.** Para replicarlos, usa Copia de seguridad → copiar, y pégalo en las demás. No se sincronizan solos: hacerlo exigiría permisos de escritura compartidos que, sin una cuenta de docente real, cualquier alumno podría usar.
- **Retirar algo del catálogo no borra lo ya ganado.** Si quitas un reconocimiento, los méritos que ya concediste siguen en el diario de los niños. Igual con el almacén: quien compró una prenda la conserva.
- **Restaurar los valores de fábrica solo borra tus ajustes**, nunca el progreso de los alumnos.

## Dar de alta a tu clase

**Configuración → 👥 Alumnado.** Ahí pones **tu nombre** y el de la clase (aparecen en la portada y en la sala de mapas), y montas la lista de alumnos.

Para cargarla entera, pega los nombres —uno por línea— y se generan solos el usuario y la contraseña de cada uno:

- **Usuario:** el nombre sin tildes ni espacios, en minúsculas, garantizando que no se repita.
- **Contraseña:** una palabra del mundo del juego más cuatro cifras (`brujula4271`). Cumple el mínimo de 8 caracteres de Appwrite y un niño de 8 años puede teclearla. Puedes cambiar ambas cosas a mano.

Con Appwrite configurado aparece **🎒 Crear cuentas**: da de alta en Appwrite las que aún no existan, **sin tocar tu sesión**. El registro te dice qué pasó con cada alumno; si Appwrite pide bajar el ritmo, se detiene ahí y te lo explica en castellano en lugar de seguir martilleando el servidor. Al terminar tienes una **hoja de credenciales** lista para repartir: cada niño solo necesita su línea.

Dos detalles:

- **El diario lo crea el alumno al entrar por primera vez.** Crear la cuenta no crea su progreso; eso nace con su primera expedición.
- **Quitar a alguien de la lista no borra su cuenta ni su diario.** Sale de tu lista y de las cuadrillas, pero puede seguir entrando. La app te lo recuerda antes de hacerlo.

### Cuadrillas sin erratas

Cuando hay lista de clase, los miembros de cada cuadrilla se marcan con **casillas** en lugar de escribirse a mano. Así el nombre siempre coincide exactamente con el del alumno, y desaparece el problema de asignar a alguien que no existe por una errata. A quien ya está en una cuadrilla se le deshabilita la casilla en las demás.

## Vista general de la clase

**Cuaderno del Docente → 👥 Vista general de la clase** (pide el PIN). Reúne los diarios de todos y muestra:

- **Los cinco KPIs de cabecera del PRD §6:** exploradores activos, minutos de excavación por sesión (atención de calidad), estratos por alumno (velocidad), % en zona de flujo y cuántos necesitan rescate.
- **Alerta de rescate:** alumnos que acumulan **tres o más señales a la vez** — caída de sesiones, tasa de error alta, estrato atascado más de 7 días, fuera del canal de flujo, o respuestas sistemáticas por debajo de 2 segundos. Se nombran arriba y su ficha se destaca.
- **Ficha por alumno:** dominio medio, estratos superados, minutos, días activos, precisión, autocorrecciones, méritos, en qué estrato está atascado y cuándo fue su última expedición.
- **Cuadrillas con su total real**, sumando lo aportado por cada miembro.

Dos decisiones deliberadas:

- **Ordena por defecto por «quien más te necesita»**, no por quien va ganando. El cuaderno sirve para detectar, no para clasificar. Tienes orden alfabético y por progreso si los prefieres.
- **Va detrás del PIN y solo la ve el docente.** El PRD §0.2 prohíbe rankings públicos con nombres de niños; esta vista existe justo para lo contrario: que tú veas lo que los niños no deben verse entre ellos.

### Permiso necesario en Appwrite

Por defecto cada alumno solo puede leer su propio diario — que es lo correcto. Para que tú puedas leerlos todos:

1. En la consola de Appwrite crea un **equipo** (por ejemplo `docentes`) y añade tu cuenta.
2. En la colección de diarios → **Permissions**, da **Read** al rol de ese equipo.
3. Cierra sesión en la app y vuelve a entrar.

Los alumnos siguen sin poder leerse entre ellos: el permiso es solo para el equipo docente. Si falta, la vista te lo explica con estos pasos en vez de fallar en seco.

> **Sin Appwrite configurado** la vista solo puede mostrar el diario de esa tablet, y lo dice con claridad. No hay forma de reunir los diarios de otros dispositivos sin un servidor de por medio.

## Crear tus propios yacimientos y retos

La sección **🏛️ Yacimientos y pozos** del panel edita toda la estructura del contenido:

1. **Yacimientos** — crea los que faltan del PRD (Valle Fósil para Naturales, Puerto de las Mil Banderas para Sociales) con su nombre, materia, icono y ambientación. Matemáticas y Lengua ya vienen de fábrica.
2. **Pozos** — cada yacimiento tiene los pozos que quieras (una rama de contenido cada uno).
3. **Retos por estrato** — dentro de un pozo tuyo, una pestaña por cada nivel de Bloom. Escribes la pregunta, cuatro respuestas, cuál es la correcta, la explicación que lee quien falla y las dos pistas de Kira.

Para cargar muchos de golpe, el **alta masiva** acepta una línea por reto:

```
pregunta | correcta | otra | otra | otra | explicación
```

La primera respuesta es la correcta; al alumno se le barajan, así que nunca aprende a pulsar siempre en el mismo sitio. Las líneas mal formadas se descartan **diciéndote cuáles**, en vez de tragárselas.

Tres comportamientos que conviene conocer:

- **Los tres pozos de fábrica generan retos infinitos por sí solos** (números, sumas con llevada, fracciones): puedes renombrarlos y ocultarlos, pero sus retos no se editan porque no existen escritos en ninguna parte — se calculan en cada partida y se adaptan a la dificultad del niño.
- **Un estrato sin retos se le explica al alumno** («todavía no tiene retos preparados»), nunca aparece como bloqueado sin motivo. Y el desbloqueo salta por encima de los estratos vacíos, así que un pozo a medio llenar no corta el camino.
- **Lo que no se puede jugar no se ofrece:** un yacimiento sin pozos, o un pozo sin retos, no aparece en el mapa del niño.

Con menos de 6 retos en un estrato el alumno repetirá alguno dentro de la misma misión; a partir de 6 no.

## Cuadrillas de excavación (equipos)

El docente crea las cuadrillas y asigna a cada alumno escribiendo su **nombre de explorador** (el que el niño puso al crear su diario; si no coincide, no se le asignará).

Son **cooperativas por diseño**: una fracción de cada Doblón que gana un niño se anota como aportación a la meta común de clase, y **no se le descuenta de su bolsa** — cooperar no cuesta nada. El PRD (§0.2) prohíbe rankings entre niños y canaliza la competición hacia los NPC, así que la comparación entre cuadrillas **viene desactivada**; puedes activarla en el panel si tu grupo la lleva bien.

> Cada niño ve su propia aportación y su parte de la meta. El total real de una cuadrilla exigiría sumar los diarios de todos sus miembros, algo que hoy no se hace: requeriría que un dispositivo leyera el progreso ajeno.

## Estructura

```
index.html            App shell (todas las pantallas)
css/styles.css        Estética pergamino/latón, apta para tablet
js/config.js          Valores de partida y capa de ajustes editable del docente
js/cloud.js           Cuentas y sincronización con Appwrite (degrada a local)
js/classview.js       Resumen de la clase (cálculo puro + lectura remota)
js/teacher.js         Panel de Configuración del docente
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

- **v1.1** — ~~Cámaras del Guardián (jefes/evaluación sumativa), fragmentos del Atlas~~ ✅ hechos. Motor adaptativo v1 refinado.
- **v1.5** — Resto de yacimientos (Lengua, Naturales, Sociales), Grandes Excavaciones de clase, Museo personal, Cofre del Naufragio.
- **v2** — Taller de Cartografía (Bloom 5–6), Saqueadores del Cuervo, informes a familias, editor docente.
