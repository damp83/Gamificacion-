/* Los ajustes del docente subiendo a su clase.

   Esto existe porque no existía. Los ajustes viajaban a la nube al crear la
   clase y al cambiar de una clase a otra, y nada más: con una sola clase,
   eso significa que se subieron el primer día y nunca más. Un banco de retos
   aprobado a lo largo de un trimestre vivía entero en el localStorage de un
   iPad, que iOS borra si el sitio no se abre en unos días. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { cargarApp } = require('./cargar.js');

const leer = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('todo cambio de ajustes programa la subida, no solo los que alguien recordó', () => {
  /* Va en saveTeacherConfig, que es el único sitio por el que pasan TODOS
     los cambios. Colgarlo de cada botón del panel garantiza que la próxima
     sección que se añada se olvide. */
  const cfg = leer('js/config.js');
  const i = cfg.indexOf('function saveTeacherConfig()');
  const fin = cfg.indexOf('\n}', i);
  const cuerpo = cfg.slice(i, fin);
  assert.match(cuerpo, /programarSubidaAjustes\(\)/, 'la subida se programa desde el guardado');
  assert.match(cuerpo, /typeof programarSubidaAjustes === 'function'/,
    'cloud.js carga después: se comprueba que exista');
});

test('adoptar los ajustes de la clase no los vuelve a subir', () => {
  /* Sería devolver el eco de lo que se acaba de bajar. */
  const cfg = leer('js/config.js');
  assert.match(cfg, /sinSubir\(\(\) => \{ applyOverlay\(nuevo\); saveTeacherConfig\(\); \}\)/);
  assert.match(cfg, /if \(subidaSilenciada\) return;/);
});

test('una subida que falla queda pendiente, nunca por hecha', () => {
  /* Darla por buena cuando no lo está es la única forma de perder un
     trimestre de trabajo sin enterarse. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function subirAjustesAhora()');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}\n', i));
  assert.match(cuerpo, /if \(r\.ok\) \{ ajustesPendientes = false/, 'solo se limpia si salió bien');
  assert.ok(!/ajustesPendientes = false;[\s\S]*else/.test(cuerpo.replace(/if \(r\.ok\)[\s\S]*?\n/, '')),
    'no se limpia por otro camino');
  assert.match(cuerpo, /ajustesFallo =/, 'y se guarda por qué falló');
});

test('lo pendiente se reintenta al abrir la clase', () => {
  const cloud = leer('js/cloud.js');
  assert.match(cloud, /if \(ajustesPendientes\) subirAjustesAhora\(\);/);
});

test('al esconder la pestaña se sube lo que quedara en el aire', () => {
  /* La subida espera unos segundos para no mandar quince peticiones al
     escribir un nombre letra a letra. Sin esto, aprobar un reto y cerrar
     pierde el cambio. En un iPad casi nunca se cierra la pestaña: se cambia
     de app, y ahí `pagehide` puede no llegar. */
  const app = leer('js/app.js');
  assert.match(app, /addEventListener\('pagehide'[\s\S]{0,400}subirAjustesAhora\(\)/);
  assert.match(app, /addEventListener\('visibilitychange'[\s\S]{0,300}subirAjustesAhora\(\)/);
});

test('lo que sube sigue sin llevar contraseñas, PIN ni claves', () => {
  /* El documento de la clase lo leen las tablets del alumnado. */
  const cloud = leer('js/cloud.js');
  const i = cloud.indexOf('async function cloudSaveAulaConfig()');
  const cuerpo = cloud.slice(i, cloud.indexOf('\n}\n', i));
  assert.match(cuerpo, /configParaCompartir\(\)/, 'sube la versión filtrada, no el overlay crudo');
  assert.ok(!/ATLAS_OVERLAY/.test(cuerpo), 'nunca el overlay entero');

  const c = cargarApp();
  const paquete = c.ev('configParaCompartir')();
  for (const k of c.ev('NO_SE_COMPARTE')) {
    assert.equal(paquete[k], undefined, `«${k}» no puede viajar a las tablets`);
  }
});

test('el panel dice la verdad sobre dónde están los ajustes', () => {
  /* «Se guardan en esta tablet» era verdad a medias y «guardado ✓» a secas
     sería mentira cuando la subida ha fallado. */
  const teacher = leer('js/teacher.js');
  assert.match(teacher, /function pintarEstadoAjustes\(\)/);
  for (const estado of ['local', 'subiendo', "'al-dia'", 'pendiente']) {
    assert.ok(teacher.includes(estado), `falta el estado ${estado}`);
  }
  assert.match(teacher, /sin subir<\/strong>/, 'lo pendiente se dice con esas palabras');
  assert.match(teacher, /copia de seguridad/, 'y se dice qué hacer si no se arregla');
});
