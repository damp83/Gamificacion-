/* ═══════════════════════════════════════════════════════════
   Función de Appwrite: escribe retos para el banco.

   Existe por una razón concreta: la clave de la API NO puede vivir en el
   navegador. La app es un sitio estático que se sirve a los niños, y ya
   está comprobado que los ajustes viajan a la tablet de cada uno; una
   clave ahí la lee cualquiera con ver el código fuente. Aquí vive en la
   variable de entorno de la función y no sale de este servidor.

   Atiende TRES encargos distintos, y están separados por una razón de peso:
   Appwrite corta cualquier ejecución síncrona a los 30 segundos, y en
   asíncrono el cuerpo de la respuesta llega vacío —lo dice su propio SDK—,
   así que no hay forma de leer el resultado. La única salida es que cada
   llamada quepa holgadamente en esos 30 segundos.

     · `paso: 'generar'`   — escribe UNOS POCOS retos (de uno en uno, como
       los pide el cliente) y los pasa por el validador. El currículo va
       cacheado, así que la segunda llamada y las siguientes cuestan una
       fracción de la primera.
     · `paso: 'verificar'` — recibe retos ya escritos y los resuelve OTRA VEZ,
       sin ver cuál está marcada. Es lo que caza el fallo que más caro cuesta:
       la respuesta correcta mal señalada.
     · `paso: 'yacimiento'` — propone la ESTRUCTURA de un yacimiento: su
       ambientación y sus pozos, repartiendo el currículo. Ni un reto. Una
       sola llamada, y lo que devuelve no puede llegarle a un niño hasta que
       el docente lo acepte y le escriba retos.

   Quien encadena las dos cosas es el cliente, en cloud.js. Antes se hacían
   en una sola ejecución y por eso saltaba el tope de los 30 segundos.

   Nunca escribe en el banco: eso lo decide el docente en su panel. Igual
   que con los acertijos que escriben los niños, nada llega a una clase sin
   que alguien lo haya leído.
   ═══════════════════════════════════════════════════════════ */
import Anthropic from '@anthropic-ai/sdk';
import {
  validarTanda, promptGenerador, esquemaRetos,
  promptVerificacion, esquemaVerificacion, cruzarVerificacion,
  promptYacimiento, esquemaYacimiento, limpiarYacimiento,
  promptCriterios, esquemaCriterios, limpiarCriterios
} from './generador.js';

const MODELO = 'claude-opus-5';
const CURRICULO_MAX = 20000;   /* caracteres: un área y un ciclo, no la ley entera */

export default async ({ req, res, log, error }) => {
  /* ── Quién llama ──
     Appwrite pone el id del usuario de la sesión en esta cabecera. Sin
     sesión no hay generación: si no, cualquiera con la URL de la función
     gasta la cuenta de la API del centro. */
  const usuario = req.headers['x-appwrite-user-id'];
  if (!usuario) {
    return res.json({ ok: false, reason: 'sin-sesion',
      texto: 'Hay que entrar con la cuenta de docente para generar retos.' }, 401);
  }

  let p;
  try { p = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); }
  catch (e) { return res.json({ ok: false, reason: 'peticion', texto: 'La petición no se entiende.' }, 400); }

  const paso = ['verificar', 'yacimiento', 'criterios'].includes(p.paso) ? p.paso : 'generar';

  /* ── Segundo encargo: resolverlos otra vez ──
     No necesita currículo ni esfuerzo alto: es resolver ejercicios de
     Primaria. Va aparte para que ninguna de las dos llamadas se acerque al
     tope de tiempo. */
  if (paso === 'verificar') {
    const retos = Array.isArray(p.retos) ? p.retos.slice(0, 8) : [];
    if (!retos.length) {
      return res.json({ ok: false, reason: 'sin-retos', texto: 'No hay retos que comprobar.' }, 400);
    }
    const clave2 = (typeof p.clave === 'string' && p.clave.trim()) || process.env.ANTHROPIC_API_KEY;
    if (!clave2) {
      return res.json({ ok: false, reason: 'sin-clave',
        texto: 'No hay clave de API. Pon la tuya en Configuración → Retos con IA.' }, 400);
    }
    const esp2 = (typeof p.workspace === 'string' && p.workspace.trim())
      || process.env.ANTHROPIC_WORKSPACE_ID || '';
    const cli2 = new Anthropic(esp2
      ? { apiKey: clave2, defaultHeaders: { 'anthropic-workspace-id': esp2 } }
      : { apiKey: clave2 });
    try {
      const ver = promptVerificacion(retos);
      const chk = await cli2.messages.create({
        model: MODELO,
        max_tokens: 4000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'low', format: { type: 'json_schema', schema: esquemaVerificacion() } },
        system: ver.sistema,
        messages: [{ role: 'user', content: ver.usuario }]
      });
      const cruce = cruzarVerificacion(retos, leerJson(chk).respuestas || []);
      log(`sobreviven a la comprobación ${cruce.buenos.length} de ${retos.length}`);
      return res.json({ ok: true, retos: cruce.buenos, descartados: cruce.descartados, usados: uso(chk) });
    } catch (e) {
      return falloApi(res, error, e, clave2);
    }
  }

  /* ── Cuarto encargo: leer el currículo y sacar sus criterios ──
     No escribe nada que vaya a jugar un niño: devuelve texto copiado del
     propio currículo del docente y una lista de conceptos del catálogo. Por
     eso puede revisarse de una tirada en pantalla, como el yacimiento, en vez
     de pasar por una cola de aprobación uno a uno. */
  if (paso === 'criterios') {
    const texto = String(p.curriculo || '').trim();
    if (texto.length < 200) {
      return res.json({ ok: false, reason: 'sin-curriculo',
        texto: 'Pega el currículo de esa materia y ese curso en «Retos con IA». Con menos de '
             + '200 caracteres no hay criterios que leer, y el modelo se los inventaría.' }, 400);
    }
    if (texto.length > CURRICULO_MAX) {
      return res.json({ ok: false, reason: 'curriculo-largo',
        texto: `El currículo pasa de ${CURRICULO_MAX} caracteres. Manda solo el área y el ciclo que toca.` }, 400);
    }
    const clave4 = (typeof p.clave === 'string' && p.clave.trim()) || process.env.ANTHROPIC_API_KEY;
    if (!clave4) {
      return res.json({ ok: false, reason: 'sin-clave',
        texto: 'No hay clave de API. Pon la tuya en Configuración → Retos con IA.' }, 400);
    }
    const esp4 = (typeof p.workspace === 'string' && p.workspace.trim())
      || process.env.ANTHROPIC_WORKSPACE_ID || '';
    const cli4 = new Anthropic(esp4
      ? { apiKey: clave4, defaultHeaders: { 'anthropic-workspace-id': esp4 } }
      : { apiKey: clave4 });
    try {
      const enc4 = promptCriterios(p);
      const c = await cli4.messages.create({
        model: MODELO,
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        /* El catálogo de conceptos es idéntico en cada llamada y ocupa lo suyo:
           se cachea, igual que en el paso del yacimiento. */
        system: [{ type: 'text', text: enc4.sistema, cache_control: { type: 'ephemeral' } }],
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: esquemaCriterios() } },
        messages: [{ role: 'user', content: enc4.usuario }]
      });
      if (c.stop_reason === 'refusal') {
        return res.json({ ok: false, reason: 'rechazado',
          texto: 'El modelo ha rechazado la petición. Revisa el currículo pegado.' }, 400);
      }
      const criterios = limpiarCriterios(leerJson(c).criterios || []);
      log(`criterios leídos del currículo: ${criterios.length}`);
      return res.json({ ok: true, criterios, usados: uso(c) });
    } catch (e) {
      return falloApi(res, error, e, clave4);
    }
  }

  /* ── Tercer encargo: la estructura de un yacimiento ──
     Va antes de las comprobaciones de abajo porque no son suyas: aquí el
     currículo puede faltar si el docente ha escrito a mano lo que quiere, y
     la materia no está limitada a las dos que tienen validador de retos. */
  if (paso === 'yacimiento') {
    const pistas = [p.curriculo, p.tema].map(x => String(x || '').trim()).join(' ');
    if (pistas.length < 30) {
      return res.json({ ok: false, reason: 'sin-curriculo',
        texto: 'Escribe el currículo de esa materia y ese curso, o di aquí mismo qué quieres '
             + 'trabajar. Sin nada de eso, el modelo se inventa de qué va el curso.' }, 400);
    }
    if (String(p.curriculo || '').length > CURRICULO_MAX) {
      return res.json({ ok: false, reason: 'curriculo-largo',
        texto: `El currículo pasa de ${CURRICULO_MAX} caracteres. Manda solo el área y el ciclo que toca.` }, 400);
    }
    const clave3 = (typeof p.clave === 'string' && p.clave.trim()) || process.env.ANTHROPIC_API_KEY;
    if (!clave3) {
      return res.json({ ok: false, reason: 'sin-clave',
        texto: 'No hay clave de API. Pon la tuya en Configuración → Retos con IA.' }, 400);
    }
    const esp3 = (typeof p.workspace === 'string' && p.workspace.trim())
      || process.env.ANTHROPIC_WORKSPACE_ID || '';
    const cli3 = new Anthropic(esp3
      ? { apiKey: clave3, defaultHeaders: { 'anthropic-workspace-id': esp3 } }
      : { apiKey: clave3 });
    try {
      const enc3 = promptYacimiento(p);
      const y = await cli3.messages.create({
        model: MODELO,
        max_tokens: 8000,
        thinking: { type: 'adaptive' },
        system: [{ type: 'text', text: enc3.sistema, cache_control: { type: 'ephemeral' } }],
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: esquemaYacimiento() } },
        messages: [{ role: 'user', content: enc3.usuario }]
      });
      if (y.stop_reason === 'refusal') {
        return res.json({ ok: false, reason: 'rechazado',
          texto: 'El modelo no ha querido proponer esto. Revisa lo que le has pedido.' }, 200);
      }
      const limpio = limpiarYacimiento(leerJson(y).yacimiento, p.cursos);
      if (!limpio) {
        return res.json({ ok: false, reason: 'vacio',
          texto: 'La propuesta ha venido sin pozos utilizables. Vuelve a intentarlo.' }, 200);
      }
      log(`yacimiento propuesto con ${limpio.pozos.length} pozo(s)`);
      return res.json({ ok: true, yacimiento: limpio, usados: uso(y) });
    } catch (e) {
      return falloApi(res, error, e, clave3);
    }
  }

  if (!p.curriculo || String(p.curriculo).trim().length < 40) {
    return res.json({ ok: false, reason: 'sin-curriculo',
      texto: 'Falta el currículo: sin él, el modelo se inventa de qué va el curso.' }, 400);
  }
  if (String(p.curriculo).length > CURRICULO_MAX) {
    return res.json({ ok: false, reason: 'curriculo-largo',
      texto: `El currículo pasa de ${CURRICULO_MAX} caracteres. Manda solo el área y el ciclo que toca.` }, 400);
  }
  if (!['matematicas', 'lengua'].includes(p.materia)) {
    return res.json({ ok: false, reason: 'materia', texto: 'Materia no reconocida.' }, 400);
  }

  /* ── La clave ──
     Manda la del docente, que llega en la petición desde SU panel: así cada
     uno paga lo suyo y no hay una factura común del centro. La variable de
     entorno queda como reserva para quien no tenga clave propia.

     La clave no se registra ni se devuelve NUNCA. `log()` en Appwrite queda
     guardado en la ejecución y lo lee cualquiera con acceso a la consola. */
  const clave = (typeof p.clave === 'string' && p.clave.trim()) || process.env.ANTHROPIC_API_KEY;
  if (!clave) {
    error('sin clave: ni en la petición ni en ANTHROPIC_API_KEY');
    return res.json({ ok: false, reason: 'sin-clave',
      texto: 'No hay clave de API. Pon la tuya en Configuración → Retos con IA, o pide que se '
           + 'configure ANTHROPIC_API_KEY en la función.' }, 400);
  }
  /* ── El espacio de trabajo ──
     Las claves «ligadas a la identidad» que reparte ahora la consola de
     Anthropic no dicen por sí solas en qué espacio de trabajo actúan, y la
     API las rechaza con un 400 hasta que se le manda. Las claves de toda la
     vida no lo necesitan, así que solo se manda si lo hay. */
  const espacio = (typeof p.workspace === 'string' && p.workspace.trim())
    || process.env.ANTHROPIC_WORKSPACE_ID || '';
  const client = new Anthropic(espacio
    ? { apiKey: clave, defaultHeaders: { 'anthropic-workspace-id': espacio } }
    : { apiKey: clave });

  try {
    /* ── 1. Escribir los retos ── */
    const enc = promptGenerador(p);
    const gen = await client.messages.create({
      model: MODELO,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      /* El currículo se repite en cada tanda de la misma área: cacheado, las
         siguientes cuestan una fracción. */
      system: [{ type: 'text', text: enc.sistema, cache_control: { type: 'ephemeral' } }],
      output_config: { effort: 'high', format: { type: 'json_schema', schema: esquemaRetos() } },
      messages: [{ role: 'user', content: enc.usuario }]
    });

    if (gen.stop_reason === 'refusal') {
      return res.json({ ok: false, reason: 'rechazado',
        texto: 'El modelo no ha querido escribir esto. Revisa el currículo que has mandado.' }, 200);
    }
    const crudos = leerJson(gen).retos || [];
    log(`generados ${crudos.length}`);

    /* ── 2. El validador, antes de gastar la segunda pasada ── */
    const v1 = validarTanda(crudos, { materia: p.materia });
    log(`pasan la validación ${v1.buenos.length}, se tiran ${v1.descartados.length}`);
    if (!v1.buenos.length) {
      return res.json({ ok: true, retos: [], descartados: v1.descartados, usados: uso(gen) });
    }

    /* La comprobación NO va aquí: es la otra llamada. Meterlas juntas es lo
       que hacía saltar el tope de 30 segundos de Appwrite. */
    return res.json({ ok: true, retos: v1.buenos, descartados: v1.descartados, usados: uso(gen) });

  } catch (e) {
    return falloApi(res, error, e, clave);
  }
};

/* ── Los fallos de la API, traducidos ──
   Lo usan los dos pasos. Se distingue lo que arregla el docente de lo que no:
   «vuelve a intentarlo» sobre una clave caducada es mandarle a dar vueltas. */
function falloApi(res, error, e, clave) {
  /* Si la clave se colara en el texto de un error, saldría en la consola de
     Appwrite y en la pantalla del docente. Se tapa antes de mirarla. */
  const sinClave = t => String(t || '').split(clave).join('sk-ant-…');
  const m = sinClave((e && e.message) || '');
  error('fallo llamando a la API: ' + m);

  /* Va ANTES que el de la clave a propósito: el aviso del espacio de trabajo
     dice «identity-linked API key», así que la comprobación de abajo lo
     cazaría y le diría al docente que su clave no vale, que es mentira y le
     manda a crear otra igual de rota. */
  if (/workspace/i.test(m)) {
    return res.json({ ok: false, reason: 'workspace',
      texto: 'Tu clave está ligada a tu cuenta y necesita saber en qué espacio de trabajo '
           + 'actúa. Pega el ID del espacio en Configuración → Retos con IA, debajo de la '
           + 'clave. Lo tienes en console.anthropic.com → Settings → Workspaces.' }, 400);
  }
  if (/401|authentication|api key/i.test(m)) {
    return res.json({ ok: false, reason: 'clave', texto: 'La clave de la API no vale o ha caducado.' }, 500);
  }
  if (/429|rate.?limit/i.test(m)) {
    return res.json({ ok: false, reason: 'ritmo', texto: 'Demasiadas peticiones seguidas. Espera un minuto.' }, 429);
  }
  if (/credit|billing|quota/i.test(m)) {
    return res.json({ ok: false, reason: 'saldo', texto: 'La cuenta de la API se ha quedado sin saldo.' }, 402);
  }
  return res.json({ ok: false, reason: 'error', texto: 'No se ha podido llamar al modelo: ' + m }, 500);
}

/* El bloque de texto de la respuesta, ya parseado. Con esquema de salida
   viene JSON válido, pero se envuelve igual: un fallo de parseo tiene que
   decir eso y no reventar la función. */
function leerJson(respuesta) {
  const bloque = (respuesta.content || []).find(b => b.type === 'text');
  if (!bloque) return {};
  try { return JSON.parse(bloque.text); } catch (e) { return {}; }
}

const uso = r => ({
  entrada: (r.usage && r.usage.input_tokens) || 0,
  cacheados: (r.usage && r.usage.cache_read_input_tokens) || 0,
  salida: (r.usage && r.usage.output_tokens) || 0
});
/* La suma de lo gastado la hace el cliente: ahora son varias llamadas y cada
   una solo sabe lo suyo. */
