/* ══════════════════════════════════════════════════════════════════════
   MODO DEMOSTRACIÓN
   ══════════════════════════════════════════════════════════════════════

   Un maestro que abre el enlace por primera vez se encuentra dos puertas: el
   panel, que pide un PIN que no tiene, y el diario de explorador, que le crea
   una libreta vacía. Con la libreta vacía no se ve nada de lo que esta
   plataforma hace: ni el mapa con progreso, ni la vista de clase, ni los
   méritos, ni el Fondo. Se marcha pensando que es un cuestionario bonito.

   Esto es la tercera puerta. Un clic y está dentro de una clase de tercero
   con dieciocho niños, tres cuadrillas repartidas, dos semanas de méritos y
   el Fondo a medio camino. Puede excavar, dar méritos, abrir el cuaderno de
   cualquiera y trastear con la configuración.

   ── Por qué no es una cuenta de prueba en la nube ──

   Porque sería meter a desconocidos dentro de la base de datos real. Y porque
   la aplicación no puede cambiar la contraseña de una cuenta ni borrarla —el
   SDK del navegador no trae servicio de usuarios—, así que el día que alguien
   cambiara esa contraseña la demostración quedaría muerta y sin arreglo
   posible desde aquí.

   ── Las tres barreras ──

   1. NADA SE GUARDA. Mientras dure la demostración, todo lo que la aplicación
      escriba va a un cajón de memoria que se vacía al salir. No es una
      comprobación repartida por los treinta sitios que guardan: es que el
      sitio donde se guarda, `almacen()`, es otro. Un maestro puede abrir la
      demostración en la tablet de su clase sin pisarle el diario a nadie.

   2. NO SE TOCA LA NUBE. `cloudEnabled()` dice que no mientras dure, así que
      no hay sesión, ni escritura, ni petición ninguna.

   3. NO SE SALE NADA FUERA. Publicar los ajustes, exportar la copia, la clave
      de la IA y el alta de cuentas quedan cerrados. Son las cuatro cosas que
      cruzan el límite de este navegador.

   Este fichero carga EL PRIMERO de los doce, antes que `content.js`, porque
   `almacen()` hace falta ya en `config.js` —que lee los ajustes del docente
   nada más arrancar— y una función solo existe cuando su fichero ya ha
   corrido. Lo que este fichero usa de los demás lo usa al pulsar el botón,
   que es mucho después. */

let DEMO = false;
function enModoDemo() { return DEMO; }

/* ── El cajón de memoria ──
   Imita lo justo de `localStorage`: lo que la aplicación usa de verdad,
   incluido `length` y `key()`, que los usa el medidor de espacio ocupado. */
const CAJON_DEMO = {
  datos: new Map(),
  get length() { return this.datos.size; },
  key(i) { return Array.from(this.datos.keys())[i] ?? null; },
  getItem(k) { return this.datos.has(String(k)) ? this.datos.get(String(k)) : null; },
  setItem(k, v) { this.datos.set(String(k), String(v)); },
  removeItem(k) { this.datos.delete(String(k)); },
  clear() { this.datos.clear(); }
};

/* Dónde se guarda. Casi siempre en el navegador, que es lo que hace que un
   diario siga ahí mañana; en demostración, en el cajón de arriba. */
function almacen() { return DEMO ? CAJON_DEMO : localStorage; }

/* ══════════ LA CLASE INVENTADA ══════════

   Dieciocho nombres, que es una clase de verdad y no una lista de ejemplo de
   tres. Los apellidos son los más comunes del padrón español: con nombres
   inventados raros, un maestro no reconoce su clase en la pantalla.

   No hay ningún dato de ninguna persona real aquí. Son nombres corrientes
   combinados a propósito para que no apunten a nadie. */
const DEMO_CLASE = [
  'Nadia Ruiz',    'Iván Soler',     'Lucía Mena',    'Adán Ferrer',
  'Zoe Carrasco',  'Bruno Salas',    'Emma Peralta',  'Hugo Villar',
  'Alba Cortés',   'Marco Nieto',    'Vega Alonso',   'Dani Quintana',
  'Sara Bermejo',  'Leo Pardo',      'Noa Gallardo',  'Tomás Ibarra',
  'Iris Vega',     'Gael Montero'
];

const DEMO_CUADRILLAS = [
  { id: 'condor',  name: 'Cuadrilla del Cóndor',   icon: '🦅', desde: 0,  hasta: 6 },
  { id: 'jaguar',  name: 'Cuadrilla del Jaguar',   icon: '🐆', desde: 6,  hasta: 12 },
  { id: 'tortuga', name: 'Cuadrilla de la Tortuga', icon: '🐢', desde: 12, hasta: 18 }
];

/* ── Azar con memoria ──
   Una demostración que cambia cada vez que se abre no sirve para enseñarla:
   el maestro que la estaba explicando pierde el hilo, y yo no puedo decir
   «mire a Vega, que lleva nueve días sin entrar» si mañana Vega va la
   primera. Con semilla fija, la clase es siempre la misma clase. */
function azarDemo(semilla) {
  let x = semilla >>> 0 || 1;
  return function () {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;  x >>>= 0;
    return x / 4294967296;
  };
}

/* Una fecha de hace `n` días, en el formato que guarda la aplicación. */
function diaDemo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/* ── La clase entera ──
   Se monta abriendo cada diario de verdad, uno por uno, y jugándolo un poco.
   Es más lento que escribir JSON y es lo que garantiza que lo que el maestro
   ve en la demostración sea exactamente lo que vería en su clase. */
function sembrarClaseDemo() {
  const diarios = {};
  DEMO_CLASE.forEach((nombre, i) => {
    const r = azarDemo(1000 + i * 37);
    const perfil = i % 6 === 0 ? 'parado' : (i % 3 === 0 ? 'flojo' : 'bien');
    const empuje = perfil === 'bien' ? 1 : perfil === 'flojo' ? .55 : .25;

    S = defaultState(nombre);
    diarioActivo = null;
    S.profile.grade = 3;
    S.profile.cara = 'c' + (1 + (i % 8));
    S.profile.created_at = diaDemo(40 + Math.floor(r() * 20));

    /* ── Lo excavado ──
       Tres perfiles porque una clase de dieciocho iguales no enseña nada: la
       vista de clase no tendría a quién señalar y los avisos no saldrían. */
    const ramas = playableBranchIds();
    let aciertos = 0, intentos = 0;
    /* La hondura se sortea POZO A POZO y no se fija por alumno. Fijándola por
       alumno salían once niños con el mismo 18 de 32 y el mismo 53 %, y una
       clase de clones no se parece a ninguna clase: lo normal es ir bien en
       numeración y regular en fracciones. */
    for (const rama of ramas) {
      if (r() < (perfil === 'bien' ? .12 : perfil === 'flojo' ? .3 : .55)) continue;
      const hondo = (perfil === 'bien' ? 2 : 1) + (r() < .5 ? 1 : 0);
      for (let k = 0; k < hondo && k < STRATA_ORDER.length; k++) {
        /* El «bien» pasa del 80 % y por tanto DOMINA el estrato; el «flojo»
           anda por ahí y unos cuantos se le quedan a medias, que es lo que
           tiene que verse; el «parado» no llega. */
        const objetivo = Math.min(1, perfil === 'bien' ? .86 + r() * .14
          : perfil === 'flojo' ? .68 + r() * .26 : .3 + r() * .25);
        updateMastery(rama, STRATA_ORDER[k], objetivo);
        updateMastery(rama, STRATA_ORDER[k], objetivo);
        const n = 6 + Math.floor(r() * 6);
        intentos += n;
        aciertos += Math.round(n * (.4 + objetivo * .55));
      }
    }

    /* ── La actividad reciente ──
       De aquí salen tres de las cuatro señales de rescate, y el maestro tiene
       que poder verlas funcionando: un panel que nunca avisa de nada parece
       un panel que no sirve. El «parado» las junta todas a propósito. */
    const desde = perfil === 'parado' ? 10 : 0;
    const sesiones = perfil === 'bien' ? 9 : perfil === 'flojo' ? 5 : 3;
    S.metrics.sessions_log = [];
    for (let k = 0; k < sesiones; k++) {
      S.metrics.sessions_log.push({
        date: diaDemo(desde + k + Math.floor(r() * 2)),
        missions: 1 + Math.floor(r() * 2),
        minutes: 6 + Math.floor(r() * 12)
      });
    }
    S.metrics.first_try_total = intentos;
    S.metrics.first_try_correct = aciertos;
    S.metrics.questions_answered = intentos;
    S.metrics.self_corrections = Math.floor(r() * 4 * empuje);
    S.metrics.hints_used = Math.floor(r() * 6);

    /* El estrato atascado: se le retrasa la última práctica a lo que no llegó
       a dominarse. Es la tercera señal y la que de verdad le importa al
       maestro, porque nombra el sitio exacto donde se quedó parado. */
    if (perfil === 'parado') {
      for (const sitio in S.dig_sites) {
        for (const rama in S.dig_sites[sitio]) {
          const estratos = S.dig_sites[sitio][rama].strata;
          for (const sId in estratos) {
            const e = estratos[sId];
            if (e.last_practiced && (e.mastery || 0) < .8) e.last_practiced = diaDemo(12);
          }
        }
      }
    }

    /* ── Lo que conviene repasar ──
       Los conceptos flojos, y el mismo para media clase a propósito: «once de
       trece fallan el valor posicional» es justo la frase con la que el panel
       se convierte en algo con lo que se prepara la clase de mañana. */
    const flojos = ['valor_posicional', 'resta_llevada', 'comparar_numeros', 'suma_llevada'];
    S.metrics.errors_by_concept = {};
    S.metrics.errors_by_skill = {};
    for (const c of flojos) {
      if (r() > (perfil === 'bien' ? .45 : .85)) continue;
      const at = 6 + Math.floor(r() * 9);
      const err = Math.ceil(at * (perfil === 'bien' ? .18 + r() * .16
                : perfil === 'flojo' ? .26 + r() * .12 : .45 + r() * .3));
      S.metrics.errors_by_concept[c] = { attempts: at, errors: err };
      S.metrics.errors_by_skill[c] = { attempts: at, errors: err };
    }

    S.adaptive.last10 = [];
    /* El «flojo» se queda justo por encima del canal de flujo y con la tasa de
       error por debajo del umbral: va regular, pero no salta la alerta. Si
       saltara, la demostración diría que un tercio de la clase está en
       apuros, y eso no es una plataforma que ayuda: es una que asusta. */
    const acierta = perfil === 'bien' ? .78 : perfil === 'flojo' ? .7 : .45;
    for (let k = 0; k < 10; k++) S.adaptive.last10.push(r() < acierta ? 1 : 0);
    S.adaptive.tier = perfil === 'bien' ? 3 : 2;
    S.adaptive.response_times = [];
    for (let k = 0; k < 8; k++) S.adaptive.response_times.push(3000 + Math.floor(r() * 9000));

    /* Bitácora: sellos ganados y los días de esta semana. */
    S.logbook.stamps_lifetime = perfil === 'bien' ? 4 : perfil === 'flojo' ? 2 : 0;
    S.logbook.current_weeks = S.logbook.stamps_lifetime;
    S.logbook.history = [];
    for (let k = S.logbook.stamps_lifetime; k > 0; k--) {
      S.logbook.history.push({ week_id: 'demo-' + k, stamped: true, protected: false });
    }
    S.logbook.active_days_this_week = [];
    const dias = perfil === 'parado' ? 0 : (perfil === 'flojo' ? 2 : 3 + Math.floor(r() * 2));
    for (let k = 0; k < dias; k++) S.logbook.active_days_this_week.push(diaDemo(k));

    /* Méritos de las dos últimas semanas. */
    S.behavior_log = [];
    const cuantosMeritos = perfil === 'parado' ? 1 : 3 + Math.floor(r() * 7);
    const cat = ATLAS_CONFIG.behaviors;
    for (let k = 0; k < cuantosMeritos; k++) {
      const b = cat[Math.floor(r() * cat.length)];
      S.behavior_log.push({ id: b.id, date: diaDemo(Math.floor(r() * 13)), ts: Date.now() - k * 86400000 });
    }

    /* ── Economía ──
       Los PE se reparten por NIVEL y no por un número suelto, porque la curva
       es `100 × n^1.55` y con cifras a ojo salían los dieciocho de aprendiz.
       Lo que hay que ver es la escalera entera: aprendices, rastreadores y
       algún cartógrafo, cada uno con su medalla. */
    const nivel = perfil === 'bien' ? 8 + Math.floor(r() * 7)
                : perfil === 'flojo' ? 4 + Math.floor(r() * 4)
                : 2 + Math.floor(r() * 2);
    S.progression.xp_total = Math.round(xpForLevel(nivel) + r() * 120);
    S.progression.doubloons_balance = Math.round(40 + r() * 340 * empuje);
    S.progression.team_contribution = Math.round(30 + r() * 220 * empuje);
    S.progression.fund_donated = Math.round(r() * 110 * empuje);
    S.progression.atlas_fragments_recovered = perfil === 'bien' && r() > .4 ? 1 : 0;

    /* Lo comprado con lo excavado: sin esto el campamento de todos sale vacío
       y el almacén parece que no sirve para nada. */
    const compras = ['sombrero_ala_ancha', 'linterna_laton', 'cantimplora',
                     'tienda_rayas', 'hoguera_grande', 'catalejo'];
    for (const id of compras) {
      if (r() > .35 + empuje * .35) continue;
      const it = shopCatalog().find(x => x.id === id);
      if (!it) continue;
      if (it.type === 'camp') S.inventory.camp_items.push(id);
      else S.inventory.gear_owned.push(id);
    }
    if (S.inventory.gear_owned.length) S.inventory.gear_equipped.push(S.inventory.gear_owned[0]);
    S.inventory.treats_given = Math.floor(r() * 4);

    S.daily.date = todayStr();
    S.updated_at = Date.now() - (desde * 86400000);

    diarios['u:' + usuarioDemo(nombre)] = S;
  });
  S = null;
  return diarios;
}

/* El usuario de cada alumno, como lo genera la lista de clase: nombre y
   primera letra del apellido, sin tildes. */
function usuarioDemo(nombre) {
  const partes = String(nombre).trim().split(/\s+/);
  const limpia = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return limpia(partes[0]) + (partes[1] ? limpia(partes[1])[0] : '');
}

/* ── Los ajustes de la clase inventada ── */
function ajustesDemo() {
  const roster = DEMO_CLASE.map(n => ({ name: n, username: usuarioDemo(n), grade: 3 }));
  const teams = DEMO_CUADRILLAS.map(c => {
    const gente = DEMO_CLASE.slice(c.desde, c.hasta);
    const roles = {};
    ROLES_CUADRILLA.filter(x => !x.especial).forEach((rol, k) => {
      if (gente[k]) roles[gente[k].trim().toLowerCase()] = rol.id;
    });
    return { id: c.id, name: c.name, icon: c.icon, members: gente, roles };
  });
  /* El Intendente es encargo de clase y no de cuadrilla: se le da a uno de la
     primera y ya, para que se vea que existe. */
  teams[0].roles[DEMO_CLASE[5].trim().toLowerCase()] = 'intendente';
  return {
    className: '3.º B · Demostración',
    teacherName: 'Prof. Ocaña',
    roster,
    teams: { enabled: true, list: teams },
    fund: { classTotal: 1180 },
    /* La nube queda apagada de raíz también aquí: aunque algo se saltara la
       barrera de `cloudEnabled`, no hay a dónde conectarse. */
    appwrite: { endpoint: '', projectId: '', databaseId: '', collectionId: '',
                aulasCollectionId: '', configCollectionId: '' }
  };
}

/* ══════════ ENTRAR Y SALIR ══════════ */

function entrarEnDemo() {
  DEMO = true;
  CAJON_DEMO.clear();
  document.body.classList.add('en-demo');

  /* Los ajustes primero: la clase inventada tiene que existir antes de sembrar
     los diarios, porque cada diario se construye contra los yacimientos y la
     economía que digan los ajustes. */
  applyOverlay(ajustesDemo());
  saveTeacherConfig();

  const diarios = sembrarClaseDemo();
  saveDiaries(diarios);

  /* Se entra por el panel, que es lo que el maestro ha venido a ver. El PIN no
     se pide: lo que protege el PIN son los ajustes de una clase real, y aquí
     no hay ninguna. */
  enterTeacherMode();
  pintarBarraDemo();
  window.scrollTo(0, 0);
}

function salirDeDemo() {
  DEMO = false;
  CAJON_DEMO.clear();
  document.body.classList.remove('en-demo', 'teacher-mode', 'en-consulta');
  const barra = $('#demo-bar');
  if (barra) barra.classList.add('hidden');
  /* Se recarga la página entera y no se deshace a mano lo que la demostración
     tocó. Deshacer a mano es acordarse de veinte cosas —los ajustes, la clase
     abierta, el diario, la caché de la vista de clase— y basta olvidar una
     para que al maestro le quede media demostración pegada encima de su clase
     de verdad. Recargar no se olvida de nada. */
  location.reload();
}

function pintarBarraDemo() {
  const barra = $('#demo-bar');
  if (!barra) return;
  barra.classList.remove('hidden');
}

/* Lo que no sale de este navegador mientras dure la demostración. Cada sitio
   que cruza el límite pregunta por aquí antes de cruzarlo. */
function bloqueadoEnDemo(que) {
  if (!DEMO) return false;
  toast(`En la demostración no se ${que}: no hay clase de verdad a la que llegue.`);
  return true;
}
