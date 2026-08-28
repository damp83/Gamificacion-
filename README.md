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
| **Ajustes de todo el equipo** | Un docente publica su configuración y las demás tablets la recogen solas al abrir. Nunca viajan las contraseñas del alumnado, el PIN ni los datos de conexión |
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
| **Clase dirigida** | El docente pregunta desde su equipo y el alumnado responde en voz alta, sin entrar en la app. Turnos repartidos, méritos desde el propio turno y el diario de cada alumno guardado en ese equipo |
| **Varios docentes** | Un claustro comparte el despliegue: cada docente entra con su cuenta, ve solo sus clases y las sincroniza entre equipos. El aislamiento lo imponen los permisos por documento de Appwrite |
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

## Pruebas

```bash
npm test          # o, sin npm:  node --test test/*.test.js
```

Sin dependencias que instalar: son las pruebas de serie de Node (`node:test`)
contra **los mismos ficheros que se sirven en el navegador**. `test/cargar.js`
los evalúa en un contexto de `vm` con un `localStorage` y un `document` de
mentira, en el mismo orden que `index.html`, así que no hay una copia paralela
que se quede vieja en cuanto alguien toque un fichero.

Cubren lo que ya se ha roto alguna vez, que es de donde salieron:

| Fichero | Qué protege |
|---|---|
| `escapado.test.js` | Que el nombre y el resumen que sube el alumno no puedan convertirse en marcado en el navegador del docente |
| `diarios.test.js` | Que dos alumnos no compartan documento, y que restaurar una copia no deshaga lo hecho después |
| `aulas.test.js` | Que cambiar de clase no borre diarios que todavía no han subido |
| `bitacora.test.js` | Que el sello semanal cueste excavar y no solo abrir la app |
| `contenido.test.js` | Que ningún reto salga malformado y que los de «encontrar el error» tengan de verdad un error |
| `service-worker.test.js` | Que en la tablet no se quede guardado el diario del niño anterior |
| `menores.test.js` | Contraseñas, claves peligrosas en la configuración compartida y el reparto del Fondo |
| `nube.test.js` | Que la configuración de Appwrite esté completa y que el diagnóstico no confunda «no existe» con «no deja listar» |
| `conceptos.test.js` | Que todo reto declare su concepto y que el agregado de clase ordene por a cuántos alumnos les pasa |
| `evaluacion.test.js` | Que cada intento de la Cámara deje rastro y que el informe a familias no lleve notas ni comparaciones |
| `voz.test.js` | Que la lectura en voz alta no lea emoji y respete lo que decida cada alumno |
| `taller.test.js` | Que ningún reto escrito por un niño llegue a la clase sin pasar por el docente |
| `consulta.test.js` | Que ver el cuaderno de un alumno no le cambie ni una coma del diario |
| `vista-vacia.test.js` | Que la vista de clase sin diarios diga quién falta y qué le falta, en vez de dejar huecos |

Lo que pide un navegador de verdad —que la página pinte, que un nombre hostil se
vea como texto— no está aquí: eso se comprueba abriendo la app.

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

### 3. Colección de configuración compartida (opcional)

Sirve para no configurar veinte tablets a mano: un docente publica sus ajustes y las demás los recogen al abrir. Si te la saltas, cada tablet conserva los suyos y todo lo demás funciona igual.

1. **Create collection** (por ejemplo `configuracion`). Copia su ID.
2. Añade tres atributos:

   | Atributo     | Tipo   | Tamaño | Obligatorio |
   |--------------|--------|--------|-------------|
   | `overlay`    | String | 200000 | sí          |
   | `updated_at` | String | 20     | no          |
   | `by`         | String | 64     | no          |

3. Crea un **equipo** llamado `docentes` (Auth → Teams) y añádete a él. Es el mismo equipo que da permiso de lectura para la vista de clase.
4. Activa **Document security** en la colección. El documento se crea con lectura para `users` (los alumnos necesitan la configuración para jugar) y escritura solo para el equipo `docentes`.
5. En **Permissions** de la colección, da **Create** al rol del equipo `docentes`: es lo que permite publicar la primera vez.

> El id del documento es siempre `clase` (`appwrite.configDocId`), así que hay una única configuración por proyecto. Para dos clases distintas, dos proyectos o dos ids.

### 4. Colección de aulas (para varios docentes)

Sirve para que **un claustro entero comparta el despliegue** y cada docente
trabaje con sus clases sin ver las de los demás. Si te la saltas, la plataforma
funciona con una sola clase guardada en el equipo, como hasta ahora.

1. **Create collection** (por ejemplo `aulas`). Copia su ID.
2. Atributos:

   | Atributo     | Tipo   | Tamaño | Obligatorio |
   |--------------|--------|--------|-------------|
   | `owner`      | String | 64     | sí          |
   | `name`       | String | 64     | sí          |
   | `teacher`    | String | 64     | no          |
   | `config`     | String | 200000 | no          |
   | `updated_at` | String | 20     | no          |

3. Añade a la colección de **diarios** dos atributos más: `aula` (String 64) y
   `owner` (String 64). Crea un **índice** por `aula` — sin él, listar los
   diarios de una clase recorre la colección entera.
4. **Document security** activado en las dos colecciones.
5. En **Permissions** de las dos, da **Create** al rol `users`: es lo que
   permite a un docente crear su clase y sus diarios. Leer, escribir y borrar
   quedan restringidos por los permisos de cada documento.

> **De dónde sale el aislamiento.** Cada clase y cada diario nacen con permisos
> de lectura, escritura y borrado **solo para la cuenta de su docente**. Que el
> cliente filtre por `owner` es una comodidad para no descargar de más; la
> barrera es que el documento de otro docente sencillamente no se puede leer.

#### Comprobado contra Appwrite, no solo contra un simulador

El aislamiento se construyó verificándolo contra un doble que reproduce los
permisos por documento de Appwrite, y durante un tiempo eso fue todo lo que
había. **Ya no**: en el despliegue de este repositorio (proyecto Expedición
Atlas, base de datos `atlas`) se ha comprobado contra Appwrite de verdad, con
dos cuentas de docente, y se comporta como debe.

Si montas **tu propia instancia**, repite la comprobación una vez antes de que
entren clases reales. Son cinco minutos y cubren lo único que de verdad importa,
porque es lo que separa «cada docente ve lo suyo» de «cualquier docente ve los
diarios de todos los niños del centro»:

1. Crea **dos cuentas de docente** (A y B) desde *Mis clases → Crear cuenta*.
2. Con A, crea una clase y dirige un turno a un alumno cualquiera.
3. Cierra sesión y entra con B: **su lista de clases debe estar vacía**.
4. En la consola de Appwrite, copia el ID del aula de A. Con B en el navegador,
   abre la consola y ejecuta `await cloudPullAula('<id>')`.
   **Debe responder `reason: 'sin-permiso'`.** Si devuelve los datos, los
   permisos de la colección no están como deben y hay que revisarlos antes de
   seguir.

El paso 4 es el que cuenta. Que la lista de B salga vacía solo demuestra que el
cliente filtra por `owner`, que es una comodidad para no descargar de más; la
barrera de verdad es que el documento de otro docente no se pueda leer aunque se
pida por su id.

### 5. Rellenar `js/config.js`

Este despliegue ya viene configurado contra el proyecto **Expedición Atlas** de
Fráncfort:

```js
appwrite: {
  endpoint: 'https://fra.cloud.appwrite.io/v1',
  projectId: '6a8d7329000303fbfb52',
  databaseId: '6a8d7636003c39f18455',   // base de datos «atlas»
  collectionId: 'diarios',
  configCollectionId: '',               // opcional; con aulas no hace falta
  configDocId: 'clase',
  aulasCollectionId: 'aulas'            // varios docentes, cada uno sus clases
},
```

Nada de esto es un secreto: viaja en el navegador de cada niño y se lee con ver
el código fuente. Lo que protege los diarios **no** son estos identificadores,
son los permisos por documento y la lista de plataformas Web del proyecto.

> **Ojo con los IDs de colección.** En Appwrite el ID de una colección no tiene
> por qué ser su nombre: si la creaste dejando que generara uno, será algo como
> `6a8d76f10021b4c93a77` y hay que poner **ese**. Se ve en la consola, en la
> cabecera de la colección, junto al nombre.

### 6. Comprobar que está bien puesto

En la app: *Sala de mapas → Configuración → Acceso y nube →* **🔌 Comprobar la
conexión**. Prueba cada colección por separado y dice cuál falla y por qué. Solo
lee: no crea ni cambia nada. Distingue los tres fallos que se parecen entre sí:

| Lo que dice | Qué pasa |
|---|---|
| `✘ No existe con ese ID` | El ID de esa colección está mal escrito o es el nombre en vez del ID |
| `✓ Existe, pero esta sesión no puede listarla entera` | Está bien: con permisos por documento y sin sesión, es lo esperado |
| `✘ No se llega al servidor` | Falta añadir este dominio en Appwrite → *Settings → Platforms* |

Ese último es el que muerde al publicar: hay que dar de alta como plataforma
**Web** tanto `localhost` (para probar) como el dominio de GitHub Pages. Sin eso
el navegador corta las peticiones por CORS y no hay cuentas ni sincronización.

### El PIN del docente, y por qué no basta con cambiarlo en el panel

`teacherPin` está en `js/config.js` y de fábrica es `1234`. Se puede cambiar
desde *Configuración → Acceso y nube*, **pero eso vale solo para ese equipo**:
queda en el `localStorage` de ese navegador y no viaja a ninguna parte.

Y no viaja **a propósito**. Los ajustes que se publican para el equipo docente
los leen todos los alumnos —los necesitan para jugar—, así que el PIN va en la
lista de lo que nunca se comparte, junto con las contraseñas del alumnado y los
datos de Appwrite. Si viajara, cualquier niño podría leerlo desde su tablet.

O sea que hay dos formas, y conviene elegir a sabiendas:

| | Cómo | Alcance | Pega |
|---|---|---|---|
| **En `js/config.js`** | Cambiar el valor y volver a publicar | **Todas** las tablets, incluidas las nuevas | Queda a la vista de quien mire el código fuente del sitio |
| **En el panel** | *Acceso y nube → PIN* | Solo ese equipo | Hay que repetirlo en cada tablet |

Para un juego de tablets de aula, lo práctico es lo primero: el PIN existe para
que nadie se conceda méritos por accidente, no para resistir a quien se ponga a
leer el código. Si en tu grupo hay alguien capaz de abrir el inspector, entonces
lo segundo, tablet por tablet.

Cambia también `teacherPin`. Y ojo: **el PIN es una barrera de aula, no seguridad real** — el código se ejecuta en el navegador y un alumno curioso puede leerlo. Sirve para que no se concedan méritos por accidente, no para resistir a quien quiera saltárselo.

### Cómo entran los alumnos

Los niños escriben **usuario**, no email (más fácil a los 8–10 años). Internamente se convierte en `usuario@` + `usernameDomain`. Appwrite exige contraseñas de 8 caracteres como mínimo.

Las contraseñas que genera el panel son una palabra del mundo del juego más cuatro cifras (`brujula8845`), para que las pueda teclear un niño de ocho años en una tablet. Salen del generador criptográfico del navegador, no de `Math.random()`: el docente da de alta la clase entera de una tacada, y de unas pocas salidas seguidas de `Math.random()` se puede reconstruir su estado y predecir las demás — y la hoja de credenciales se reparte en clase. Lo que impide adivinarlas probando no es su tamaño, es el límite de intentos de Appwrite: igual que el PIN, esto es una barrera de aula.

> **Si el SDK de Appwrite no carga** (centro sin acceso al CDN, red caída), la app muestra un aviso en pantalla y sigue funcionando en modo local. El aviso existe para que nadie crea que se está guardando en la nube cuando no es así.

### Al subir de versión el SDK

La etiqueta del SDK en `index.html` lleva su huella (`integrity`): si lo que llega del CDN no es exactamente ese archivo —CDN comprometido, proxy del centro que reescribe—, el navegador no lo ejecuta. Aquí dentro se manejan datos de menores y un script sustituido podría leerlos todos.

Al cambiar de versión hay que recalcular la huella, o el SDK dejará de cargar:

```bash
npm pack appwrite@<version>
tar xzf appwrite-<version>.tgz
openssl dgst -sha384 -binary package/dist/iife/sdk.js | openssl base64 -A
```

jsDelivr sirve el archivo del paquete de npm tal cual, así que la huella que sale de ahí es la buena. Si no casara, no se pierde nada: el SDK no carga, la app avisa en pantalla y sigue en modo local.

## Clase dirigida por el docente

De fábrica la plataforma funciona **dirigida**: el alumnado no entra en la app.
Pregunta el docente desde su equipo —proyectado o no— y el niño responde en voz
alta; el docente marca lo que ha dicho. La portada, en este modo, solo ofrece la
puerta del docente y explica por qué.

Se cambia en **Configuración → Alumnado → «Cómo se usa en clase»**:

| Modo | Para qué |
|---|---|
| **Dirigida por el docente** (de fábrica) | Un solo equipo. Nadie más entra. Los diarios se guardan ahí. |
| **Cada alumno en su dispositivo** | El de siempre: cada niño con su cuenta de Appwrite. |
| **Las dos cosas** | En clase dirigida, en casa por su cuenta. |

### Cómo va una sesión

1. **Sala de mapas → 🎤 Dirigir la clase.** Sale la clase entera en fichas grandes.
2. Se elige a quién preguntar, o se pulsa **«A quien le toque»**: propone a quien
   menos veces haya salido hoy y, a igualdad, a quien lleve más tiempo sin que le
   pregunten. Es el problema real de un aula de 25.
3. Arriba se elige el tema: *lo que más le convenga a cada uno* (decide el motor
   adaptativo, mirando su dominio) o un pozo concreto, si hoy tocan fracciones.
4. Se lee el reto en voz alta y **se marca la opción que dice el alumno**. Si
   falla, se le puede ofrecer *restaurar el hallazgo* —corregirse a sí mismo— igual
   que si jugara solo, y darle la pista de Kira.
5. **🏅 Los méritos se conceden desde el propio turno**, que es donde ocurren
   («ha ayudado a su compañera»), sin salir a otra pantalla.
6. **Terminar turno** cierra la ronda cuando haga falta: se puntúa solo lo
   respondido, no las preguntas que nadie llegó a ver.

Por dentro es exactamente una expedición: mismo motor adaptativo, mismo dominio
por estratos, mismas reglas anti-grinding. Lo único que cambia es quién toca la
pantalla.

> **Los diarios viven en ese equipo.** En clase dirigida no hace falta Appwrite:
> el equipo del docente guarda el diario de cada alumno y la vista general de la
> clase los lee de ahí. Para que además entren desde casa, sí hace falta la nube.

### Copia de seguridad: lo primero que hay que saber

En clase dirigida **el curso entero de tu clase vive en el navegador de ese
equipo**. Si el centro borra el perfil al cerrar sesión —muy habitual en las
imágenes gestionadas—, alguien limpia los datos de navegación, o cambias de
navegador o de máquina, se pierde y no hay de dónde recuperarlo.

**Configuración → Copia de seguridad → 💾 Descargar copia** guarda un archivo
`.json` con **los diarios y los ajustes**. Guárdalo donde guardas todo lo demás.

- **Restaurar fusiona, no sustituye.** De cada alumno se queda la versión más
  reciente, así que recuperar una copia del viernes un lunes no borra lo que se
  hizo el lunes por la mañana. El resumen te dice cuántos entraron nuevos,
  cuántos se actualizaron y cuántos ya estaban más al día.
- **La sala de mapas te avisa** si nunca has hecho una copia o si hace más de una
  semana de la última, pero solo cuando hay diarios que perder.
- La copia lleva nombres y contraseñas del alumnado: trátala como el cuaderno de
  notas.
- Si el visor bloquea las descargas, en el mismo sitio hay un plegable para
  copiar el texto y pegarlo en un `.json` a mano.

> La app detecta dónde se está ejecutando: en tu servidor o como archivo suelto
> descarga con un enlace normal; dentro del visor de un Artifact usa la descarga
> que media el propio visor, porque ahí un enlace no haría nada.

### Varios docentes, cada uno con sus clases

Con la colección de aulas configurada, la plataforma pasa a servir a un claustro:

- Cada docente **entra con su cuenta** desde *Sala de mapas → 🏫 Mis clases*.
- Ve **solo sus clases**. Las de los demás no aparecen y, si intenta abrir una
  por su id, Appwrite se lo impide.
- Al **abrir una clase**, sus diarios y sus ajustes se traen a ese equipo. Al
  trabajar, cada diario se guarda **en el documento de esa clase** (agrupado, no
  uno por respuesta: la red del centro no está para eso).
- **Desde otro equipo**, entra con su cuenta, abre la misma clase y la recupera.
- **Traer de la nube fusiona por lo más reciente**, así que trabajar sin red en
  el portátil y sincronizar después no pisa nada.
- **Cambiar de clase vacía los diarios locales**, para no mezclar dos clases en
  el mismo equipo. Antes de borrar nada se suben todos a su clase; si alguno no
  sube —el aula sin red, la cola de guardado a medias—, **no se borra nada** y se
  dice cuántos quedan pendientes, porque ese trabajo no está en ninguna otra parte.

El id de cada diario se deriva de la clase y del alumno, así que el mismo niño
escrito desde dos equipos va **al mismo documento** en vez de crear duplicados.
Se deriva con un hash del nombre completo y no con el nombre recortado: Appwrite
limita el id a 36 caracteres y, con los 20 del aula por delante, «Ana María
Rodríguez Pérez» y «Ana María Rodríguez Gómez» caían las dos en el mismo
documento y la segunda pisaba a la primera.


## Taller de Cartografía: los niños crean

El árbol de excavación llega hasta **Analizar**. Crear es el escalón siguiente,
y el PRD lo señala como «el predictor más fuerte de retención a largo plazo»:
quien tiene que inventar un reto **y sus tres respuestas falsas** se obliga a
entender por qué una respuesta equivocada resulta tentadora, que es otro nivel
de comprensión.

Desde el Campamento, cada niño puede inventar retos para sus compañeros. Al
enviarlo gana Doblones; los **PE solo llegan si el docente lo aprueba**, porque
los PE siguen midiendo únicamente aprendizaje demostrado y que el reto esté bien
pensado no consta hasta que alguien lo lee.

**Nada llega a los demás sin pasar por el docente.** No es burocracia: es la
única barrera entre el texto libre de un crío y las pantallas de los otros
veinticinco. En *Configuración → Taller de Cartografía* se leen los pendientes,
se aprueban («al mapa») o se devuelven con una nota. Devolver no quita nada:
volver a intentarlo es parte del taller.

Los aprobados entran en el pozo **Los acertijos de la clase**, que viaja con la
configuración del aula y llega a todos los equipos. Mientras esté vacío no
aparece en el mapa: un pozo vacío prometería algo que no está.

Tope de 3 al día por alumno, para que no se convierta en una fábrica de
acertijos malos. Todo configurable desde el panel.

## Lectura en voz alta

Un niño de seis años que todavía descifra no puede hacer las matemáticas solo:
si tiene que descodificar «¿Cuántas quedan?» antes de restar, el reto le está
midiendo la lectura y no el cálculo. Lo mismo a cualquier edad para quien tenga
dislexia.

El botón **Escuchar** lee el enunciado y las cuatro opciones, nombradas por su
letra («Opción A…»), que es lo que permite responder en voz alta en clase. Usa
la voz del propio navegador: no manda nada a ningún servidor ni necesita
conexión, y donde no exista el botón no aparece.

De fábrica se ofrece en 1.º y 2.º. El docente puede darlo a toda la clase desde
el panel y cada alumno decide lo suyo desde el Campamento.

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

### Ver el cuaderno de un alumno

En cada ficha, **👁 Ver su cuaderno** abre lo que ve ese niño: su HUD, su mapa,
su campamento, su bitácora y su cuaderno. Sirve para sentarse cinco minutos con
él, o para preparar una reunión con su familia sin tener que imaginárselo.

Es **solo lectura**, y eso no es una promesa de la interfaz: es una barrera en
el motor. Mientras dura la consulta, `saveState()` no escribe nada —ni en el
equipo ni en la nube— así que aguanta aunque alguien añada mañana una pantalla
que guarde sin acordarse de comprobar el modo. Y las acciones que gastan del
bolsillo del niño (jugar, comprar, donar, conceder méritos, enviar al Taller)
se bloquean además una a una, para que la pantalla no finja que funciona.

Dos cosas que había que evitar y que no se ven a simple vista:

- `openDiary()` termina en `saveState()`, así que abrir un cuaderno marcaba ese
  diario como modificado y disparaba una subida a la nube que no correspondía a
  nada.
- El turno de clase dirigida llama a `rolloverIfNeeded()`, que da los 15
  doblones del «primer desembarco del día». Consultar no pasa por ahí: sería
  regalárselos a quien ni ha tocado la tablet.

Una barra fija arriba dice de quién es el cuaderno, porque el riesgo real no es
técnico: es que el docente se olvide de en qué pantalla está.

Necesita el diario completo, así que funciona en clase dirigida —donde los
diarios están en el equipo—. Leyendo de la nube llega solo el resumen, la misma
limitación que tiene el informe a familias.

### Lo que conviene repasar

Es lo primero de la pantalla, y a propósito: el docente entra aquí con la
pregunta «¿qué doy mañana?», y hasta ahora la vista contestaba a otra distinta
—«¿cómo va cada uno?»— que había que traducir leyendo veinticinco tarjetas.

Cada reto declara **qué concepto** trabaja: no «Numeración · Aplicar», sino
«Resta llevando», «B y V», «Comparar fracciones». Con eso, la vista de clase
puede decir **«7 alumnos fallan la resta llevando, y son estos»**, que sí es una
frase con la que se prepara una clase.

Tres decisiones que conviene no deshacer:

- **Se ordena por cuántos alumnos lo fallan, no por la tasa de error.** Lo que
  decide si algo va a la pizarra es a cuánta gente le sirve. Un concepto con
  89 % de fallo en un solo niño es una conversación con ese niño, no una
  lección, y por eso aparece el último aunque su tasa sea la más alta.
- **Hacen falta al menos 3 intentos** para que un concepto cuente. Con dos
  respuestas no se sabe nada: un solo fallo daría 100 % y mandaría a repasar
  algo que quizá no toca.
- **Solo cuenta el primer intento** de cada reto. El segundo llega con la
  explicación de Kira delante y mediría otra cosa.

El cálculo y el enunciado son conceptos **distintos** («Suma con llevada» frente
a «Problema de sumar»). Un niño que resuelve 4856 + 30 y falla el mismo cálculo
dentro de un problema no tiene un problema de matemáticas: lo tiene de lectura.
Mezclarlos escondía justo eso. Por lo mismo, la ortografía se clasifica por
regla y no por estrato: «falla ortografía» no se puede enseñar, «falla B/V» sí.

En el cuaderno de cada alumno aparece lo mismo en pequeño, bajo «Le está
costando»: es lo que se mira antes de sentarse cinco minutos con un niño.

> Los pozos que crea el docente no declaran concepto y se agrupan por el nombre
> de su pozo. Se puede afinar poniendo un campo `skill` en los retos del banco.


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

### Quién sale y quién no

La vista lista **diarios**, no nombres: un alumno aparece con su ficha completa
cuando ha entrado y ha empezado a excavar. Quien está en la lista de clase pero
todavía no ha entrado **también sale**, con una ficha a trazos marcada
«Aún no ha entrado» y el motivo concreto: le falta cuenta, ya la tiene y solo
falta que entre, o —sin Appwrite— que cada tablet guarda un único diario.

La cabecera lo resume: *«3 de 25 de la lista han empezado su diario»*.

> **En modo local solo puede haber una ficha completa.** Sin cuentas en la nube
> cada dispositivo guarda su propio diario, así que la tablet del docente solo
> conoce el suyo. Para ver a la clase entera hace falta configurar Appwrite.


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
css/styles.css        Sistema de diseño y estilos (ver «El sistema visual»)
fonts/                Bree Serif y Nunito, servidas desde aquí (SIL OFL)
js/config.js          Valores de partida y capa de ajustes editable del docente
js/cloud.js           Cuentas y sincronización con Appwrite (degrada a local)
js/classview.js       Resumen de la clase (cálculo puro + lectura remota)
js/content.js         Generadores procedurales de retos por estrato y tier
js/state.js           Estado user_state (PRD §5), economía y persistencia (localStorage)
js/game.js            Motor de misiones, recompensas y anti-grinding
js/ui.js              Chasis: escapado, iconos, cambio de pantalla, diálogo, cabecera
js/play.js            Las pantallas del alumno (mapa, pozo, misión, campamento…)
js/aula.js            Las del docente en el aula (mis clases, clase dirigida, vista de clase)
js/teacher.js         Panel de Configuración del docente
js/app.js             Portada, acceso, navegación y arranque
sw.js                 Caché offline (network-first)
manifest.webmanifest  Instalación PWA
tools/build-standalone.py  Genera la versión de un solo archivo (dist/)
test/                 Pruebas (ver «Pruebas»)
docs/PRD.md           Documento de diseño completo
```

### Por qué la interfaz está en cuatro ficheros

`app.js` llegó a 2 200 líneas y 87 funciones, con la pantalla de un niño de
ocho años y la vista general de la clase del docente a cincuenta líneas de
distancia. Se repartió por **quién mira la pantalla**, que es lo que de verdad
las separa:

| | Quién la mira |
|---|---|
| `ui.js` | Nadie en concreto: es el chasis del que tiran todas |
| `play.js` | El alumno |
| `aula.js` | El docente, con la clase delante |
| `teacher.js` | El docente, preparando la expedición |
| `app.js` | Todavía nadie: decide quién entra y por qué puerta |

Los once scripts comparten un único ámbito global, así que el orden de carga
solo importa para que se lea bien; nada se ejecuta hasta que `app.js` engancha
`DOMContentLoaded`. Ese mismo orden está escrito en cuatro sitios que tienen que
ir juntos: `index.html`, la lista `ASSETS` de `sw.js`, el `ORDEN` de
`tools/build-standalone.py` y el de `test/cargar.js`.

## El sistema visual

Todo el estilo sale de un puñado de fichas declaradas en `:root`, no de valores
sueltos repartidos por el archivo. Cambiar una ficha cambia la plataforma entera.

| Familia | Para qué |
|---|---|
| **Superficies** (`--paper`, `--surface`, `--surface-raised`, `--surface-sunken`) | Cuatro niveles de profundidad. Antes casi todo compartía el mismo crema y la jerarquía dependía solo del borde. |
| **Tipografía** (`--font-display`, `--font-text`, `--t-xs` … `--t-3xl`) | Bree Serif en los titulares —voz de diario de campo— y Nunito en el texto. Escala de ocho pasos: cada uno se nota sin dar saltos. |
| **Espaciado** (`--s-1` … `--s-8`) y **radios** (`--r-sm` … `--r-pill`) | El contenedor siempre es más redondo que lo que lleva dentro, como en el papel real. |
| **Elevación** (`--e-1`, `--e-2`, `--e-3`, `--e-inset`) | Sombras con tinte de tinta, no grises: sobre pergamino un gris puro se ve sucio. |
| **Anchos** (`--w-narrow`, `--w-content`, `--w-wide`) | Cada pantalla declara cuánto quiere ocupar en vez de una columna fija de 680 px. |

### Emoji o dibujo: quién manda en cada icono

La regla es de una línea: **los emoji son contenido del docente; el dibujo es
mobiliario de la app.**

Los yacimientos, los pozos, los méritos, los artículos del almacén y los
animales de las cuadrillas siguen siendo emoji, porque el docente los teclea y
los cambia cuando quiere desde el panel. Todo lo demás —el HUD, las pestañas,
los cuatro estratos de Bloom, el pico, el candado, el doblón, los sellos de
resultado— es un `<symbol>` del sprite que hay al principio de `index.html`, y
se pinta con `ico('nombre')` desde JavaScript o con `<use href="#i-nombre">`
desde el HTML.

El motivo no es de gusto. Un emoji lo dibuja el sistema operativo: el mismo
🪙 es una cosa en un iPad, otra en un Android y otra en Windows, cambia de
estilo con cada actualización y a 20 px se convierte en una mancha. Un sprite
propio se ve igual en los seis dispositivos de un aula, hereda el color de
donde se ponga (`currentColor`) y pesa 6 KB para los cuarenta iconos.

Para añadir uno: un `<symbol id="i-loquesea" viewBox="0 0 24 24">` con trazo de
1,7, sin declarar `fill` ni `stroke` —se heredan del `<svg class="ico">`, que es
la única vía que atraviesa el árbol en sombra de un `<use>`—. Si una forma tiene
que ir maciza, se le pone `fill="currentColor" stroke="none"` en el propio
elemento.

### Cinco decisiones que conviene no deshacer sin pensarlo

- **Las tipografías se sirven desde `fonts/`, no desde un CDN.** En un centro la
  red puede bloquear `fonts.googleapis.com` o caerse a mitad de sesión, y una
  plataforma que se despinta a medio uso no parece profesional. Son 66 KB del
  subconjunto latino, y así la versión de un solo archivo funciona desde un USB.
  Ninguna página pide nada a Google: si vuelve a aparecer un `<link>` a
  `fonts.googleapis.com`, sobra.
- **El pozo se dibuja como un corte del terreno.** Cada estrato tiene su tono de
  tierra —arena clara arriba, arcilla abajo—, una línea de sedimento irregular
  entre capas, grano diagonal en lo que sigue enterrado y filo de latón en lo
  excavado. Antes eran cuatro filas blancas iguales y la palabra «estrato» no
  significaba nada a la vista.
- **El fondo tiene paisaje.** Un templo lejano y tres crestas de duna fijos al
  pie de la ventana (`body::after`), muy bajos de contraste y detrás de todo.
  La mitad inferior de casi cada pantalla se quedaba en pergamino vacío. Ojo al
  tocarlo: el `#` de un color dentro de `url(data:image/svg+xml,…)` **tiene que
  ir como `%23`**, o abre un identificador de fragmento y trunca el SVG entero
  sin dar ningún error.
- **En misión desaparecen las pestañas.** Ya estaban bloqueadas por código;
  mostrarlas era ofrecer una salida que no existía. El reto se queda solo en
  pantalla, centrado y a la altura de los ojos.
- **Todo degradado lleva su `background-color` de reserva.** Si el degradado no
  pinta, el texto de encima sigue teniendo fondo, y las herramientas de medición
  de contraste leen el color real en vez de atravesarlo hasta la página.

### Lo que se mide en cada cambio

- **Contraste** — WCAG 2.1 AA (4,5:1; 3:1 en texto grande), compuesto sobre las
  capas translúcidas reales, en las doce pantallas.
- **Objetivos táctiles** — 44 × 44 px mínimo, incluyendo el ampliador de las
  casillas. Son dedos de seis años sobre una tablet.
- **Foco por teclado** — anillo propio de 3 px, visible sobre cualquier
  superficie; solo aparece con `:focus-visible`, no al tocar con el dedo.
- **Desborde horizontal** — a 390, 768, 1024 y 1440 px de ancho.
- **Declaraciones perdidas** — `check-css.js` vuelve a parsear la hoja en el
  navegador y avisa si alguna regla se ha quedado sin declaraciones. Un color
  mal escrito no rompe la página: la regla desaparece en silencio y el fallo
  solo se ve mirando una captura. Ha pasado dos veces.

### El movimiento

Todo dura menos de medio segundo, ocurre una sola vez y no lleva información
que no esté también en el color y el texto: acertar levanta la losa, fallar la
mueve dos veces de lado (corto, nunca un temblor largo: con el error el tono es
cómico, no punitivo), el sello del resultado se estampa, el aro del nivel da un
destello al subir y las tarjetas del mapa entran escalonadas. Con
`prefers-reduced-motion` desaparece entero y la interfaz sigue diciendo lo
mismo.

## Cómo ponerla en marcha

No hay compilación ni dependencias: el repositorio **es** el sitio web.

**Recomendado — GitHub Pages.** El flujo de trabajo `.github/workflows/pages.yml`
ya está puesto y publica en cada push. Solo falta **activar Pages una vez**, que
es lo único que no puede hacerse desde el repositorio:

> **Settings → Pages → Build and deployment → Source: `GitHub Actions`**

Con eso hecho, el siguiente push —o *Actions → Publicar en GitHub Pages → Run
workflow*— deja el sitio en `https://<usuario>.github.io/<repositorio>/`.

`index.html` está en la raíz y todas las rutas son relativas, así que funciona
igual en una subcarpeta. Al ser una PWA, el navegador ofrece **«Instalar»**:
queda un icono en el escritorio o en la pantalla de inicio que abre sin barra de
navegador, y el service worker cachea la app para que siga funcionando sin
internet. Actualizar es hacer push.

> El service worker guarda **solo los archivos de la propia app**, y solo cuando
> el servidor los devuelve bien. Las respuestas de Appwrite no se cachean nunca:
> en una tablet compartida quedarían en el disco después de cerrar sesión y, sin
> red, se le servirían al siguiente niño que la abriese.

> El flujo lleva `enablement: true`, que intenta activar Pages solo. En la
> práctica el token de Actions no tiene permiso para crear el sitio
> (`Resource not accessible by integration`), así que la primera activación es
> a mano de todos modos. Hasta que se active, cada push deja una ejecución en
> rojo en Actions: es ese paso, no el sitio.

> Con repositorio público la URL es pública. En el código no hay datos personales
> —los nombres y contraseñas del alumnado viven en el navegador, nunca en el
> repositorio—, pero el PIN del docente sí se ve; es una barrera de aula, no
> seguridad. Para mantenerlo privado sin coste, Cloudflare Pages o Netlify.

**Sin internet o desde un USB — archivo único.** `python3 tools/build-standalone.py`
genera `dist/Expedicion-Atlas.html` (~490 KB): un solo archivo con el CSS, el JS y
las tipografías dentro. Se abre con doble clic y guarda los diarios igual.
Dos avisos: ahí no hay service worker, y **los datos de ese archivo y los de la
versión web son islas separadas**, no se sincronizan.

**No hace falta un `.exe`.** Sería Chromium envolviendo este mismo HTML, con
avisos de SmartScreen, sin permisos de instalación en un PC gestionado y con
actualizaciones a mano. La PWA instalada da lo mismo sin ninguno de esos problemas.

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
