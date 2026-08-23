/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — config.js
   Configuración del despliegue: la rellena el DOCENTE.
   Si los datos de Appwrite quedan vacíos, la app funciona en
   modo local (el progreso se guarda solo en ese navegador).
   ═══════════════════════════════════════════════════════════ */

const ATLAS_CONFIG = {

  /* ── Appwrite: cuentas y guardado en la nube ──
     Sigue la guía de README.md §Cuentas para crear el proyecto.
     endpoint p.ej. 'https://cloud.appwrite.io/v1' */
  appwrite: {
    endpoint: '',
    projectId: '',
    databaseId: '',
    collectionId: ''
  },

  /* Los alumnos entran con USUARIO, no con email (más fácil a los 8-10
     años). Internamente se convierte en usuario@<este dominio>. */
  usernameDomain: 'expedicion-atlas.app',

  /* PIN del panel de méritos. CÁMBIALO. Es una barrera de aula frente a
     dedos curiosos, no seguridad real: el código corre en el navegador. */
  teacherPin: '1234',

  /* ── El curso: tres trimestres (fechas editables) ── */
  course: {
    label: 'Curso 2026-2027',
    trimesters: [
      { name: '1er trimestre', start: '2026-09-07', end: '2026-12-22' },
      { name: '2º trimestre',  start: '2027-01-07', end: '2027-03-26' },
      { name: '3er trimestre', start: '2027-04-05', end: '2027-06-22' }
    ]
  },

  /* ── Méritos de Campamento: puntos por comportamientos ──
     Solo Doblones, nunca PE: el rango debe seguir midiendo únicamente
     aprendizaje demostrado (PRD §2.2). Solo comportamientos POSITIVOS:
     retirar puntos rompería el «nada se pierde nunca» (PRD §0.2). */
  behaviors: [
    { id: 'ayudar',     icon: '🤝', name: 'Ayudar a un compañero',                coins: 10, perDay: 3 },
    { id: 'material',   icon: '🧹', name: 'Cuidar el material y el campamento',   coins: 5,  perDay: 2 },
    { id: 'atencion',   icon: '🤫', name: 'Trabajo concentrado en la excavación', coins: 5,  perDay: 2 },
    { id: 'deberes',    icon: '📚', name: 'Tareas y bitácora al día',             coins: 10, perDay: 1 },
    { id: 'participar', icon: '🙋', name: 'Participar en la asamblea',            coins: 5,  perDay: 3 },
    { id: 'especial',   icon: '🌟', name: 'Mérito especial del Prof. Ocaña',      coins: 20, perDay: 1 }
  ]
};
