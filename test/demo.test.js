/* La demostración para quien viene de fuera.

   Un maestro que abre el enlace se encontraba dos puertas que no le servían:
   el panel, con un PIN que no tiene, y el diario de explorador, que le crea
   una libreta vacía donde no se ve nada de lo que esto hace.

   Lo que se fija aquí no es que la clase inventada sea bonita, sino las tres
   promesas que hace el botón: que no se guarda nada, que no se toca la nube y
   que no sale nada de este navegador. Son promesas que se le hacen a alguien
   que va a pulsar sin leer, y por eso cada una tiene su prueba. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

/* ══ 1. Nada se guarda ══ */

test('fuera de la demostración se guarda donde siempre', () => {
  /* Esta es la que de verdad importa: si `almacen()` se quedara enganchado en
     el cajón de memoria, la app dejaría de recordar nada y nadie se daría
     cuenta hasta el día siguiente. */
  const c = cargarApp();
  assert.equal(c.ev('DEMO'), false);
  assert.equal(c.ev('almacen()'), c.ev('localStorage'));
});

test('y en demostración, en un cajón que se vacía al salir', () => {
  const c = cargarApp();
  c.ev('DEMO = true');
  assert.equal(c.ev('almacen()'), c.ev('CAJON_DEMO'));
  c.ev("almacen().setItem('lo_que_sea', 'valor')");
  assert.equal(c.ev("almacen().getItem('lo_que_sea')"), 'valor');
  assert.equal(c.ev("localStorage.getItem('lo_que_sea')"), null,
    'lo de la demostración se coló en el navegador');
});

test('el diario de un niño sobrevive a que alguien abra la demostración', () => {
  /* El caso que da miedo: el maestro prueba la demostración en la tablet de
     clase, donde un niño tiene su diario a medias. */
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('S.progression.xp_total = 4321');
  c.ev('saveState()');
  const antes = c.ev("localStorage.getItem('atlas_diarios_v1')");
  assert.ok(antes.includes('4321'), 'no se guardó lo de partida');

  c.ev('entrarEnDemo()');
  c.ev("openDiaryKey(Object.keys(loadDiaries())[0])");
  c.ev('S.progression.xp_total = 99');
  c.ev('saveState()');
  assert.equal(c.ev("localStorage.getItem('atlas_diarios_v1')"), antes,
    'la demostración pisó el diario de verdad');
});

test('ni los ajustes de la clase de verdad', () => {
  const c = cargarApp();
  c.ev("cfgSave('className', 'Mi 4.º A')");
  const antes = c.ev("localStorage.getItem('atlas_teacher_config_v1')");
  c.ev('entrarEnDemo()');
  assert.match(c.ev('ATLAS_CONFIG.className'), /Demostraci/,
    'la clase inventada no llegó a montarse');
  assert.equal(c.ev("localStorage.getItem('atlas_teacher_config_v1')"), antes,
    'la demostración pisó los ajustes de verdad');
});

test('todo lo que guarda pasa por almacen(), no por localStorage', () => {
  /* La promesa no se sostiene comprobando el modo en cada sitio que guarda:
     se sostiene porque el sitio donde se guarda es otro. Si mañana alguien
     escribe `localStorage` a pelo en uno de estos ficheros, la promesa se
     rompe sin que nadie lo note. */
  for (const f of ['js/state.js', 'js/config.js', 'js/cloud.js', 'js/app.js', 'js/teacher.js']) {
    const sinComentarios = leer(f)
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    assert.ok(!/\blocalStorage\b/.test(sinComentarios),
      `${f} guarda en localStorage a pelo; usa almacen()`);
  }
});

/* ══ 2. No se toca la nube ══ */

test('la nube no existe mientras dura', () => {
  const c = cargarApp();
  c.ev('CLOUD.enabled = true');
  assert.equal(c.ev('cloudEnabled()'), true);
  c.ev('DEMO = true');
  assert.equal(c.ev('cloudEnabled()'), false);
});

test('y los ajustes de la clase inventada no llevan a dónde conectarse', () => {
  const c = cargarApp();
  c.ev('entrarEnDemo()');
  assert.equal(c.ev('ATLAS_CONFIG.appwrite.endpoint'), '');
  assert.equal(c.ev('ATLAS_CONFIG.appwrite.projectId'), '');
  assert.equal(c.ev('cloudConfigured()'), false);
});

/* ══ 3. No sale nada de este navegador ══ */

test('las cuatro salidas están cerradas', async () => {
  const c = cargarApp();
  c.ev('DEMO = true');
  const pub = await c.ev('cloudPublishConfig')('Quien sea');
  assert.equal(pub.reason, 'demo', 'se pudo publicar la configuración');
  const alta = await c.ev('cloudCreateStudent')('Quien', 'quien', 'contrasena');
  assert.equal(alta.reason, 'demo', 'se pudo dar de alta una cuenta');
  assert.equal(c.ev('exportBackup()'), null, 'se pudo exportar una copia');
  assert.equal(c.ev("bloqueadoEnDemo('hace lo que sea')"), true);
});

test('y fuera de la demostración siguen abiertas', () => {
  const c = cargarApp();
  assert.equal(c.ev("bloqueadoEnDemo('hace lo que sea')"), false);
  assert.ok(c.ev('exportBackup()'), 'la copia de seguridad dejó de funcionar');
});

/* ══ La clase inventada ══ */

test('son dieciocho, con nombres de clase y ninguno repetido', () => {
  const c = cargarApp();
  const clase = c.ev('DEMO_CLASE');
  assert.equal(clase.length, 18);
  assert.equal(new Set(clase).size, 18);
  const usuarios = clase.map(n => c.ev('usuarioDemo')(n));
  assert.equal(new Set(usuarios).size, 18, 'dos alumnos con el mismo usuario comparten diario');
  for (const u of usuarios) assert.match(u, /^[a-z]+$/, `usuario raro: ${u}`);
});

test('la clase es SIEMPRE la misma clase', () => {
  /* Una demostración que cambia entre una explicación y la siguiente no se
     puede explicar: el maestro dice «mira a Vega» y Vega ya no es esa. */
  const a = cargarApp(); a.ev('entrarEnDemo()');
  const b = cargarApp(); b.ev('entrarEnDemo()');
  const resumen = c => Object.values(c.ev('loadDiaries()'))
    .map(d => `${d.profile.explorer_name}:${d.progression.xp_total}:${d.logbook.stamps_lifetime}`).join('|');
  assert.equal(resumen(a), resumen(b));
});

test('con desnivel de verdad: no todos van igual', () => {
  /* Dieciocho clones no enseñan nada: la vista de clase no tendría a quién
     señalar y los avisos no saldrían nunca. */
  const c = cargarApp();
  c.ev('entrarEnDemo()');
  const diarios = Object.values(c.ev('loadDiaries()'));
  assert.equal(diarios.length, 18);
  const niveles = diarios.map(d => c.ev('levelFromXp')(d.progression.xp_total));
  assert.ok(Math.max(...niveles) - Math.min(...niveles) >= 6,
    `los dieciocho van casi igual: niveles de ${Math.min(...niveles)} a ${Math.max(...niveles)}`);
  assert.ok(new Set(niveles).size >= 6, 'demasiados alumnos con el mismo nivel');
});

test('y alguien a quien el panel tiene que avisar', () => {
  /* Un panel que nunca avisa de nada parece un panel que no sirve. */
  const c = cargarApp();
  c.ev('entrarEnDemo()');
  const entradas = c.ev('allDiaries()');
  const vista = c.ev('buildClassOverview')(entradas);
  assert.equal(vista.students.length, 18);
  assert.ok(vista.kpis.needHelp >= 2, 'nadie salta la alerta de rescate');
  assert.ok(vista.kpis.needHelp <= 5,
    'media clase en apuros: eso no es una plataforma que ayuda, es una que asusta');
  assert.ok(vista.repasar && vista.repasar.length,
    'sin conceptos que repasar no se ve para qué sirve el panel');
});

test('las cuadrillas están repartidas y con sus papeles puestos', () => {
  const c = cargarApp();
  c.ev('entrarEnDemo()');
  const equipos = c.ev('ATLAS_CONFIG.teams.list');
  assert.equal(equipos.length, 3);
  for (const t of equipos) {
    assert.equal(t.members.length, 6);
    assert.ok(Object.keys(t.roles).length >= 5, `${t.id} sin roles repartidos`);
  }
  const todos = equipos.flatMap(t => Object.values(t.roles));
  assert.ok(todos.includes('intendente'), 'el encargo de clase no se ve por ninguna parte');
});

/* ══ La salida ══ */

test('salir recarga la página y no deja nada detrás', () => {
  const c = cargarApp();
  c.ev('entrarEnDemo()');
  assert.equal(c.ev('DEMO'), true);
  assert.ok(c.ev('CAJON_DEMO.datos.size') > 0);
  c.ev('salirDeDemo()');
  assert.equal(c.ev('DEMO'), false);
  assert.equal(c.ev('CAJON_DEMO.datos.size'), 0);
  assert.equal(c.ev('location.recargas'), 1,
    'sin recargar quedan a medias los ajustes, la clase abierta y el diario');
});

test('el botón de la portada existe y dice lo que hay', () => {
  const html = leer('index.html');
  assert.match(html, /id="home-demo"/);
  assert.match(html, /No hace falta\s+cuenta y no se guarda nada/,
    'la portada no promete lo que el modo cumple');
  assert.match(html, /id="demo-bar"/, 'sin barra, nadie sabe que está en una demostración');
  assert.match(leer('js/app.js'), /'#home-demo'\)/);
});

/* ══ La otra mitad: jugar ══ */

test('desde el panel se puede jugar como un alumno, no solo mirarlo', () => {
  /* El panel enseña la mitad de la plataforma. Un maestro que está decidiendo
     si esto le sirve necesita responder un reto y ver qué pasa al fallar. */
  const c = cargarApp();
  c.ev('entrarEnDemo()');
  const clave = Object.keys(c.ev('loadDiaries()'))[0];
  c.ev('jugarEnDemo')(clave);
  assert.ok(c.ev('S'), 'no se abrió ningún diario');
  assert.equal(c.ev('enModoLectura()'), false, 'se abrió en solo lectura: no se puede jugar');
  assert.equal(c.ev('DEMO'), true, 'jugar sacó de la demostración');
});

test('y jugando sigue sin escribirse nada en el navegador', () => {
  const c = cargarApp();
  c.ev('entrarEnDemo()');
  c.ev('jugarEnDemo')(Object.keys(c.ev('loadDiaries()'))[0]);
  c.ev('S.progression.doubloons_balance = 12345');
  c.ev('saveState()');
  assert.equal(c.ev("localStorage.getItem('atlas_diarios_v1')"), null);
  assert.ok(JSON.stringify(c.ev('loadDiaries()')).includes('12345'),
    'jugando no se guarda ni siquiera en el cajón de la demostración');
});

test('jugando siempre hay vuelta al panel', () => {
  /* Sin la pestaña «Docente», el único camino de vuelta sería salir de la
     demostración entera y volver a entrar. */
  const c = cargarApp();
  c.ev('entrarEnDemo()');
  c.ev('jugarEnDemo')(Object.keys(c.ev('loadDiaries()'))[0]);
  assert.equal(c.ev('teacherOnly'), false, 'no se está jugando de verdad');
  assert.equal(c.ev('puedeVerCuadernoDocente()'), true, 'no hay vuelta al panel');
});

test('fuera de la demostración no se puede jugar el diario de nadie', () => {
  /* Con una clase de verdad, el cuaderno de un alumno se MIRA y no se toca:
     esa es la regla del modo consulta y esto no puede ser un boquete en ella. */
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Nadia', username: 'nadia' }, 3);
  c.ev('saveState()');
  const clave = Object.keys(c.ev('loadDiaries()'))[0];
  c.ev('S = null');
  c.ev('jugarEnDemo')(clave);
  assert.equal(c.ev('S'), null, 'se abrió un diario a jugar sin estar en demostración');
});

test('y el botón solo se pinta dentro de la demostración', () => {
  assert.match(leer('js/aula.js'), /\$\{DEMO && s\.clave \? `<button[^`]*student-jugar/);
});

test('el aviso de «sin conexión» se calla durante la demostración', () => {
  /* No hay clase real que sincronizar: contar que el diario no se guarda es
     un problema que aquí no existe, y encima lo tapaba la barra. */
  assert.match(leer('css/styles.css'), /body\.en-demo \.cloud-warning \{ display: none/);
});
