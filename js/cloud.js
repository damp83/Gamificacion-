/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — cloud.js
   Cuentas y guardado en Appwrite. Un documento por alumno
   (id = id de usuario) con todo el user_state serializado.
   Si Appwrite no está configurado o el SDK no carga, todas
   las funciones degradan a modo local sin romper nada.
   ═══════════════════════════════════════════════════════════ */

const CLOUD = { enabled: false, account: null, db: null, user: null, saveTimer: 0, lastError: null };

function cloudConfigured() {
  const c = ATLAS_CONFIG.appwrite;
  return !!(c.endpoint && c.projectId && c.databaseId && c.collectionId);
}
/* En demostración la nube no existe. Va aquí, en la puerta por la que pasa
   todo el mundo, y no repartido por cada sitio que la usa: la mitad de esos
   sitios los escribirá alguien dentro de un año. */
function cloudEnabled() { return !DEMO && CLOUD.enabled; }
function cloudUser() { return CLOUD.user; }

function cloudInit() {
  if (!cloudConfigured()) return false;
  if (typeof Appwrite === 'undefined') {
    console.warn('Appwrite configurado pero el SDK no cargó: la app sigue en modo local.');
    return false;
  }
  const client = new Appwrite.Client()
    .setEndpoint(ATLAS_CONFIG.appwrite.endpoint)
    .setProject(ATLAS_CONFIG.appwrite.projectId);
  CLOUD.account = new Appwrite.Account(client);
  CLOUD.db = new Appwrite.Databases(client);
  /* Funciones: solo se usa para el generador de retos. Si el SDK que se cargue
     no las trae, la app funciona igual y el panel lo dice. */
  CLOUD.functions = typeof Appwrite.Functions === 'function' ? new Appwrite.Functions(client) : null;
  CLOUD.enabled = true;
  return true;
}

/* ══════════ RETOS ESCRITOS POR IA ══════════
   Se llama a la función de Appwrite, que es donde vive la clave de la API. Aquí
   NO hay clave ni la puede haber: este código se sirve a la tablet de cada niño.

   Lo que vuelve no entra en el banco: va a la cola de revisión del docente. */
async function cloudGenerarRetos(peticion, onProgreso) {
  if (!CLOUD.enabled) return { ok: false, reason: 'sin-nube', texto: 'No hay conexión con Appwrite.' };
  if (!CLOUD.functions) {
    return { ok: false, reason: 'sdk-viejo',
      texto: 'El SDK de Appwrite que ha cargado no trae Functions. Recarga forzando la página.' };
  }
  if (!CLOUD.user) {
    return { ok: false, reason: 'sin-sesion',
      texto: 'Entra con tu cuenta de docente en «Mis clases» antes de generar.' };
  }
  const id = (ATLAS_CONFIG.appwrite.generadorFunctionId || '').trim();
  if (!id) {
    return { ok: false, reason: 'sin-funcion',
      texto: 'Falta el ID de la función en Acceso y nube. Está en Appwrite → Functions.' };
  }

  const cuantos = Math.max(1, Math.min(20, Number(peticion.n) || 1));
  const avisar = (hechos, fase) => { if (typeof onProgreso === 'function') onProgreso(hechos, cuantos, fase); };

  const buenos = [], descartados = [];
  let gastado = { entrada: 0, cacheados: 0, salida: 0 };
  const suma = u => { if (!u) return; gastado = { entrada: gastado.entrada + (u.entrada || 0),
    cacheados: gastado.cacheados + (u.cacheados || 0), salida: gastado.salida + (u.salida || 0) }; };

  /* ── Se escriben DE UNO EN UNO ──
     No es un capricho: Appwrite corta toda ejecución síncrona a los 30
     segundos, y en asíncrono el cuerpo de la respuesta llega vacío, así que
     no habría forma de leer el resultado. Una llamada por reto cabe de
     sobra; una tanda entera con su comprobación, no.

     Sale casi igual de caro porque el currículo va cacheado: la primera
     llamada lo paga y las demás lo leen a una fracción del precio. */
  const evitar = [];
  /* Los conceptos que ya están trabajados: los que trae el pozo de antes más
     los de esta tanda. Sin esto, diez llamadas con el mismo currículo caen
     casi todas en el mismo concepto y sale un pozo de diez retos correctos
     que miden una sola cosa. */
  const evitarConceptos = Array.isArray(peticion.conceptosYaEnElPozo)
    ? peticion.conceptosYaEnElPozo.slice() : [];
  let corte = null;
  for (let i = 0; i < cuantos; i++) {
    avisar(i, 'escribiendo');
    const r = await ejecutarConReintento(id,
      Object.assign({}, peticion, { paso: 'generar', n: 1, evitar, evitarConceptos }),
      (n, de) => avisar(i, `reintentando (${n} de ${de})`));
    if (!r.ok) {
      /* Si ya hay retos escritos, no se tiran: están pagados. Se sigue con lo
         que haya y se dice qué pasó. */
      if (!buenos.length && !descartados.length) return r;
      corte = r.texto;
      break;
    }
    suma(r.usados);
    for (const x of (r.retos || [])) {
      buenos.push(x);
      evitar.push(x.question);
      if (x.skill && !evitarConceptos.includes(x.skill)) evitarConceptos.push(x.skill);
    }
    for (const d of (r.descartados || [])) descartados.push(d);
  }

  if (!buenos.length) {
    return { ok: true, retos: [], descartados, usados: gastado, corte };
  }

  /* ── La comprobación, en tandas ──
     Resolver ocho de golpe a esfuerzo bajo cabe en los 30 segundos; veinte,
     no. Se parte por si el docente pidió muchos. */
  const supervivientes = [];
  for (let i = 0; i < buenos.length; i += 4) {
    avisar(i, 'comprobando');
    const trozo = buenos.slice(i, i + 4);
    const r = await ejecutarConReintento(id, Object.assign({}, peticion,
      { paso: 'verificar', retos: trozo }), (n, de) => avisar(i, `reintentando (${n} de ${de})`));
    if (!r.ok) {
      /* Sin comprobar no se aprueban a ciegas: van a la cola marcados, y el
         docente decide. Callarse esto sería lo peor que podría hacer aquí. */
      for (const x of trozo) supervivientes.push(Object.assign({}, x, { sinComprobar: true }));
      corte = corte || r.texto;
      continue;
    }
    suma(r.usados);
    for (const x of (r.retos || [])) supervivientes.push(x);
    for (const d of (r.descartados || [])) descartados.push(d);
  }

  return { ok: true, retos: supervivientes, descartados, usados: gastado, corte };
}

/* Una llamada a la función, con la clave del docente pegada al cuerpo.

   La clave va aquí y no se guarda en ningún sitio: la función la usa y la
   suelta. Si va vacía, la función recurre a la del centro, si la hay. */
async function ejecutarGenerador(id, cuerpo) {
  const clave = (ATLAS_CONFIG.iaClave || '').trim();
  if (clave) cuerpo.clave = clave;
  /* Solo lo piden las claves ligadas a la cuenta. Vacío = no se manda. */
  const espacio = (ATLAS_CONFIG.iaWorkspace || '').trim();
  if (espacio) cuerpo.workspace = espacio;

  try {
    /* Síncrona a propósito: en asíncrono el `responseBody` llega vacío y no
       habría resultado que leer. La firma es posicional en el SDK v17
       (functionId, body, async, path, method, headers). */
    const ex = await CLOUD.functions.createExecution(
      id, JSON.stringify(cuerpo), false, '/', 'POST', { 'content-type': 'application/json' });

    /* Appwrite marca «failed» cualquier respuesta 4xx o 5xx, y las nuestras lo
       son A PROPÓSITO: la función contesta 400 con el motivo escrito dentro.
       Así que primero se lee el cuerpo y solo si no hay nada que leer se da el
       aviso del tope de tiempo —que es justo el caso en que no hay cuerpo,
       porque a la función la cortaron a media frase—.

       Estuvo al revés y costó una sesión de depuración: la API decía
       exactamente qué faltaba y la pantalla contestaba «sube el timeout». */
    let datos = null;
    try { datos = JSON.parse(ex.responseBody || 'null'); }
    catch (e) { datos = null; }

    if (!datos) {
      if (ex.status === 'failed') {
        return { ok: false, reason: 'fallo',
          texto: 'La función ha fallado sin llegar a contestar. Casi siempre es el tope de tiempo: '
               + 'súbelo en Appwrite → Functions → Settings → Timeout.' };
      }
      return { ok: false, reason: 'respuesta', texto: 'La función ha respondido algo que no se entiende.' };
    }

    if (!datos.ok) return { ok: false, reason: datos.reason || 'error', texto: datos.texto || 'No se han podido generar.' };
    /* `yacimiento` solo viene en el encargo de estructura; en los otros dos es
       undefined y no estorba. Se pasa aquí para no tener dos funciones que
       hablan con la misma función de Appwrite. */
    return { ok: true, retos: datos.retos || [], descartados: datos.descartados || [],
             yacimiento: datos.yacimiento, usados: datos.usados };

  } catch (e) {
    const m = (e && e.message) || '';
    if (/not found|could not be found/i.test(m)) {
      return { ok: false, reason: 'no-existe', texto: 'No existe ninguna función con ese ID.' };
    }
    if (/not authorized|missing scope|permission/i.test(m)) {
      return { ok: false, reason: 'sin-permiso',
        texto: 'Tu cuenta no puede ejecutar la función. En Appwrite → Functions → Settings → '
             + 'Execute access, marca «Users».' };
    }
    /* El tope duro de Appwrite: 30 segundos por ejecución síncrona, y no se
       puede subir. Por eso se pide un reto por llamada. Si aun así salta, lo
       que hay que bajar es el esfuerzo, no el número. */
    if (/timed out|timeout/i.test(m)) {
      return { ok: false, reason: 'tope',
        texto: 'Appwrite ha cortado la llamada a los 30 segundos, que es su tope y no se puede subir. '
             + 'Vuelve a intentarlo: si se repite, el modelo está tardando de más con este currículo '
             + '—prueba a mandar solo el bloque del área que estás trabajando, no el documento entero—.' };
    }
    /* ── Se cayó el transporte, no la función ──
       «Load failed» es lo que dice Safari cuando aborta una petición: la
       pantalla se apagó, el iPad cambió de red, o el wifi del centro
       parpadeó. Se distingue de un error de la API porque no llegó a haber
       respuesta, y por eso merece reintento y no un mensaje técnico. */
    if (esCorteDeRed(m)) {
      return { ok: false, reason: 'red', reintentable: true,
        texto: 'Se cortó la conexión a mitad de la petición.' };
    }
    return { ok: false, reason: 'error', texto: 'No se ha podido llamar a la función: ' + m };
  }
}

/* Los mensajes con los que cada navegador dice «no pude ni mandarla». */
function esCorteDeRed(m) {
  return /load failed|failed to fetch|network|networkerror|aborted|ERR_|connection/i.test(m || '');
}

/* Una llamada con reintentos, solo para lo que se cae por la red.

   Una tanda de diez son once llamadas de medio minuto: casi cinco minutos
   con el wifi de un colegio de por medio. Que un parpadeo tire la tanda
   entera —y con ella lo que ya se ha pagado— no es aceptable. Un error de
   la API (clave mala, sin saldo) NO se reintenta: sería gastar tiempo en
   algo que va a fallar igual las tres veces. */
async function ejecutarConReintento(id, cuerpo, avisar) {
  const ESPERAS = [2000, 5000];
  let ultimo = null;
  for (let intento = 0; intento <= ESPERAS.length; intento++) {
    const r = await ejecutarGenerador(id, cuerpo);
    /* Un «sin saldo» o una clave caducada no se arreglan solos y dejan muerta
       la generación de retos hasta que alguien toca algo. Se recuerda para que
       el panel de salud lo diga hoy y no el día que haga falta generar. */
    if (typeof apuntarResultadoIA === 'function') apuntarResultadoIA(r);
    if (r.ok || !r.reintentable) return r;
    ultimo = r;
    if (intento < ESPERAS.length) {
      if (typeof avisar === 'function') avisar(intento + 1, ESPERAS.length);
      await new Promise(res => setTimeout(res, ESPERAS[intento]));
    }
  }
  return Object.assign({}, ultimo, {
    texto: 'Se cortó la conexión y no se ha recuperado tras tres intentos. '
         + 'Si estás en un iPad, deja la pantalla encendida y la app delante mientras genera.' });
}

/* ── Los diarios que se quedaron sueltos ──

   Desde que el panel guarda el id de la cuenta al darla de alta, vincular un
   diario es ir directo a su documento. Pero las cuentas creadas ANTES de eso
   no lo tienen, y no hay forma de recuperarlo: `account.create` sobre un
   correo que ya existe contesta «already exists» y no devuelve el id.

   Sí hay otro camino, y es el único: el id del documento de un diario ES el
   id de la cuenta de ese niño. Como el equipo docente puede leer la
   colección, se pueden listar los diarios y emparejarlos por nombre.

   Emparejar por nombre es exactamente lo que se quitó del resto de la app,
   así que aquí NO se hace solo: se proponen y las confirma el docente. Y se
   descarta de entrada lo que podría hacer daño —el diario de un alumno de
   otro docente—, porque vincularlo le pondría a él nuestra clase encima. */
async function cloudDiariosParaVincular() {
  if (!CLOUD.enabled) return { ok: false, reason: 'sin-nube' };
  if (!CLOUD.user) return { ok: false, reason: 'sin-sesion' };
  const c = ATLAS_CONFIG.appwrite;
  const yo = CLOUD.user.$id;
  const aula = aulaActiva() || '';
  const CAMPOS = ['$id', 'name', 'aula', 'owner'];
  const fuera = [];
  try {
    let cursor = null;
    for (let pagina = 0; pagina < 20; pagina++) {          /* tope de seguridad */
      const q = [Appwrite.Query.limit(100)];
      if (Appwrite.Query.select) q.push(Appwrite.Query.select(CAMPOS));
      if (cursor) q.push(Appwrite.Query.cursorAfter(cursor));
      const r = await CLOUD.db.listDocuments(c.databaseId, c.collectionId, q);
      for (const d of r.documents) {
        /* Solo lo que es mío o de nadie. El diario de otro docente no se
           toca ni se enseña: proponerlo ya sería invitar a pisarlo. */
        const dueno = d.owner || '';
        const suAula = d.aula || '';
        if (dueno && dueno !== yo) continue;
        if (suAula && aula && suAula !== aula) continue;
        fuera.push({ id: d.$id, name: d.name || '', aula: suAula, owner: dueno });
      }
      if (r.documents.length < 100) break;
      cursor = r.documents[r.documents.length - 1].$id;
    }
    return { ok: true, diarios: fuera };
  } catch (e) {
    const msg = (e && e.message) || '';
    /* Una colección sin las columnas nuevas no puede seleccionarlas. */
    if (/select|attribute|unknown/i.test(msg)) {
      return { ok: false, reason: 'falta-columna', detail: msg };
    }
    return errorNube(e);
  }
}

/* ── La estructura de un yacimiento, propuesta ──
   Una sola llamada y ni un reto: lo que vuelve es la ambientación y el reparto
   de pozos. Va aparte de cloudGenerarRetos porque no comparte casi nada con
   ella —ni tandas, ni cola de aprobación, ni segunda pasada— y mezclarlas
   habría convertido una función que ya es larga en una función con dos modos. */
async function cloudProponerYacimiento(peticion) {
  if (!CLOUD.enabled) return { ok: false, reason: 'sin-nube', texto: 'No hay conexión con Appwrite.' };
  if (!CLOUD.functions) {
    return { ok: false, reason: 'sdk-viejo',
      texto: 'El SDK de Appwrite que ha cargado no trae Functions. Recarga forzando la página.' };
  }
  if (!CLOUD.user) {
    return { ok: false, reason: 'sin-sesion',
      texto: 'Entra con tu cuenta de docente en «Mis clases» antes de pedir una propuesta.' };
  }
  const id = (ATLAS_CONFIG.appwrite.generadorFunctionId || '').trim();
  if (!id) {
    return { ok: false, reason: 'sin-funcion',
      texto: 'Falta el ID de la función en Acceso y nube. Está en Appwrite → Functions.' };
  }
  const r = await ejecutarConReintento(id, {
    paso: 'yacimiento',
    materia: peticion.materia,
    cursos: peticion.cursos,
    cuantos: peticion.cuantos,
    curriculo: peticion.curriculo,
    tema: peticion.tema,
    existente: peticion.existente,
    clave: ATLAS_CONFIG.iaClave || '',
    workspace: ATLAS_CONFIG.iaWorkspace || ''
  });
  if (!r.ok) return r;
  if (!r.yacimiento) {
    return { ok: false, reason: 'vacio', texto: 'La propuesta ha venido vacía. Vuelve a intentarlo.' };
  }
  return { ok: true, yacimiento: r.yacimiento, usados: r.usados };
}

/* ── Leer el currículo y sacar sus criterios ──
   Una sola llamada, como el yacimiento: lo que vuelve es texto copiado del
   propio currículo del docente y una lista de conceptos del catálogo, así que
   se revisa entero en pantalla y no hace falta cola de aprobación. */
async function cloudProponerCriterios(peticion, avisar) {
  if (!CLOUD.enabled) return { ok: false, reason: 'sin-nube', texto: 'No hay conexión con Appwrite.' };
  if (!CLOUD.functions) {
    return { ok: false, reason: 'sdk-viejo',
      texto: 'El SDK de Appwrite que ha cargado no trae Functions. Recarga forzando la página.' };
  }
  if (!CLOUD.user) {
    return { ok: false, reason: 'sin-sesion',
      texto: 'Entra con tu cuenta de docente en «Mis clases» antes de pedir una propuesta.' };
  }
  const id = (ATLAS_CONFIG.appwrite.generadorFunctionId || '').trim();
  if (!id) {
    return { ok: false, reason: 'sin-funcion',
      texto: 'Falta el ID de la función en Acceso y nube. Está en Appwrite → Functions.' };
  }
  const r = await ejecutarConReintento(id, {
    paso: 'criterios',
    materiaNombre: peticion.materiaNombre,
    cursos: peticion.cursos,
    curriculo: peticion.curriculo,
    clave: ATLAS_CONFIG.iaClave || '',
    workspace: ATLAS_CONFIG.iaWorkspace || ''
  }, avisar);
  if (!r.ok) return r;
  /* ── Dos «ningún criterio» que no son el mismo ──
     Este mensaje echaba la culpa al texto del docente en los dos casos, y en
     uno de ellos el texto está perfecto: si la función desplegada es anterior
     a este paso, no sabe qué es `criterios` y contesta sin ese campo. Mandar a
     alguien a revisar un currículo que está bien es la peor ayuda posible.

     Se distinguen por la forma de la respuesta: sin el campo, la función no
     entendió la petición; con el campo vacío, sí lo entendió y no encontró
     nada, y entonces sí es el texto. */
  if (!Array.isArray(r.criterios)) {
    return { ok: false, reason: 'paso-desconocido',
      texto: 'La función ha contestado, pero sin criterios: la que tienes desplegada es anterior '
           + 'a esta pantalla y no sabe leerlos. Vuelve a desplegarla con la última versión '
           + '(Appwrite → Functions → Deployments) y repite.' };
  }
  if (!r.criterios.length) {
    return { ok: false, reason: 'vacio',
      texto: 'La función ha leído el currículo y no ha encontrado criterios de evaluación en él. '
           + 'Comprueba arriba QUÉ currículo está leyendo: si pusiste el texto en un curso '
           + 'concreto, elige ese curso en la lista y no el de «todos los cursos».' };
  }
  return { ok: true, criterios: r.criterios, usados: r.usados };
}

/* ── El currículo, leído en tandas ──

   Appwrite corta toda ejecución síncrona a los 30 segundos y ese tope no se
   sube. La generación de retos ya vivía con ello partiendo el trabajo; esto
   se pedía de una vez y con un currículo de curso entero no llegaba.

   Lo que cuesta aquí no es leer: es ESCRIBIR. Al modelo se le pide que copie
   cada criterio y cada saber literalmente, así que la respuesta crece con el
   texto que se le manda. Por eso se parte la ENTRADA: cada trozo devuelve sus
   criterios en unos segundos y se juntan todos al final.

   Se corta por párrafos y nunca a mitad de uno, que partir un criterio en dos
   sería perderlo entero. Con un poco de solape, para que uno que caiga justo
   en la costura salga en los dos trozos; los repetidos se quitan después. */
const CRITERIOS_TROZO = 2600;
const CRITERIOS_SOLAPE = 300;

function trozosDeCurriculo(texto, tam, solape) {
  const t = String(texto || '');
  const max = tam || CRITERIOS_TROZO;
  if (t.length <= max) return t.trim() ? [t] : [];
  /* Los párrafos son la unidad: un criterio vive dentro de uno. */
  const parrafos = t.split(/\n\s*\n/);
  const trozos = [];
  let actual = '';
  /* Un currículo copiado de un PDF puede venir sin un solo salto de línea: una
     parrafada de nueve mil caracteres. Sin esta red, ese caso no se partía y
     volvía a chocar con los treinta segundos. Se corta por palabras, que es la
     costura menos mala que queda cuando no hay ninguna otra. */
  const porTamano = t => {
    if (t.length <= max) return [t];
    const fuera = [];
    let linea = '';
    for (const palabra of t.split(/(\s+)/)) {
      if (linea && (linea.length + palabra.length) > max) { fuera.push(linea); linea = ''; }
      linea += palabra;
    }
    if (linea.trim()) fuera.push(linea);
    return fuera;
  };

  for (const p of parrafos) {
    /* Un párrafo más largo que el trozo entero se parte por líneas, y si
       tampoco las tiene, por palabras. */
    const piezas = p.length > max
      ? p.split(/\n/).flatMap(porTamano)
      : [p];
    for (const pieza of piezas) {
      if (actual && (actual.length + pieza.length + 2) > max) {
        trozos.push(actual);
        const cola = actual.slice(-(solape === undefined ? CRITERIOS_SOLAPE : solape));
        actual = cola + '\n\n';
      }
      actual += (actual ? '\n\n' : '') + pieza;
    }
  }
  if (actual.trim()) trozos.push(actual);
  return trozos.filter(x => x.trim());
}

/* Dos criterios son el mismo si dicen lo mismo, aunque uno venga del solape
   con un espacio de más o el código escrito de otra forma. */
function juntarCriterios(listas) {
  const vistos = new Set();
  const out = [];
  for (const lista of listas) {
    for (const c of (lista || [])) {
      const clave = String(c.texto || '').trim().toLowerCase().replace(/\s+/g, ' ');
      if (!clave || vistos.has(clave)) continue;
      vistos.add(clave);
      out.push(c);
    }
  }
  return out;
}

async function cloudLeerCriteriosEnTandas(peticion, onProgreso) {
  const trozos = trozosDeCurriculo(peticion.curriculo);
  const avisar = (i, extra) => {
    if (typeof onProgreso === 'function') onProgreso(i, trozos.length, extra || '');
  };
  const listas = [];
  let usados = { entrada: 0, cacheados: 0, salida: 0 };
  let corte = null;
  for (let i = 0; i < trozos.length; i++) {
    avisar(i);
    const r = await cloudProponerCriterios(Object.assign({}, peticion, { curriculo: trozos[i] }),
      (n, de) => avisar(i, `reintentando ${n} de ${de}`));
    if (!r.ok) {
      /* Lo ya leído está pagado y sirve: no se tira por un trozo que falló.
         Se sigue con lo que haya y se dice que la lectura quedó a medias. */
      if (r.reason === 'vacio') continue;          /* ese trozo no traía criterios */
      if (!listas.length) return r;
      corte = r.texto;
      break;
    }
    listas.push(r.criterios);
    if (r.usados) {
      usados = { entrada: usados.entrada + (r.usados.entrada || 0),
                 cacheados: usados.cacheados + (r.usados.cacheados || 0),
                 salida: usados.salida + (r.usados.salida || 0) };
    }
  }
  const criterios = juntarCriterios(listas);
  if (!criterios.length) {
    return { ok: false, reason: 'vacio',
      texto: 'La función ha leído el currículo y no ha encontrado criterios de evaluación en él. '
           + 'Comprueba arriba QUÉ currículo está leyendo: si pusiste el texto en un curso '
           + 'concreto, elige ese curso en la lista y no el de «todos los cursos».' };
  }
  return { ok: true, criterios, usados, trozos: trozos.length, corte };
}

/* ══════════ LA TABLA DE RETOS ══════════

   Una fila por reto, en dos estados: `cola` (escrito, sin revisar) y `banco`
   (aprobado, jugándose). Sustituye a guardarlos dentro del campo `config`
   del aula, que tenía dos fallos: cabían unos 278 en total, y ese documento
   solo lo puede leer su docente, así que un reto aprobado no llegaba jamás a
   la tablet de un niño.

   Permisos, tal como está montada la tabla:
     · READ para `users` — las cuentas del alumnado leen las preguntas.
     · CREATE/UPDATE/DELETE para el equipo `docentes` — solo el claustro
       escribe. Un alumno con el identificador de la tabla no puede tocar
       nada.

   Los permisos por fila se ponen igualmente aunque el RLS esté apagado: si
   algún día se enciende, sigue funcionando sin tocar código. */

function retosOn() {
  return !!(CLOUD.enabled && ATLAS_CONFIG.appwrite.retosCollectionId);
}

/* ── Los permisos de cada fila ──
   Aquí NO se nombra al equipo docente, y es a propósito.

   Appwrite solo deja poner permisos que quien escribe pueda otorgar, y los
   equipos se nombran por su ID, no por su etiqueta. Un equipo etiquetado
   «docentes» tiene un ID como `6a92c58d001142cf8ba2`, así que `team:docentes`
   no existe y Appwrite rechaza la escritura ENTERA con un «Permissions must
   be one of…». Escribir ese ID en la configuración sería pedirle a cada
   centro que copie un identificador para que la app arranque.

   No hace falta: `users` y `user:<uno mismo>` los puede otorgar cualquiera
   siempre. Y no se pierde nada, porque quien decide de verdad es la tabla —
   el equipo docente tiene ahí UPDATE y DELETE—: con el Row level security
   apagado estos permisos ni se miran, y encendido se suman a los de la
   tabla, nunca los recortan. */
function permisosDeReto() {
  const yo = CLOUD.user && CLOUD.user.$id;
  const p = [Appwrite.Permission.read(Appwrite.Role.users())];
  if (yo) {
    p.push(Appwrite.Permission.update(Appwrite.Role.user(yo)));
    p.push(Appwrite.Permission.delete(Appwrite.Role.user(yo)));
  }
  return p;
}

/* Los campos tal cual van a la tabla. Se recortan a lo que declara cada
   columna: pasarse de largo es un 400 con un mensaje que no dice cuál. */
function filaDeReto(r, aulaId, estado) {
  const t = (v, n) => String(v == null ? '' : v).slice(0, n);
  return {
    owner: (CLOUD.user && CLOUD.user.$id) || '',
    aula: aulaId,
    estado: estado || r.estado || 'cola',
    siteId: t(r.siteId, 64),
    branchId: t(r.branchId, 64),
    estrato: t(r.estrato, 16),
    materia: t(r.materia, 16),
    curso: Number(r.curso) || 0,
    skill: t(r.skill, 48),
    question: t(r.question, 600),
    options: (Array.isArray(r.options) ? r.options : []).map(o => t(o, 200)),
    answer: Number(r.answer) || 0,
    hint1: t(r.hint1, 500),
    hint2: t(r.hint2, 500),
    explanation: t(r.explanation, 1000),
    criterio: t(r.criterio, 600),
    origen: t(r.origen || 'ia', 16),
    comprobado: !r.sinComprobar,
    updated_at: String(Date.now())
  };
}

/* Crea varios de golpe. Devuelve los creados y los que fallaron: una tanda
   de diez no puede perderse entera porque el séptimo diera error. */
async function cloudCrearRetos(lista, estado) {
  if (!retosOn()) return { ok: false, reason: 'sin-nube', texto: 'Falta la tabla de retos en Acceso y nube.' };
  if (!CLOUD.user) return { ok: false, reason: 'sin-sesion', texto: 'Entra con tu cuenta de docente.' };
  const aulaId = aulaActiva();
  if (!aulaId) return { ok: false, reason: 'sin-aula',
    texto: 'Abre una clase en «Mis clases»: los retos se guardan en ella.' };

  const c = ATLAS_CONFIG.appwrite;
  const creados = [], fallidos = [];
  for (const r of lista) {
    const fila = filaDeReto(r, aulaId, estado);
    try {
      const doc = await CLOUD.db.createDocument(
        c.databaseId, c.retosCollectionId, 'unique()', fila, permisosDeReto());
      creados.push(doc);
    } catch (e) {
      /* ── Segundo intento, sin permisos por fila ──
         Nombran un equipo por su ID, y ese ID no tiene por qué existir. Con
         el «Row level security» apagado —que es como está montada la tabla—
         esos permisos se ignoran de todas formas, así que mandarlos solo
         puede estorbar. Antes de dar el reto por perdido, se prueba sin
         ellos: si entra así, el problema estaba ahí y no en la tabla. */
      try {
        const doc = await CLOUD.db.createDocument(
          c.databaseId, c.retosCollectionId, 'unique()', fila);
        creados.push(doc);
      } catch (e2) { fallidos.push({ reto: r, error: errorNube(e2) }); }
    }
  }
  /* El motivo del PRIMER fallo sube con el resultado. Sin esto, quien llama
     no encontraba ni `reason` ni `texto` y acababa enseñando «sin conexión»
     —que era mentira— en vez de lo que dijo Appwrite: que falta una columna,
     que el tipo no cuadra, o que la cuenta no está en el equipo «docentes».
     Tragarse el error convierte un arreglo de dos minutos en una noche. */
  const primero = fallidos.length ? fallidos[0].error : null;
  return {
    ok: !!creados.length || !lista.length,
    creados, fallidos,
    reason: primero ? primero.reason : undefined,
    texto: primero ? textoDeFalloAlCrear(primero) : undefined
  };
}

/* Los tres motivos por los que falla crear un reto, con lo que hay que
   tocar en cada caso. El mensaje crudo de Appwrite dice qué pasa pero no
   dónde se arregla. */
function textoDeFalloAlCrear(err) {
  const d = err.detail || '';
  /* El mensaje CRUDO de Appwrite va siempre al final, pase lo que pase.
     Mi traducción ayuda cuando acierto y estorba cuando no: sin el original
     no hay forma de averiguar qué pasa desde fuera, y eso ya costó una
     noche. Appwrite nombra la columna que sobra o falta, y esa palabra es
     justo la que hace falta para arreglarlo. */
  const crudo = d ? ' — Appwrite dice: «' + d + '»' : '';
  if (err.reason === 'sin-permiso' || /not authorized|missing scope|permission/i.test(d)) {
    return 'tu cuenta no puede escribir en la tabla «retos». Comprueba dos cosas en Appwrite: '
         + 'que estés dentro del equipo «docentes» (Auth → Teams → docentes → Members), y que ese '
         + 'equipo tenga CREATE en la pestaña Security de la tabla' + crudo;
  }
  if (err.reason === 'no-existe' || /could not be found/i.test(d)) {
    return 'no existe ninguna tabla con ese identificador en esta base de datos' + crudo;
  }
  if (/unknown attribute|invalid document structure|attribute|required/i.test(d)) {
    return 'a la tabla le falta alguna columna, le sobra, o su tipo no coincide' + crudo;
  }
  return 'Appwrite ha rechazado la escritura' + (crudo || ' sin decir por qué');
}

/* Los nombres y tipos que la app manda, para poder compararlos de un vistazo
   con las columnas de la consola. Se enseña en el diagnóstico cuando falla:
   son diecinueve columnas y encontrar la que baila a ojo es un suplicio. */
function columnasQueSeMandan() {
  const ejemplo = filaDeReto({ options: ['a', 'b', 'c', 'd'], answer: 0 }, 'aula', 'cola');
  return Object.keys(ejemplo).map(k => {
    const v = ejemplo[k];
    const tipo = Array.isArray(v) ? 'String[]' : typeof v === 'number' ? 'Integer'
      : typeof v === 'boolean' ? 'Boolean' : 'String';
    return k + ' (' + tipo + ')';
  }).join(', ');
}

async function cloudActualizarReto(docId, campos) {
  if (!retosOn() || !CLOUD.user) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  try {
    const doc = await CLOUD.db.updateDocument(c.databaseId, c.retosCollectionId, docId,
      Object.assign({ updated_at: String(Date.now()) }, campos));
    return { ok: true, doc };
  } catch (e) { return errorNube(e); }
}

async function cloudBorrarReto(docId) {
  if (!retosOn() || !CLOUD.user) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  try {
    await CLOUD.db.deleteDocument(c.databaseId, c.retosCollectionId, docId);
    return { ok: true };
  } catch (e) { return errorNube(e); }
}

/* Trae TODOS los retos de una clase y refresca la caché.

   Pagina: un banco de curso entero pasa de mil filas y Appwrite sirve como
   mucho unas decenas por página. Sin esto, a partir de la primera página los
   retos dejarían de aparecer sin ningún error visible, que es la peor clase
   de fallo. */
const RETOS_PAGINA = 100;
async function cloudTraerRetos(aulaId) {
  if (!retosOn()) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  const id = aulaId || aulaActiva();
  if (!id) return { ok: false, reason: 'sin-aula' };
  const fuera = [];
  let cursor = null;
  try {
    for (let p = 0; p < 40; p++) {
      const q = [Appwrite.Query.equal('aula', id), Appwrite.Query.limit(RETOS_PAGINA)];
      if (cursor) q.push(Appwrite.Query.cursorAfter(cursor));
      const res = await CLOUD.db.listDocuments(c.databaseId, c.retosCollectionId, q);
      fuera.push(...res.documents);
      if (res.documents.length < RETOS_PAGINA) break;
      cursor = res.documents[res.documents.length - 1].$id;
    }
  } catch (e) { return errorNube(e); }

  saveRetosCache(id, fuera.map(limpiarFila));
  applyOverlay(ATLAS_OVERLAY);   /* recalcula y vuelve a mezclarlos en los pozos */
  return { ok: true, retos: fuera.length };
}

/* El documento de Appwrite trae metadatos ($permissions, $collectionId…) que
   no hacen falta y engordan la caché. Se guarda solo lo que se usa. */
function limpiarFila(d) {
  return {
    $id: d.$id, estado: d.estado, aula: d.aula, owner: d.owner,
    siteId: d.siteId, branchId: d.branchId, estrato: d.estrato,
    materia: d.materia, curso: d.curso, skill: d.skill,
    question: d.question, options: d.options || [], answer: d.answer,
    hint1: d.hint1, hint2: d.hint2, explanation: d.explanation,
    criterio: d.criterio, origen: d.origen, comprobado: d.comprobado
  };
}

/* ══════════ POR QUÉ NO SE LLEGA AL SERVIDOR ══════════

   «Failed to fetch» contra Appwrite se decía como «revisa la red», y eso manda
   a mirar donde casi nunca está el problema. Hay tres causas distintas detrás
   del mismo mensaje del navegador, y solo una es la red:

     · El dispositivo no tiene conexión.
     · La tiene, pero algo entre medias no deja llegar al servidor: el filtro
       de la red del centro, o Appwrite caído.
     · Se llega perfectamente y es el navegador el que TAPA la respuesta,
       porque el proyecto de Appwrite no tiene dada de alta la dirección desde
       la que se abre la app. Es, con diferencia, la más común, y la única que
       se arregla en un minuto: Appwrite → Settings → Platforms.

   Distinguirlas se puede, y con una sola petición. Un `fetch` en modo
   `no-cors` devuelve una respuesta opaca —no se puede leer nada de ella— pero
   RESUELVE si el servidor contestó, y falla si no se llegó. Eso es justo la
   línea entre «no hay ruta» y «hay ruta y el navegador tapa lo que vuelve».

   Es una comprobación, no una petición de datos: no lleva sesión, no lleva
   contraseñas y no mira lo que responde. */
async function diagnosticarConexion() {
  /* Abierta desde un fichero guardado en el móvil: ningún servidor va a
     aceptar peticiones de ahí, y no es un problema de red ni de Appwrite. */
  try {
    if (typeof location !== 'undefined' && location.protocol === 'file:') return 'fichero';
  } catch (e) { /* sin location */ }

  try {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'sin-red';
  } catch (e) { /* sin navigator */ }

  const ep = String((ATLAS_CONFIG.appwrite && ATLAS_CONFIG.appwrite.endpoint) || '').replace(/\/+$/, '');
  if (!ep) return 'sin-configurar';

  try {
    await fetch(ep + '/health/version', { mode: 'no-cors', cache: 'no-store' });
    return 'bloqueado';
  } catch (e) { return 'no-responde'; }
}

/* La dirección desde la que se abre la app, que es lo que hay que dar de alta
   en Appwrite. Se enseña para poder copiarla en vez de teclearla mal. */
function origenDeLaApp() {
  try { return location.origin || ''; } catch (e) { return ''; }
}

/* ¿El error de entrar fue de red, o de contraseña? Solo el primero merece un
   diagnóstico: el segundo ya se explica solo. */
function esFalloDeRed(e) {
  const m = (e && e.message) || '';
  return /Failed to fetch|NetworkError|CORS|network/i.test(m);
}

/* usuario del niño → email interno válido para Appwrite */
function cloudEmail(username) {
  return username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '') + '@' + ATLAS_CONFIG.usernameDomain;
}

/* crear sesión con compatibilidad entre versiones del SDK */
function createSession(email, pass) {
  if (typeof CLOUD.account.createEmailPasswordSession === 'function') {
    return CLOUD.account.createEmailPasswordSession(email, pass);
  }
  return CLOUD.account.createEmailSession(email, pass); /* SDK < 14 */
}

/* ── Probar la contraseña de un alumno ──

   La pregunta que deja tirada una tarde es «¿esta contraseña abre su cuenta,
   sí o no?», y hasta ahora solo se podía contestar yendo a una tablet, con el
   niño delante, y probando. Appwrite responde igual a «contraseña mal» y a «esa
   cuenta no existe» —lo hace a propósito— así que desde fuera no hay forma de
   distinguirlo: solo intentando entrar.

   Y ahí está el precio, que no se puede esconder: abrir la sesión de un alumno
   CIERRA la del docente. El navegador guarda una sesión por proyecto, no una
   por persona. Se pregunta antes, se dice claro, y al terminar se cierra la
   sesión del niño para no dejar su cuenta abierta en el equipo del docente. */
async function probarClaveDeAlumno(r) {
  if (!cloudEnabled()) return { ok: false, texto: 'Sin conexión con Appwrite.' };
  if (!r || !r.username) return { ok: false, texto: 'Esa ficha no tiene usuario.' };
  try {
    try { await CLOUD.account.deleteSession('current'); } catch (e) { /* no había */ }
    await createSession(cloudEmail(r.username), String(r.password || ''));
    /* Entró: la contraseña es esa. No se toca su diario ni se lee nada suyo. */
    try { await CLOUD.account.deleteSession('current'); } catch (e) { /* ya está */ }
    CLOUD.user = null;
    return { ok: true, texto: 'Esta contraseña SÍ abre su cuenta. Si aun así no puede entrar, es el usuario '
      + 'o la conexión de su tablet, no la contraseña.' };
  } catch (e) {
    CLOUD.user = null;
    const m = (e && e.message) || '';
    if (typeof esFalloDeRed === 'function' && esFalloDeRed(e)) {
      return { ok: false, texto: 'No se ha podido probar: no se llegó al servidor. Mira «Salud de la clase».' };
    }
    if (/Invalid credentials|Invalid `?password/i.test(m)) {
      return { ok: false, texto: 'Esta contraseña NO abre su cuenta. O no es la suya, o esa cuenta no existe '
        + 'todavía: Appwrite contesta lo mismo a las dos cosas, a propósito. Comprueba que la ficha dice '
        + '«✓ cuenta creada» y, si lo dice, cámbiala en la consola de Appwrite (Auth → Update password).' };
    }
    return { ok: false, texto: 'No se ha podido probar: ' + m };
  }
}

/* ¿hay sesión guardada de otro día? → devuelve el estado remoto o null */
async function cloudResume() {
  if (!CLOUD.enabled) return null;
  try { CLOUD.user = await CLOUD.account.get(); }
  catch (e) { CLOUD.user = null; return null; }
  return cloudLoadState();
}

async function cloudLogin(username, pass) {
  try { await CLOUD.account.deleteSession('current'); } catch (e) { /* no había sesión */ }
  await createSession(cloudEmail(username), pass);
  CLOUD.user = await CLOUD.account.get();
  return cloudLoadState();
}

async function cloudRegister(name, username, pass) {
  await CLOUD.account.create(Appwrite.ID.unique(), cloudEmail(username), pass, name);
  await createSession(cloudEmail(username), pass);
  CLOUD.user = await CLOUD.account.get();
  return null; /* cuenta nueva: sin estado remoto todavía */
}

/* ── Alta de cuentas de alumno desde el panel ──
   account.create() es el alta pública: crea el usuario SIN abrir sesión, así
   que el docente puede dar de alta a toda la clase sin perder la suya. El
   diario en sí lo crea cada alumno al entrar por primera vez. */
async function cloudCreateStudent(name, username, password) {
  if (DEMO) return { ok: false, reason: 'demo' };
  if (!CLOUD.enabled) return { ok: false, reason: 'sin-nube' };
  try {
    const u = await CLOUD.account.create(Appwrite.ID.unique(), cloudEmail(username), password, name);
    /* El id hace falta para el paso siguiente: crear su diario ya dentro de
       la clase. Es el ÚNICO momento en que se conoce. */
    return { ok: true, id: u && u.$id };
  } catch (e) {
    const msg = (e && e.message) || '';
    if (/already exists/i.test(msg))       return { ok: false, reason: 'existe' };
    if (/Rate limit/i.test(msg))           return { ok: false, reason: 'ritmo' };
    if (/at least 8|password/i.test(msg))  return { ok: false, reason: 'contrasena' };
    if (/Invalid.*email/i.test(msg))       return { ok: false, reason: 'usuario' };
    return { ok: false, reason: 'error', detail: msg };
  }
}

/* ── Atar el diario de un alumno a esta clase ──

   Esto lo hacía el panel al dar de alta la cuenta: creaba el diario ya con su
   clase y su dueño. NO SE PUEDE, y el error tardó en entenderse porque parecía
   un problema de configuración: «Permissions must be one of: (any, users,
   user:<el docente>, team:<docentes>…)». Appwrite solo deja repartir permisos
   que uno mismo tiene, y el docente no es el alumno, así que
   `Permission.read(Role.user(<alumno>))` es un permiso que no puede dar.

   Y crearlo con los permisos del docente a secas habría sido peor que no
   crearlo: el niño no podría leer NI ESCRIBIR su propio diario, su app lo
   tomaría por inexistente, intentaría crearlo, chocaría con un id ya usado y
   se quedaría sin sincronizar en silencio durante todo el curso.

   Así que el diario lo crea el niño la primera vez que entra —con permiso para
   él, que es lo correcto— y el panel lo ADOPTA después: le pone `aula` y
   `owner`. Para adoptarlo, el equipo `docentes` necesita permiso de UPDATE en
   la colección de diarios; es el mismo que ya hace falta para anotarle un
   mérito a un niño que se registró por su cuenta. */
async function cloudVincularDiario(alumnoId) {
  if (!CLOUD.enabled) return { ok: false, reason: 'sin-nube' };
  /* Sin sesión de docente no se puede adoptar el diario de nadie, y eso NO es
     lo mismo que estar sin nube: la app está conectada, quien no ha entrado
     es el docente. Decirlo con el mismo código dejaba en pantalla una lista de
     «sin-nube» que no llevaba a ninguna parte. */
  if (!CLOUD.user) return { ok: false, reason: 'sin-sesion' };
  if (!alumnoId) return { ok: false, reason: 'sin-id' };
  const c = ATLAS_CONFIG.appwrite;
  const docente = CLOUD.user.$id;
  const aula = aulaActiva() || '';
  let doc;
  try {
    doc = await CLOUD.db.getDocument(c.databaseId, c.collectionId, alumnoId);
  } catch (e) {
    const msg = (e && e.message) || '';
    /* Que no exista no es un fallo: es que ese niño todavía no ha entrado. */
    if (/not be found|404|Document with the requested ID could not/i.test(msg)) {
      return { ok: false, reason: 'sin-estrenar' };
    }
    return errorNube(e);
  }
  /* Ya está en su sitio: no se gasta una escritura ni se toca la fecha. */
  if ((doc.aula || '') === aula && (doc.owner || '') === docente) {
    return { ok: true, cambiado: false };
  }
  const data = { owner: docente };
  if (aula) data.aula = aula;
  try {
    await CLOUD.db.updateDocument(c.databaseId, c.collectionId, alumnoId, data);
    return { ok: true, cambiado: true };
  } catch (e) {
    const msg = (e && e.message) || '';
    if (/Unknown attribute/i.test(msg)) return { ok: false, reason: 'falta-columna', detail: msg };
    if (/not authorized|missing scop|permission/i.test(msg)) {
      return { ok: false, reason: 'sin-permiso', detail: msg };
    }
    return { ok: false, reason: 'error', detail: msg };
  }
}

/* ── Traer el diario ENTERO de un alumno ──
   La vista de clase baja solo el resumen (<1 KB por alumno) porque los lee
   todos de una vez. Pero ver el cuaderno de un niño o escribir el informe de
   su familia necesita el diario completo, y eso es UN alumno: ~20 KB pedidos
   a propósito, no 20 KB × 25 en cada apertura de la pantalla. */
async function cloudTraerDiario(docId) {
  if (!CLOUD.enabled || !CLOUD.user) return { ok: false, reason: 'sin-nube' };
  if (!docId) return { ok: false, reason: 'sin-id' };
  const c = ATLAS_CONFIG.appwrite;
  try {
    const doc = await CLOUD.db.getDocument(c.databaseId, c.collectionId, docId);
    const estado = JSON.parse(doc.state);
    return { ok: true, estado, name: doc.name || (estado.profile && estado.profile.explorer_name) || '' };
  } catch (e) {
    if (/JSON|Unexpected token/i.test((e && e.message) || '')) {
      return { ok: false, reason: 'ilegible', detail: 'El diario guardado no se puede leer.' };
    }
    return errorNube(e);
  }
}

async function cloudLoadState() {
  const c = ATLAS_CONFIG.appwrite;
  try {
    const doc = await CLOUD.db.getDocument(c.databaseId, c.collectionId, CLOUD.user.$id);
    /* De qué clase es este niño. Lo pone el panel del docente al crearle el
       diario, y es lo único que dice a su tablet QUÉ retos le tocan: sin
       esto habría que bajarse los de todos los docentes del centro. */
    if (doc.aula) recordarMiAula(doc.aula);
    return JSON.parse(doc.state);
  } catch (e) { return null; } /* primer inicio: aún no hay documento */
}

/* La clase de quien está usando este equipo: la abierta si es un docente, y
   si no la que diga su diario. Un alumno que se registró por su cuenta y a
   quien nadie ha asignado clase se queda sin ella, y entonces juega con los
   pozos de fábrica, como hasta ahora. */
const MI_AULA_KEY = 'atlas_mi_aula_v1';
function recordarMiAula(id) {
  try { if (id) almacen().setItem(MI_AULA_KEY, String(id)); } catch (e) { /* sin almacenamiento */ }
}
function miAula() {
  const abierta = (typeof aulaActiva === 'function' && aulaActiva()) || '';
  if (abierta) return abierta;
  try { return almacen().getItem(MI_AULA_KEY) || ''; } catch (e) { return ''; }
}

/* ── Los ajustes de la clase, al arrancar ──
   Suben solos desde la v33, pero no bajaban solos: solo se traían al tocar
   la clase en «Mis clases». Un docente creaba un yacimiento en el portátil,
   abría el iPad al día siguiente y no estaba, porque el iPad seguía con su
   copia de la semana pasada. Parecía que no se había guardado.

   Dos cautelas, y las dos importan:
     · Si este equipo tiene cambios SIN SUBIR, no se baja nada. Traer lo de
       la nube encima de trabajo sin guardar es perderlo.
     · Solo se adopta lo que sea MÁS NUEVO que lo último que este equipo vio
       o escribió. Si no, cada arranque pisaría los cambios locales con una
       copia vieja. */
async function traerAjustesDeAula() {
  /* `miAula()` sirve a los dos: al docente le da la clase que tiene abierta,
     y a un alumno la que dice su diario. Antes exigía clase ABIERTA, que es
     cosa del panel del docente, así que una tablet de alumno no bajaba nada
     nunca. */
  const id = miAula();
  if (!aulasOn() || !id || !CLOUD.user) return { ok: false, reason: 'sin-aula' };
  if (ajustesPendientes) return { ok: false, reason: 'hay-pendientes' };
  const c = ATLAS_CONFIG.appwrite;
  try {
    const doc = await CLOUD.db.getDocument(c.databaseId, c.aulasCollectionId, id);
    const marca = Number(doc.updated_at) || 0;
    if (marca <= (ATLAS_CONFIG_META.sharedAt || 0)) return { ok: true, adoptado: false };
    let ajustes = null;
    try { ajustes = JSON.parse(doc.config || '{}'); } catch (e) { return { ok: false, reason: 'ilegible' }; }
    if (!ajustes || typeof ajustes !== 'object') return { ok: true, adoptado: false };
    /* La lista de clase no baja a la tablet de un niño: la usan el panel y
       la clase dirigida, ninguno de los dos vive ahí, y son nombres de
       menores. Menos datos donde no hacen falta. */
    if (!aulaActiva()) delete ajustes.roster;
    /* Un documento escrito antes de que la lista saliera de aquí todavía la
       lleva dentro, y ahí la lee cualquier alumno. Adoptarlo no la borra: hay
       que reescribir el documento, así que se programa la subida que lo
       limpia. Es lo que hace que el agujero se cierre solo. */
    const traiaLaLista = Array.isArray(ajustes.roster) && ajustes.roster.length > 0;
    adoptSharedConfig({ overlay: ajustes, updated_at: marca, by: doc.teacher || '' });
    if (traiaLaLista && aulaActiva()) programarSubidaAjustes();
    return { ok: true, adoptado: true, limpiando: traiaLaLista };
  } catch (e) { return errorNube(e); }
}

/* ── Mudanza de lo que ya había ──
   Los retos vivían en los ajustes: la cola en `iaCola` y los aprobados
   dentro del banco de cada pozo, marcados con `origen: 'ia'`. Se suben a la
   tabla y se quitan de ahí, en ese orden: si la subida falla no se borra
   nada, y se vuelve a intentar la próxima vez.

   Se muda TODO el banco, no solo lo que escribió la IA. Los escritos a mano
   estuvieron fuera de la mudanza una versión, y fue un error: los ajustes
   del aula solo los lee su docente, así que un reto escrito a mano tampoco
   llegaba a ninguna tablet. El sitio donde vive un reto no puede depender de
   quién lo escribió. */
async function migrarRetosALaTabla() {
  if (!retosOn() || !CLOUD.user || !aulaActiva()) return { ok: false, reason: 'sin-nube' };

  const cola = (Array.isArray(ATLAS_CONFIG.iaCola) ? ATLAS_CONFIG.iaCola : []).slice();
  const aprobados = [];
  for (const site of (ATLAS_CONFIG.sites || [])) {
    for (const b of (site.branches || [])) {
      for (const est of Object.keys(b.bank || {})) {
        for (const r of (b.bank[est] || [])) {
          /* Los que ya viven en la tabla llegan con docId: mudarlos otra vez
             los duplicaría en cada arranque. */
          if (r && !r.docId) {
            aprobados.push(Object.assign({}, r, {
              siteId: site.id, branchId: b.id, estrato: est, origen: r.origen || 'docente' }));
          }
        }
      }
    }
  }
  if (!cola.length && !aprobados.length) return { ok: true, mudados: 0 };

  const rc = cola.length ? await cloudCrearRetos(cola, 'cola') : { ok: true, creados: [], fallidos: [] };
  const ra = aprobados.length ? await cloudCrearRetos(aprobados, 'banco') : { ok: true, creados: [], fallidos: [] };
  const fallos = (rc.fallidos || []).length + (ra.fallidos || []).length;
  if (fallos) return { ok: false, reason: 'parcial', fallos };

  /* Ya están arriba: ahora sí se quitan de los ajustes. */
  if (cola.length) setTeacherConfig('iaCola', []);
  if (aprobados.length) {
    /* Todo lo que había en el banco está ya en la tabla, así que el banco de
       los ajustes se queda vacío. Los pozos de fábrica no traen banco, de
       modo que vaciarlo no pierde nada de la configuración original. */
    const l = deepClone(ATLAS_CONFIG.sites || []);
    for (const site of l) {
      for (const b of (site.branches || [])) delete b.bank;
    }
    setTeacherConfig('sites', l);
  }
  return { ok: true, mudados: (rc.creados || []).length + (ra.creados || []).length };
}

/* Trae los retos de la clase de este equipo. Se llama al arrancar, después
   de que haya sesión. Si falla no se dice nada en pantalla: la caché de la
   última vez sigue sirviendo y un niño no puede hacer nada con ese aviso. */
async function sincronizarRetos() {
  const id = miAula();
  if (!id || !retosOn()) return { ok: false, reason: 'sin-aula' };
  /* Solo el docente muda: es quien tiene los retos en sus ajustes y quien
     puede escribir en la tabla. Un alumno solo lee. */
  if (aulaActiva()) { try { await migrarRetosALaTabla(); } catch (e) { /* se reintenta */ } }
  return cloudTraerRetos(id);
}

async function cloudPush() {
  if (!CLOUD.enabled || !CLOUD.user || !S) return false;
  const c = ATLAS_CONFIG.appwrite;
  /* Se envía el diario completo (para que el niño lo recupere en otro equipo)
     y, aparte, un resumen de menos de 1 KB. La vista de clase lee SOLO el
     resumen: así un centro de 300 diarios baja ~300 KB en vez de ~7 MB. */
  const data = { state: JSON.stringify(S), name: S.profile.explorer_name };
  try {
    const sum = buildSummary();
    if (sum) data.summary = JSON.stringify(sum);
  } catch (e) { /* si el resumen falla, el diario se guarda igual */ }
  try {
    await CLOUD.db.updateDocument(c.databaseId, c.collectionId, CLOUD.user.$id, data);
    CLOUD.lastError = null;
    return true;
  } catch (e) {
    try {
      const uid = CLOUD.user.$id;
      await CLOUD.db.createDocument(c.databaseId, c.collectionId, uid, data, [
        Appwrite.Permission.read(Appwrite.Role.user(uid)),
        Appwrite.Permission.update(Appwrite.Role.user(uid)),
        Appwrite.Permission.delete(Appwrite.Role.user(uid))
      ]);
      CLOUD.lastError = null;
      return true;
    } catch (e2) {
      CLOUD.lastError = e2; /* sin red: el estado sigue en localStorage */
      console.warn('No se pudo guardar en la nube (se reintentará):', e2.message);
      return false;
    }
  }
}

/* ══════════ CONFIGURACIÓN COMPARTIDA DEL EQUIPO DOCENTE ══════════
   Un colegio no configura veinte tablets a mano. El docente publica sus
   ajustes en un único documento y el resto los recoge al abrir.
   Permisos: lectura para todos los usuarios (los alumnos necesitan la
   configuración para jugar), escritura solo para el equipo `docentes`.
   Si no hay colección configurada, todo esto no existe y cada tablet sigue
   con sus propios ajustes. */
function sharedConfigOn() {
  const c = ATLAS_CONFIG.appwrite;
  return !!(CLOUD.enabled && c.configCollectionId);
}

async function cloudFetchConfig() {
  if (!sharedConfigOn()) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  try {
    const doc = await CLOUD.db.getDocument(c.databaseId, c.configCollectionId, c.configDocId || 'clase');
    let overlay = {};
    try { overlay = JSON.parse(doc.overlay || '{}'); } catch (e) { return { ok: false, reason: 'ilegible' }; }
    return { ok: true, paquete: { overlay, updated_at: Number(doc.updated_at) || 0, by: doc.by || '' } };
  } catch (e) {
    const msg = (e && e.message) || '';
    /* Todavía no ha publicado nadie: no es un error, es el primer día */
    if (/could not be found|not found/i.test(msg)) return { ok: false, reason: 'sin-publicar' };
    if (/not authorized|missing scope|permission/i.test(msg)) return { ok: false, reason: 'sin-permiso', detail: msg };
    return { ok: false, reason: 'error', detail: msg };
  }
}

async function cloudPublishConfig(nombreDocente) {
  if (DEMO) return { ok: false, reason: 'demo' };
  if (!sharedConfigOn()) return { ok: false, reason: 'sin-nube' };
  if (!CLOUD.user) return { ok: false, reason: 'sin-sesion' };
  const c = ATLAS_CONFIG.appwrite;
  const id = c.configDocId || 'clase';
  const data = {
    overlay: JSON.stringify(configParaCompartir()),
    updated_at: String(Date.now()),
    by: nombreDocente || ATLAS_CONFIG.teacherName || ''
  };
  const permisos = () => [
    /* Los alumnos LEEN la configuración —sin ella no hay nada que jugar—
       pero solo el equipo docente puede cambiarla. */
    Appwrite.Permission.read(Appwrite.Role.users()),
    /* Por su ID no, por la misma razón que en permisosDeReto(): un equipo
       se nombra por su identificador y Appwrite rechaza la escritura entera
       si se le da la etiqueta. Quien manda es el permiso de la colección. */
    Appwrite.Permission.update(Appwrite.Role.user(CLOUD.user.$id)),
    Appwrite.Permission.delete(Appwrite.Role.user(CLOUD.user.$id))
  ];
  /* Publicar deja esta tablet al día consigo misma: si no, al abrir de nuevo
     se avisaría de un conflicto con lo que acaba de publicar ella. */
  const anotar = () => {
    ATLAS_CONFIG_META.sharedAt = Number(data.updated_at);
    ATLAS_CONFIG_META.touchedAt = Number(data.updated_at);
    ATLAS_CONFIG_META.by = data.by;
    saveConfigMeta();
    return { ok: true, updated_at: Number(data.updated_at) };
  };
  try {
    await CLOUD.db.updateDocument(c.databaseId, c.configCollectionId, id, data);
    return anotar();
  } catch (e) {
    try {
      await CLOUD.db.createDocument(c.databaseId, c.configCollectionId, id, data, permisos());
      return anotar();
    } catch (e2) {
      const msg = (e2 && e2.message) || '';
      if (/not authorized|missing scope|permission/i.test(msg)) return { ok: false, reason: 'sin-permiso', detail: msg };
      return { ok: false, reason: 'error', detail: msg };
    }
  }
}

/* Al arrancar: recoger lo del equipo si es más nuevo y esta tablet no se ha
   tocado desde entonces. Devuelve qué ha pasado para poder decirlo. */
let sharedConfigState = { estado: 'sin-nube' };

async function syncSharedConfig() {
  sharedConfigState = await calcularSync();
  return sharedConfigState;
}
async function calcularSync() {
  if (!sharedConfigOn()) return { estado: 'sin-nube' };
  const res = await cloudFetchConfig();
  if (!res.ok) return { estado: res.reason, detail: res.detail };

  const p = res.paquete;
  if (p.updated_at <= ATLAS_CONFIG_META.sharedAt) return { estado: 'al-dia', paquete: p };
  if (configEditadaEnLocal()) return { estado: 'conflicto', paquete: p };
  adoptSharedConfig(p);
  return { estado: 'adoptada', paquete: p };
}

/* ══════════ AULAS: VARIOS DOCENTES, CADA UNO CON SUS CLASES ══════════
   Un mismo proyecto de Appwrite sirve a todo un claustro. El modelo es:

     aulas/<id>     ← una clase. Su DUEÑO es la cuenta del docente.
     diarios/<id>   ← un diario de alumno, con el campo `aula` apuntando
                      a su clase y los mismos permisos que ella.

   El aislamiento entre docentes NO depende de que el cliente filtre bien:
   depende de los permisos por documento de Appwrite. El filtro por `owner`
   es una comodidad para no descargar de más, no la barrera. La barrera es
   que un documento de otro docente sencillamente no se puede leer. */

function aulasOn() {
  const c = ATLAS_CONFIG.appwrite;
  return !!(CLOUD.enabled && c.aulasCollectionId && c.databaseId);
}

/* Permisos de todo lo que pertenece a una clase: solo su docente. */
/* ── Quién puede leer una clase ──
   Leen TODAS las cuentas con sesión, y escribe solo su docente.

   Estuvo cerrada a su dueño, y eso dejaba a los alumnos sin nada: los
   yacimientos, los méritos, la economía y las cuadrillas que configura el
   docente viajan dentro de este documento, así que los niños jugaban
   siempre con lo de fábrica por mucho que el docente preparase su clase. Es
   el mismo fallo que tenían los retos: guardado en un sitio que solo puede
   abrir quien lo escribió.

   Lo que se guarda ahí es `configParaCompartir()`, o sea SIN contraseñas del
   alumnado, sin PIN, sin datos de Appwrite y sin la clave de la API. Y al
   adoptarlo, una tablet de alumno se deja además la lista de clase, que es
   cosa del docente y el juego no necesita. */
function permisosDeAula(ownerId) {
  return [
    Appwrite.Permission.read(Appwrite.Role.users()),
    Appwrite.Permission.update(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.delete(Appwrite.Role.user(ownerId))
  ];
}

function errorNube(e) {
  const msg = (e && e.message) || '';
  if (/not authorized|missing scope|permission/i.test(msg)) return { ok: false, reason: 'sin-permiso', detail: msg };
  if (/could not be found|not found/i.test(msg)) return { ok: false, reason: 'no-existe', detail: msg };
  return { ok: false, reason: 'error', detail: msg };
}

/* ── Las clases de ESTE docente ── */
async function cloudListAulas() {
  if (!aulasOn()) return { ok: false, reason: 'sin-nube' };
  if (!CLOUD.user) return { ok: false, reason: 'sin-sesion' };
  const c = ATLAS_CONFIG.appwrite;
  try {
    const res = await CLOUD.db.listDocuments(c.databaseId, c.aulasCollectionId, [
      Appwrite.Query.equal('owner', CLOUD.user.$id),
      Appwrite.Query.limit(100)
    ]);
    return {
      ok: true,
      /* El documento de credenciales vive en esta misma colección y lleva el
         mismo `owner`, así que aparece aquí como si fuera una clase más. No lo
         es: se reconoce por el sufijo del id y se queda fuera de la lista. */
      aulas: res.documents.filter(d => !esDeCredenciales(d.$id)).map(d => ({
        id: d.$id, name: d.name || 'Clase', teacher: d.teacher || '',
        updated_at: Number(d.updated_at) || 0
      }))
    };
  } catch (e) { return errorNube(e); }
}

async function cloudCreateAula(nombre) {
  if (!aulasOn()) return { ok: false, reason: 'sin-nube' };
  if (!CLOUD.user) return { ok: false, reason: 'sin-sesion' };
  const c = ATLAS_CONFIG.appwrite;
  const uid = CLOUD.user.$id;
  try {
    const doc = await CLOUD.db.createDocument(c.databaseId, c.aulasCollectionId, 'unique()', {
      owner: uid,
      name: String(nombre || 'Mi clase').trim() || 'Mi clase',
      teacher: ATLAS_CONFIG.teacherName || '',
      config: JSON.stringify(configParaCompartir()),
      updated_at: String(Date.now())
    }, permisosDeAula(uid));
    return { ok: true, aula: { id: doc.$id, name: doc.name, teacher: doc.teacher } };
  } catch (e) { return errorNube(e); }
}

/* ══════════ EL CUADERNO PRIVADO DEL DOCENTE ══════════

   Las contraseñas del alumnado NO viajan en el documento de la clase, y no es
   un descuido: ese documento lo lee cualquier cuenta con sesión —tiene que
   leerlo, o los niños jugarían con la configuración de fábrica—, así que
   meterlas ahí sería enseñarle a cada niño la contraseña de los demás.

   Pero el docente sí las necesita en sus dos equipos. Las generaba en el
   portátil, abría la tablet y la hoja de credenciales salía en blanco. Y lo
   que hacía entonces era peor que quedarse sin ellas: volvía a generarlas, y
   esas contraseñas nuevas no abren nada, porque cambiar el texto de la lista
   NO cambia la contraseña de la cuenta de Appwrite.

   Así que van en un documento aparte de la misma colección, con permisos
   SOLO para la cuenta del docente. Un alumno tiene el rol `users` y nada más:
   no puede leerlo. Y como usa los mismos atributos que un aula, no hay que
   añadir ninguna columna en la consola.

   El id es el del aula con un sufijo, para que borrar la clase se lo lleve
   también y no queden contraseñas de una clase que ya no existe.

   Por el mismo canal viajan las NOTAS que el docente escribe para las
   familias: no son secretas, pero son sobre un niño concreto y el documento
   de la clase lo lee toda la clase. El sufijo del id sigue siendo «-cred»
   aunque ahora lleve dos cosas: cambiarlo dejaría huérfano el documento de
   quien ya lo tenga creado, y un documento huérfano con contraseñas dentro es
   justo lo que no puede pasar. */
/* Appwrite corta los ids en 36 caracteres. Los que genera él tienen 20, así
   que el recorte no toca nada hoy; está para que un id escrito a mano no
   rompa el canal en silencio. */
function idDeCredenciales(aulaId) { return String(aulaId || '').slice(0, 30) + '-cred'; }
function esDeCredenciales(id) { return /-cred$/.test(String(id || '')); }

function permisosDeCredenciales(ownerId) {
  return [
    Appwrite.Permission.read(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.update(Appwrite.Role.user(ownerId)),
    Appwrite.Permission.delete(Appwrite.Role.user(ownerId))
  ];
}

/* Lo que se guarda: usuario → contraseña, y nada más. Ni nombres, ni cursos,
   ni el resto de la ficha: si algún día este documento se leyera de más, que
   lo que haya dentro sea lo mínimo. */
function credencialesDeLaLista() {
  const out = {};
  for (const r of (ATLAS_CONFIG.roster || [])) {
    const u = String(r.username || '').trim().toLowerCase();
    if (u && r.password) out[u] = r.password;
  }
  return out;
}

/* Los usuarios que hay ahora mismo en la lista de clase. Sirve para no
   arrastrar para siempre la contraseña de quien ya no está. */
function usuariosDeLaLista() {
  const out = new Set();
  for (const r of (ATLAS_CONFIG.roster || [])) {
    const u = String(r.username || '').trim().toLowerCase();
    if (u) out.add(u);
  }
  return out;
}

async function cloudGuardarCredenciales() {
  if (!aulasOn() || !aulaActiva() || !CLOUD.user) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  const uid = CLOUD.user.$id;
  const propias = credencialesDeLaLista();
  const hayNotas = Object.keys(ATLAS_CONFIG.notasInforme || {}).length > 0;
  /* Sin nada que guardar no se crea el documento: un equipo que aún no tiene
     contraseñas no puede vaciar el del que sí. Las notas cuentan como algo
     que guardar, así que un equipo que solo tenga notas sí escribe: la mezcla
     de más abajo es la que protege las contraseñas que no conoce. */
  if (!Object.keys(propias).length && !hayNotas) return { ok: true, vacio: true };

  /* Se MEZCLA con lo que ya hay, no se reemplaza. Un segundo equipo puede
     conocer tres contraseñas de veinticinco —las que se pusieron en él—, y
     guardar solo esas tres se llevaría por delante las otras veintidós. Lo
     que este equipo sabe manda sobre lo guardado; lo que no sabe, se
     conserva. Solo se cae lo de quien ya no está en la lista. */
  const cred = {};
  const enLista = usuariosDeLaLista();
  const previo = await cloudTraerCredenciales();
  if (previo.ok) {
    for (const [u, pw] of Object.entries(previo.cred || {})) {
      if (enLista.has(u)) cred[u] = pw;
    }
  }
  Object.assign(cred, propias);
  /* Las notas de las familias se mezclan con la misma regla: gana la más
     reciente de cada alumno, y lo que este equipo no conoce se conserva. */
  const notas = mezclarNotas(previo.ok ? previo.notas : null, ATLAS_CONFIG.notasInforme);

  /* ── Y la lista de clase ──
     Aquí sí va entera, con las contraseñas dentro: este documento es del
     docente y de nadie más. Dos cautelas, por lo que se juega:

     · Si este equipo no tiene lista y el documento sí, se conserva la suya.
       Un equipo recién estrenado no puede vaciarle la clase al que la tiene.
     · Si la guardada es MÁS NUEVA que la última que vio este equipo, tampoco
       se pisa. Es el caso de dar de alta a un alumno en el portátil y tocar
       cualquier ajuste en la tablet antes de que le llegue: sin esto, la
       tablet subiría su lista vieja y el alumno nuevo desaparecería. */
  const miRoster = Array.isArray(ATLAS_CONFIG.roster) ? ATLAS_CONFIG.roster : [];
  const rosterGuardado = (previo.ok && Array.isArray(previo.roster)) ? previo.roster : null;
  const guardadaEsMasNueva = !!(previo.ok && previo.rosterAt
    && previo.rosterAt > (ATLAS_CONFIG_META.rosterAt || 0));
  const conservarLaGuardada = !!rosterGuardado && (!miRoster.length || guardadaEsMasNueva);
  const roster = conservarLaGuardada ? rosterGuardado : miRoster;
  const rosterAt = conservarLaGuardada
    ? (previo.rosterAt || Date.now())
    : (miRoster.length ? Date.now() : 0);

  const data = {
    owner: uid,
    name: 'Credenciales',
    teacher: ATLAS_CONFIG.teacherName || '',
    config: JSON.stringify({ v: 1, cred, notas, roster, rosterAt }),
    updated_at: String(Date.now())
  };
  const id = idDeCredenciales(aulaActiva());
  try {
    await CLOUD.db.updateDocument(c.databaseId, c.aulasCollectionId, id, data,
      permisosDeCredenciales(uid));
    apuntarRosterVisto(rosterAt);
    return { ok: true };
  } catch (e) {
    try {
      await CLOUD.db.createDocument(c.databaseId, c.aulasCollectionId, id, data,
        permisosDeCredenciales(uid));
      apuntarRosterVisto(rosterAt);
      return { ok: true, creado: true };
    } catch (e2) { return errorNube(e2); }
  }
}

/* La marca de la última lista que este equipo escribió o adoptó. Sirve para
   no adoptar la propia y para saber cuándo la de la nube es más nueva. */
function apuntarRosterVisto(marca) {
  if (!marca) return;
  ATLAS_CONFIG_META.rosterAt = Math.max(ATLAS_CONFIG_META.rosterAt || 0, marca);
  saveConfigMeta();
}

async function cloudTraerCredenciales() {
  if (!aulasOn() || !aulaActiva() || !CLOUD.user) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  try {
    const doc = await CLOUD.db.getDocument(c.databaseId, c.aulasCollectionId,
      idDeCredenciales(aulaActiva()));
    const p = JSON.parse(doc.config || '{}');
    return {
      ok: true,
      cred: (p && p.cred) || {},
      notas: (p && p.notas) || {},
      roster: (p && Array.isArray(p.roster)) ? p.roster : null,
      rosterAt: Number((p && p.rosterAt) || 0)
    };
  } catch (e) {
    const msg = (e && e.message) || '';
    /* Que no exista es lo normal la primera vez. */
    if (/not be found|not found|404/i.test(msg)) {
      return { ok: true, cred: {}, notas: {}, roster: null, rosterAt: 0 };
    }
    return errorNube(e);
  }
}

/* ── Borrar de la nube todo lo de un alumno ──

   Tres sitios y tres finales distintos, y conviene no prometer los tres:

   · El documento privado del docente es suyo: se reescribe sin ese alumno y
     ya está.
   · Su diario lo creó él, con permiso solo para él. El equipo «docentes»
     tiene Read y Update en la colección —es lo que hace falta para la vista
     de clase y para anotarle un mérito—, pero Delete es un permiso aparte que
     puede no estar dado. Si falta, se dice cuál y dónde se da.
   · Su CUENTA de Appwrite no se puede borrar desde aquí: el SDK del navegador
     no tiene servicio de usuarios, a propósito. Eso se hace en la consola, y
     mientras no se haga el niño puede seguir entrando y crear un diario nuevo.
     Callarlo sería dar por cumplido un borrado a medias. */
async function cloudBorrarAlumno(ficha) {
  const hecho = { privado: false, diario: false };
  const pendientes = [];
  if (!aulasOn() || !CLOUD.user) {
    return { ok: false, reason: 'sin-sesion', hecho,
             pendientes: ['No hay sesión de docente: no se ha tocado nada de la nube.'] };
  }
  const c = ATLAS_CONFIG.appwrite;
  const usuario = String((ficha && ficha.username) || '').trim().toLowerCase();
  const clave = ficha ? diaryKey(ficha) : '';

  /* 1) El documento privado: contraseña, ficha de la lista y notas. */
  if (aulaActiva()) {
    const previo = await cloudTraerCredenciales();
    if (previo.ok) {
      const cred = { ...(previo.cred || {}) };
      if (usuario) delete cred[usuario];
      const notas = { ...(previo.notas || {}) };
      if (clave) delete notas[clave];
      const roster = (previo.roster || []).filter(r => String(r.username || '').trim().toLowerCase() !== usuario);
      try {
        await CLOUD.db.updateDocument(c.databaseId, c.aulasCollectionId,
          idDeCredenciales(aulaActiva()),
          { config: JSON.stringify({ v: 1, cred, notas, roster, rosterAt: Date.now() }),
            updated_at: String(Date.now()) },
          permisosDeCredenciales(CLOUD.user.$id));
        hecho.privado = true;
      } catch (e) { pendientes.push('No se ha podido reescribir tu documento privado: ' + ((e && e.message) || '')); }
    }
  }

  /* 2) Su diario. */
  const docId = (ficha && ficha.authId) || '';
  if (docId) {
    try {
      await CLOUD.db.deleteDocument(c.databaseId, c.collectionId, docId);
      hecho.diario = true;
    } catch (e) {
      const msg = (e && e.message) || '';
      if (/not be found|not found|404/i.test(msg)) hecho.diario = true;   /* no había */
      else if (/not authorized|missing scope|permission/i.test(msg)) {
        pendientes.push('Su diario sigue en la nube: tu cuenta no tiene permiso para borrarlo. '
          + 'En la consola de Appwrite, colección de diarios → Settings → Permissions → '
          + 'Team «docentes» → Delete. Es un permiso aparte del de leer y escribir.');
      } else pendientes.push('Su diario sigue en la nube: ' + msg);
    }
  }

  /* 3) Su cuenta, que desde aquí no se toca. */
  if (ficha && ficha.account) {
    pendientes.push('Su CUENTA de Appwrite sigue existiendo y no se puede borrar desde la app. '
      + 'Hazlo en la consola, en Auth → Users. Mientras siga, puede entrar y empezar un diario nuevo.');
  }
  return { ok: true, hecho, pendientes };
}

/* ── Juntar las notas de dos equipos ──
   Cada alumno tiene una lista corta de notas con fecha. Se juntan por fecha:
   dos equipos que escribieron el mismo día son una corrección —gana la de
   aquí, que es la que el docente acaba de ver— y días distintos se conservan
   los dos. Nunca se pierde una nota por sincronizar. */
function mezclarNotas(dellaNube, deAqui) {
  const out = {};
  const claves = new Set([...Object.keys(dellaNube || {}), ...Object.keys(deAqui || {})]);
  for (const k of claves) {
    const porFecha = new Map();
    for (const n of ((dellaNube || {})[k] || [])) {
      if (n && n.texto && n.fecha) porFecha.set(String(n.fecha), { fecha: String(n.fecha), texto: String(n.texto) });
    }
    for (const n of ((deAqui || {})[k] || [])) {
      if (n && n.texto && n.fecha) porFecha.set(String(n.fecha), { fecha: String(n.fecha), texto: String(n.texto) });
    }
    const lista = [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (lista.length) out[k] = lista.slice(-NOTAS_TOPE);
  }
  return out;
}

/* Rellena en la lista de clase las contraseñas que a ESTE equipo le faltan.
   Nunca pisa una que ya esté puesta: la de aquí puede ser la buena y la de la
   nube una copia vieja. */
async function rellenarCredenciales() {
  const r = await cloudTraerCredenciales();
  if (!r.ok) return r;

  /* ── Primero la lista de clase entera ──
     Desde que la lista dejó de viajar con los ajustes —la leía cualquier
     alumno—, este es el único camino por el que llega al segundo equipo del
     docente. Se adopta cuando la guardada es más nueva que la última que vio
     este equipo, la misma regla que ya usan los ajustes del aula. */
  let rosterNuevo = 0;
  if (Array.isArray(r.roster) && r.rosterAt > (ATLAS_CONFIG_META.rosterAt || 0)) {
    rosterNuevo = r.roster.length;
    sinSubir(() => { setTeacherConfig('roster', deepClone(r.roster)); saveTeacherConfig(); });
    apuntarRosterVisto(r.rosterAt);
  }

  const lista = deepClone(ATLAS_CONFIG.roster || []);
  let puestas = 0;
  for (const f of lista) {
    const u = String(f.username || '').trim().toLowerCase();
    if (!u || f.password) continue;
    if (r.cred[u]) { f.password = r.cred[u]; puestas++; }
  }
  /* Y las notas de las familias, que viajan por el mismo documento. Aquí no
     hay «no pisar»: se mezclan las dos listas y se quedan todas. */
  const notas = mezclarNotas(r.notas, ATLAS_CONFIG.notasInforme);
  const cambian = JSON.stringify(notas) !== JSON.stringify(ATLAS_CONFIG.notasInforme || {});

  if (puestas || cambian) {
    sinSubir(() => {
      if (puestas) setTeacherConfig('roster', lista);
      if (cambian) setTeacherConfig('notasInforme', notas);
      saveTeacherConfig();
    });
  }
  return { ok: true, puestas, notas: cambian, roster: rosterNuevo };
}

/* ══════════ LOS AJUSTES, A LA CLASE ══════════

   Todo cambio del panel acaba aquí, porque `saveTeacherConfig()` llama a
   `programarSubidaAjustes()`. Se espera unos segundos antes de mandar: al
   escribir el nombre de un pozo se guarda letra a letra, y sin la espera
   serían quince peticiones para un cambio.

   Lo que se sube es `configParaCompartir()`, o sea SIN las contraseñas del
   alumnado, sin el PIN, sin los datos de Appwrite y sin la clave de la API.
   Eso no cambia: sigue viviendo solo en cada equipo.

   Si falla —sin red, permiso denegado— no se pierde: queda anotado como
   pendiente y se reintenta al siguiente cambio y al abrir la clase. El
   estado se puede consultar con `ajustesArriba()`, que es lo que lee el
   panel para decir la verdad en vez de «guardado ✓». */
let ajustesTimer = null;
let ajustesSubiendo = false;
let ajustesPendientes = false;
let ajustesFallo = '';
const AJUSTES_ESPERA = 4000;

function ajustesArriba() {
  if (!aulasOn() || !aulaActiva()) return { estado: 'local' };
  if (ajustesSubiendo) return { estado: 'subiendo' };
  if (ajustesPendientes) return { estado: 'pendiente', detalle: ajustesFallo };
  return { estado: 'al-dia' };
}

function programarSubidaAjustes() {
  if (!aulasOn() || !aulaActiva()) return;   /* sin clase abierta no hay dónde */
  ajustesPendientes = true;
  clearTimeout(ajustesTimer);
  ajustesTimer = setTimeout(() => { subirAjustesAhora(); }, AJUSTES_ESPERA);
}

async function subirAjustesAhora() {
  if (ajustesSubiendo) return { ok: false, reason: 'ocupado' };
  if (!aulasOn() || !aulaActiva()) return { ok: false, reason: 'sin-nube' };
  clearTimeout(ajustesTimer);
  ajustesSubiendo = true;
  try {
    const r = await cloudSaveAulaConfig();
    /* Las contraseñas van por su propio canal, privado del docente, pero
       cambian en el mismo momento que los ajustes: al dar de alta la clase.
       Si fallan, no se toca el estado de los ajustes: son cosas distintas. */
    try { await cloudGuardarCredenciales(); } catch (e) { /* se reintenta al siguiente cambio */ }
    if (r.ok) { ajustesPendientes = false; ajustesFallo = ''; }
    else {
      /* Se queda pendiente A PROPÓSITO: el próximo cambio o la próxima
         apertura de la clase lo vuelven a intentar. Darlo por subido cuando
         no lo está es la única forma de perderlo sin enterarse. */
      ajustesFallo = r.reason === 'sin-permiso'
        ? 'tu cuenta no puede escribir en la clase'
        : (r.detail || 'no hay conexión');
    }
    return r;
  } finally {
    ajustesSubiendo = false;
    if (typeof refrescarPanelSiAbierto === 'function') refrescarPanelSiAbierto();
  }
}

/* ══════════ BORRAR UNA CLASE ══════════

   Es lo más destructivo que hace la plataforma: una clase se lleva por
   delante los diarios de veinticinco niños, que son un trimestre de trabajo
   suyo. Por eso va en dos partes: primero se CUENTA lo que hay dentro para
   poder enseñárselo al docente, y solo después se borra.

   Y se borra de dentro afuera —retos, diarios, y el aula al final—. Al revés,
   si algo fallara a mitad, quedarían filas apuntando a una clase que ya no
   existe: invisibles desde la app y imposibles de limpiar sin entrar en la
   consola. */
async function cloudContarDeAula(aulaId) {
  if (!aulasOn() || !CLOUD.user) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  const contar = async (col, campo) => {
    if (!col) return 0;
    try {
      const res = await CLOUD.db.listDocuments(c.databaseId, col,
        [Appwrite.Query.equal(campo, aulaId), Appwrite.Query.limit(1)]);
      /* `total` lo da Appwrite aunque se pida un solo documento. */
      return typeof res.total === 'number' ? res.total : res.documents.length;
    } catch (e) { return -1; }   /* -1 = no se ha podido contar */
  };
  return {
    ok: true,
    diarios: await contar(c.collectionId, 'aula'),
    retos: await contar(c.retosCollectionId, 'aula')
  };
}

/* Borra todo lo de una clase. Devuelve cuántos borró de cada cosa y qué
   falló: un borrado a medias tiene que poder contarse, no darse por bueno. */
async function cloudBorrarAula(aulaId, onProgreso) {
  if (!aulasOn() || !CLOUD.user) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  const cuenta = { retos: 0, diarios: 0, fallos: 0 };

  const barrer = async (col, campo, nombre) => {
    if (!col) return;
    for (let vuelta = 0; vuelta < 60; vuelta++) {
      let res;
      try {
        res = await CLOUD.db.listDocuments(c.databaseId, col,
          [Appwrite.Query.equal(campo, aulaId), Appwrite.Query.limit(50)]);
      } catch (e) { cuenta.fallos++; return; }
      if (!res.documents.length) return;
      for (const d of res.documents) {
        try { await CLOUD.db.deleteDocument(c.databaseId, col, d.$id); cuenta[nombre]++; }
        catch (e) { cuenta.fallos++; }
      }
      if (typeof onProgreso === 'function') onProgreso(nombre, cuenta[nombre]);
      /* Si en una vuelta entera no se ha borrado nada, no hay que seguir
         pidiendo la misma página para siempre. */
      if (cuenta.fallos >= res.documents.length) return;
    }
  };

  await barrer(c.retosCollectionId, 'aula', 'retos');
  await barrer(c.collectionId, 'aula', 'diarios');

  /* El aula, la última: mientras exista, lo de dentro sigue siendo
     alcanzable y se puede reintentar. */
  if (cuenta.fallos) return { ok: false, reason: 'parcial', ...cuenta };
  try { await CLOUD.db.deleteDocument(c.databaseId, c.aulasCollectionId, aulaId); }
  catch (e) { return Object.assign({ ok: false }, errorNube(e), cuenta); }

  /* Y solo entonces sus credenciales: dejarlas sería guardar las contraseñas
     de una clase que ya no existe, pero borrarlas antes sería quedarse sin
     ellas en un borrado que se queda a medias y hay que reintentar. */
  try { await CLOUD.db.deleteDocument(c.databaseId, c.aulasCollectionId, idDeCredenciales(aulaId)); }
  catch (e) { /* si no había, mejor */ }
  return { ok: true, ...cuenta };
}

/* Guarda los ajustes de la clase activa (no los diarios: van aparte) */
async function cloudSaveAulaConfig() {
  if (!aulasOn() || !aulaActiva()) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  /* El nombre de la clase vive en su documento. Sincronizar desde un equipo
     donde no esté puesto NO puede rebautizarla: antes la dejaba en «Clase». */
  const paquete = JSON.stringify(configParaCompartir());

  /* ── ¿Cabe? ──
     El campo `config` del aula admite 200 000 caracteres. Los retos generados
     con IA viven en su propia tabla y no cuentan aquí, pero los escritos a
     mano ANTES de configurarla se quedan dentro de los ajustes, y un banco
     propio de cierto tamaño se pasa. Sin esta comprobación, lo que se veía
     era el error crudo de Appwrite: no decía qué ocupaba de más ni qué hacer,
     y el docente creía que sus ajustes estaban a salvo cuando no subían. */
  if (paquete.length > CONFIG_MAX) {
    const dentro = retosDentroDeLosAjustes();
    return { ok: false, reason: 'demasiado-grande',
      detail: `Los ajustes ocupan ${Math.round(paquete.length / 1000)} KB y la clase admite `
            + `${Math.round(CONFIG_MAX / 1000)}. `
            + (dentro
              ? `Llevan ${dentro} reto(s) escritos dentro. Configura la tabla de retos en `
                + '«Acceso y nube» y pulsa «Mover los retos a la tabla»: dejan de viajar aquí.'
              : 'Revisa si hay yacimientos o pozos que ya no uses.') };
  }

  const data = {
    teacher: ATLAS_CONFIG.teacherName || '',
    config: paquete,
    updated_at: String(Date.now())
  };
  const nombre = (ATLAS_CONFIG.className || '').trim() || (AULA.name || '').trim();
  if (nombre) data.name = nombre;

  try {
    /* Los permisos van en cada guardado, no solo al crear: es lo que abre la
       lectura a las clases que se crearon antes de este cambio, sin que
       nadie tenga que tocar nada en la consola. */
    await CLOUD.db.updateDocument(c.databaseId, c.aulasCollectionId, aulaActiva(), data,
      permisosDeAula(CLOUD.user.$id));
    /* Se anota la marca que se acaba de escribir. Sin esto, al arrancar este
       mismo equipo vería una versión «más nueva» en la nube —la suya— y se
       la volvería a tragar, pisando lo que hubiera tocado desde entonces. */
    ATLAS_CONFIG_META.sharedAt = Number(data.updated_at) || Date.now();
    saveConfigMeta();
    return { ok: true };
  } catch (e) { return errorNube(e); }
}

/* Lo que admite el campo `config` del documento de la clase. Es el límite de
   Appwrite, no nuestro: por eso se comprueba antes de mandar en vez de
   descubrirlo en el mensaje de error. */
const CONFIG_MAX = 200000;

/* Cuántos retos escritos a mano viajan todavía dentro de los ajustes. Es el
   número que convierte «no cabe» en algo que el docente puede arreglar. */
function retosDentroDeLosAjustes() {
  let n = 0;
  for (const s of (ATLAS_CONFIG.sites || [])) {
    for (const b of (s.branches || [])) {
      for (const est of Object.keys(b.bank || {})) n += (b.bank[est] || []).length;
    }
  }
  return n;
}

/* ── Diarios de una clase ── */
const AULA_PAGE = 100;

async function cloudPullAula(aulaId) {
  if (!aulasOn()) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  try {
    /* Los ajustes de la clase */
    const doc = await CLOUD.db.getDocument(c.databaseId, c.aulasCollectionId, aulaId);
    let ajustes = null;
    try { ajustes = JSON.parse(doc.config || '{}'); } catch (e) { ajustes = null; }

    /* Y todos sus diarios, paginando */
    const docs = [];
    let cursor = null;
    for (let p = 0; p < 20; p++) {
      const q = [Appwrite.Query.equal('aula', aulaId), Appwrite.Query.limit(AULA_PAGE)];
      if (cursor) q.push(Appwrite.Query.cursorAfter(cursor));
      const res = await CLOUD.db.listDocuments(c.databaseId, c.collectionId, q);
      docs.push(...res.documents);
      if (res.documents.length < AULA_PAGE) break;
      cursor = res.documents[res.documents.length - 1].$id;
    }
    return {
      ok: true,
      aula: { id: doc.$id, name: doc.name, teacher: doc.teacher },
      ajustes,
      diarios: docs
    };
  } catch (e) { return errorNube(e); }
}

/* ── Cuándo llegó por última vez el diario de cada uno ──
   Para el panel de salud, y solo eso: se piden cuatro campos por documento
   —no el diario, que son 20 KB por alumno— porque la pregunta es «¿cuándo
   sincronizó esta tablet?» y no «¿qué ha hecho?». En una clase de 25 son
   dos kilobytes.

   Va aparte de fetchClassDocs() a propósito: aquella lee resúmenes para
   pintar la clase y no necesita saber la fecha; esta necesita la fecha y no
   necesita el resumen. Meterlas en una sola habría hecho que la vista de
   clase se trajera de más en cada apertura. */
async function cloudPulsoDeLosDiarios() {
  if (!aulasOn()) return { ok: false, reason: 'sin-nube' };
  if (!CLOUD.user) return { ok: false, reason: 'sin-sesion' };
  const aula = aulaActiva();
  if (!aula) return { ok: false, reason: 'sin-aula' };
  const c = ATLAS_CONFIG.appwrite;
  const CAMPOS = ['$id', 'name', 'updated_at', '$updatedAt'];
  const out = [];
  try {
    let cursor = null;
    for (let p = 0; p < 20; p++) {
      const q = [Appwrite.Query.equal('aula', aula), Appwrite.Query.limit(AULA_PAGE)];
      if (Appwrite.Query.select) q.push(Appwrite.Query.select(CAMPOS));
      if (cursor) q.push(Appwrite.Query.cursorAfter(cursor));
      const res = await CLOUD.db.listDocuments(c.databaseId, c.collectionId, q);
      for (const d of res.documents) {
        /* updated_at lo escribe el diario; $updatedAt lo pone Appwrite. Se
           usa el mayor: un diario viejo guardado hoy sincronizó hoy. */
        const propio = Number(d.updated_at) || 0;
        const suyo = d.$updatedAt ? new Date(d.$updatedAt).getTime() : 0;
        out.push({ id: d.$id, nombre: d.name || '', visto: Math.max(propio, suyo || 0) });
      }
      if (res.documents.length < AULA_PAGE) break;
      cursor = res.documents[res.documents.length - 1].$id;
    }
    return { ok: true, diarios: out };
  } catch (e) { return errorNube(e); }
}

/* Reparto estable de una cadena en 13 caracteres base36 (≈67 bits).
   Dos pasadas FNV-1a con constantes distintas: no es criptográfico —no le
   hace falta— y solo tiene que repartir bien y dar SIEMPRE lo mismo en
   cualquier equipo, que es de lo que depende que un alumno escriba en su
   documento y no en el de otro. */
function hash36(texto) {
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  const s = String(texto);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return (h1.toString(36).padStart(7, '0') + h2.toString(36).padStart(7, '0')).slice(0, 13);
}

/* El id del documento se deriva de la clase y del alumno: así el mismo
   alumno desde dos equipos escribe en el MISMO documento en vez de crear
   duplicados que luego nadie sabe cuál es el bueno.

   Va con hash y no con el nombre recortado. Appwrite limita el id a 36
   caracteres, y los 20 del id del aula más el guion bajo solo dejaban 15
   para el nombre: «Ana María Rodríguez Pérez» y «Ana María Rodríguez Gómez»
   se recortaban las dos a «ana-maria-rodri» y el segundo diario pisaba al
   primero sin avisar. Con nombres compuestos, que en un aula española son
   lo normal, eso pasaba de verdad. El hash se calcula sobre el nombre
   ENTERO, así que dos nombres distintos dan documentos distintos por muy
   parecido que empiecen. */
const DOC_ID_MAX = 36;

function docIdDiario(aulaId, clave) {
  /* Sin tildes y en minúsculas: el mismo alumno escrito «José» en una tablet
     y «jose» en otra tiene que caer en el mismo documento. */
  const limpio = String(clave).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const h = hash36(limpio);
  /* Si algún día el id del aula fuera más largo de lo que cabe, se recorta
     el prefijo (que solo sirve para leerlo en la consola de Appwrite) y
     nunca el hash, que es lo que evita las colisiones. */
  const prefijo = String(aulaId || 'd').slice(0, DOC_ID_MAX - h.length - 1);
  return prefijo + '_' + h;
}

async function cloudPushDiario(clave, estado) {
  if (!aulasOn() || !aulaActiva() || !CLOUD.user) return { ok: false, reason: 'sin-nube' };
  const c = ATLAS_CONFIG.appwrite;
  const uid = CLOUD.user.$id;
  /* Al mismo documento del que vino. Solo cuando no se sabe —el diario nació
     en este equipo, en clase dirigida— se deriva el id del nombre. */
  const id = docIdConocido(clave) || docIdDiario(aulaActiva(), clave);
  const data = {
    aula: aulaActiva(),
    owner: uid,
    name: estado.profile.explorer_name,
    state: JSON.stringify(estado),
    updated_at: String(estado.updated_at || Date.now())
  };
  try { const s = buildSummaryOf(estado); if (s) data.summary = JSON.stringify(s); }
  catch (e) { /* sin resumen, el diario se guarda igual */ }

  try {
    await CLOUD.db.updateDocument(c.databaseId, c.collectionId, id, data);
    recordarDocId(clave, id);
    apuntarSubida(clave, data.updated_at);
    return { ok: true, id };
  } catch (e) {
    try {
      await CLOUD.db.createDocument(c.databaseId, c.collectionId, id, data, permisosDeAula(uid));
      recordarDocId(clave, id);
      apuntarSubida(clave, data.updated_at);
      return { ok: true, id, creado: true };
    } catch (e2) { return errorNube(e2); }
  }
}

/* ── Subida perezosa de diarios ──
   Durante un turno se guarda en cada respuesta. Enviar uno por respuesta
   sería castigar la red del centro; se agrupan y se envían al terminar. */
const AULA_COLA = new Set();
let aulaTimer = 0;

function aulaScheduleSave(clave) {
  if (!aulasOn() || !aulaActiva()) return;
  AULA_COLA.add(clave);
  clearTimeout(aulaTimer);
  aulaTimer = setTimeout(vaciarColaAula, 3000);
}

async function vaciarColaAula() {
  if (!aulasOn() || !aulaActiva() || !AULA_COLA.size) return { ok: true, enviados: 0 };
  const map = loadDiaries();
  const pendientes = [...AULA_COLA];
  AULA_COLA.clear();
  let enviados = 0, fallidos = 0;
  for (const clave of pendientes) {
    const estado = map[clave];
    if (!estado) continue;
    const r = await cloudPushDiario(clave, estado);
    if (r.ok) enviados++;
    else { fallidos++; AULA_COLA.add(clave); }   /* se reintenta en la próxima */
  }
  return { ok: !fallidos, enviados, fallidos };
}

/* ── Abrir una clase en este equipo ──
   Trae sus ajustes y sus diarios, fusionando con lo que hubiera aquí.

   Cambiar de clase VACÍA los diarios de este equipo, así que antes de
   borrar nada hay que dejarlos a salvo arriba. Antes no se hacía: si el
   docente cambiaba de clase sin red, o justo al acabar un turno —la cola de
   subida espera 3 s—, la sesión entera se perdía mientras el diálogo le
   aseguraba que estaba guardada. Ahora se sube todo primero y, si algo no
   sale, no se borra nada y se dice cuántos quedan. */
async function abrirAula(aulaId, nombre, opciones) {
  const cambiaDeClase = !!(aulaActiva() && aulaActiva() !== aulaId);

  if (cambiaDeClase) {
    clearTimeout(aulaTimer);          /* la cola pendiente entra en esta subida */
    const sync = await sincronizarAula();
    if (!sync.ok && !(opciones && opciones.descartarSinSubir)) {
      /* sincronizarAula() puede fallar sin llegar a intentarlo (sin nube):
         lo que se le dice al docente es cuántos diarios hay aquí en juego,
         no cuántas peticiones fallaron. */
      const enJuego = sync.fallidos || diariosPorSubir(0).length;
      return { ok: false, reason: 'sin-subir', pendientes: enJuego };
    }
  }

  const res = await cloudPullAula(aulaId);
  if (!res.ok) return res;

  /* Ya están arriba: ahora sí, los de la clase anterior no pueden quedarse */
  if (cambiaDeClase) cerrarAula();
  setAulaActiva(aulaId, res.aula.name || nombre || '');

  if (res.ajustes && typeof res.ajustes === 'object') {
    /* Los ajustes de la clase mandan, pero sin tocar lo que nunca viaja
       (contraseñas, PIN, datos de conexión de este equipo). */
    adoptSharedConfig({ overlay: res.ajustes, updated_at: Date.now(), by: res.aula.teacher || '' });
  }
  /* El nombre lo manda el documento de la clase, no lo que hubiera aquí */
  if (res.aula.name) setTeacherConfig('className', res.aula.name);
  const fus = fusionarDiarios(res.diarios || []);
  /* Si algo quedó sin subir de la última vez, este es el momento: hay clase
     abierta y acaba de haber red suficiente para traerla entera. */
  if (ajustesPendientes) subirAjustesAhora();
  return { ok: true, aula: res.aula, ...fus };
}

/* Subir todo lo que este equipo tenga y la nube no: al recuperar la red */
async function sincronizarAula() {
  if (!aulasOn() || !aulaActiva()) return { ok: false, reason: 'sin-nube' };
  const pendientes = diariosPorSubir(0);
  let enviados = 0, fallidos = 0;
  for (const p of pendientes) {
    const r = await cloudPushDiario(p.clave, p.estado);
    if (r.ok) enviados++; else fallidos++;
  }
  const cfg = await cloudSaveAulaConfig();
  return { ok: !fallidos, enviados, fallidos, ajustes: cfg.ok };
}

/* ══════════ COMPROBACIÓN DE LA CONEXIÓN ══════════
   Los identificadores de colección se copian a mano de la consola de Appwrite
   y equivocarse en uno deja la plataforma en un fallo mudo: parece que va, y
   los diarios no llegan a ninguna parte. Esto los prueba uno a uno y dice cuál
   falla y por qué. Son todo lecturas: no crea ni cambia nada.

   La parte que decide QUÉ significa cada error va aparte y es pura, para poder
   probarla sin red. */
function interpretarSondeo(e) {
  if (!e) return { ok: true, veredicto: 'existe', texto: 'Responde.' };
  const msg = (e && e.message) || '';
  if (/could not be found|not be found|404/i.test(msg)) {
    return { ok: false, veredicto: 'no-existe',
             texto: 'No existe con ese ID. Revísalo en la consola de Appwrite: el ID no siempre es el nombre.' };
  }
  if (/not authorized|missing scope|unauthorized|permission/i.test(msg)) {
    /* Existe: si no, habría contestado que no la encuentra. Que no deje leer
       de golpe es lo NORMAL con seguridad por documento y sin sesión. */
    return { ok: true, veredicto: 'sin-permiso',
             texto: 'Existe, pero esta sesión no puede listarla entera. Con permisos por documento es lo esperado.' };
  }
  if (/fetch|network|CORS|Failed to fetch/i.test(msg)) {
    return { ok: false, veredicto: 'sin-red',
             texto: 'No se llega al servidor. Suele ser que falta añadir este dominio en Appwrite → Settings → Platforms.' };
  }
  return { ok: false, veredicto: 'error', texto: msg || 'Error desconocido.' };
}

async function cloudSondearColeccion(id) {
  try {
    await CLOUD.db.listDocuments(ATLAS_CONFIG.appwrite.databaseId, id, [Appwrite.Query.limit(1)]);
    return interpretarSondeo(null);
  } catch (e) { return interpretarSondeo(e); }
}

/* ── Cuántos diarios ve ESTA cuenta ──
   Con seguridad por documento, un diario que no puedes leer no da error: la
   consulta responde bien y con la lista vacía. Para el docente eso es
   indistinguible de «todavía no ha empezado nadie», y es exactamente el punto
   donde se queda atascado. Aquí al menos se convierte en un número. */
async function cloudContarDiarios() {
  const c = ATLAS_CONFIG.appwrite;
  try {
    const res = await CLOUD.db.listDocuments(c.databaseId, c.collectionId, [Appwrite.Query.limit(1)]);
    const n = Number(res.total);
    const cuantos = Number.isFinite(n) ? n : res.documents.length;
    if (cuantos > 0) {
      return { ok: true, veredicto: 'lee', texto: `Tu cuenta puede leer ${cuantos} diario(s).` };
    }
    return { ok: true, aviso: true, veredicto: 'cero', texto:
      'Tu cuenta no ve ningún diario. Puede ser que aún no haya ninguno, o que existan y tu '
      + 'cuenta no tenga permiso para leerlos: Appwrite no distingue las dos cosas, responde '
      + 'con la lista vacía en las dos. Si algún alumno ya ha entrado, es lo segundo: en la '
      + 'consola, colección de diarios → Permissions → Read para el equipo «docentes».' };
  } catch (e) { return interpretarSondeo(e); }
}

async function cloudDiagnostico() {
  const c = ATLAS_CONFIG.appwrite;
  const pasos = [];
  const anotar = (que, r) => pasos.push({ que, ...r });

  if (!cloudConfigured()) {
    anotar('Configuración', { ok: false, texto: 'Faltan datos: endpoint, proyecto, base de datos o colección de diarios.' });
    return pasos;
  }
  if (!CLOUD.enabled) {
    anotar('SDK de Appwrite', { ok: false, texto: 'No ha cargado. Sin él la plataforma funciona en modo local.' });
    return pasos;
  }
  anotar('SDK de Appwrite', { ok: true, texto: 'Cargado.' });
  anotar('Sesión', CLOUD.user
    ? { ok: true, texto: `Iniciada como ${CLOUD.user.name || CLOUD.user.email || CLOUD.user.$id}.` }
    : { ok: true, texto: 'Sin sesión. Algunas comprobaciones dirán «no puede listarla»: es normal.' });

  anotar('Versión de la app', { ok: true, texto:
    `${ATLAS_VERSION}. Si aquí sale una versión vieja, el navegador está sirviendo una copia `
    + 'guardada: recarga forzando (Ctrl+May+R, o mantén pulsado el botón de recargar).' });

  /* Con sesión se cuenta, que dice más y cuesta la misma petición: si la
     colección no existiera o no hubiera red, el conteo lo interpreta igual. */
  anotar(`Diarios («${c.collectionId}»)`, CLOUD.user
    ? await cloudContarDiarios()
    : await cloudSondearColeccion(c.collectionId));
  if (c.aulasCollectionId) anotar(`Aulas («${c.aulasCollectionId}»)`, await cloudSondearColeccion(c.aulasCollectionId));
  if (c.configCollectionId) anotar(`Configuración («${c.configCollectionId}»)`, await cloudSondearColeccion(c.configCollectionId));
  if (c.retosCollectionId) anotar(`Retos («${c.retosCollectionId}»)`, await cloudSondearColeccion(c.retosCollectionId));
  /* Leer no es escribir: la tabla de retos se lee con `users` y se escribe
     con el equipo «docentes», así que se puede listar perfectamente y luego
     no poder guardar. Esto lo prueba de verdad, creando y borrando. */
  if (c.retosCollectionId && CLOUD.user) anotar('Escribir un reto de prueba', await cloudProbarEscrituraRetos());
  return pasos;
}

/* Crea un reto de mentira y lo borra. Es la única forma de saber si el
   docente podrá guardar: listar la tabla solo prueba la lectura, que la
   tiene cualquier cuenta con sesión. */
async function cloudProbarEscrituraRetos() {
  if (!aulaActiva()) {
    return { ok: false, texto: 'No hay clase abierta. Ábrela en «Mis clases»: un reto se guarda en una clase.' };
  }
  const c = ATLAS_CONFIG.appwrite;
  const prueba = {
    siteId: '_prueba', branchId: '_prueba', estrato: 'recordar', skill: '_prueba',
    question: 'Reto de prueba del diagnóstico', options: ['a', 'b', 'c', 'd'], answer: 0
  };
  let doc = null;
  try {
    doc = await CLOUD.db.createDocument(c.databaseId, c.retosCollectionId, 'unique()',
      filaDeReto(prueba, aulaActiva(), 'cola'), permisosDeReto());
  } catch (e) {
    return { ok: false, texto: textoDeFalloAlCrear(errorNube(e)) +
      ' · La app manda estas columnas: ' + columnasQueSeMandan() };
  }
  try { await CLOUD.db.deleteDocument(c.databaseId, c.retosCollectionId, doc.$id); }
  catch (e) {
    return { ok: false, texto: 'Se puede crear, pero NO borrar: revisa DELETE del equipo «docentes» en Security. '
      + 'Ha quedado un reto de prueba en la tabla; bórralo desde la consola.' };
  }
  return { ok: true, texto: 'Se puede crear y borrar. Los retos se guardarán bien.' };
}

/* guardado perezoso: saveState() lo invoca; agrupa ráfagas en un envío */
function cloudScheduleSave() {
  if (!CLOUD.enabled || !CLOUD.user) return;
  clearTimeout(CLOUD.saveTimer);
  CLOUD.saveTimer = setTimeout(cloudPush, 2500);
}

async function cloudLogout() {
  clearTimeout(CLOUD.saveTimer);
  try { await CLOUD.account.deleteSession('current'); } catch (e) { /* ya cerrada */ }
  CLOUD.user = null;
}
