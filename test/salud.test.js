/* Salud de la clase.

   El fallo más caro de esta plataforma no es un cálculo mal hecho: es que una
   tablet lleve una semana sin sincronizar y nadie se entere hasta que el
   trabajo ya no está. Lo que se fija aquí es que cada cosa que se pierde en
   silencio deje de perderse en silencio, y que el panel no grite por lo que no
   es: un aviso que sale siempre se aprende a ignorar en dos semanas. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');
const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

const DIA = 86400000;
const HOY = new Date('2026-03-10T10:00:00Z').getTime();

/* Un equipo sano: nube abierta, todo subido, copia de ayer. Cada prueba
   estropea UNA cosa, para que el hallazgo que salga no pueda venir de otra. */
function sano(cambios) {
  return Object.assign({
    hoy: HOY,
    guardadoRoto: false,
    sitio: { bytes: 100000, cupo: 5242880, parte: 100000 / 5242880 },
    sinSubir: [],
    ilegiblesAqui: [],
    descartados: [],
    ajustes: { estado: 'al-dia' },
    falloIA: null,
    claseAbierta: true,
    backupAt: HOY - DIA,
    rosterAt: HOY - DIA,
    hayContrasenas: true,
    cuentasSinId: [],
    sinEntrar: [],
    calladas: [],
    tamanoAjustes: 12000,
    configMax: 200000,
    retosEnAjustes: 3
  }, cambios || {});
}

const busca = (lista, id) => lista.find(h => h.id === id);

/* ── Un equipo sano no dice nada ── */

test('con todo en orden el panel no inventa un problema', () => {
  const c = cargarApp();
  const h = c.ev('analizarSalud')(sano());
  assert.deepEqual(h, [], 'un aviso que sale siempre se ignora a las dos semanas');
  assert.equal(c.ev('veredictoDeSalud')(h).nivel, 'bien');
});

/* ── Lo que se está perdiendo ahora ── */

test('si este equipo no puede guardar, eso va lo primero', () => {
  const c = cargarApp();
  const h = c.ev('analizarSalud')(sano({ guardadoRoto: true, backupAt: 0, claseAbierta: false }));
  assert.equal(h[0].id, 'guardado-roto', 'mientras dure, nada de lo demás importa');
  assert.equal(h[0].nivel, 'grave');
  assert.match(h[0].accion, /copia de seguridad AHORA/);
});

test('un diario ilegible en este equipo se nombra, no se resta de la cuenta', () => {
  const c = cargarApp();
  const h = busca(c.ev('analizarSalud')(sano({ ilegiblesAqui: ['u:nadia'] })), 'ilegibles-aqui');
  assert.equal(h.nivel, 'grave');
  assert.match(h.detalle, /u:nadia/);
  assert.deepEqual(h.quienes, ['u:nadia']);
});

test('y uno ilegible en la nube también, que es el que nadie ve', () => {
  const c = cargarApp();
  const h = busca(c.ev('analizarSalud')(sano({
    descartados: [{ id: 'a1', name: 'Nadia Ruiz', motivo: 'ilegible' }]
  })), 'ilegibles-nube');
  assert.equal(h.nivel, 'grave');
  assert.match(h.detalle, /Nadia Ruiz/);
});

test('un documento vacío es aviso y no alarma: casi siempre es una cuenta recién creada', () => {
  const c = cargarApp();
  const h = c.ev('analizarSalud')(sano({
    descartados: [{ id: 'a1', name: 'Nadia Ruiz', motivo: 'vacio' }]
  }));
  assert.equal(busca(h, 'vacios-nube').nivel, 'aviso');
  assert.equal(busca(h, 'ilegibles-nube'), undefined, 'un diario vacío no es un diario roto');
});

test('trabajo sin subir de hace días es grave; el de hoy, un aviso', () => {
  const c = cargarApp();
  const ayer = c.ev('analizarSalud')(sano({
    sinSubir: [{ clave: 'u:nadia', nombre: 'Nadia', cambiado: HOY - 3 * DIA, subido: 0 }]
  }));
  assert.equal(busca(ayer, 'sin-subir').nivel, 'grave');
  assert.match(busca(ayer, 'sin-subir').detalle, /no está en ningún otro sitio/);

  const hoy = c.ev('analizarSalud')(sano({
    sinSubir: [{ clave: 'u:nadia', nombre: 'Nadia', cambiado: HOY - 1000, subido: 0 }]
  }));
  assert.equal(busca(hoy, 'sin-subir').nivel, 'aviso', 'la cola sube sola a los tres segundos');
});

test('sin clase en la nube no se habla de subir: no hay dónde', () => {
  const c = cargarApp();
  const h = c.ev('analizarSalud')(sano({
    claseAbierta: false,
    sinSubir: [{ clave: 'u:nadia', nombre: 'Nadia', cambiado: HOY - 3 * DIA, subido: 0 }]
  }));
  assert.equal(busca(h, 'sin-subir'), undefined);
  assert.ok(busca(h, 'sin-nube'), 'lo que hay que decir es que no hay nube');
});

test('sin nube y sin copia reciente, el curso entero está a un borrado de distancia', () => {
  const c = cargarApp();
  assert.equal(busca(c.ev('analizarSalud')(sano({ claseAbierta: false, backupAt: 0 })), 'sin-nube').nivel, 'grave');
  assert.equal(busca(c.ev('analizarSalud')(sano({ claseAbierta: false, backupAt: HOY - DIA })), 'sin-nube').nivel,
    'aviso', 'con copia de ayer el riesgo es otro');
});

/* ── Las tablets calladas: el aviso que da nombre al punto ── */

test('una tablet que lleva más de una semana sin sincronizar sale nombrada', () => {
  const c = cargarApp();
  const h = busca(c.ev('analizarSalud')(sano({
    calladas: [{ id: 'a1', nombre: 'Nadia Ruiz', visto: HOY - 9 * DIA }]
  })), 'calladas');
  assert.equal(h.nivel, 'aviso');
  assert.match(h.detalle, /Nadia Ruiz/);
  assert.match(h.detalle, /solo en su tablet/);
  assert.match(h.accion, /wifi/);
});

test('pero una que sincronizó anteayer no molesta a nadie', () => {
  const c = cargarApp();
  const h = c.ev('analizarSalud')(sano({
    calladas: [{ id: 'a1', nombre: 'Nadia Ruiz', visto: HOY - 2 * DIA }]
  }));
  assert.equal(busca(h, 'calladas'), undefined);
});

test('un diario que nunca ha sincronizado también cuenta como callado', () => {
  const c = cargarApp();
  const h = c.ev('analizarSalud')(sano({ calladas: [{ id: 'a1', nombre: 'Nadia', visto: 0 }] }));
  assert.ok(busca(h, 'calladas'));
});

/* ── La clave de la IA ── */

test('un «sin saldo» se recuerda y se dice hoy, no el día que haga falta generar', () => {
  const c = cargarApp();
  const h = busca(c.ev('analizarSalud')(sano({
    falloIA: { motivo: 'saldo', at: HOY - 4 * DIA }
  })), 'ia-parada');
  assert.equal(h.nivel, 'grave');
  assert.match(h.titulo, /sin saldo/);
  assert.match(h.accion, /Billing/);
});

test('cada motivo lleva su arreglo, que no es el mismo', () => {
  const c = cargarApp();
  const clave = busca(c.ev('analizarSalud')(sano({ falloIA: { motivo: 'clave', at: HOY } })), 'ia-parada');
  const ws = busca(c.ev('analizarSalud')(sano({ falloIA: { motivo: 'workspace', at: HOY } })), 'ia-parada');
  assert.match(clave.accion, /API keys/);
  assert.match(ws.accion, /espacio/);
  assert.notEqual(clave.titulo, ws.titulo);
});

test('solo se recuerdan los fallos que no se arreglan solos', () => {
  const c = cargarApp();
  c.ev('apuntarResultadoIA')({ ok: false, reason: 'red', texto: 'se cortó' });
  assert.equal(c.ev('ultimoFalloIA()'), null, 'un corte de red se reintenta y pasa');
  c.ev('apuntarResultadoIA')({ ok: false, reason: 'saldo', texto: 'sin saldo' });
  assert.equal(c.ev('ultimoFalloIA()').motivo, 'saldo');
  c.ev('apuntarResultadoIA')({ ok: true });
  assert.equal(c.ev('ultimoFalloIA()'), null, 'al primer acierto se olvida');
});

test('el aviso de la IA se apunta desde la llamada, no desde cada pantalla', () => {
  assert.match(leer('js/cloud.js'), /apuntarResultadoIA\(r\)/,
    'si lo hiciera cada pantalla, la que se olvidara dejaría el fallo sin registrar');
});

/* ── El sitio que queda ── */

test('el equipo llenándose avisa antes de que guardar deje de funcionar', () => {
  const c = cargarApp();
  const medio = c.ev('analizarSalud')(sano({ sitio: { bytes: 1, cupo: 10, parte: 0.65 } }));
  assert.equal(busca(medio, 'sitio').nivel, 'aviso');
  const lleno = c.ev('analizarSalud')(sano({ sitio: { bytes: 1, cupo: 10, parte: 0.9 } }));
  assert.equal(busca(lleno, 'sitio').nivel, 'grave');
  assert.match(busca(lleno, 'sitio').detalle, /estimación/, 'el navegador no dice su cupo y no se finge que sí');
});

test('con sitio de sobra no dice nada', () => {
  const c = cargarApp();
  assert.equal(busca(c.ev('analizarSalud')(sano({ sitio: { bytes: 1, cupo: 10, parte: 0.2 } })), 'sitio'), undefined);
});

test('sitioUsado() mide y no revienta si el navegador no deja mirar', () => {
  const c = cargarApp();
  const s = c.ev('sitioUsado()');
  assert.ok(s === null || (s.bytes >= 0 && s.parte >= 0));
});

/* ── Los ajustes que no van a caber ── */

test('los ajustes acercándose al tope avisan con el número que se puede arreglar', () => {
  const c = cargarApp();
  const h = busca(c.ev('analizarSalud')(sano({ tamanoAjustes: 170000, retosEnAjustes: 240 })), 'ajustes-grandes');
  assert.equal(h.nivel, 'aviso');
  assert.match(h.detalle, /240 retos/);
});

test('pasado el tope ya no es un aviso: las tablets se han quedado atrás', () => {
  const c = cargarApp();
  const h = busca(c.ev('analizarSalud')(sano({ tamanoAjustes: 210000 })), 'ajustes-grandes');
  assert.equal(h.nivel, 'grave');
});

/* ── Lista de clase ── */

test('las contraseñas que solo están aquí se dicen, porque no se pueden recuperar', () => {
  const c = cargarApp();
  const h = busca(c.ev('analizarSalud')(sano({ rosterAt: 0 })), 'contrasenas-solo-aqui');
  assert.equal(h.nivel, 'aviso');
  assert.match(h.detalle, /repartir contraseñas nuevas/);
});

test('sin contraseñas puestas no hay nada que perder y no se avisa', () => {
  const c = cargarApp();
  assert.equal(busca(c.ev('analizarSalud')(sano({ rosterAt: 0, hayContrasenas: false })),
    'contrasenas-solo-aqui'), undefined);
});

test('una cuenta sin identificador manda al sitio exacto donde se arregla', () => {
  const c = cargarApp();
  const h = busca(c.ev('analizarSalud')(sano({ cuentasSinId: [{ nombre: 'Nilo Ferrer' }] })), 'cuentas-sin-id');
  assert.match(h.detalle, /Nilo Ferrer/);
  assert.match(h.accion, /Buscar el diario/);
});

/* ── Cómo se ordena ── */

test('lo grave va antes que lo que solo conviene mirar', () => {
  const c = cargarApp();
  const h = c.ev('analizarSalud')(sano({
    cuentasSinId: [{ nombre: 'Nilo' }],
    ilegiblesAqui: ['u:nadia'],
    calladas: [{ id: 'a1', nombre: 'Mara', visto: HOY - 20 * DIA }]
  }));
  const niveles = h.map(x => x.nivel);
  assert.deepEqual(niveles, [...niveles].sort((a, b) => (a === 'grave' ? 0 : 1) - (b === 'grave' ? 0 : 1)));
  assert.equal(c.ev('veredictoDeSalud')(h).nivel, 'grave');
});

test('todo hallazgo dice qué se pierde Y qué hacer', () => {
  /* Un panel de avisos sin salida es una lista de motivos para cerrarlo. */
  const c = cargarApp();
  const h = c.ev('analizarSalud')(sano({
    guardadoRoto: true, ilegiblesAqui: ['x'], claseAbierta: false, backupAt: 0,
    ajustes: { estado: 'pendiente', detalle: 'sin red' },
    falloIA: { motivo: 'saldo', at: HOY }, rosterAt: 0,
    cuentasSinId: [{ nombre: 'Nilo' }], sinEntrar: [{ nombre: 'Mara' }],
    calladas: [{ id: 'a', nombre: 'Vega', visto: 0 }],
    descartados: [{ id: 'b', name: 'Ada', motivo: 'ilegible' }],
    sitio: { bytes: 1, cupo: 10, parte: 0.9 }, tamanoAjustes: 190000
  }));
  assert.ok(h.length >= 11, 'con todo roto tienen que salir todos');
  for (const x of h) {
    assert.ok(x.titulo && x.detalle && x.accion, `${x.id} no dice qué hacer`);
    assert.ok(!/undefined|NaN|\[object/.test(x.titulo + x.detalle + x.accion), `${x.id} tiene un hueco sin rellenar`);
  }
  assert.equal(new Set(h.map(x => x.id)).size, h.length, 'nada se dice dos veces');
});

/* ── El registro de subidas ── */

test('un diario del que no consta subida cuenta como pendiente', () => {
  /* Es lo honrado: no consta que haya salido de aquí. */
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Vega Serrano', username: 'vega' }, 3);
  c.ev('saveState()'); c.ev('closeDiary()');
  const p = c.ev('diariosSinSubir()');
  assert.equal(p.length, 1);
  assert.equal(p[0].clave, 'u:vega');
});

test('apuntada la subida, deja de estar pendiente; y al volver a jugar, vuelve', () => {
  const c = cargarApp();
  c.ev('openDiary')({ name: 'Vega Serrano', username: 'vega' }, 3);
  c.ev('saveState()');
  const cuando = c.ev('S.updated_at');
  c.ev('apuntarSubida')('u:vega', cuando);
  c.ev('closeDiary()');
  assert.deepEqual(c.ev('diariosSinSubir()'), []);

  /* Lo jugado DESPUÉS de esa subida vuelve a estar pendiente. La marca se
     mueve a mano en vez de esperar al reloj: saveState() pone la hora él, y
     dos guardados del mismo milisegundo dejarían la prueba a merced de lo
     rápido que sea el equipo. */
  const map = c.ev('loadDiaries()');
  map['u:vega'].updated_at = cuando + 60000;
  c.ev('saveDiaries')(map);
  const p = c.ev('diariosSinSubir()');
  assert.equal(p.length, 1, 'lo jugado después de subir vuelve a estar sin subir');
  assert.equal(p[0].clave, 'u:vega');
});

test('la subida se apunta donde se sube, en las dos ramas', () => {
  /* Update y create: si solo se apuntara en una, el primer diario de cada
     alumno se quedaría marcado como pendiente para siempre. */
  const t = leer('js/cloud.js');
  const i = t.indexOf('async function cloudPushDiario');
  const trozo = t.slice(i, i + 1600);
  assert.equal((trozo.match(/apuntarSubida\(clave, data\.updated_at\)/g) || []).length, 2);
});

/* ── Lo que la nube descartaba en silencio ── */

test('la lectura de clase ya no se traga un diario roto sin decirlo', () => {
  const c = cargarApp();
  const ok = { $id: 'a1', name: 'Vega', summary: JSON.stringify({ v: 1, name: 'Vega' }) };
  const entradas = c.ev('parseClassDocs')([
    ok,
    { $id: 'a2', name: 'Nadia', state: '{roto' },
    { $id: 'a3', name: 'Mara' },
    { $id: 'a4', name: 'Ada', state: '{"sin":"perfil"}' }
  ]);
  assert.equal(entradas.length, 1);
  const d = c.ev('descartadosDeLaNube()');
  assert.equal(d.length, 3);
  assert.deepEqual(d.map(x => x.motivo).sort(), ['ilegible', 'sin-perfil', 'vacio']);
  assert.ok(d.every(x => x.name), 'sin el nombre, el docente no sabe de quién hablamos');
});

test('la lista de descartados se vacía en cada lectura, no se acumula', () => {
  const c = cargarApp();
  c.ev('parseClassDocs')([{ $id: 'a2', name: 'Nadia', state: '{roto' }]);
  c.ev('parseClassDocs')([{ $id: 'a1', name: 'Vega', summary: JSON.stringify({ v: 1 }) }]);
  assert.deepEqual(c.ev('descartadosDeLaNube()'), []);
});

/* ── El panel ── */

test('el panel se abre sin pedirle nada a la red', () => {
  /* Un diagnóstico que tarda cuatro segundos en aparecer no se abre nunca. */
  const c = cargarApp();
  const caja = c.ev('document').createElement('div');
  c.ev('cfgSalud')(caja);
  assert.match(caja.innerHTML, /salud-veredicto/);
  assert.match(caja.innerHTML, /salud-pulso/, 'el pulso de la nube va a petición, con su botón');
});

test('está en el índice, con lo del día a día y no escondido', () => {
  const c = cargarApp();
  const sec = c.ev('CFG_SECTIONS').find(s => s.id === 'salud');
  assert.ok(sec, 'sin entrada en el índice no existe');
  assert.equal(sec.grupo, 'diario');
});

test('el pulso pide cuatro campos, no los diarios enteros', () => {
  const t = leer('js/cloud.js');
  const i = t.indexOf('async function cloudPulsoDeLosDiarios');
  assert.ok(i > 0);
  const trozo = t.slice(i, i + 1200);
  assert.match(trozo, /\$id', 'name', 'updated_at', '\$updatedAt/);
  assert.ok(!/'state'|'summary'/.test(trozo), 'traerse los diarios para saber una fecha es red del centro tirada');
});

test('el pulso solo mira los diarios de esta clase', () => {
  const t = leer('js/cloud.js');
  const i = t.indexOf('async function cloudPulsoDeLosDiarios');
  assert.match(t.slice(i, i + 1200), /Query\.equal\('aula', aula\)/,
    'sin esto listaría los diarios de todo el centro');
});

/* ── Lo que este panel NO hace ── */

test('el panel de salud no le enseña nada al alumno', () => {
  const c = cargarApp();
  const caja = c.ev('document').createElement('div');
  c.ev('cfgSalud')(caja);
  assert.ok(!/nota|calific|comparar/i.test(caja.innerHTML),
    'esto es fontanería, no evaluación: no puede convertirse en un juicio sobre nadie');
});
