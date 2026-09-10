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
| **Ajustes de todo el equipo** | Un docente publica su configuración y las demás tablets la recogen solas al abrir. Por ahí nunca viajan las contraseñas del alumnado, el PIN ni los datos de conexión; las contraseñas van por un documento aparte que solo lee la cuenta del docente |
| **Estratos de Bloom 1–4** | Recordar · Comprender · Aplicar · Analizar, con desbloqueo al demostrar ≥80% de dominio del estrato superior **dos sesiones seguidas** |
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
| **Méritos de Campamento** | Doblones por comportamientos (ayudar, cuidar el material, participar…), concedidos por el docente desde su equipo, con topes diarios, **a un alumno, a una cuadrilla, a la clase entera o a unos cuantos elegidos a dedo, de un toque** |
| **Panel de Configuración** | El docente edita en la propia app el curso, los reconocimientos, las cuadrillas, los pozos, el almacén, la economía y el acceso — sin tocar código |
| **Cuadrillas de excavación** | Equipos cooperativos que suman a una meta común de clase, con un **rol y personaje** para cada miembro; sin ranking entre niños salvo que se active |
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
| `informe-fallos.test.js` | Los fallos que encontró la auditoría de los informes: que «terminado» exija la prueba superada, que el diagnóstico olvide lo viejo, que dos alumnos del mismo nombre no se fundan en la vista de clase y que un estrato que se está perdiendo avise |
| `informe-mejoras.test.js` | Que el informe diga de qué trimestre habla, con qué denominador y con cuánta evidencia detrás; que la nota del docente no viaje a las tablets del alumnado y no se pierda al juntar dos equipos |
| `voz.test.js` | Que la lectura en voz alta no lea emoji y respete lo que decida cada alumno |
| `taller.test.js` | Que ningún reto escrito por un niño llegue a la clase sin pasar por el docente |
| `consulta.test.js` | Que ver el cuaderno de un alumno no le cambie ni una coma del diario |
| `vista-vacia.test.js` | Que la vista de clase sin diarios diga quién falta y qué le falta, en vez de dejar huecos |
| `cuentas.test.js` | Que el panel avise de una contraseña que Appwrite va a rechazar, y de que escribirla no crea la cuenta |
| `merito-grupo.test.js` | Que dar un mérito a una cuadrilla entera, a la clase o a unos cuantos elegidos a dedo use el mismo tope y el mismo registro que darlo uno a uno, y que se diga a quién no le llegó |
| `criterios.test.js` | Que la evidencia por criterio se calcule bien, que no se proponga un nivel sin datos suficientes, y que nada de esto llegue nunca al niño ni a su familia |
| `atencion.test.js` | Que la app diga por dónde seguir en vez de dejar elegir a ciegas, que la racha empiece donde hay algo que perder, que dos yacimientos nunca sean del mismo color, y que nada de esto castigue el error ni se le imponga a quien pidió menos movimiento |
| `pin.test.js` | Que no quede ni un sitio donde teclear el PIN en la pantalla de un alumno, que al portal se entre por una sola puerta, y que salir de él lo vuelva a cerrar |
| `conexion.test.js` | Que «no hay conexión» diga cuál de las cuatro causas es, y que las cuatro dejen claro que la contraseña no se ha llegado a comprobar |
| `salud.test.js` | Que todo lo que se pierde en silencio deje de perderse en silencio: quién no sincroniza, qué diario está roto, si la clave de la IA se agotó, y que con todo en orden el panel no invente un problema |
| `adaptaciones.test.js` | Que las cuatro palancas de una adaptación hagan lo que dicen, que el techo no impida bajar, y sobre todo que abrir la puerta no cambie lo que la app dice que ese alumno ha demostrado |
| `nombres-unicos.test.js` | Que dos ficheros no declaren una función con el mismo nombre: comparten un solo ámbito global y la segunda pisa a la primera en silencio |
| `datos-alumno.test.js` | Que se pueda ver y borrar todo lo que se guarda de un alumno, que el borrado no se lleve a nadie más, y que lo que la app no puede borrar —su cuenta de Appwrite— se diga en vez de darse por hecho |
| `credenciales.test.js` | Que las contraseñas lleguen al segundo equipo del docente y a nadie más: permisos solo para su cuenta, nunca `users`, y que ningún equipo pueda vaciar lo que otro guardó |
| `cuaderno-docente.test.js` | Que la lectura pedagógica sobre un alumno solo se abra con el docente al mando |
| `version.test.js` | Que el número de versión que lee el docente no se separe del de la caché |
| `usabilidad.test.js` | Que la letra grande escale de verdad, que el Taller se pueda teclear y que nada se salga de la pantalla |
| `generador.test.js` | Que un reto escrito por IA con la cuenta mal marcada no llegue nunca a un niño |
| `alta.test.js` | Que el panel no intente crear el diario del alumno —Appwrite no lo permite— y que vincularlo le ponga su clase y su docente |
| `asistente-yacimientos.test.js` | Que la asistente proponga estructura y **nunca retos**, que lo que vuelve se limpie antes de tocar los ajustes, y que el inspector avise de lo que falla en silencio sin acusar a un yacimiento sano |
| `motor-reglas.test.js` | Que las reglas del motor se cumplan jugando misiones enteras: que fallar no domine, que lo dominado no se pierda, que la Cámara no se abra antes de tiempo y que fallarla salga gratis |
| `auditoria-resto.test.js` | Que unos ajustes que no caben se paren antes de mandarlos, que ningún campo del panel se quede sin nombre accesible, y que los retos repetidos de un pozo salgan a la vista |
| `robustez.test.js` | Que un diario a medias se complete en vez de reventar, que un equipo que no puede guardar lo diga, y que la economía no admita números imposibles |
| `ids-unicos.test.js` | Que dos cosas creadas seguidas no nazcan con el mismo id, y que una configuración ya rota se repare al cargarla |
| `avatar.test.js` | Que el retrato del rol sea el avatar en las cuatro pantallas, y que el sombrero comprado no lo borre |
| `repaso-genera.test.js` | Que cada concepto flojo caiga en el pozo que habla de eso y deje el generador preparado |
| `vincular-por-nombre.test.js` | Que el rescate de diarios sueltos no toque el de otro docente ni empareje un nombre repetido |
| `pozo-tema.test.js` | Que los retos generados vayan de lo que dice el pozo, y que los ocho pozos de fábrica lo digan |
| `identidad.test.js` | Que dos alumnas con el mismo nombre en cursos distintos no compartan diario, y que los diarios viejos se muden sin perderse |
| `bolsa.test.js` | Que comprar o donar por un alumno salga de su bolsa, no toque sus PE, y vuelva a su documento |
| `feedback.test.js` | Que el aviso de acierto/fallo no llegue a una misión que ya terminó |

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
- **Para familias y profesorado:** qué es, el criterio pedagógico (estratos de Bloom, 80 % de dominio), la adaptación a cada niño, y las garantías: nada se pierde, sin compras reales, sin rankings entre niños, y los datos justos — el nombre con el que aparece en clase y lo que aprende, sin fotos, sin ubicación y sin correo del niño.

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
6. Añade dos atributos más: `aula` (String 64) y `owner` (String 64), **los dos opcionales**. Los rellena el panel al dar de alta cada alumno, y son lo que ata su diario a una clase y a un docente.

   > **Cópialos con cuidado.** Si el nombre no coincide exactamente —`ower` en vez de `owner`, por ejemplo— Appwrite rechaza el documento con *Unknown attribute*. El panel lo dice ahora con todas las letras al crear las cuentas, pero es un rato perdido que se ahorra mirando dos veces.

7. Crea un **equipo** llamado `docentes` (Auth → Teams), añádete a él, y en **Permissions** de esta colección dale **Read** y **Update**.

   - **Read** es lo que te deja ver los diarios. Cada uno nace con permiso solo para su dueño —eso es lo correcto, así ningún alumno lee el de otro— y tu cuenta necesita el suyo aparte.
   - **Update** es lo que te deja **vincular** el diario de un alumno a tu clase y anotarle un mérito. Sin él, «Vincular los diarios» dice *«tu cuenta no puede escribir en su diario»* y la vista de clase se queda vacía aunque los niños hayan entrado.

   > Es el paso que más se olvida, y el de lectura falla en silencio: un diario que tu cuenta no puede leer **no da error**. Appwrite responde con la lista vacía, exactamente igual que si no existiera ninguno, así que la pantalla dice «aún no ha empezado nadie» cuando lo que pasa es otra cosa.
   >
   > Los alumnos siguen sin poder leerse entre ellos: el permiso de lectura de la colección es solo para el equipo docente; ellos únicamente tienen el de su propio documento.
   >
   > Para comprobarlo: *Configuración → Acceso y nube → **Comprobar la conexión*** dice cuántos diarios ve tu cuenta ahora mismo.

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

### 3 bis. Tabla de retos (para el generador con IA)

Los retos escritos —los de la cola de revisión y los aprobados— viven en su
propia tabla, una fila por reto. No están en los ajustes, y hay dos razones:

- El campo `config` del aula son 200.000 caracteres y un reto ocupa unos 718:
  el techo estaba en **278 retos para toda la clase**.
- Y sobre todo: el documento del aula **solo lo puede leer su docente**, así
  que un reto aprobado no llegaba jamás a la tablet de un niño.

1. Crea la colección (tabla) `retos`.
2. Columnas:

   | Columna | Tipo | Tamaño | Oblig. | Array |
   |---|---|---|---|---|
   | `owner` | String | 64 | sí | |
   | `aula` | String | 64 | sí | |
   | `estado` | String | 16 | sí | | 
   | `siteId` | String | 64 | sí | |
   | `branchId` | String | 64 | sí | |
   | `estrato` | String | 16 | sí | |
   | `materia` | String | 16 | no | |
   | `curso` | Integer | | no | |
   | `skill` | String | 48 | sí | |
   | `question` | String | 600 | sí | |
   | `options` | String | 200 | sí | **sí** |
   | `answer` | Integer | | sí | |
   | `hint1` | String | 500 | no | |
   | `hint2` | String | 500 | no | |
   | `explanation` | String | 1000 | no | |
   | `criterio` | String | 600 | no | |
   | `origen` | String | 16 | no | |
   | `comprobado` | Boolean | | no | |
   | `updated_at` | String | 20 | no | |

   `estado` es `cola` (escrito, sin revisar) o `banco` (aprobado, jugándose).

3. Índices: uno por `aula`, y otro compuesto por `aula` + `estado`. Sin el
   primero, listar los retos de una clase falla en cuanto haya unos cientos.
4. **Permisos** (pestaña *Security*):

   | Rol | CREATE | READ | UPDATE | DELETE |
   |---|---|---|---|---|
   | All users | | ✓ | | |
   | Team `docentes` | ✓ | ✓ | ✓ | ✓ |

   El READ de `All users` es lo que hace que la pregunta llegue al niño. No
   des UPDATE ni DELETE ahí: cualquier cuenta con sesión —un alumno— podría
   reescribir las preguntas. No hace falta activar **Row level security**:
   con estos permisos de tabla está resuelto, y la app pone además los
   permisos por fila para que siga funcionando si algún día se enciende.

   > **Los permisos por fila no nombran al equipo, y es a propósito.**
   > Appwrite identifica los equipos por su **ID** (algo como
   > `6a92c58d001142cf8ba2`), no por la etiqueta que se les pone, y solo
   > acepta permisos que quien escribe pueda otorgar. Mandar `team:docentes`
   > hace que rechace la escritura entera con un *«Permissions must be one
   > of…»*. Cada fila se crea con `users` para leer y el propio autor para
   > editar y borrar, que son permisos que cualquiera puede otorgar siempre;
   > al claustro le da permiso la tabla, no la fila.

5. Pega el ID de la tabla en `retosCollectionId`, en `js/config.js`.

**Todos los retos van aquí**, los escriba la IA o el docente a mano en
«Yacimientos y pozos». Dónde vive un reto no depende de quién lo escribió:
si se quedara en los ajustes, no llegaría a ninguna tablet.

**La mudanza es automática.** Lo que ya estuviera en los ajustes —la cola y
los bancos de cada pozo— se sube a la tabla la primera vez que se abre la
clase con la tabla configurada, y solo entonces se borra de los ajustes. Se
puede ejecutar mil veces: lo que ya está en la tabla no se vuelve a subir.

---

### 4. Colección de aulas (para varios docentes)

> **Borrar una clase** se hace desde *Mis clases*, con la papelera de su
> tarjeta. Se lleva sus diarios, sus retos y sus ajustes, y no se puede
> deshacer: antes se cuenta y se enseña qué hay dentro, se ofrece la copia de
> seguridad, y hay que escribir el nombre de la clase —la pantalla dice cuál,
> y la comparación **ignora tildes, espacios, puntos y el ordinal**: «4.º A»,
> «4º A», «4° A» y «4 A» valen igual, porque el `º` de la app (U+00BA) no es
> el `°` del teclado y nadie tiene por qué saberlo; «2.º A» sigue siendo otra
> clase, que es lo único que hay que distinguir—. Se borra de dentro
> afuera —retos, diarios, y el aula al final— para que un fallo a mitad no
> deje filas apuntando a una clase que ya no existe. Las cuentas del
> alumnado no se borran: se quedan sin diario.

> **Los permisos de cada clase.** El documento de una clase lo **lee cualquier
> cuenta con sesión** y lo **escribe solo su docente**. La lectura abierta no
> es un descuido: dentro de ese documento viajan los yacimientos, los pozos,
> los méritos, la economía y las cuadrillas, y sin ella los alumnos jugarían
> siempre con la configuración de fábrica por mucho que el docente prepare su
> clase. Lo que se guarda ahí no incluye contraseñas del alumnado, PIN, datos
> de Appwrite ni la clave de la API; y una tablet de alumno se deja además la
> lista de clase al adoptarlo, que el juego no la necesita. Las contraseñas
> viajan aparte, en un documento de esta misma colección con el sufijo `-cred`
> y permisos solo para la cuenta del docente. Los permisos se
> refrescan en cada guardado, así que las clases creadas antes de esto se
> abren solas.

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

### El PIN no se teclea nunca delante de un niño

La pantalla de Méritos del alumno tenía debajo un portillo: **«Panel del
docente»**, el PIN, y ahí mismo la lista para conceder méritos. La idea era que
el docente pasara por las mesas y fuera dando méritos en la tablet de cada uno.

Estaba mal, y por dos motivos de tamaño muy distinto.

El evidente: **el PIN se teclea a diez centímetros de los ojos del dueño de la
tablet**. Basta con verlo una vez para concederse méritos cuando se quiera, y
eso convierte la moneda del juego en algo que no vale nada.

El grave: abrir aquel portillo **marcaba la sesión entera como desbloqueada**.
Desde la portada se entraba después al portal del docente **sin volver a pedir
nada**: la lista de clase, las contraseñas de todos sus compañeros, los ajustes.
Un niño que veía cuatro cifras se llevaba el portal completo.

Así que el portillo se ha ido, y con él dos cosas más:

- **Solo hay una puerta.** El PIN se pide en un sitio, el de la portada, y no
  hay ningún campo de PIN en ninguna pantalla del alumno.
- **Salir del portal lo vuelve a cerrar con llave.** Antes el PIN valía para
  toda la sesión, así que un docente que salía y le pasaba la tablet a un niño
  se la pasaba abierta. Volver a teclear cuatro cifras cuesta menos que eso.

Los méritos se conceden desde **Dirigir la clase**, en el equipo del docente,
que además es donde se dan a una cuadrilla, a la clase entera o a unos cuantos
elegidos a dedo de un solo toque. Y no hace falta nube: esa pantalla trabaja con
la lista de clase y los diarios de ese equipo.

### El PIN del docente, y por qué no basta con cambiarlo en el panel

`teacherPin` está en `js/config.js` y ahora mismo es `2026`. Se puede cambiar
desde *Configuración → Acceso y nube*, **pero eso vale solo para ese equipo**:
queda en el `localStorage` de ese navegador y no viaja a ninguna parte.

Y no viaja **a propósito**. Los ajustes que se publican para el equipo docente
los leen todos los alumnos —los necesitan para jugar—, así que el PIN va en la
lista de lo que nunca se comparte, junto con las contraseñas del alumnado y los
datos de Appwrite. Si viajara, cualquier niño podría leerlo desde su tablet.
(Las contraseñas sí llegan al otro equipo del docente, pero por un documento
que solo puede leer su cuenta, no por los ajustes de la clase.)

O sea que hay dos formas, y conviene elegir a sabiendas:

| | Cómo | Alcance | Pega |
|---|---|---|---|
| **En `js/config.js`** | Cambiar el valor y volver a publicar | **Todas** las tablets, incluidas las nuevas | Queda a la vista de quien mire el código fuente del sitio |
| **En el panel** | *Acceso y nube → PIN* | Solo ese equipo | Hay que repetirlo en cada tablet |

Para un juego de tablets de aula, lo práctico es lo primero: el PIN existe para
que un niño no entre al portal del docente por curiosidad, no para resistir a
quien se ponga a leer el código. Si en tu grupo hay alguien capaz de abrir el inspector, entonces
lo segundo, tablet por tablet.

Cambia también `teacherPin`. Y ojo: **el PIN es una barrera de aula, no seguridad real** — el código se ejecuta en el navegador y un alumno curioso puede leerlo. Sirve para que un niño no entre al portal por curiosidad, no para resistir a quien quiera saltárselo. Por eso mismo no se teclea nunca en la pantalla de un alumno.

### Cómo entran los alumnos

Los niños escriben **usuario**, no email (más fácil a los 8–10 años). Internamente se convierte en `usuario@` + `usernameDomain`. Appwrite exige contraseñas de **8 caracteres como mínimo**, y el panel lo avisa en la propia ficha del alumno si te quedas corto.

> **Escribir la contraseña en la lista de clase NO crea la cuenta.** La lista vive en el equipo; la cuenta hay que darla de alta en Appwrite con **Crear las cuentas**. Hasta que no se pulsa, ese alumno no puede entrar, y Appwrite responderá lo mismo que si la contraseña estuviera mal —lo hace a propósito, para que no se pueda averiguar quién tiene cuenta probando—. Por eso cada ficha dice lo que le falta.

> **«Crear las cuentas» crea la cuenta, no el diario.** El diario nace cuando el niño entra por primera vez, con permiso solo para él —es lo único que Appwrite permite—, y nace suelto: sin clase y sin docente. **🔗 Vincular los diarios a esta clase** se lo pone después, y es lo que hace que aparezca en la vista de clase. Aun así conviene dar de alta desde el panel en vez de dejar que cada uno se registre con **Soy nuevo**: así la lista guarda el identificador de su cuenta, que es lo que permite vincularlo sin confundir a dos alumnos con el mismo nombre.

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
   («ha ayudado a su compañera»), sin salir a otra pantalla. Y a **una cuadrilla
   entera** desde el botón 🏅 de su título, a **toda la clase** desde la barra de
   arriba, o a **un puñado elegido a dedo** con ☑️ *Elegir a varios*: un toque en
   vez de una parada por niño.
6. **Terminar turno** cierra la ronda cuando haga falta: se puntúa solo lo
   respondido, no las preguntas que nadie llegó a ver.

Por dentro es exactamente una expedición: mismo motor adaptativo, mismo dominio
por estratos, mismas reglas anti-grinding. Lo único que cambia es quién toca la
pantalla.

> **Si la tablet no puede guardar, se dice.** Con el almacenamiento del navegador
> lleno —o en una ventana privada— cada respuesta parecía guardarse y no se
> guardaba ninguna, sin que la pantalla cambiara en nada. Ahora sale una barra
> roja que lo dice y qué hacer, y se retira sola en cuanto vuelve a poder. En
> clase dirigida esto importa el doble: ahí no hay nube que haga de red.

> **Si los ajustes no caben, se dice antes de mandarlos.** El campo de la clase
> admite 200 000 caracteres. Los retos con IA viven en su propia tabla y no
> cuentan, pero los escritos a mano antes de configurarla se quedan dentro de
> los ajustes. Ahora se mide antes de subir y el aviso dice cuánto ocupa,
> cuántos retos lo llenan y qué hacer, en vez del error crudo de Appwrite.

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

### A una cuadrilla entera, de una vez

«Los Jaguares han recogido el campamento» se dice una vez, y darla de alta
costaba seis paradas: abrir la bolsa de cada niño, pulsar, cerrar, buscar al
siguiente. Con la clase delante eso no se hace, se deja para luego, y luego no
se hace.

En **Dirigir la clase**, cada título de cuadrilla lleva un botón 🏅 que abre sus
méritos ahí mismo, bajo su propio título; en la barra de arriba hay otro para
**toda la clase**, que es lo que más se dice. Un toque y lo tienen todos.

Tres cosas que lo hacen fiable:

- **Es el mismo mérito**, no una vía rápida con reglas propias: por dentro abre
  el diario de cada uno y llama a la misma función que si se diera uno a uno.
  El tope diario, los Doblones y el recuento del trimestre son exactamente los
  suyos.
- **Cada botón dice a cuántos les cabe hoy antes de pulsarlo** («a 4 de 6»), así
  que no hay sorpresa.
- **Se dice a quién no le llegó.** Un premio de grupo que calla eso es un premio
  que crees haber dado y el niño no ha recibido.

A quien ya llegó a su tope no se le cuenta dos veces, venga el mérito por donde
venga: dárselo suelto en su bolsa y luego a su cuadrilla no le da dos.

### Y a un puñado suelto, elegido a dedo

No todo lo que pasa en un aula es una cuadrilla: los cuatro que recogieron la
biblioteca, los tres que salieron a la pizarra. **☑️ Elegir a varios** convierte
las fichas en casillas: se toca a quien sea —de cuadrillas distintas, da igual—,
la barra de arriba dice cuántos van, y de ahí sale el mismo panel de méritos.

- Lo marcado son **diarios, no nombres**. Con dos alumnas que se llaman igual,
  marcar por nombre marcaría a las dos.
- Mientras se elige, los botones de cuadrilla y de clase entera **se apagan**:
  son otro grupo distinto pidiendo el mismo toque.
- **Dar turno cierra el modo**, porque al volver una selección a medias de hace
  diez minutos ya no es la que tenías en la cabeza.

## Retos escritos por IA (a partir de tu currículo)

En **Configuración → 🤖 Retos con IA**: pegas o subes el currículo de tu área,
eliges pozo, estrato, curso y cuántos, y lo generado cae en una **cola de
revisión**. De ahí lo apruebas, cambias la pregunta o lo descartas. **Nada entra
en el banco sin que lo leas**, igual que con los acertijos que inventan los
niños.

**Cómo desplegarlo, paso a paso: [`GUIA-GENERADOR.md`](GUIA-GENERADOR.md).**
Quince minutos. Los detalles técnicos, en `functions/generador/README.md`.

> Ojo con el tiempo máximo de la función: de fábrica son 15 segundos y hacen
> falta 300. Es donde se atasca todo el mundo.

**La clave de la API la pone cada docente en su panel** y se queda en su
navegador: no viaja a las tablets ni entra en la copia de seguridad, que se
lleva en un pincho y se manda por correo. Se le pasa a la función en cada
petición y allí no se guarda, así que **cada uno paga lo suyo** en vez de
compartir una factura. Quien no tenga la suya usa la del centro, si quien montó
la función puso una en su variable de entorno.

> Crea la clave con **límite de gasto**. Una clave en un ordenador de sala de
> profesores está ahí para quien se siente después; con techo, lo peor que
> puede pasar lo tiene.

El currículo y la cola **se quedan en tu equipo**: son decenas de miles de
caracteres que a un niño no le sirven, y un borrador sin aprobar no se enseña.
Si trabajas desde dos dispositivos, el currículo se pega en cada uno.

**La clave de la API no puede vivir en el navegador.** La app es un sitio
estático que se sirve a cada niño y los ajustes de la clase viajan a su tablet.
Por eso hay una función: la clave está en su variable de entorno y no sale del
servidor. Una prueba comprueba que no aparezca en nada que se sirva al navegador.

### Lo que se comprueba antes de enseñarte un reto

Cuatro barreras, y ninguna sobra:

1. **El esquema de salida.** Cuatro opciones, índice de 0 a 3, dos pistas,
   explicación, concepto y cita del currículo. El modelo no puede devolver otra
   forma.
2. **El validador** (`js/generador.js`): opciones repetidas aunque cambien las
   tildes, la correcta mucho más larga que las demás (se acierta midiendo, no
   pensando), tres números y una palabra (esa se descarta sola), concepto que no
   es del catálogo o es de la otra materia, pistas que dicen lo mismo.
3. **La comprobación aritmética.** Si la pregunta es una operación entre dos
   números y las cuatro opciones son números, se calcula y se compara con la
   marcada. Y **calla cuando no puede estar segura**: una comprobación que
   adivina descarta retos buenos, y entonces el docente deja de fiarse.
4. **La segunda pasada.** Se le da el reto ya escrito y se le pide que lo
   resuelva sin ver cuál está marcada. Si no coincide, fuera — sin intentar
   decidir cuál de las dos tiene razón: un reto sobre el que dos lecturas no se
   ponen de acuerdo ya no sirve para un niño de nueve años.

Todo eso existe por una sola razón: **un reto con la respuesta correcta mal
marcada le dice «has fallado» a un niño que acertó.** En una plataforma cuyo
primer principio es que el error no penaliza, eso es peor que no tener
generador.

> **El validador es el mismo fichero en la tablet y en el servidor.**
> `tools/sync-generador.py` lo copia, y una prueba comprueba que la copia no se
> quede vieja: si se separan, uno acepta lo que el otro rechaza y nadie se entera.

### Lo que también se enseña

Lo que se ha **tirado** en la última tanda, con el motivo. No llega a la cola,
pero se ve: si se tiran muchos, casi siempre es que el currículo pegado no cubre
lo que se está pidiendo, y eso solo se sabe mirándolo.

Al aprobar se **vuelve a validar**: entre generar y aprobar, el docente ha podido
cambiar la pregunta a mano y dejar la cuenta sin cuadrar.

### Lo que sigue sin garantizar nadie

La última lectura es la tuya. Un modelo que se equivoca y un docente que aprueba
sin leer dan el mismo resultado.

## Medido en pantalla, no supuesto

La interfaz se audita con el navegador midiendo: objetivo táctil de cada
control, contraste de cada texto contra su fondo real, tamaño de letra, ancho
de 320 a 1440 px y número de toques de cada tarea.

| Tarea | Toques |
|---|---|
| Un niño nuevo, de la portada a su primera pregunta | 4 (más teclear su nombre) |
| Responder y pasar a la siguiente | 2 |
| Desde el mapa, comprar en el almacén | 2 |
| El docente, de la portada al turno de un alumno | 4 (más el PIN) |
| Conceder un mérito sin salir del turno | 1 |
| Comprarle algo a un alumno sin darle turno | 2 |
| Del portal al cuaderno de un alumno | 2 |

Contraste: **ninguna** combinación por debajo de AA. Sin desborde horizontal en
ninguno de los siete anchos, tampoco con la letra grande puesta. El movimiento
desaparece entero con `prefers-reduced-motion`.

> **Sobre la legibilidad del texto.** Los índices de lectura (Fernández-Huerta)
> salen bajos en el Mapa y en los pozos, y es un falso positivo: penalizan las
> palabras largas, y ahí casi todo son NOMBRES —«Matemáticas», «Engranajes»,
> «Cantimplora»—, no prosa. Lo que sí se mide bien es la frase: entre 3,5 y 7,8
> palabras por frase en las pantallas del alumno.

## Lo que esta plataforma NO protege

Auditado inyectando cargas hostiles por cada entrada real, no leyendo el código.
Lo que se encontró está arreglado y fijado con pruebas; lo que queda es
deliberado, y conviene saberlo antes de repartir tablets.

**El PIN es una barrera de aula, no seguridad.** El código se ejecuta en el
navegador del niño: quien sepa abrir la consola lo lee. Sirve para que nadie
entre por curiosidad, no contra alguien que quiera entrar. Y **cambiarlo desde
el panel vale solo para ese equipo** —no puede viajar, porque los ajustes de la
clase los leen los alumnos—, así que las demás tablets siguen con el de
`js/config.js`, que es el único sitio que vale para todo el despliegue.

**Las contraseñas del alumnado se guardan en claro en el equipo del docente.**
Es lo que permite reimprimir la hoja de credenciales cuando un niño pierde la
suya. No viajan a ninguna otra tablet ni a los ajustes compartidos, pero en un
ordenador de sala de profesores están ahí. Si el equipo es compartido, usa un
perfil de navegador propio.

**Y en la nube, en claro también, en un documento tuyo.** Es lo que hace que la
hoja de credenciales esté en tus dos equipos. Lo que lo protege son los permisos
por documento de Appwrite: `read`, `update` y `delete` solo para tu cuenta. Un
alumno tiene el rol `users` y nada más, así que no puede leerlo — pero quien
entre en tu cuenta de Appwrite, o quien administre el proyecto, sí. Es el mismo
riesgo que ya tenía el documento de la clase, y la misma llave: la contraseña de
tu cuenta de docente.

**Cerrar sesión no borra los diarios de la clase de ese equipo.** Borra el
diario personal del dispositivo, no el archivo de la clase dirigida: es
deliberado —el docente cierra sesión entre clases y no puede perder el trabajo
del día— pero significa que en una tablet compartida los diarios siguen ahí.
Para vaciarla del todo: *Configuración → Copia de seguridad*.

**Quien pueda escribir en el documento de una clase escribe en las tablets de
sus alumnos.** Los ajustes viajan de ahí a cada dispositivo. Lo que lo protege
son los permisos por documento de Appwrite: ese documento pertenece a la cuenta
del docente y nadie más puede tocarlo. Por eso la contraseña de esa cuenta es
la llave de verdad de todo esto, y no el PIN.

Lo que sí está cubierto, y probado: el texto que teclea cualquiera —docente,
alumno o el resumen que sube el cliente de otro niño— se escapa al pintarlo; y
ni la configuración compartida ni un diario que llegue de la nube pueden
contaminar el prototipo de `Object`.

## Panel de Configuración

**Portada → 🧔🏻‍♂️ Soy docente → ⚙️ Configurar la expedición** (pide el PIN).

Trece secciones, repartidas en dos grupos. No es una manía de orden: la tira
de secciones no cabía en una tablet y se medía **1 sección visible de 13 en un
móvil**, con casi dos mil píxeles detrás de un scroll lateral que nadie ve que
está ahí. Ahora delante va lo que se abre cualquier martes, detrás lo que se
monta una vez por trimestre, y en pantalla estrecha el segundo grupo empieza
plegado —con su nombre y su flecha a la vista, que es lo que le faltaba al
scroll—. El panel abre por **Alumnado**.

**El día a día**

| Sección | Qué puedes cambiar |
|---|---|
| 👥 Alumnado | Tu nombre y el de la clase, la lista de alumnos, y **crear sus cuentas de golpe** |
| 🏅 Comportamientos, tareas y actividades | Crear, editar y retirar reconocimientos: icono, nombre, Doblones, tope diario y categoría. **Se conceden desde la ficha del alumno en «Dirigir la clase»**, sin pedirle la tablet: el mismo sitio desde el que se le compra en el almacén o se dona al Fondo. Y **a una cuadrilla entera, a toda la clase o a unos cuantos elegidos a dedo, de un toque**, con el tope diario de cada niño intacto |
| 🏛️ Yacimientos y pozos | **Crear yacimientos y pozos nuevos y escribir los retos de cada estrato**, además de renombrar y ocultar. Con la IA configurada, una **asistente** propone el yacimiento entero desde tu currículo o completa el que ya tienes, y un **inspector** dice qué pozo no lo ve nadie, cuál se queda a medias y cuál repite concepto. Los pozos **de fábrica** también tienen banco: lo que escribas ahí se sirve antes que sus retos automáticos, y cuando se agota el pozo sigue generando solo |
| 🤖 Retos con IA | Tu clave de la API, el currículo de tu área, y la **cola de revisión**: nada escrito por IA entra en el banco sin que lo apruebes |
| ✍️ Taller de Cartografía | Los acertijos que escriben los niños, esperando a que alguien los lea |

Las dos últimas son colas: alguien escribió algo y espera. Por eso van aquí y
no con lo de preparar el curso.

**Preparar la expedición**

| Sección | Qué puedes cambiar |
|---|---|
| 📅 Curso y trimestres | Nombre del curso y las fechas de los tres trimestres |
| 🛖 Cuadrillas de excavación | Crear equipos, **asignar alumnos marcando casillas**, **repartir los roles** (Cartógrafo, Descodificadora, Guardián, Cronometradora, Ilustrador y el Intendente de Campo, con tope de dos), **rotarlos al terminar la semana**, fijar la meta común y la aportación. Con alumnos asignados, la lista de **Dirigir la clase** se agrupa por cuadrillas —con cuántos han salido hoy en cada una— y un interruptor vuelve a la lista de todos |
| 🏪 Almacén | Añadir, retirar y reajustar precios de los artículos cosméticos |
| ⚖️ Economía | Retos por misión, Doblones de cada fuente, topes diarios, minutos hasta la fatiga, bolsa inicial… |
| 🗿 Cámara del Guardián | La prueba sumativa de cada pozo: cuántos retos, cuánto hay que acertar y cada cuánto se puede repetir |
| 🌍 Fondo de la Sociedad | La meta común de toda la clase y lo que lleva donado |
| 🔐 Acceso y nube | PIN del panel, datos de Appwrite y el Function ID del generador |
| 💾 Copia de seguridad | Exportar los ajustes para llevarlos a otra tablet, importarlos y restaurar los de fábrica |

Los cambios se aplican **al instante**: renombras un pozo y el mapa ya lo muestra así.

> **El icono se elige de un banco.** Junto a cada campo de icono —yacimientos,
> pozos, reconocimientos, cuadrillas, almacén e hitos del Fondo— hay un botón
> 🎨 que abre 149 emojis agrupados por para qué sirven aquí: Excavación,
> Matemáticas, Lengua, Comportamiento… Escribir un emoji a mano sigue
> valiendo; el banco es para no pelearse con el teclado de emojis de una
> tablet. Todos los iconos que la app trae de fábrica están dentro, así que
> cambiar uno por error siempre se puede deshacer.

> **Un pozo aparece en el mapa cuando tiene al menos un reto en su primer
> estrato** (Recordar), y un yacimiento cuyos pozos están todos así no le sale
> a nadie. Es a propósito: un pozo que se abre y no tiene nada dentro es peor
> que no verlo. El panel lo avisa en el propio yacimiento y en el pozo, con
> qué hacer para que aparezca. Los pozos de fábrica siempre son jugables,
> porque generan retos solos.

> Los diálogos de PIN y de confirmación son propios de la app, no del navegador: dentro de un iframe con `sandbox` sin `allow-modals` (como el visor de Artifacts) `prompt()` devuelve `null` y `confirm()` devuelve `false`, así que el panel no llegaba a abrirse y los borrados se cancelaban solos.

Tres cosas que conviene saber:

- **Con una clase abierta, los ajustes suben y bajan solos.** Al arrancar se traen los de la clase, así que un yacimiento creado en el portátil aparece en el iPad al abrirlo. No se baja nada si este equipo tiene cambios sin subir —sería perderlos—, ni si la copia de la nube es más vieja que lo último que este equipo vio.
- **Cada cambio se guarda aquí y en tu clase.** Cada cambio del panel se guarda en este equipo y, unos segundos después, en el documento de tu clase — el banco de retos incluido. La línea de arriba del panel dice dónde están: *guardados aquí y en tu clase*, *subiendo*, o **sin subir**, que es cuando hay que hacer una copia. Si la subida falla no se da por hecha: queda pendiente y se reintenta al siguiente cambio, al abrir la clase y al dejar la app.
  Lo que sube es la versión filtrada: **nunca** las contraseñas del alumnado, el PIN, los datos de Appwrite ni la clave de la API. El documento de la clase lo leen las tablets de los niños.
  **Sin clase abierta** (modo local, o Appwrite sin configurar) los ajustes viven solo en ese navegador, y entonces la copia de seguridad es la única red. Ojo con esto en un iPad: iOS borra el almacenamiento de un sitio que no se abre en unos días si no está instalado en la pantalla de inicio.
- **Retirar algo del catálogo no borra lo ya ganado.** Si quitas un reconocimiento, los méritos que ya concediste siguen en el diario de los niños. Igual con el almacén: quien compró una prenda la conserva.
- **Restaurar los valores de fábrica solo borra tus ajustes**, nunca el progreso de los alumnos.

## Dar de alta a tu clase

**Configuración → 👥 Alumnado.** Ahí pones **tu nombre** y el de la clase (aparecen en la portada y en la sala de mapas), y montas la lista de alumnos.

Para cargarla entera, pega los nombres —uno por línea— y se generan solos el usuario y la contraseña de cada uno:

- **Usuario:** el nombre sin tildes ni espacios, en minúsculas, garantizando que no se repita.
- **Contraseña:** una palabra del mundo del juego más cuatro cifras (`brujula4271`). Cumple el mínimo de 8 caracteres de Appwrite y un niño de 8 años puede teclearla. Puedes cambiar ambas cosas a mano.

Con Appwrite configurado aparece **🎒 Crear cuentas**: da de alta en Appwrite las que aún no existan, **sin tocar tu sesión**. El registro te dice qué pasó con cada alumno; si Appwrite pide bajar el ritmo, se detiene ahí y te lo explica en castellano en lugar de seguir martilleando el servidor. Al terminar tienes una **hoja de credenciales** lista para repartir: cada niño solo necesita su línea.

Si alguna ficha llegó sin usuario o sin contraseña —escrita a mano, o traída de una copia antigua— **🔑 Completar fichas sin credenciales** rellena lo que falte de una vez, sin tocar lo que ya esté puesto. No se ofrece para quien ya tiene cuenta creada: inventarle ahí una contraseña no cambia la de Appwrite, y el niño se quedaría fuera con un papel en la mano.

### La lista de clase y las contraseñas, en tus dos equipos

La lista de clase **no viaja en el documento del aula**, y esto es lo más serio
que hay que entender del reparto de datos. Ese documento lo puede leer
**cualquier cuenta con sesión** —los alumnos lo necesitan para jugar, y los
datos de conexión están en el JavaScript que se sirve—, así que a un niño le
bastaba con pedirlo para tener el nombre, los apellidos, el curso y **el usuario
con el que entra** cada uno de sus compañeros. Iba sin contraseñas, sí; pero el
usuario es media credencial, y estas contraseñas son de aula: una palabra y
cuatro cifras, para que las teclee alguien de ocho años.

Así que la lista va por un canal aparte: **un documento propio, en la misma
colección `aulas`, con permisos solo para tu cuenta**. Su id es el de la clase
con el sufijo `-cred`, lleva la lista entera —contraseñas incluidas, que ahí
dentro no hay a quién esconderlas— más tus notas para las familias, se sube con
cada cambio y se recupera sola al abrir la app con la clase abierta. En la lista
de clases no aparece.

> **Lo que sí sigue viajando son las cuadrillas**, con los nombres de sus
> miembros: un niño ve quién está en su equipo dentro de su propia app, y eso es
> lo mismo que ve girando la cabeza en clase. Lo que se ha quitado del documento
> público es la lista completa con los usuarios, que es lo que no debía estar.

> **Los documentos escritos antes de este cambio siguen llevando la lista
> dentro.** Adoptarlos no la borra —hay que volver a escribir el documento—, así
> que al abrir la clase la app detecta que el documento es antiguo y programa la
> subida que lo limpia. Se cierra solo, sin que tengas que hacer nada.

Cuatro detalles que evitan perder algo:

- Un equipo que **no** tiene contraseñas nunca vacía el documento del que sí.
- Un equipo que conoce tres de veinticinco **mezcla**, no reemplaza: las otras veintidós siguen ahí.
- Lo que ya está puesto en un equipo **no se pisa** con lo que baje de la nube.
- Y con la lista, igual por partida doble: un equipo sin lista no le vacía la
  clase al que la tiene, y un equipo con la lista **de ayer** no pisa la de hoy.
  Es el caso de dar de alta a un alumno en el portátil y tocar cualquier ajuste
  en la tablet antes de que le llegue; sin esa cautela, el alumno nuevo
  desaparecía de los dos sitios.

> **Cambiar la contraseña en la lista no cambia la cuenta.** Atlas no sabe cambiar contraseñas en Appwrite: lo que escribes ahí es el papel que repartes, no la credencial de la cuenta. El panel te lo dice en el momento en que editas la de un alumno que ya tiene cuenta. Para cambiarla de verdad, hazlo desde la consola de Appwrite.

Si un alumno aparece con cuenta creada y sin contraseña, es que se puso en otro equipo y este todavía no la ha recuperado: entra al panel con la clase abierta y bajan solas. Sin Appwrite configurado no hay de dónde traerlas, y hay que mirarlas en el equipo donde se crearon.

> **Vincular y buscar necesitan tu sesión; crear las cuentas, no.** Dar de alta
> una cuenta es un alta pública de Appwrite y funciona sin haber entrado.
> Adoptar el diario de un niño lo haces tú con tu cuenta, así que sin sesión
> esos dos botones salen apagados y se dice por qué. Antes se ofrecían igual y
> fallaban una vez por alumno, con el nombre interno de la comprobación en
> pantalla: una lista de «✘ NADIA — sin-nube» que mandaba a mirar la red cuando
> lo que faltaba era entrar.

### Qué se guarda de un alumno, y cómo borrarlo

La portada le dice a la familia que puede pedir ver lo que se guarda de su hijo
y pedir que se borre. Eso es una promesa, y hasta ahora la app no sabía
cumplirla: los datos de un niño estaban repartidos por seis sitios y no había
forma de reunirlos ni de quitarlos de todos a la vez.

El **🔐 de cada ficha** de la lista de clase abre su inventario: lo que hay en la
lista, lo que hay en su diario, su cuadrilla y su rol, tus notas para su familia,
y **dónde vive cada cosa**. Sin eso último, «borrar» es un botón que hay que
creerse.

- **📄 Descargar esta ficha** la deja en un HTML que se imprime y se archiva. No
  imprime la contraseña: es un documento que se enseña, y esa se entrega aparte.
- **🗑️ Borrar todo lo suyo** se lleva su diario (con la clave nueva y con la
  antigua del nombre), su ficha de la lista, sus notas, su sitio en la cuadrilla
  y **su rol** —uno suelto reaparecería al rotar—, su entrada del documento
  privado y su diario de la nube. Pide el nombre escrito antes, igual que borrar
  una clase.

> **Lo que la app no puede hacer, lo dice.** Su cuenta de Appwrite no se borra
> desde aquí: el SDK del navegador no tiene servicio de usuarios, y mientras la
> cuenta siga el niño puede entrar y empezar un diario nuevo. Eso se hace en la
> consola, en *Auth → Users*. Y si tu cuenta no tiene permiso para borrar
> diarios, se dice cuál falta y dónde se da: colección de diarios → *Settings →
> Permissions → Team «docentes» → Delete*, que es un permiso aparte del de leer
> y escribir. Un borrado a medias que se da por hecho es peor que no borrar.

## Evaluación por criterios

Es el punto donde la plataforma se encuentra con el papeleo del centro sin
traicionar su propio diseño. **Atlas no pone notas y esto no las pone tampoco**:
el niño no ve ninguna, la familia tampoco, y hay pruebas que lo fijan. Lo que
hace es reunir lo que ya está medido y agruparlo por **tus** criterios, para que
la calificación que pide Séneca, Rayuela o quien sea la pongas mirando una tabla
en vez de traduciendo veinticuatro informes a mano.

**Configuración → 📋 Evaluación por criterios.** Escribes el código y el texto
tal y como estén en tu programación y marcas qué conceptos de la app los
trabajan. Se hace una vez por curso.

### O se los saca la IA a tu currículo

El currículo que pegaste en **Retos con IA** ya trae dentro tus criterios de
evaluación y sus saberes básicos. **🤖 Leer el currículo y proponer** los lee y
te los devuelve con los conceptos de la app que le corresponden a cada uno.

Tres reglas que hacen que la propuesta se revise deprisa:

- **No reescribe.** El criterio y los saberes se copian *literalmente* del
  texto. Lo que llevas a la programación del centro tiene que ser lo que dice el
  currículo, palabra por palabra, no una paráfrasis nuestra.
- **No inventa criterios** que no estén en el texto, ni códigos que tu centro no
  use: si el currículo no viene numerado, el código se queda vacío.
- **No inventa conceptos.** Solo puede marcar los del catálogo, y si ninguno
  encaja deja la lista vacía. Ese criterio llega **sin marcar** y lo dice: *«ningún
  concepto de la app mide esto»*. Puedes añadirlo igual —está en tu
  programación— pero saldrá vacío en la tabla, y eso es información, no un fallo.

Nada se guarda sin que lo revises: la propuesta es una lista de casillas y hay
que aceptarla.

### Y si un criterio no tiene actividades, se dice

Cada criterio de tu lista muestra **cuántos retos hay en la clase** de lo que
mide, contando el banco escrito a mano y la tabla de retos. Si alguno de sus
conceptos no tiene ni uno, sale el aviso con cuál: la tabla de evaluación no
podrá decir nada de esa parte hasta que los haya. Es la diferencia entre
enterarse en septiembre y enterarse en diciembre. Después, **Calcular la tabla** da una fila
por alumno y una columna por criterio, acotada al trimestre que elijas.

Cada celda lleva tres cosas, y las tres importan:

| | Qué es |
|---|---|
| **90 %** | Aciertos sobre intentos en los conceptos de ese criterio |
| **9/10** | La evidencia que hay detrás. Sin esto, el porcentaje no se puede juzgar |
| **Sobresaliente** | El nivel que sugiere ese porcentaje, solo si hay evidencia suficiente |

> **Con menos de 8 intentos no se propone nivel** y la celda sale gris: un 100 %
> de tres respuestas no es un sobresaliente, es un 100 % de tres respuestas. Y
> un criterio sin intentos sale vacío, no a cero: «no lo hemos trabajado» y «lo
> hizo mal» se parecen en una tabla y no son lo mismo — uno se lleva a la nota y
> el otro a la programación.

**Se descarga en CSV de dos formas**, porque se usan para dos cosas: la ancha se
pega en la hoja de cálculo del centro, y la larga —una fila por alumno y
criterio, con aciertos e intentos— se filtra y se ordena. Las dos con punto y
coma y BOM, que es lo que abre bien un Excel en español sin tocar nada.

Para poder acotar al trimestre, cada concepto guarda ahora también sus intentos
y fallos **por trimestre**. Un diario anterior a este cambio no tiene ese
desglose y lo dice, en vez de repartir a ojo: sus columnas de trimestre salen
vacías y el total sigue estando.

> La tabla necesita el diario **completo** de cada alumno, no el resumen: el
> resumen lleva solo los seis conceptos que peor van, y una evaluación hecha con
> eso sería una evaluación de lo que falla. En clase dirigida están en el equipo;
> con el alumnado entrando desde casa hay que traerlos uno a uno, así que tarda.

### Menos dato desde el origen

Al pegar la clase de golpe hay una casilla: **guardar solo el nombre y la
inicial**. «Vega Serrano» se guarda como «Vega S.». El apellido completo de un
menor es un dato personal y aquí no hace falta para nada: lo único que tiene que
hacer el nombre es que sepas de quién hablas.

El **usuario se genera del nombre completo** aunque se guarde acortado, porque
dos «Vega S.» de apellidos distintos tienen que poder distinguirse al entrar, y
el usuario es lo que las separa en toda la app. La casilla viene desmarcada: no
se toca lo que escribe el docente sin que lo decida.

### El diario nace cuando el niño entra, y luego se vincula

Son dos momentos, y conviene saberlo porque explica lo que se ve en pantalla:

1. **Crear las cuentas** da de alta la cuenta de cada alumno. Nada más.
2. El niño entra con su línea de la hoja y **ahí nace su diario**, con permiso solo para él.
3. **🔗 Vincular los diarios a esta clase** les pone tu clase y tu nombre. Hasta ese momento son diarios sueltos: existen, pero la vista de clase no sabe que son tuyos.

Se puede pulsar «Vincular» las veces que haga falta, según vayan entrando; de quien todavía no ha entrado dice justo eso, y no cuenta como fallo.

#### Las cuentas creadas antes de que se guardara el identificador

A esas fichas les falta el id de la cuenta y **no hay forma de recuperarlo**: dar de alta un correo que ya existe contesta «already exists» sin devolver el id, y «Crear las cuentas» salta a quien ya está marcado como creado. Queda un camino, y es el único: **el id del documento de un diario es el id de la cuenta de ese niño**, y tu cuenta puede leer la colección.

**🔍 Buscar el diario de N alumno(s)** hace eso: lista los diarios, los empareja por el nombre y rellena el identificador que falta. Después ya se pueden vincular como los demás.

Emparejar por nombre es justo lo que se quitó del resto de la app, así que aquí se hace con cuidado:

- **Nunca toca el diario de otro docente.** Un diario con dueño distinto del tuyo, o de otra clase, ni siquiera se enseña: proponerlo sería invitar a pisarlo.
- **Un nombre que aparece dos veces entre los diarios no se empareja.** Te lo dice y no toca ninguno; elegir uno al azar sería escribir en el diario del niño equivocado.
- El nombre se compara sin tildes ni dobles espacios.

> **Por qué el panel no crea el diario él mismo.** Lo intentaba, y Appwrite lo rechaza: **solo se pueden repartir permisos que uno tiene**, y tú no eres tu alumno, así que no puedes darle a él permiso de lectura sobre nada. El error salía como `Permissions must be one of: (any, users, user:<tu id>, team:<docentes>…)`, que parece un problema de configuración y no lo es.
>
> Crearlo con tus permisos a secas habría sido peor que no crearlo: el niño no podría **ni leer ni escribir su propio diario**, su app lo daría por inexistente, intentaría crear uno con el mismo identificador, chocaría, y se quedaría sin sincronizar en silencio todo el curso.

Y dos detalles más:

- **Quitar a alguien de la lista no borra su cuenta ni su diario.** Sale de tu lista y de las cuadrillas, pero puede seguir entrando. La app te lo recuerda antes de hacerlo.
- **Dos alumnos pueden llamarse igual.** Ver abajo.

### Dos alumnas con el mismo nombre

Pasa en cuanto la lista mezcla cursos: una Sarah en 2.º y otra en 4.º. Antes la segunda se rechazaba al añadirla («ya está en la lista») y, si entraba de otra forma, las dos **compartían diario, cuadrilla y rol**: lo que hacía una se lo encontraba la otra.

Lo que identifica a un alumno es su **usuario**, no su nombre. El usuario no se repite —la lista lo genera distinto para cada uno: `sarah`, `sarah2`— y no cambia cuando corriges un nombre.

- Al añadir de golpe, escribe el curso detrás: `Mara Ibáñez, 4` (vale también `Mara Ibáñez (4.º)`). Sin curso va al de la clase. Solo se rechaza como repetido quien coincide **en nombre y en curso**.
- La ficha de un nombre repetido lo dice, y **la hoja de credenciales añade el curso** en esas líneas: `Sarah (2.º) → usuario: sarah`. Una hoja con dos líneas «Sarah» es una hoja que se reparte mal.
- Los diarios guardados antes de esto están bajo el nombre y **se mudan solos** a la clave del usuario, una vez, al arrancar. La mudanza nunca pisa un diario que ya esté en el destino, y quien entró antes de estar en la lista conserva el suyo.

### Comprar y donar sin que el alumno entre

En clase el niño lo pide en voz alta —«me compro el sombrero», «dono diez al
Fondo»— y con veinticinco críos esperar a que cada uno entre en la app se come
la sesión. El docente lo hace desde **Dirigir la clase**, por dos caminos
porque las dos cosas pasan:

- **Desde la lista**, el botón 🪙 de la esquina de cada tarjeta, sin darle turno.
- **Dentro de un turno**, *Su bolsa: comprar o donar*, debajo de los méritos.

Lo que ve el docente es su bolsa real: lo que ya tiene sale marcado y lo que no
puede pagar dice **cuánto le falta**, para no tener que restar en alto delante
de la clase.

> Pasa por las mismas funciones que usa el niño (`buyItem`, `donateToFund`), así
> que las reglas son exactamente las suyas: sale de **su** bolsa de Doblones,
> nunca de sus PE, y no se le puede dejar a deber. Que lo haga el docente no
> abre ninguna puerta que el niño no tuviera.

Y el diario vuelve **al documento del que vino**. Esto no es un detalle: un
diario puede vivir en dos sitios de la misma colección —el id derivado del
nombre, en clase dirigida, o el de la cuenta del alumno si entró él— y sin
recordarlo, lo que el docente le compre acabaría en un segundo documento que el
niño no lee nunca.

### Quién es quién en la vista de clase

La lista de clase y los diarios se emparejaban **por nombre en minúsculas**, y
con dos «Mara Ibáñez» en cursos distintos la segunda desaparecía de la pantalla:
ni salía como alumna ni salía en «quién falta». Nadie se enteraba de que le
faltaba, que es justo lo contrario de para lo que existe esa lista.

Ahora se empareja en dos pasadas:

1. Por lo que **no se repite**: la clave del diario (que lleva el usuario
   dentro) y el id de la cuenta de Appwrite.
2. Solo para lo que quede suelto, **por el nombre** —un diario antiguo se
   guardaba así— y solo cuando ese nombre es único a los dos lados. Si hay duda
   no se empareja ninguno: adivinar es escribir en la ficha de quien no es.

> **Las cuadrillas siguen guardándose por nombre**, aquí y en el resto de la app
> (los roles, el mérito de grupo). Con dos alumnos que se llaman igual, cada
> cuadrilla se apuntaba a los dos y sumaba la aportación de ambos. Ahora ese
> nombre **no cuenta en ninguna** y la pantalla lo dice, con el arreglo: cámbiale
> el nombre a uno de los dos en la lista —«Mara I.» y «Mara S.»— y vuelve a
> asignarlos. Separarlos de verdad pide que las cuadrillas guarden el usuario en
> vez del nombre, y eso toca también los roles.

### Lo que se está perdiendo, no solo lo que falta

El aviso de «atascado» exigía que el estrato estuviera en `in_progress`, y un
estrato que llega a `mastered` **no vuelve nunca a ese estado** aunque el dominio
se caiga. Resultado: el que lo tuvo y lo está perdiendo —justo del que hay que
acordarse— no contaba como dominado ni saltaba como atascado. Ahora se decide
por el dominio y la fecha, no por la etiqueta, y lo que se está perdiendo se
marca aparte: pedagógicamente no es lo mismo que lo que nunca se ganó.

### El id de cada cosa es único

Crear una cuadrilla nueva le ponía siempre el id `cuadrilla`; un pozo nuevo, `pozo`; un yacimiento, `yacimiento`. **El id no es una etiqueta**: es lo que decide de qué pozo es un reto, en qué cuadrilla está un niño y qué artículo se compra, y la app resuelve un id devolviendo el primero que encuentra. Dos cosas con el mismo id son *la misma cosa* para toda la plataforma.

Se veía así: marcabas alumnos en la segunda cuadrilla y aparecían en la primera, la lista de clase pintaba el mismo grupo dos veces con las dos listas juntas, y dos pozos distintos compartían retos y progreso.

- Al crear algo, el id se busca **libre**: `cuadrilla`, `cuadrilla_2`, `cuadrilla_3`…
- Los **pozos y los yacimientos son únicos en toda la configuración**, no dentro de su padre: `findBranch()` los busca en todos los yacimientos.
- Una configuración **ya rota se repara al cargarla**, y la reparación se guarda y se sube. El primero conserva su id —y con él lo que ya se hubiera jugado—; se renombran el segundo y siguientes, que venían compartiéndolo todo y pasan a tener identidad propia.

### Cuadrillas sin erratas

Cuando hay lista de clase, los miembros de cada cuadrilla se marcan con **casillas** en lugar de escribirse a mano. Así el nombre siempre coincide exactamente con el del alumno, y desaparece el problema de asignar a alguien que no existe por una errata. A quien ya está en una cuadrilla se le deshabilita la casilla en las demás.

## Salud de la clase

Lo que se pierde en esta plataforma no se pierde con un error en pantalla: se
pierde en silencio. Una tablet que lleva una semana sin sincronizar, un diario
que dejó de poder leerse, la clave de la API agotada. Todo eso ya se sabía en
alguna parte —la barra de guardado, el estado de los ajustes, el diálogo de la
IA, la fecha de la copia— repartido por seis pantallas distintas, y el aviso
llegaba cuando ya no había nada que hacer.

**Configuración → 🩺 Salud de la clase.** Una sola lista, ordenada por lo que
cuesta cada cosa. Dos colores: rojo es «se está perdiendo trabajo ahora» y
naranja «va a doler pronto». Con todo en orden **no dice nada**, que es lo que
mantiene el panel legible: un aviso que sale siempre se aprende a ignorar en dos
semanas.

Lo que mira:

| | Qué avisa |
|---|---|
| **Este equipo no puede guardar** | Va la primera: mientras dure, cada respuesta que marques desaparece al cerrar la pestaña |
| **Diarios ilegibles** | Aquí y en la nube. Un alumno que no sale en la vista de clase aunque haya estado jugando |
| **Trabajo sin subir** | Diarios cuyo último cambio no consta arriba, con la antigüedad del más viejo |
| **Tablets calladas** | Quién lleva más de una semana sin que llegue nada suyo a la clase |
| **El curso solo aquí** | Sin clase en la nube y sin copia reciente, un perfil de navegador que se limpia se lo lleva todo |
| **Ajustes sin subir** | Los retos que aprobaste no han llegado a las tablets del alumnado |
| **La IA parada** | «Sin saldo» y «clave caducada» no se arreglan solos, y se descubrían con la clase delante |
| **El equipo llenándose** | Antes de que guardar deje de funcionar, no después |
| **Los ajustes sin sitio** | Cuántos retos escritos a mano viajan todavía dentro, que es el número que se puede arreglar |
| **Contraseñas solo aquí** | Appwrite guarda un resumen, no la contraseña: si se pierden hay que repartir de nuevo a toda la clase |
| **Cuentas sin identificador** | Existen y funcionan, pero sus diarios no se pueden vincular |

Cada aviso dice **qué se pierde** y **qué hacer**, y en qué pantalla se hace. Un
panel de diagnóstico sin salida es una lista de motivos para cerrarlo.

### Cambiar la contraseña en el panel no la cambia en Appwrite

Es la trampa más cara de todas, porque no se parece a un error. Se le cambia la
contraseña a una ficha que **ya tiene cuenta creada**, el panel enseña tan
tranquilo la nueva, la hoja de credenciales la reparte, y Appwrite sigue con la
de antes. El alumno la escribe bien y la app le dice que la compruebe. Se pasa
la tarde probando.

La app **no puede** cambiarle la contraseña a un alumno desde el navegador: eso
necesita el servicio `users` de Appwrite, que no existe en el SDK web y no puede
existir, porque este código se sirve a la tablet de cada niño. Así que lo único
honrado es decirlo:

- **Toda ficha con cuenta creada** lleva la advertencia debajo de la contraseña,
  aunque no haya pasado nada. Es lo que se reparte; lo que abre la cuenta es lo
  que se puso al crearla.
- **Si además se detecta el desajuste**, se dice entero: al crear la cuenta se
  guarda una huella de la contraseña usada —no una segunda copia del secreto,
  que la lista ya lo guarda en claro para poder repartirlo— y si la de la ficha
  deja de coincidir, la ficha lo avisa con el correo exacto que hay que buscar
  en la consola de Appwrite y qué hacer allí.

Las cuentas creadas antes de esto no tienen huella y no pueden detectar el
desajuste. Por eso la advertencia general está siempre, y por eso existe lo de
abajo.

### 🔑 Probar una contraseña

Appwrite responde **exactamente lo mismo** a «esta contraseña está mal» y a «esa
cuenta no existe». Lo hace a propósito, para que no se pueda averiguar quién
tiene cuenta probando. El efecto secundario es que desde el panel no había forma
de contestar la única pregunta que importa: *¿esta contraseña abre su cuenta, sí
o no?*

El botón de cada ficha lo prueba de verdad, y luego cierra la sesión del niño
para no dejarle la cuenta abierta en el equipo del docente. No lee ni escribe
nada de su diario.

> **Tiene un precio y se dice antes de pulsar**: el navegador guarda una sola
> sesión, así que entrar como un alumno **cierra la sesión del docente**. Después
> se vuelve a entrar en «Mis clases». Se avisa con un diálogo que hay que
> aceptar; nunca se hace de callado.

Si contesta que sí, el problema no es la contraseña: es el usuario o la conexión
de esa tablet. Si contesta que no, la ficha dice cuál de las dos cosas mirar
primero.

### «No hay conexión» casi nunca es la conexión

Un alumno intenta entrar y sale *«No hay conexión con la Sociedad Geográfica.
Revisa la red»*. Se mira el wifi, que está bien. Se prueba otra contraseña, y
otra. Y el problema no era ninguna de las dos cosas.

Detrás de ese mensaje del navegador —`Failed to fetch`— hay **cuatro causas
distintas**, y la más común no tiene nada que ver con la red:

| Qué pasa de verdad | Dónde se arregla |
|---|---|
| El dispositivo no tiene conexión | Ahí sí, en el wifi |
| La tiene, pero no se llega al servidor | El filtro de la red del centro, o Appwrite caído |
| **Se llega perfectamente y el navegador tapa la respuesta** | **Appwrite → Settings → Platforms** |
| La app se abrió desde un fichero guardado en el móvil | Abrirla desde su dirección de internet |

La tercera es la que más tiempo se lleva. Si el proyecto de Appwrite no tiene
dada de alta la dirección desde la que se abre la app, Appwrite contesta con
normalidad y es **el navegador** el que descarta la respuesta por seguridad. La
app ve exactamente lo mismo que si no hubiera red, con el wifi a tope y todo lo
demás funcionando.

**Se distinguen, y con una sola petición.** Un `fetch` en modo `no-cors`
devuelve una respuesta opaca —no se puede leer nada de ella— pero *resuelve* si
el servidor contestó y falla si no se llegó. Eso es justo la línea entre «no hay
ruta» y «hay ruta y el navegador tapa lo que vuelve». Es una comprobación, no
una petición de datos: va sin sesión, sin contraseñas y sin mirar lo que
responde.

Así que la pantalla de entrada enseña el aviso al instante y lo **afina** en
cuanto lo sabe, con el nombre de la causa y el sitio donde se arregla. Y las
cuatro dicen lo mismo primero, porque es lo que hace perder la tarde: **la
contraseña no se ha llegado a comprobar, no es que esté mal.**

Al docente, que es quien puede arreglarlo, se le dice en dos sitios más:
**Acceso y nube** enseña la dirección exacta desde la que se abre esta copia de
la app —para copiarla en vez de teclearla— y **Salud de la clase** hace el mismo
diagnóstico cuando falla el pulso de los diarios.

### Lo que hay que ir a preguntar

Saber cuándo sincronizó cada alumno solo lo sabe la clase, así que va aparte y a
petición: el panel abre al instante con todo lo que se sabe sin red, y **📡
Comprobar quién ha sincronizado** añade lo demás. Se piden cuatro campos por
alumno —id, nombre y fecha—, no los diarios enteros: en una clase de
veinticinco son dos kilobytes en vez de medio mega. Un diagnóstico que tarda
cuatro segundos en aparecer no se abre nunca.

### Dos cosas que dejaron de callarse

**Lo que se sube se apunta.** Cada diario que llega arriba deja constancia de la
marca de tiempo que subió. Así «pendiente» pasa a ser una comprobación en vez de
una suposición, y un diario del que no consta ninguna subida cuenta como
pendiente: es lo honrado, no consta que haya salido de este equipo.

**Lo que la nube descartaba.** Al leer la clase, un documento sin nada dentro o
con el diario roto se saltaba en silencio. Ese niño no salía en la vista de
clase, tampoco en la lista de quien no ha entrado —porque entrar, entró— y su
trabajo seguía arriba, ilegible, sin que nadie lo supiera. Ahora se nombran, con
el motivo, y se distingue el documento vacío —casi siempre una cuenta recién
creada, y entonces no es un problema— del diario que de verdad está roto.

> El panel de salud es fontanería, no evaluación. No dice si un alumno va bien
> —para eso está la vista de clase—: dice que no se está perdiendo su trabajo.

## Lo que hace que un niño mire la pantalla

La app era correcta, coherente y silenciosa: hacía bien su trabajo sin pedir que la
miraras. Una auditoría estética sobre las ocho pantallas del alumno, capturadas en
un móvil de 412 px y recorriendo una expedición entera —elegir, responder, fallar,
acertar, terminar— dio diez hallazgos. El criterio no era «bonito», era **cuánta
atención cuesta cada pantalla y cuánta devuelve**: una app escolar compite con lo que
ese niño tiene en la mano el resto del día.

### Nada decía «aquí»

El mapa abría con seis tarjetas idénticas. Para un niño de ocho años, elegir entre
seis cosas que se ven igual no es libertad: es un cuello de botella que se resuelve
tocando la primera o cerrando la app. Y la app **sabía** la respuesta —el motor decide
a cada rato qué le conviene— solo que no la decía en la única pantalla donde se
pregunta.

Ahora el mapa abre con **«Sigue por aquí»**: el pozo, el estrato y cuánto lleva de él.
Dice el porcentaje porque «te falta poco» mueve más que «empieza algo». El orden es el
de una excavación de verdad: primero lo que dejó a medias, empezando por lo último que
tocó; si no hay nada a medias, el primer estrato abierto sin dominar. Lo ya dominado no
se propone —para eso está el Encargo del Bazar— y si no hay nada que proponer la
tarjeta no se pinta, en vez de inventar un destino.

### Un color por yacimiento

Ruinas de Kaldros y Biblioteca de Arena se veían igual: el mismo beige, la misma
tarjeta blanca. Un mundo entero con una sola textura se lee como una lista de ajustes.

Seis tintas de la familia del pergamino, en el filete, el icono y la barra, y elegidas
para distinguirse también en escala de grises. Dos detalles que importan: el color de
partida sale del **identificador**, no del orden, para que añadir un yacimiento nuevo no
repinte los que el niño ya tenía localizados; y **dos yacimientos nunca acaban del mismo
color**, porque con seis tintas y tres sitios dejarlo al azar del reparto era jugársela,
y el día que salieran dos iguales se perdía justo lo que esto venía a dar.

### El premio deja de ser un recibo

La pantalla de resultado es el momento de máxima recompensa de toda la app, y los
números ya estaban ahí cuando llegabas. Ahora suben desde cero, con frenada al final
para que se lean los últimos, y las filas entran una detrás de otra. El saldo de
doblones del HUD también sube contando cuando crece; cuando baja porque acaba de
comprar algo se pone y ya, que contar hacia atrás lo gastado sería subrayar la pérdida.

Todo esto se apaga entero con `prefers-reduced-motion`, y si el navegador no trae
`requestAnimationFrame` el número se pone del tirón: un premio a medio contar sería
peor que uno sin animar.

### La racha

El motor lleva la cuenta de los aciertos seguidos desde siempre y el niño veía seis
puntitos que cambian de color. Tres seguidos es el momento en que empieza a haber algo
que perder, y a partir de ahí es lo que sostiene la atención hasta el final.

Aparece **en el tres**, no antes: felicitar por uno convierte el aviso en ruido y a los
dos días no lo mira nadie. Late cuando el número sube, no cuando se repinta la pantalla.
Y al fallar **desaparece sin estruendo**: en esta app el error no penaliza, y una racha
que se rompe con aspavientos es exactamente lo contrario.

### Los personajes se ven, no solo se nombran

«La losa se hundió. Tobías te mira con cara de yo también me equivoco.» Buen texto, y el
perro no estaba por ninguna parte. Un compañero al que solo se cita no acompaña a nadie.
Ahora sale la cara de quien habla, y **quién habla importa**: el que celebra al acertar
no es el que acompaña al fallar. Un niño que se equivoca no necesita un aspaviento,
necesita ver que alguien sigue ahí.

En la misma tarjeta, la explicación del fallo era el texto más pequeño y más gris de la
pantalla, justo al revés de lo que hace falta: el titular consuela, la explicación
enseña. Al fallar pasa a ser el elemento dominante.

### Lo que queda

Por orden de lo que más cambiaría la app: el **campamento no enseña ningún campamento**
—se compran las botas y no se ven nunca—, el **mapa no es un mapa** aunque diga «4 % del
mundo dibujado», la **excavación es una palabra y no un dibujo**, las **cuatro respuestas
son cuatro manchas iguales**, y la **bitácora recibe a todos con un muro de ceros**.

> Nada de esto es motivo para meter marcadores, rankings ni rachas que castiguen faltar.
> La racha se apaga en silencio a propósito. Lo que separa esto de las plataformas
> comerciales es precisamente eso, y es lo que lo hace defendible en un claustro.

## Adaptaciones para el alumnado ACNEAE

En una clase de veintidós hay tres o cuatro con adaptación, y hasta ahora el
docente no podía decidir **nada** explícito sobre ellos: el motor ajustaba la
dificultad él solo y ahí se acababa. Peor todavía, el listón de dominio jugaba
en su contra. El estrato siguiente se abre demostrando un 80 % dos veces, y para
quien no va a llegar a ese 80 % eso no es un listón exigente: es un techo. Se
pasa el curso entero en el mismo estrato, jugando lo mismo, mientras la app le
dice que siga intentándolo.

**Alumnado → 🧩** en la ficha de cada alumno. Cuatro palancas y una nota:

| Palanca | Para qué |
|---|---|
| **Retos por expedición** | Quien se cansa al cuarto reto no aprende nada de los dos últimos: los falla por cansancio y la app lo apunta como si no lo supiera |
| **Lectura en voz alta** | Con «siempre», un toque sin querer en su Campamento no puede quitársela para el resto del curso |
| **Nivel de dificultad máximo** | Impide que una racha con suerte le suba a un nivel donde se hunde y del que tarda tres sesiones en bajar. **Bajar nunca se le impide** |
| **Dominio que abre el estrato siguiente** | Entre el 50 % y el 80 %. Es la palanca que más le cambia el curso |
| **Qué adaptación es** | Texto libre para tu registro. No sale en el informe de la familia ni en ninguna pantalla del alumno |

### Abre la puerta, no cambia lo que significa dominar

Es la línea que no se cruza, y hay pruebas que la fijan. Bajarle la puerta al
estrato siguiente y mentir sobre su dominio son dos cosas distintas, y aquí solo
se hace la primera:

- Un alumno que avanza con el 65 % **sigue apareciendo como no dominado** en su
  informe, en el recuento del trimestre y en la tabla de criterios. Eso es la
  verdad y es lo que se lleva a la evaluación.
- El **mapa dibujado** se mide con el 0,8 de todos: si usara su puerta, le diría
  que ha excavado lo que no ha excavado.
- La **Cámara del Guardián** sí se le abre con su dominio —si no, no llegaría
  nunca a la prueba—, pero **el listón para superarla es el mismo para todos**.
  El fragmento del Atlas significa lo mismo en manos de cualquiera.

### Vive en su diario, no en la lista

Se guarda dentro del diario del alumno por dos razones: **viaja con él** —se
aplica también cuando juega en casa, que es donde nadie puede ayudarle— y la
lista de clase ya no sale de tu equipo. Por eso hace falta que su diario esté
aquí: si no está, la ficha lo dice en vez de crear uno vacío que acabaría siendo
un segundo documento suyo en la nube.

**El niño no ve nada de esto.** Nota los efectos, nunca la etiqueta: ni la
palabra, ni el número de retos, ni que juega distinto. En la vista de clase, su
tarjeta lleva un 🧩 para ti —que sus señales se lean con eso delante— y nada
más: cuál es la adaptación se queda en su ficha.

## Vista general de la clase

### Ver el cuaderno de un alumno

En cada ficha, **👁 Ver su cuaderno** abre lo que ve ese niño: su HUD, su mapa,
su campamento, su bitácora y su cuaderno. Sirve para sentarse cinco minutos con
él, o para preparar una reunión con su familia sin tener que imaginárselo.

Funciona con el diario esté donde esté. En clase dirigida vive en este equipo;
con el alumnado entrando desde el suyo, vive en la nube y aquí solo ha llegado
su resumen, así que al pulsar se trae el diario **de ese alumno** —uno, a
propósito: bajarlos todos por si acaso son 20 KB × 25 cada vez que se abre la
pantalla—. Lo mismo vale para el informe a la familia, que también necesita el
diario completo.

Durante la consulta —y **solo** durante la consulta— aparece además la pestaña
**📊 Docente**, con la lectura pedagógica de ese alumno: dificultad adaptativa,
tiempo real de trabajo, dominio por estrato, lo que le está costando y las
señales de calidad. En la sesión del niño esa pestaña no existe:

> El Cuaderno del Docente es una lectura **sobre** el alumno, no **para** él. Un
> crío que lee de sí mismo «posible sesión de baja calidad, responder al azar» o
> «objetivo: 70–85 % de acierto» aprende dos cosas que no queremos enseñarle: que
> se le mide por detrás, y que bajando el acierto le llegan preguntas más
> fáciles. Su progreso sí lo ve, contado para él: el mapa con los estratos, la
> bitácora con los sellos y sus méritos.

Esconder la pestaña no es lo único que la protege: la navegación comprueba quién
manda antes de abrir esa pantalla, así que enseñarla a la fuerza no sirve de nada.

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

### El informe para la familia

En cada ficha, **📖 Informe para la familia** descarga un HTML autocontenido que
se abre y se imprime sin la plataforma delante. No lleva notas, ni porcentajes,
ni comparaciones con nadie: eso está prohibido por el PRD §0.2 y comprobado por
una prueba.

**Antes de generarlo se te pregunta qué quieres decirle a esa familia.** Es lo
único de la hoja que no sale de un contador, y va lo primero, antes que ninguna
cifra. Se guarda con la fecha, así que el informe de marzo enseña también lo que
escribiste en diciembre: una familia ve entonces el camino y no una foto suelta.
Puedes dejarlo en blanco.

> Las notas **no viajan en el documento de la clase**, que lo lee cualquier
> alumno con sesión: lo que dices de un niño a su familia no lo leen sus
> veinticinco compañeros. Van por el mismo canal privado que las contraseñas,
> así que sí las tienes en tus dos equipos. Al juntarlas, dos equipos que
> escribieron días distintos conservan las dos.

**Lo que le cuesta viene con qué hacer en casa.** «Está trabajando la resta
llevando» dice qué pasa, no qué hacer; debajo va la frase de ese concepto —«el
cambio de la compra: he pagado 20 y ha costado 13»—. Están escritas una por
concepto en `js/content.js`, con una regla: cinco minutos, con lo que ya hay en
una casa, sin fichas, sin pantallas y sin «que practique más». Una familia que
no puede comprar ni imprimir nada tiene que poder hacerlo igual.

**El informe habla de un trimestre y lo dice.** Antes mezclaba tres ventanas sin
avisar —conceptos de siempre, días de treinta, sellos de toda la vida— y dos
informes del mismo curso no se podían comparar. Ahora la constancia y las
pruebas son del trimestre en curso, y una línea al pie explica qué parte cuenta
desde el principio y por qué.

**«Terminado» significa terminado.** Un pozo se daba por terminado con los
bloques al 80 %, y eso podía convivir —en la misma hoja, cuatro líneas más
abajo— con «la prueba, todavía no superada». Ahora hay tres estados: *terminado*
solo con la Cámara del Guardián superada, *los bloques hechos, a falta de la
prueba final* mientras no lo esté, y *X de Y bloques* antes. Un pozo que
retiraste del catálogo no sale: sin su definición solo se podría imprimir su
identificador interno, y eso en una hoja que va a una casa no informa de nada.

**A quien no ha entrado nunca no se le manda un informe de ceros.** Cuatro ceros
y un «ahora mismo no hay nada que se le esté atragantando» se leen en casa como
buenas noticias: es la frase correcta para quien trabaja sin dificultades y la
peor posible para quien no ha abierto la app. Ahora sale un informe corto que lo
dice, y ofrece que la familia avise si el problema es que no ha podido entrar.
Quien empezó antes pero no ha trabajado este trimestre también lo lee escrito,
con lo que aprendió antes intacto encima.

**Los números llevan denominador.** «0 pruebas superadas» podían ser cero de
cero; ahora dice «ha superado 1 de 2». Y concuerdan en singular: «1 día
trabajado», no «1 días».

**Los informes olvidan lo viejo, como la barra de dominio.** Los contadores por
concepto eran acumulados de por vida, así que un mal octubre pesaba igual en
junio y el informe no podía enseñar que un niño había mejorado. Medido: un
concepto con cuatro fallos en ocho intentos necesitaba **19 aciertos seguidos**
para pasar a «ya le sale». Ahora cada concepto guarda además sus últimos
`CONCEPTO_VENTANA` intentos y el diagnóstico se hace sobre esa ventana: los
mismos 19 se quedan en 5. El acumulado sigue guardado, que es el histórico, y un
diario anterior al cambio se mide con lo que tiene.

> Lo mismo vale para la señal de rescate «tasa de error alta», que salía de un
> contador de por vida: una alerta que no se puede quitar de encima por más que
> se mejore deja de ser una alerta y pasa a ser una etiqueta pegada al niño.

**«Ya le sale» pide más de una tanda con suerte.** Antes bastaban tres aciertos
seguidos, que pueden ser tres en el mismo minuto. Ahora hacen falta además dos
días distintos, el mismo criterio que ya usa la barra de dominio. Los diarios
anteriores al cambio no llevan esa cuenta y se les aplica la regla de antes: no
se le vacía el informe a nadie por una decisión nuestra.

**Y de toda la clase de una vez.** Arriba de las fichas, **Informes de toda la
clase** prepara un solo archivo con uno por página, listo para imprimir y
repartir. Usa la nota que ya tengas escrita de cada familia y no pregunta
veintidós veces seguidas, que eso ya no es escribir.

### Las Cámaras del Guardián, por clase

Bajo «lo que conviene repasar» hay tres cifras que se calculaban desde hacía
versiones y no se pintaban en ninguna parte:

| Cifra | Qué dice |
|---|---|
| **Cámaras superadas** | Cuántas pruebas sumativas ha conseguido la clase, de las abiertas |
| **Intentos que salen bien** | El *Guardian Pass Rate* del PRD §6: intentos superados sobre intentos hechos |
| **Lo que la barra prometía de más** | La divergencia entre el dominio formativo y lo que confirmó la prueba |

La tercera es la que avisa, **y no avisa sobre los niños**: si la barra promete
0,9 y la prueba da 0,5, lo que hay que revisar es el banco de retos de ese pozo
—demasiado fácil, o demasiado parecido entre sí— porque el dominio se está
ganando sin haber aprendido. Por debajo del 15 % es ruido normal y se dice.

> Ojo con dos medidas que estuvieron con el mismo nombre: cámaras conseguidas e
> intentos que salen bien no son lo mismo. Una cámara superada al tercer intento
> cuenta 1 en la primera y 1 de 3 en la segunda. Ahora cada una lleva el suyo.

### Lo que conviene repasar

Es lo primero de la pantalla, y a propósito: el docente entra aquí con la
pregunta «¿qué doy mañana?», y hasta ahora la vista contestaba a otra distinta
—«¿cómo va cada uno?»— que había que traducir leyendo veinticinco tarjetas.

Cada reto declara **qué concepto** trabaja: no «Numeración · Aplicar», sino
«Resta llevando», «B y V», «Comparar fracciones». Con eso, la vista de clase
puede decir **«7 alumnos fallan la resta llevando, y son estos»**, que sí es una
frase con la que se prepara una clase.

Y junto al concepto va **en qué nivel se rompe**, que es lo que decide la clase
del día siguiente: «la fallan al aplicar» es no tener el procedimiento, y «la
fallan al analizar» es tenerlo y no saber cuándo usarlo. No se preparan igual.
Se cuenta solo sobre los fallos —acertar no dice dónde se atasca nadie— y en la
clase gana el nivel en el que se atranca más gente; a igualdad, el más básico,
que es por donde hay que empezar.

Tres decisiones que conviene no deshacer:

- **Algo es «de clase» a partir de un tercio de los que tienen datos**, con un
  mínimo de tres. Estaba fijo en tres y el pie decía «lo falla media clase o
  más»: en una clase de veintidós, tres es el 14 %, y parar la clase entera no
  le corresponde a tres niños. Ahora se escribe la cifra real, «lo fallan 7 de
  22», que es lo que permite decidir sin fiarse de un adjetivo.
- **Se ordena por cuántos alumnos lo fallan, no por la tasa de error.** Lo que
  decide si algo va a la pizarra es a cuánta gente le sirve. Un concepto con
  89 % de fallo en un solo niño es una conversación con ese niño, no una
  lección, y por eso aparece el último aunque su tasa sea la más alta.
- **Hacen falta al menos 3 intentos y 2 fallos**, y más de uno de cada tres
  fallado. Un error suelto no es un patrón. El umbral está en 0,30 y no más
  arriba a propósito: «falla una de cada tres» da 0,333, que es el caso más
  común de un concepto que se atraganta, y con 0,34 se quedaba fuera.
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


**Portada → 🧔🏻‍♂️ Soy docente → 👥 Vista general de la clase** (pide el PIN). Reúne los diarios de todos y muestra:

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

### 🤖 La asistente de yacimientos

Los puntos 1 y 2 son un formulario en blanco, y ahí es donde una asistente ayuda de verdad: tú sabes qué quieres trabajar —lo tienes escrito en tu currículo— y lo que cuesta es inventarse ocho nombres de expedición y repartir el temario en pozos que no se solapen.

Con Appwrite y tu clave de la API configuradas aparecen dos botones:

- **🤖 Crear uno con ayuda** propone el yacimiento entero: nombre, materia, icono, ambientación y los pozos que reparten tu currículo, cada uno con su icono, su descripción para el niño, **los cursos a los que le sirve** y una línea que te dice a ti qué se trabaja ahí.
- **🤖 Completar con ayuda**, dentro de un yacimiento, mira los pozos que ya tiene y propone **solo los que faltan**. Es el caso de verdad: casi nadie empieza de cero.

Le puedes pedir algo a mano —«ambiéntalo en el Antiguo Egipto», «que el primer pozo sea repaso del curso anterior»— y eso manda sobre todo lo demás. Los cursos vienen marcados de tu lista de clase. Si no hay currículo escrito para esa materia y esos cursos, **te lo dice antes de gastar la llamada** en vez de inventárselo en silencio.

La propuesta llega **editable**: cambias lo que quieras, quitas los pozos que no te sirvan y aceptas de una vez. Hasta ese momento no se ha guardado nada.

> **No escribe ni un reto, y eso es a propósito.** Es lo que la hace segura: un pozo sin retos no le aparece a ningún niño, así que una propuesta mala se borra y no ha llegado a clase. Los retos vienen después, pozo a pozo, por la cola de revisión de siempre. Una prueba comprueba que el esquema de la propuesta no tenga siquiera dónde poner una pregunta.
>
> Cuesta **una sola llamada** a la API, unos veinte segundos. Nada que ver con generar retos, que es una llamada por reto.

Funciona también con materias que el generador de retos no cubre —Naturales, Sociales—: el yacimiento se monta igual y sus retos los escribes tú.

### 🔎 El inspector

Cada yacimiento lleva una línea plegada que dice **cuántas cosas hay que revisar**. No llama a la IA ni cuesta nada: sale de mirar lo que hay, y por eso sigue sirviendo en marzo. Busca justo lo que falla en silencio:

| Lo que encuentra | Por qué importa |
|---|---|
| Un pozo sin retos en el primer estrato | **No le aparece a nadie.** No da error: simplemente no está en el mapa |
| Estratos vacíos | El niño llega hasta ahí y no puede seguir |
| Un pozo puesto para cursos que no tienes en clase | Nadie lo va a abrir. Solo lo dice si hay lista de clase; sin ella, callarse es mejor que avisar de algo que no consta |
| Un pozo donde el 60 % de los retos son del mismo concepto | Veinte retos buenos de lo mismo son un pozo de un solo concepto |
| Dos pozos con el mismo nombre | En el mapa el niño ve dos entradas idénticas |

Un yacimiento sano no dice nada: un inspector que siempre encuentra algo se deja de leer.

Dentro del banco de un pozo hay además un **detector de retos repetidos**. Compara por palabras y mira el pozo entero, no cada estrato por separado: dos tandas distintas rara vez repiten el enunciado exacto, pero sí la pregunta con las palabras cambiadas de orden —«¿Cuánto vale la cifra 4 en 347?» y «En el número 347, ¿cuánto vale la cifra 4?»—, y el mismo reto en dos estratos no se ve nunca porque están en pestañas distintas. No borra nada: te los pone delante y decides tú.

### De «esto se falla» a una tanda de retos

La vista de clase ya decía *«nueve alumnos fallan la fracción de una cantidad»*, y ahí se acababa: para hacer algo con esa frase había que traducirla a materia, pozo y estrato a mano, en otra pantalla.

Cada fila de **Lo que conviene repasar** lleva ahora **🤖 Generar retos de esto**. Deja el generador preparado: la materia del concepto, el pozo que habla de eso —emparejado con lo que cada pozo dice que trabaja, lo mismo que lee el generador— y el concepto pedido. Tú compruebas el pozo y el estrato, y generas.

Además le manda **por qué interesa**: «Interesa especialmente porque la clase falla en: Fracción de una cantidad (lo fallan 9 alumnos)». Ese parámetro estaba en el prompt desde el primer día y no se lo mandaba nadie.

> El foco se queda guardado, así que hay un botón para quitarlo. Sin él, la siguiente tanda de otro pozo saldría con el concepto de la semana pasada.

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

### La puerta al estrato siguiente se confirma antes de abrirse

El desbloqueo es por prerrequisito cognitivo —≥80 % de dominio del estrato de arriba— y hasta la v65 se abría **en el instante** en que la media cruzaba ese 0,8. Una sesión son cinco retos: un niño con un 70 % de competencia real saca cinco de cinco una de cada seis veces, y esa casualidad decidía para siempre.

Medido simulando cientos de niños con una competencia real conocida, machacando el mismo estrato ocho veces:

| acierto real | abrían el siguiente | …y terminaban con su propia barra diciendo que **no** dominan |
|---|---|---|
| 55 % | 15 % | 13 % |
| 70 % | 59 % | 43 % |
| 85 % | 99 % | 19 % |

La app se contradecía: la barra decía «0,70 · no dominado» y la puerta estaba abierta. Ahora **el 0,8 hay que enseñarlo dos veces seguidas**:

| acierto real | abren ahora | terminan sin dominar |
|---|---|---|
| 55 % | 4 % | 3 % |
| 70 % | 34 % | 21 % |
| 85 % | 97 % | 17 % |

**No es un listón más alto** —sigue siendo 0,8— ni cierra nada de lo ya abierto: es pedir que la medida se repita antes de tomar una decisión permanente. A quien de verdad domina apenas le cuesta: de 100 niños con un 85 % de acierto, abrían 99 y siguen abriendo 97.

> **Y se le dice al niño.** Con una sesión por encima del 0,8, el estrato de abajo pone *«¡Ya casi! Vuelve a superar el estrato de arriba una vez más y este se abre»*, y Bruno deja de prometer una puerta que aún no está abierta. Una puerta cerrada sin motivo aparente invita a abandonar; un objetivo a una sesión de distancia, no.

> **La barra sí dice la verdad.** La misma simulación comprueba que el dominio mostrado coincide con la competencia real a todos los niveles (25 % → 0,25; 70 % → 0,70; 85 % → 0,85), y que **al azar puro nadie llega a dominar**. El árbol no está inflado.

## Cuadrillas de excavación (equipos)

El docente crea las cuadrillas y asigna a cada alumno escribiendo su **nombre de explorador** (el que el niño puso al crear su diario; si no coincide, no se le asignará).

Son **cooperativas por diseño**: una fracción de cada Doblón que gana un niño se anota como aportación a la meta común de clase, y **no se le descuenta de su bolsa** — cooperar no cuesta nada. El PRD (§0.2) prohíbe rankings entre niños y canaliza la competición hacia los NPC, así que la comparación entre cuadrillas **viene desactivada**; puedes activarla en el panel si tu grupo la lleva bien.

> Cada niño ve su propia aportación y su parte de la meta. El total real de una cuadrilla exigiría sumar los diarios de todos sus miembros, algo que hoy no se hace: requeriría que un dispositivo leyera el progreso ajeno.

### Roles dentro de la cuadrilla

Un equipo de cinco sin reparto de trabajo es un niño resolviendo y cuatro
mirando. Por eso cada miembro puede llevar un **rol con personaje**, elegido en
el panel (**Cuadrillas → Roles dentro de la cuadrilla**), con un desplegable por
alumno:

| | Personaje | Tarea |
|---|---|---|
| 🧭 | **Leo, el Cartógrafo** | Coordinador · Guía de ruta. Lee el objetivo, guía al equipo y recuerda en qué punto del mapa o del estrato están |
| 🪲 | **Maya, la Descodificadora** | Investigadora de pistas · Portavoz. Busca las respuestas ocultas, analiza los fallos con Kira y comunica la respuesta final |
| 🎒 | **Nico, el Guardián del Campamento** | Materiales y logística. Mantiene la mesa ordenada, reparte los recursos y custodia los Doblones de la cuadrilla |
| ⏳ | **Sofía, la Cronometradora** | Guardiana del tiempo y del ritmo. Vigila el reloj y avisa del tiempo que queda |
| 🎨 | **Hugo, el Ilustrador de la Bitácora** | Diseño creativo · Apoyo. Da forma visual a los retos, propone ideas en el Taller y anima a los suyos |
| 🎖️ | **Gael o Sara, Intendente de Campo** | *Encargo especial de clase, máximo 2.* Ayudante principal del docente: anota la fecha, guarda la caja del recreo, lidera la fila y echa una mano en los recados del aula |

Se puede dejar a alguien **sin rol**, y **repetir uno** si la cuadrilla es
grande. Al desmarcar a un alumno de la cuadrilla su rol se borra con él: un rol
solo significa algo dentro de un equipo.

El **Intendente de Campo** es la excepción: no es de una cuadrilla, es de la
clase, así que lleva **tope de dos alumnos contados sobre todas las cuadrillas**
—dos Cartógrafos en dos equipos distintos son normales; dos Intendentes ya son
todos los que hay—. Cuando las dos plazas están dadas, el desplegable sigue
mostrando el encargo pero deshabilitado y diciendo quién lo lleva, en vez de
esconderlo. El tope se comprueba otra vez al guardar: la opción bloqueada frena
el ratón, pero no el teclado.

### Rotar los roles al terminar la semana

El botón **🔄 Rotar los roles** (bajo la lista de cuadrillas, solo aparece si
hay algo repartido) pasa el rol de cada niño **al siguiente de su cuadrilla**, y
el del último al primero. En unas semanas todos han pasado por todos.

Como el reparto se mueve solo *dentro* de cada equipo, rotar nunca puede romper
el tope del Intendente: siguen puestos los mismos roles, en otras manos. Y como
se reconstruye desde los miembros de hoy, un nombre que ya no está en la
cuadrilla no sobrevive a la rotación.

El alumno ve el suyo destacado al abrir **Tu Cuadrilla**, y el de cada compañero
junto a su nombre. La lista de **Dirigir la clase** también muestra el personaje
de cada uno, así que el docente sabe a quién pedirle qué sin abrir el panel.

**El retrato es su avatar en toda la app**: el HUD, el turno de clase dirigida,
su bolsa y el Campamento Base. Antes esas cuatro pantallas pintaban un emoji
fijo que solo miraba el sombrero comprado, así que el retrato se esfumaba justo
al entrar en un reto.

> El sombrero comprado **no borra el retrato**: se queda como chapa en la
> esquina del medallón. Un premio que deja de verse deja de ser un premio, y un
> rol que se pierde al comprarse un gorro tampoco vale. Caben los dos.

#### Los retratos

Los seis están en `img/roles/`, **nombrados como el rol** (`cartografo.png`,
`descodificadora.png`…): el Intendente lo llevan dos niños y no tiene un nombre
único, así que el nombre del archivo es el del papel, no el del personaje. Un
rol sin retrato se sigue pintando con su emoji, así que añadir uno nuevo nunca
deja un hueco.

Los originales llegan como láminas apaisadas y no sirven tal cual: el avatar se
ve **en un círculo pequeño y sobre pergamino**. `tools/preparar-retrato.py` hace
la conversión entera:

```
python3 tools/preparar-retrato.py original.jpg img/roles/guardian.png \
        --modo blanco --caja 450,45,920,515
```

- `--modo` dice cómo es el fondo del original: `blanco` liso, `damero` (el
  tablero de transparencia aplastado a JPEG, que llega con marca de agua y
  motas) o `degradado` (un color claro con viñeta).
- El fondo **no se borra por color**: se rellena *desde el borde*, que es lo
  único que con seguridad es fondo. Borrar «lo blanco» agujerearía el cristal de
  la lupa de Maya, el blanco de los ojos y el papel de las libretas.
- `--caja x1,y1,x2,y2` es el encuadre. Conviene apretarlo a **la cara más el
  objeto que identifica al papel** —la brújula de Leo, el reloj de Sofía, el
  cuaderno de Hugo—: la figura entera no se reconoce a 2,5 rem.
- La salida es un PNG cuadrado de 400×400 con paleta de 96 colores, unos 40 KB.
  Se ve como máximo a 5,5 rem, así que 400 px sobran hasta en retina, y seis
  retratos pesados serían media app.

Después quedan dos líneas: la ruta en el campo `img` de `ROLES_CUADRILLA`
(`js/content.js`) y el archivo en `ASSETS` de `sw.js` — sin lo segundo no se
vería en un aula sin red. Ninguna pantalla cambia: `avatarDeRol()` (`js/ui.js`)
es el único sitio donde se pinta un rol y pasa solo de emoji a `<img>`. La
versión de un solo archivo (`tools/build-standalone.py`) incrusta los retratos
que encuentre en la carpeta, y avisa si hay uno que no usa nadie. Tres pruebas
vigilan lo que falla en silencio: que la ruta exista, que esté cacheada y que no
pese de más.

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
