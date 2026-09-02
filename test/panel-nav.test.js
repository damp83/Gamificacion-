/* El índice del panel del docente. Lo que se prueba no es el orden por gusto,
   sino que nada quede escondido: la versión anterior era una tira con scroll
   lateral donde en un móvil se veía 1 sección de 13. */
const { test } = require('node:test');
const assert = require('node:assert');
const { cargarApp } = require('./cargar.js');

const ctx = cargarApp();
const SECCIONES = ctx.ev('CFG_SECTIONS');
const GRUPOS = ctx.ev('CFG_GRUPOS');

test('todas las secciones tienen grupo y todos los grupos existen', () => {
  const ids = GRUPOS.map(g => g.id);
  for (const s of SECCIONES) {
    assert.ok(s.grupo, `«${s.name}» no tiene grupo`);
    assert.ok(ids.includes(s.grupo), `«${s.name}» está en un grupo que no existe`);
  }
  /* Ninguno vacío: un título de grupo sin nada debajo es un hueco raro. */
  for (const g of GRUPOS) {
    assert.ok(SECCIONES.some(s => s.grupo === g.id), `el grupo «${g.name}» está vacío`);
  }
});

test('el panel abre por el día a día, no por lo de septiembre', () => {
  /* «Curso y trimestres» era la primera y es de las que menos se abren; con
     ella delante, «Retos con IA» quedaba la décima de trece. */
  const inicio = ctx.ev('CFG_INICIO');
  const sec = SECCIONES.find(s => s.id === inicio);
  assert.ok(sec, 'la sección de inicio existe');
  assert.equal(sec.grupo, 'diario');
  assert.equal(SECCIONES[0].id, inicio, 'y además es la primera de la lista');
});

test('las colas por revisar van en el día a día', () => {
  /* Los acertijos del Taller y los retos de la IA son cosas que alguien
     escribió y esperan a que un docente las lea. Eso no es preparar el
     curso: es de esta semana. */
  for (const id of ['ia', 'taller']) {
    assert.equal(SECCIONES.find(s => s.id === id).grupo, 'diario', id);
  }
});

test('el grupo de la sección que se ve está siempre abierto', () => {
  /* Si no, entrar en «Acceso y nube» desde otro sitio dejaría el panel
     enseñando una sección sin marcar dónde estás. */
  const c = cargarApp();
  c.ev('cfgPlegados = ["preparar"]');
  c.ev('cfgSection = "alumnado"');
  assert.equal(c.ev('grupoAbierto')('preparar'), false, 'plegado si no estás dentro');
  c.ev('cfgSection = "acceso"');
  assert.equal(c.ev('grupoAbierto')('preparar'), true, 'abierto si estás dentro');
});

test('el pulso de la sala de mapas lleva a secciones que existen', () => {
  const c = cargarApp();
  c.ev('setTeacherConfig')('iaCola', [{ id: 'a' }]);
  c.ev('setTeacherConfig')('roster', []);
  const ids = SECCIONES.map(s => s.id);
  for (const f of c.ev('pulsoDocente')()) {
    if (f.ir) assert.ok(ids.includes(f.ir), `la ficha ${f.icono} apunta a «${f.ir}», que no existe`);
  }
});
