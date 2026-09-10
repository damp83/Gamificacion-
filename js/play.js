/* ═══════════════════════════════════════════════════════════
   Expedición Atlas — play.js
   Las pantallas del alumno: el mapa de yacimientos, el pozo y sus
   estratos, la Cámara del Guardián, la misión en curso con su feedback,
   el resultado, el Campamento Base, el Fondo de la Sociedad, la bitácora,
   las cuadrillas, los méritos y el cuaderno.

   Todo lo de aquí pinta lo que el motor (game.js) y el estado (state.js)
   deciden; ninguna regla del juego vive en este fichero.
   ═══════════════════════════════════════════════════════════ */

/* ── Mapa ── */
function renderMap() {
  renderHud();
  const pct = Math.round(mapRevealPct() * 100);
  $('#map-reveal-fill').style.width = pct + '%';
  const gi = gradeInfo(S.profile.grade);
  const frags = fragmentsRecovered();
  $('#map-reveal-pct').textContent = `${pct}% del mundo dibujado · ${gi.label} (${gi.age})` +
    (frags ? ` · ${frags} fragmento${frags === 1 ? '' : 's'} del Atlas` : '');

  $('#fatigue-banner').classList.toggle('hidden', !isFatigued());

  const siteList = $('#site-list');
  siteList.innerHTML = '';

  const sites = sitesEnabled().filter(site => branchesEnabledOf(site).length);
  if (!sites.length) {
    siteList.innerHTML = `<div class="dialog bruno"><span class="dialog-avatar">🧔🏻‍♂️</span>
      <div class="dialog-text"><strong>Prof. Bruno Ocaña</strong>
      <p>«Todavía no hay ningún yacimiento abierto… ¡habré perdido los mapas otra vez!
      En cuanto el docente prepare uno, aparecerá aquí.»</p></div></div>`;
    return;
  }

  const seguir = dondeSeguir();

  for (const site of sites) {
    /* Cada yacimiento con su color. Seis tarjetas del mismo beige se leen
       como una lista; con color son sitios distintos, que es lo que son. */
    const col = colorDeYacimiento(site.id);
    const header = document.createElement('div');
    header.className = 'site-header';
    header.dataset.site = site.id;      /* la carta de arriba apunta aquí */
    header.style.setProperty('--acento', col.tinta);
    header.style.setProperty('--acento-suave', col.fondo);
    header.innerHTML = `<span class="site-icon">${esc(site.icon)}</span>
      <div><h3>${esc(site.name)}</h3><p>${esc(site.subject)}${esc(site.desc ? ' · ' + site.desc : '')}</p></div>`;
    siteList.appendChild(header);

    /* Los pozos van en su propia rejilla, no sueltos en la columna: así en
       pantalla ancha se reparten en dos por fila en vez de dejar medio
       lienzo vacío al lado. */
    const grid = document.createElement('div');
    grid.className = 'site-branches';
    siteList.appendChild(grid);

    for (const b of branchesEnabledOf(site)) {
      const strata = branchState(b.id).strata;
      const withContent = STRATA_ORDER.filter(sId => stratumHasContent(b, sId));
      const mastered = withContent.filter(sId => strata[sId].mastery >= 0.8).length;
      const card = document.createElement('button');
      card.className = 'branch-card' + (seguir && seguir.branchId === b.id ? ' branch-aqui' : '');
      card.style.setProperty('--acento', col.tinta);
      card.style.setProperty('--acento-suave', col.fondo);
      card.innerHTML = `<span class="branch-icon">${esc(b.icon)}</span>
        <div class="branch-info">
          <strong>${esc(b.name)}</strong>
          <div class="branch-strata-dots">${withContent.map(sId => {
            const st = strata[sId];
            const cls = st.mastery >= 0.8 ? 'dot-mastered' : st.status === 'locked' ? 'dot-locked' : 'dot-open';
            return `<span class="dot ${cls}" title="${STRATA_META[sId].label}"></span>`;
          }).join('')}</div>
          <small>${mastered}/${withContent.length} estratos dominados</small>
        </div><span class="branch-go">${ico('pickaxe')}</span>`;
      card.addEventListener('click', () => openBranch(b.id));
      grid.appendChild(card);
    }
  }

  pintarCartaDeExpedicion(sites);
  pintarSeguir(seguir);

  /* Encargo del Bazar: repaso espaciado con excusa narrativa */
  const bazar = $('#bazar-card');
  const target = bestBazarTarget();
  /* Si el Encargo es la remediación que pide un Guardián, se ofrece aunque el
     estrato esté recién practicado: es justo entonces cuando hace falta. */
  if (target && (target.paraGuardian || target.cover > 0.1) && S.daily.bazar_today < ECO().bazarPerDay) {
    const b = branchDef(target.branchId);
    const meta = STRATA_META[target.stratumId];
    bazar.innerHTML = `<div class="bazar-inner">
      <span class="bazar-icon">${ico(target.paraGuardian ? 'idol' : 'basket')}</span>
      <div><strong>${target.paraGuardian ? 'Repaso para el Guardián' : 'Encargo del Bazar'}</strong>
      <p>${target.paraGuardian
        ? `El Guardián de ${esc(b.name)} pide que repases «${meta.name}» antes de dejarte volver a entrar.`
        : `«${meta.name}» de ${esc(b.name)} se está cubriendo de arena… Un repaso rápido lo redescubrirá. (+10–15 ${ico('coin')})`}</p></div>
      <button class="btn btn-secondary" id="btn-bazar">Repasar</button></div>`;
    $('#btn-bazar').addEventListener('click', () => {
      if (!startMission(target.branchId, target.stratumId, 'bazar')) { toast('Ese encargo ya no está disponible.'); return; }
      renderMissionScreen();
      show('mission');
    });
    bazar.classList.remove('hidden');
  } else {
    bazar.innerHTML = '';
    bazar.classList.add('hidden');
  }
}

/* ══════════ LA CARTA DE EXPEDICIÓN ══════════

   La pantalla se llamaba «El Mapa del Atlas», decía «4 % del mundo dibujado», y
   lo que había era una lista con una barra de progreso encima. La promesa más
   fuerte de toda la app —dibujar un mundo excavando— no se cumplía en ninguna
   pantalla, y el 4 % no estaba en ninguna parte: era un número sobre una barra.

   Esto lo dibuja. Y lo dibuja de la única forma que significa algo: el terreno
   NO se revela por un porcentaje global, sino alrededor de cada yacimiento y en
   proporción a lo que se lleva excavado de ÉL. Así el mapa dice algo que la
   barra no podía decir: dónde has estado y dónde no. Un niño que solo ha tocado
   matemáticas ve un claro alrededor de Kaldros y arena en todo lo demás, que es
   exactamente la verdad.

   La carta orienta; la lista de abajo es la que actúa. Tocar un sitio lleva a su
   parte de la lista en vez de abrir un pozo al azar: dos caminos distintos para
   lo mismo se pisan, y en una tablet el dedo acierta más en una tarjeta grande
   que en un punto de doce píxeles.

   Los sitios se colocan en el ORDEN de la configuración, no por huella. Es lo
   contrario que el color, y a propósito: el color identifica y tiene que
   aguantar, pero la carta y la lista cuentan la misma historia y tienen que
   contarla en el mismo orden. Si no, el docente reordena sus yacimientos y el
   mapa deja de coincidir con lo que hay debajo. */

/* Sitios sobre la carta, en % del lienzo. Están repartidos a mano para que con
   dos, con tres o con seis nunca se solapen ni se amontonen en una esquina. */
const PUNTOS_CARTA = [
  { x: 30, y: 38 }, { x: 72, y: 55 }, { x: 48, y: 20 },
  { x: 17, y: 66 }, { x: 86, y: 25 }, { x: 57, y: 71 },
  { x: 12, y: 26 }, { x: 88, y: 68 }
];

/* Cuánto se lleva excavado de un yacimiento: estratos dominados sobre los que
   tienen retos escritos. Es la misma cuenta que hace el mapa entero, mirando
   solo a este sitio. */
function progresoDeYacimiento(site) {
  let total = 0, hechos = 0;
  for (const b of branchesEnabledOf(site)) {
    const strata = branchState(b.id).strata;
    for (const sId of STRATA_ORDER) {
      if (!stratumHasContent(b, sId)) continue;
      total++;
      if (strata[sId].mastery >= 0.8) hechos++;
    }
  }
  return { total, hechos, parte: total ? hechos / total : 0 };
}

/* El claro que ha abierto un yacimiento, en % del ancho de la carta. Nunca es
   cero: el sitio se ve desde el primer día, porque saber que existe es parte de
   querer llegar. Y nunca lo tapa todo: al 100 % sigue habiendo mundo fuera. */
const CLARO_MINIMO = 9;
const CLARO_MAXIMO = 30;
function claroDeYacimiento(parte) {
  const p = Math.max(0, Math.min(1, Number(parte) || 0));
  return CLARO_MINIMO + (CLARO_MAXIMO - CLARO_MINIMO) * p;
}

function pintarCartaDeExpedicion(sites) {
  const caja = $('#map-carta');
  if (!caja) return;
  const lista = (sites || []).slice(0, PUNTOS_CARTA.length);
  if (!lista.length) { caja.innerHTML = ''; caja.classList.add('hidden'); return; }

  const marcas = lista.map((site, i) => {
    const p = PUNTOS_CARTA[i];
    const pr = progresoDeYacimiento(site);
    return { site, x: p.x, y: p.y, r: claroDeYacimiento(pr.parte), pr,
             col: colorDeYacimiento(site.id) };
  });

  /* La arena se quita con una máscara: lo blanco del `mask` es lo que se ve
     del terreno de abajo. Un círculo por yacimiento, del tamaño de su claro. */
  const claros = marcas.map(m =>
    `<circle cx="${m.x}" cy="${m.y}" r="${m.r.toFixed(1)}" fill="url(#atlas-claro)"/>`).join('');

  caja.innerHTML = `
    <svg class="carta" viewBox="0 0 100 80" preserveAspectRatio="xMidYMid slice"
         role="img" aria-label="Carta de la expedición: ${esc(marcas.map(m =>
           `${m.site.name}, ${m.pr.hechos} de ${m.pr.total} estratos`).join('; '))}">
      <defs>
        <!-- Un claro se desvanece por el borde: la excavación no tiene un
             perímetro recto, y un círculo duro sobre arena parece un error. -->
        <radialGradient id="atlas-claro">
          <stop offset="52%" stop-color="#fff"/>
          <stop offset="100%" stop-color="#fff" stop-opacity="0"/>
        </radialGradient>
        <!-- Blanco = terreno visible. Los claros SE SUMAN: dos yacimientos
             cercanos abren un claro mayor en vez de taparse el uno al otro,
             que es lo que pasaría enmascarando la arena en vez del terreno. -->
        <mask id="atlas-claros">
          <rect x="0" y="0" width="100" height="80" fill="#000"/>
          ${claros}
        </mask>
      </defs>

      <!-- La arena sin levantar. Es el suelo de la carta, no una capa encima, y
           va bastante más apagada que el terreno: si los dos tonos se parecen,
           el claro no se ve y todo el dibujo deja de contar nada. -->
      <rect x="0" y="0" width="100" height="80" fill="#cbb389"/>
      <path d="M0 63 q 22 -5 44 2 t 56 3 L100 80 L0 80 Z" fill="#c2a97e"/>
      <path d="M0 30 q 26 -6 52 3 t 48 2" fill="none" stroke="#c0a67c" stroke-width=".7"/>

      <!-- El terreno dibujado, que solo asoma por los claros. Lleva cosas
           repartidas —ruinas, cauces, rocas— para que abrir un claro más grande
           no sea solo más papel claro: sea encontrar algo. -->
      <g mask="url(#atlas-claros)">
        <rect x="0" y="0" width="100" height="80" fill="#f6e7c6"/>
        <path d="M0 58 Q 18 50 32 56 T 62 54 T 100 60 L100 80 L0 80 Z" fill="#e2c894"/>
        <path d="M0 69 Q 26 63 48 69 T 100 71 L100 80 L0 80 Z" fill="#cfae72"/>
        <g fill="none" stroke="#a8854e" stroke-width=".9" stroke-linecap="round">
          <path d="M4 24 q 11 -9 22 0 q 11 9 22 0"/>
          <path d="M54 14 q 13 -7 24 2"/>
          <path d="M60 74 q 14 -5 28 2"/>
          <path d="M10 50 q 16 7 30 -3 q 14 -10 28 0" stroke-dasharray="2.5 2.5"/>
          <path d="M76 34 q 9 -6 18 1"/>
        </g>
        <!-- Ruinas: tres columnas y un dintel, del tamaño de una uña -->
        <g fill="#b08d55">
          <rect x="20" y="28" width="1.4" height="5" rx=".4"/>
          <rect x="23" y="27" width="1.4" height="6" rx=".4"/>
          <rect x="26" y="28.5" width="1.4" height="4.5" rx=".4"/>
          <rect x="19.4" y="25.6" width="9" height="1.3" rx=".5"/>
          <rect x="63" y="46" width="1.4" height="5" rx=".4"/>
          <rect x="66" y="45" width="1.4" height="6" rx=".4"/>
          <rect x="62.4" y="43.6" width="6" height="1.3" rx=".5"/>
          <circle cx="41" cy="59" r="1.5"/><circle cx="44.5" cy="60.5" r="1"/>
          <circle cx="83" cy="62" r="1.4"/><circle cx="86" cy="63.5" r=".9"/>
          <circle cx="13" cy="45" r="1.2"/>
        </g>
      </g>

      ${marcas.map(m => `
        <g class="carta-sitio" data-sitio="${esc(m.site.id)}" tabindex="0" role="button"
           aria-label="${esc(m.site.name)}: ${m.pr.hechos} de ${m.pr.total} estratos dominados">
          <circle cx="${m.x}" cy="${m.y}" r="3.6" fill="${m.col.fondo}" stroke="${m.col.tinta}" stroke-width="1.1"/>
          <circle cx="${m.x}" cy="${m.y}" r="1.3" fill="${m.col.tinta}"/>
        </g>`).join('')}
    </svg>
    <div class="carta-leyenda">
      ${marcas.map(m => `<button class="carta-chip" data-sitio="${esc(m.site.id)}"
        style="--acento:${m.col.tinta};--acento-suave:${m.col.fondo}">
        <span class="carta-chip-punto"></span>${esc(m.site.name)}
        <b>${m.pr.hechos}/${m.pr.total}</b></button>`).join('')}
    </div>`;

  const ir = id => {
    const destino = $(`#site-list [data-site="${CSS && CSS.escape ? CSS.escape(id) : id}"]`);
    if (destino && destino.scrollIntoView) destino.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $$('#map-carta [data-sitio]').forEach(el => {
    el.addEventListener('click', () => ir(el.dataset.sitio));
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ir(el.dataset.sitio); }
    });
  });
  caja.classList.remove('hidden');
}

/* ── «Sigue por aquí» ──
   Un solo botón grande, con nombre propio y el sitio exacto. Enseña cuánto
   lleva de ese estrato, porque «te falta poco» mueve más que «empieza algo».
   Si no hay nada empezado ni abierto —todo dominado— no se pinta: inventar un
   destino sería mandarle a repasar disfrazado de avanzar. */
function pintarSeguir(destino) {
  const caja = $('#seguir-card');
  if (!caja) return;
  if (!destino) { caja.innerHTML = ''; caja.classList.add('hidden'); return; }

  const b = branchDef(destino.branchId);
  const site = siteOfBranch(destino.branchId);
  const meta = STRATA_META[destino.stratumId];
  const col = colorDeYacimiento(site ? site.id : '');
  const pct = Math.round((destino.mastery || 0) * 100);
  const empezado = pct > 0;

  caja.style.setProperty('--acento', col.tinta);
  caja.style.setProperty('--acento-suave', col.fondo);
  caja.innerHTML = `
    <div class="seguir-eyebrow">${empezado ? 'Sigue por aquí' : 'Empieza por aquí'}</div>
    <div class="seguir-cuerpo">
      <span class="seguir-icono">${esc(b.icon || '⛏️')}</span>
      <div class="seguir-texto">
        <strong>${esc(b.name)}</strong>
        <p>${esc(meta.name)} · ${esc(meta.label)}</p>
        ${empezado ? `<div class="seguir-barra"><i style="width:${pct}%"></i></div>
          <small>${pct}% de este estrato</small>` : '<small>Sin empezar todavía</small>'}
      </div>
    </div>
    <button class="btn btn-primary seguir-btn" id="btn-seguir">
      ${ico('pickaxe')} ${empezado ? 'Seguir excavando' : 'Empezar a excavar'}</button>`;

  $('#btn-seguir').addEventListener('click', () => {
    if (!startMission(destino.branchId, destino.stratumId)) {
      toast('Ese estrato no tiene retos todavía.');
      return;
    }
    renderMissionScreen();
    show('mission');
  });
  caja.classList.remove('hidden');
}

/* ══════════ EL CAMPAMENTO QUE SE VE ══════════

   Un niño ahorraba noventa doblones, se compraba las botas todoterreno, y no
   las veía nunca. Ni la tienda de rayas, ni el jeep, ni la hoguera. La
   pantalla que debería ser el premio de todo lo demás era una lista de la
   compra de quince líneas con un formulario encima, y la «escena» era una
   línea de emoji sueltos que no se distinguía de un texto cualquiera.

   Es el agujero más grande que tenía la app: la moneda existía, el catálogo
   existía, y la recompensa no se veía por ninguna parte. Excavar da doblones,
   los doblones compran cosas y las cosas no cambian nada de lo que el niño ve.
   El circuito no cerraba.

   Aquí cierra. Hay un sitio dibujado —dunas, cielo y suelo— y lo comprado
   está PUESTO en él, cada cosa en su lugar: la tienda a un lado, el jeep al
   fondo, la hoguera en el centro, el explorador delante con lo que lleva
   encima. Cada compra cambia algo que se ve.

   Dos decisiones que importan:

     · Los sitios están escritos, no repartidos al azar. Un campamento cuya
       tienda cambia de sitio cada vez que entras no es un sitio, es un
       collage. Lo comprado se queda donde estaba.

     · Lo que el docente añada al almacén también aparece. Los iconos de la
       tienda los teclea él y viajan con los ajustes de la clase, así que hay
       huecos libres para lo que no conocemos: un artículo nuevo se ve desde el
       primer día sin tocar una línea de código. */

/* Dónde va cada cosa: izquierda y base en % de la escena, y el tamaño
   relativo. `z` ordena la profundidad —lo de atrás, más pequeño y más alto. */
const SITIOS_CAMPAMENTO = {
  /* Al fondo, sobre la duna lejana y pequeño. */
  jeep_oxidado:    { x: 80, y: 52, escala: .85, z: 1 },
  /* Plano medio: la tienda a un lado y el tendedero detrás del fuego. */
  tienda_rayas:    { x: 17, y: 34, escala: 1.5, z: 2 },
  tendedero_mapas: { x: 46, y: 40, escala: .95, z: 2 },
  /* Delante, junto al explorador: es donde se hace la vida. */
  hoguera_grande:  { x: 65, y: 14, escala: 1.2, z: 5 }
};
/* Huecos para lo que el docente añada. Van todos por debajo de la línea del
   horizonte —nada flota en el cielo— y de atrás hacia delante, para que un
   artículo nuevo se coloque sin pisar al explorador. */
const HUECOS_LIBRES = [
  { x: 32, y: 44, escala: .9, z: 2 },
  { x: 90, y: 34, escala: 1, z: 3 },
  { x:  8, y: 16, escala: 1, z: 5 },
  { x: 80, y: 16, escala: .95, z: 5 }
];

/* Lo que Tobías está haciendo, según las golosinas que le hayan dado. */
function estadoDeTobias(golosinas) {
  const n = Number(golosinas) || 0;
  if (n >= 3) return { cara: '🐕', dice: 'Tobías no se mueve de tu lado. Sospechoso.' };
  if (n > 0)  return { cara: '🐕', dice: 'Tobías está feliz con sus golosinas.' };
  return { cara: '🐕', dice: 'Tobías husmea buscando golosinas…' };
}

/* Lo siguiente que podría comprarse, para que la escena vacía mire hacia
   delante en vez de decirle que no tiene nada. Se elige lo más barato que le
   falte: es lo que está a menos excavaciones de distancia. */
function loSiguienteDelAlmacen() {
  const tiene = new Set((S.inventory.gear_owned || []).concat(S.inventory.camp_items || []));
  let mejor = null;
  for (const it of shopCatalog()) {
    if (it.type !== 'treat' && tiene.has(it.id)) continue;
    if (!mejor || it.cost < mejor.cost) mejor = it;
  }
  return mejor;
}

function pintarEscenaDelCampamento() {
  const scene = $('#camp-scene');
  if (!scene) return;
  const catalogo = shopCatalog();
  const deId = id => catalogo.find(i => i.id === id) || null;

  const piezas = [];
  let libre = 0;
  for (const id of (S.inventory.camp_items || [])) {
    const it = deId(id);
    if (!it) continue;
    const sitio = SITIOS_CAMPAMENTO[id] || HUECOS_LIBRES[libre++ % HUECOS_LIBRES.length];
    piezas.push({ icon: it.icon || '📦', name: it.name || '', sitio });
  }

  const tobias = estadoDeTobias(S.inventory.treats_given);
  const siguiente = loSiguienteDelAlmacen();
  const vacio = !piezas.length;

  scene.innerHTML = `
    <div class="escena" role="img" aria-label="Tu campamento${
      piezas.length ? ' con ' + esc(piezas.map(p => p.name).join(', ')) : ' todavía vacío'}">
      <div class="escena-cielo"></div>
      <div class="escena-duna escena-duna-lejos"></div>
      <div class="escena-duna escena-duna-cerca"></div>
      <div class="escena-suelo"></div>
      ${piezas.map(p => `<span class="escena-cosa" title="${esc(p.name)}" aria-hidden="true"
        style="left:${p.sitio.x}%;bottom:${p.sitio.y}%;font-size:${(p.sitio.escala * 2.1).toFixed(2)}rem;z-index:${p.sitio.z}">${esc(p.icon)}</span>`).join('')}
      <span class="escena-yo" aria-hidden="true">${avatarDelExplorador()}</span>
      <span class="escena-perro" aria-hidden="true" title="${esc(tobias.dice)}">${tobias.cara}</span>
    </div>
    <p class="escena-pie">${vacio
      ? (siguiente
        ? `Tu campamento está por montar. Lo más barato del almacén es <strong>${esc(siguiente.name)}</strong> por ${siguiente.cost} ${ico('coin')}.`
        : 'Tu campamento está por montar.')
      : esc(tobias.dice)}</p>`;
}

/* ── Pozo / estratos ── */
let currentBranch = null;
function openBranch(branchId) {
  currentBranch = branchId;
  const b = branchDef(branchId);
  if (!b) { show('map'); return; }
  $('#branch-title').textContent = `${b.icon} ${b.name}`;
  $('#branch-desc').textContent = (b.desc || '') + ' Cuanto más profundo excaves, mayor es el tesoro.';
  const list = $('#strata-list');
  list.innerHTML = '';
  const strata = branchState(branchId).strata;

  STRATA_ORDER.forEach((sId, i) => {
    const meta = STRATA_META[sId];
    const hasContent = stratumHasContent(b, sId);
    const st = strata[sId];
    const cover = sandCover(st);
    const locked = st.status === 'locked';
    const row = document.createElement('button');
    row.className = 'stratum-row' + (locked || !hasContent ? ' locked' : '')
      + (st.mastery >= 0.8 ? ' excavado' : '');
    row.disabled = locked || !hasContent;
    const masteryPct = Math.round(st.mastery * 100);

    let detail;
    if (!hasContent) {
      /* pozo del docente a medio llenar: se dice, no se finge que está bloqueado */
      detail = '<small>Este estrato todavía no tiene retos preparados</small>';
    } else if (locked) {
      /* Si el de arriba ya ha llegado al 0,8 una vez, lo que falta no es
         dominar más: es repetirlo para confirmar que no fue suerte. Decirlo
         convierte una puerta cerrada sin motivo aparente en un objetivo
         claro, que es la diferencia entre insistir y abandonar. */
      const arriba = i > 0 ? strata[STRATA_ORDER[i - 1]] : null;
      detail = (arriba && (arriba.altas || 0) === 1)
        ? '<small>¡Ya casi! Vuelve a superar el estrato de arriba una vez más y este se abre</small>'
        : '<small>Se abre al dominar (≥80%) el estrato de arriba, dos veces seguidas</small>';
    } else {
      detail = `<div class="mastery-bar"><div class="mastery-fill${st.mastery >= 0.8 ? ' gold' : ''}" style="width:${masteryPct}%"></div></div>
        <small>Dominio: ${masteryPct}%${st.mastery >= 0.9 ? ' · ya excavado (PE al 10%)' : ''}${cover > 0.2 ? ' · cubierto de arena' : ''}</small>`;
    }

    row.innerHTML = `
      <span class="stratum-depth"><i>Estrato</i><b>${i + 1}</b></span>
      <span class="stratum-icon">${ico(!hasContent ? 'crate' : locked ? 'lock' : ICO_ESTRATO[sId])}</span>
      <div class="stratum-info"><strong>${meta.label} · «${meta.name}»</strong>${detail}</div>
      <span class="stratum-go">${locked || !hasContent ? '' : ico('pickaxe')}</span>`;

    if (!row.disabled) {
      row.addEventListener('click', () => {
        if (!startMission(branchId, sId, 'expedition')) {
          toast('Ese estrato aún no tiene retos preparados.');
          return;
        }
        renderMissionScreen();
        show('mission');
      });
    }
    list.appendChild(row);
  });

  renderBranchGuardian(branchId);
  show('branch');
}

/* ── La Cámara del Guardián, al fondo del pozo ── */
function renderBranchGuardian(branchId) {
  const cont = $('#branch-guardian');
  const est = guardianStatus(branchId);
  if (est.estado === 'oculta') { cont.innerHTML = ''; return; }

  const nombres = (est.strata || []).map(sId => STRATA_META[sId].label).join(' · ');
  if (est.estado === 'superada') {
    cont.innerHTML = `<div class="guardian-card guardian-done">
      <span class="guardian-card-icon">${ico('idol','ico-lg')}</span>
      <div><strong>Cámara del Guardián · superada</strong>
      <small>Recuperaste el fragmento del Atlas de este pozo${est.fecha ? ' el ' + est.fecha.split('-').reverse().slice(0,2).join('/') : ''}.</small></div>
      <span class="guardian-card-go">${ico('pickaxe')}</span></div>`;
    return;
  }
  if (est.estado === 'cerrada') {
    const faltan = est.faltan.map(sId => STRATA_META[sId].label).join(', ');
    cont.innerHTML = `<div class="guardian-card guardian-locked">
      <span class="guardian-card-icon">${ico('lock','ico-lg')}</span>
      <div><strong>Cámara del Guardián</strong>
      <small>Se abre con todo el pozo dominado. Te falta: ${faltan}.</small></div></div>`;
    return;
  }
  if (est.estado === 'repaso') {
    const w = STRATA_META[est.weak] ? STRATA_META[est.weak].label : '';
    cont.innerHTML = `<div class="guardian-card guardian-wait">
      <span class="guardian-card-icon">${ico('basket','ico-lg')}</span>
      <div><strong>El Guardián te espera</strong>
      <small>Pide un Encargo del Bazar sobre <strong>${w}</strong> antes de volver a intentarlo.
      Lo tienes en el mapa.</small></div></div>`;
    return;
  }

  const btn = document.createElement('button');
  btn.className = 'guardian-card guardian-open';
  btn.innerHTML = `<span class="guardian-card-icon">${ico('idol','ico-lg')}</span>
    <div><strong>Cámara del Guardián</strong>
    <small>${est.intentos ? 'Vuelve a intentarlo. ' : ''}Todo el pozo dominado: ${nombres}</small></div>
    <span class="guardian-card-go">→</span>`;
  btn.addEventListener('click', () => openGuardianHall(branchId));
  cont.innerHTML = '';
  cont.appendChild(btn);
}

/* ── Antesala: se ve lo que va a preguntar antes de entrar ── */
let guardianBranch = null;
function openGuardianHall(branchId) {
  guardianBranch = branchId;
  const b = branchDef(branchId);
  const est = guardianStatus(branchId);
  const g = ATLAS_CONFIG.guardian || {};
  if (est.estado !== 'abierta') { openBranch(branchId); return; }

  /* el rostro del Guardián ya está justo encima: repetir el emoji en el título
     solo hacía la línea más larga */
  $('#guardian-title').textContent = `Cámara del Guardián · ${b.name}`;
  $('#guardian-dialog').innerHTML = `<span class="dialog-avatar">🧔🏻‍♂️</span>
    <div class="dialog-text"><strong>Prof. Bruno Ocaña</strong>
    <p>«${est.intentos
      ? 'El Guardián ya te vio una vez. No te preocupes: a mí me echó cuatro veces seguidas, y a la quinta me dejó pasar por pena.'
      : 'Ahí está. Lleva mil años esperando a alguien que se sepa el pozo entero. No pregunta nada nuevo: pregunta todo a la vez.'}»</p></div>`;

  /* Se enseña de qué va a preguntar: una evaluación no debería sorprender */
  $('#guardian-strata').innerHTML = est.strata.map(sId => {
    const meta = STRATA_META[sId];
    const st = getStratum(branchId, sId);
    return `<div class="guardian-stratum">
      <span class="guardian-stratum-icon">${ico(ICO_ESTRATO[sId])}</span>
      <div><strong>${meta.label}</strong><small>«${meta.name}» · lo llevas al ${Math.round(st.mastery * 100)}%</small></div>
    </div>`;
  }).join('');

  const total = Math.max(4, Math.min(20, g.questions || 10));
  const acts = $('#guardian-actions');
  acts.innerHTML = `<p class="guardian-meta">${total} retos encadenados ·
    hacen falta ${Math.round((g.passAccuracy || 0.8) * 100)}% de aciertos a la primera ·
    premio: ${ico('map')} un fragmento del Atlas y ${g.coins || 100} ${ico('coin')}</p>`;
  const entrar = document.createElement('button');
  entrar.className = 'btn btn-primary';
  entrar.id = 'guardian-enter';
  entrar.innerHTML = 'Entrar en la cámara ' + ico('idol');
  entrar.addEventListener('click', () => {
    if (!startGuardian(branchId)) { toast('La cámara no está abierta ahora mismo.'); openBranch(branchId); return; }
    renderMissionScreen();
    show('mission');
  });
  acts.appendChild(entrar);
  show('guardian');
}

/* ── Misión ── */
function renderMissionScreen() {
  const b = branchDef(mission.branchId);
  const meta = STRATA_META[mission.stratumId];
  $('#mission-title').innerHTML =
      mission.kind === 'bazar'    ? `${ico('basket')} Encargo: ${esc(meta.name)}`
    : mission.kind === 'guardian' ? `${ico('idol')} Cámara del Guardián · ${esc(b.name)}`
    : `<span class="mh-site">${esc(b.icon)} ${esc(b.name)}</span>
       <span class="mh-sep"></span>
       ${ico(ICO_ESTRATO[mission.stratumId])} ${esc(meta.label)}`;
  renderQuestion();
}
function renderProgressDots() {
  const total = mission.questions.length;
  $('#mission-progress').innerHTML = Array.from({ length: total }, (_, i) => {
    let cls = 'qdot';
    if (i < mission.resolved.length) cls += mission.resolved[i] ? ' qdot-ok' : ' qdot-fail';
    else if (i === mission.index) cls += ' qdot-current';
    return `<span class="${cls}"></span>`;
  }).join('');
  pintarRacha();
}

/* ── La racha ──
   El motor lleva la cuenta de los aciertos seguidos desde siempre y el niño no
   veía nada: seis puntitos que cambian de color y punto. Tres seguidos es el
   momento en que empieza a haber algo que perder, y a partir de ahí es lo que
   sostiene la atención hasta el final de la expedición.

   Aparece en el tres, no antes: felicitar por uno convierte el aviso en ruido
   y a los dos días no lo mira nadie. Y NO castiga al fallar —simplemente
   desaparece— porque en esta app el error no penaliza, y una racha que se
   rompe con estruendo es exactamente eso. */
const RACHA_MINIMA = 3;
function rachaActual() {
  let n = 0;
  for (let i = (mission.resolved || []).length - 1; i >= 0; i--) {
    if (!mission.resolved[i]) break;
    n++;
  }
  return n;
}
function pintarRacha() {
  const el = $('#mission-racha');
  if (!el) return;
  const n = rachaActual();
  if (n < RACHA_MINIMA) { el.classList.add('hidden'); el.dataset.n = ''; return; }
  const nuevo = el.dataset.n !== String(n);
  el.innerHTML = `<span class="racha-llama" aria-hidden="true">🔥</span> ${n}`
    + `<span class="racha-texto"> seguidos</span>`;
  el.classList.remove('hidden');
  el.dataset.n = String(n);
  /* Solo late cuando el número CAMBIA: repintar la pantalla no es un logro. */
  if (nuevo && !menosMovimiento()) {
    el.classList.remove('racha-late'); void el.offsetWidth; el.classList.add('racha-late');
  }
}
function renderQuestion() {
  renderProgressDots();
  $('#feedback-card').classList.add('hidden');
  $('#question-card').classList.remove('hidden');
  $('#kira-box').classList.add('hidden');
  const q = mission.current;
  $('#question-text').textContent = q.question;
  const optionsEl = $('#options');
  optionsEl.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option';
    /* La letra la pinta el CSS desde aquí: así se puede nombrar la opción en
       voz alta («la C») y todos los textos arrancan en la misma columna. */
    btn.dataset.letra = 'ABCD'[i];
    btn.textContent = opt;
    btn.addEventListener('click', () => onAnswer(i, btn));
    optionsEl.appendChild(btn);
  });
  $('#btn-hint').disabled = false;
  $('#btn-hint').innerHTML = ico('beetle') + ' Pista de Kira';
  /* Cada reto empieza en silencio: si el anterior seguía sonando, se corta.
     Se ofrece escuchar, no se impone: leerlo solo también es practicar. */
  vozParar();
  aplicarVoz();
}

function onAnswer(index, btn) {
  vozParar();
  $$('.option').forEach(o => o.disabled = true);
  const wasRestoring = mission.restoring;
  const res = answerQuestion(index);
  btn.classList.add(res.correct ? 'option-correct' : 'option-wrong');
  if (!res.correct) {
    const correctBtn = $$('.option')[mission.current.answer];
    if (correctBtn) correctBtn.classList.add('option-reveal');
  }
  renderHud();

  programarFeedback(() => {
    if (wasRestoring) {
      const coins = completeRestore(res.correct);
      showFeedback(res, { restored: res.correct, restoreCoins: coins });
    } else {
      showFeedback(res, {});
    }
  }, 700);
}

/* ── Los personajes se ven, no solo se nombran ──
   Tobías y Kira salían nombrados en el texto —«Tobías te mira con cara de yo
   también me equivoco»— y no aparecían por ninguna parte. Un compañero al que
   solo se le cita no acompaña a nadie: sale su cara, y quien habla se sabe.

   Y sí, importa cuál sale. El de acertar celebra; el de fallar acompaña. Un
   niño de ocho años que se equivoca no necesita un aspaviento, necesita ver
   que alguien sigue ahí. */
const ANIMOS_BIEN = [
  { quien: '🪲', texto: '¡Hallazgo descubierto!' },
  { quien: '⛏️', texto: '¡Excavación perfecta!' },
  { quien: '🪲', texto: '¡Kira aplaude con las antenas!' },
  { quien: '🐕', texto: '¡Tobías ladra de alegría!' }
];
const ANIMOS_MAL = [
  { quien: '🧔🏻‍♂️', texto: '¡Trampa! Bruno ya había caído en esa misma…' },
  { quien: '🧔🏻‍♂️', texto: '¡Zas! Una reja… y Bruno dentro, contando chistes.' },
  { quien: '🐕', texto: 'La losa se hundió. Tobías te mira con cara de «yo también me equivoco».' }
];
function ponerTitulo(animo) {
  const el = $('#feedback-title');
  const a = (animo && animo.texto) ? animo : { quien: '', texto: String(animo || '') };
  el.innerHTML = (a.quien ? `<span class="feedback-quien" aria-hidden="true">${esc(a.quien)}</span>` : '')
    + esc(a.texto);
}

function showFeedback(res, extra) {
  renderProgressDots(); /* el punto del reto recién resuelto ya refleja el resultado */
  $('#question-card').classList.add('hidden');
  const card = $('#feedback-card');
  card.classList.remove('hidden');
  const btnRestore = $('#btn-restore');
  btnRestore.classList.add('hidden');
  /* Al fallar, lo que hay que leer es la explicación, no el titular. Era el
     texto más pequeño y más gris de la pantalla, justo al revés. */
  card.classList.toggle('feedback-ensena', !res.correct && !extra.restored);

  if (extra.restored) {
    selloFeedback('wrench', 'logro');
    $('#feedback-title').textContent = '¡Hallazgo restaurado!';
    $('#feedback-explain').textContent = extra.restoreCoins
      ? `Corregiste tu propio error. +${extra.restoreCoins} doblones por restaurar el hallazgo.`
      : 'Corregiste tu propio error. (Ya usaste las 5 restauraciones con premio de hoy.)';
  } else if (res.correct) {
    selloFeedback('check', 'bien');
    ponerTitulo(pick(ANIMOS_BIEN));
    $('#feedback-explain').textContent = res.explanation;
  } else {
    selloFeedback('cross', 'mal');
    ponerTitulo(pick(ANIMOS_MAL));
    $('#feedback-explain').textContent = res.explanation;
    /* ofrecer restauración del hallazgo (metacognición) */
    if (!mission.restoring) {
      btnRestore.classList.remove('hidden');
      btnRestore.textContent = S.daily.restores_today < ECO().restoresPerDay
        ? 'Restaurar hallazgo (+5 doblones)'
        : 'Restaurar hallazgo (sin premio hoy)';
    }
  }
  $('#btn-next').textContent = mission.index >= mission.questions.length - 1 ? 'Terminar excavación' : 'Continuar →';
}

function onNext() {
  const next = advance();
  if (next) renderQuestion();
  else {
    const result = finishMission();
    renderResult(result);
    show('result');
  }
}

function onRestore() {
  restoreQuestion();
  $('#feedback-card').classList.add('hidden');
  $('#question-card').classList.remove('hidden');
  renderQuestion();
  toast('Kira: «Mismo tesoro, nuevo intento. ¡Tú puedes!» 🪲');
}

function onHint() {
  const h = requestHint();
  if (!h.ok) {
    toast(h.reason === 'no-coins' ? 'No tienes Doblones para otra pista (cuesta 10).' : 'Kira ya no tiene más pistas: ¡confía en tu pala!');
    return;
  }
  $('#kira-box').classList.remove('hidden');
  $('#kira-text').textContent = h.text + (h.cost ? ` (−${h.cost} doblones)` : '');
  if (mission.hintsShown >= 2) { $('#btn-hint').disabled = true; }
  else { $('#btn-hint').innerHTML = `${ico('beetle')} Otra pista (${ECO().hintCost} ${ico('coin')})`; }
  renderHud();
}

/* ── Resultado ── */
function renderResult(r) {
  if (r.kind === 'guardian') return renderGuardianResult(r);
  const meta = STRATA_META[r.stratumId];
  const good = r.accuracy >= 0.7;
  /* Sello de expedición en vez de un emoji gigante: el premio se estampa. */
  sello(r.nowMastered ? 'medal' : good ? 'star' : 'compass', r.nowMastered || good);
  $('#result-title').textContent = r.nowMastered
    ? `¡Estrato «${meta.name}» dominado!`
    : r.kind === 'bazar' ? 'Encargo completado' : 'Excavación terminada';

  const rewards = $('#result-rewards');
  rewards.innerHTML = `
    <div class="reward-row"><span>Aciertos a la primera</span><strong>${r.firstTryCorrect}/${r.total}</strong></div>
    <div class="reward-row"><span>${ico('star')} Puntos de Expedición</span><strong data-contar="${r.pe}">+${r.pe}</strong></div>
    <div class="reward-row"><span>${ico('coin')} Doblones</span><strong data-contar="${r.coins}">+${r.coins}</strong></div>
    ${r.restored ? `<div class="reward-row"><span>${ico('vessel')} Hallazgos restaurados</span><strong>${r.restored}</strong></div>` : ''}
    ${r.notes.map(n => `<div class="reward-note">${n}</div>`).join('')}
    ${r.leveledUp ? `<div class="reward-levelup">🎉 ¡Has subido al nivel ${r.newLevel}! Ahora eres ${rankForLevel(r.newLevel).name}.</div>` : ''}
    ${r.nowMastered ? `<div class="reward-levelup">🗺️ ¡El mapa del Atlas se dibuja un poco más!</div>` : ''}
    ${r.reabreGuardian ? `<div class="reward-levelup">🗿 La Cámara del Guardián vuelve a estar abierta.</div>` : ''}`;

  /* Los números suben, y las filas entran una detrás de otra. */
  rewards.querySelectorAll('[data-contar]').forEach(el => contarHasta(el, el.dataset.contar, '+'));
  escalonar([...rewards.children]);

  const dialog = $('#result-dialog');
  let brunoSays;
  if (r.nowMastered) {
    /* Prometer «ya está desbloqueado» cuando aún falta la confirmación es
       mentirle al niño en la única pantalla que lee con atención. */
    const stR = getStratum(r.branchId, r.stratumId);
    brunoSays = (stR.altas || 0) >= 2
      ? '«¡Extraordinario! Ni yo lo habría hecho mejor… bueno, yo me habría caído en tres trampas. El estrato de abajo ya está desbloqueado.»'
      : '«¡Extraordinario! Ni yo lo habría hecho mejor. Repítelo una vez más y abrimos el estrato de abajo: en arqueología, un hallazgo se confirma antes de anunciarlo.»';
  }
  else if (good) brunoSays = '«¡Buen trabajo, aprendiz! Cada acierto dibuja el mundo. Yo una vez confundí un mapa con una servilleta.»';
  else if (r.reabreGuardian) brunoSays = '«¡Repaso hecho! El Guardián ya no tiene excusa: su cámara vuelve a estar abierta para ti.»';
  else if (r.restored > 0) brunoSays = '«¿Sabes qué distingue a un gran explorador? Que vuelve a mirar donde se equivocó. ¡Y tú lo has hecho!»';
  else brunoSays = '«Tranquilo, en esa trampa caí yo dos veces… el mismo día. Mañana esa cámara seguirá ahí esperándote.»';
  dialog.innerHTML = `<span class="dialog-avatar">🧔🏻‍♂️</span>
    <div class="dialog-text"><strong>Prof. Bruno Ocaña</strong><p>${brunoSays}</p></div>`;
  renderHud();
}

/* Estampa el sello del resultado. `logrado` distingue el latón encendido
   de la versión apagada, para que ganar y no ganar no se vean igual. */
function sello(nombre, logrado) {
  const el = $('#result-emoji');
  el.className = 'sello' + (logrado ? ' sello-logro' : '');
  el.innerHTML = ico(nombre, 'ico-lg');
}

/* Sello del aviso que aparece justo después de responder. `tono` decide el
   color: bien, mal o logro. */
function selloFeedback(nombre, tono) {
  const el = $('#feedback-icon');
  el.className = 'sello sello-' + tono;
  el.innerHTML = ico(nombre, 'ico-lg');
}

/* ── Resultado de la Cámara del Guardián ──
   Ganar da un fragmento del Atlas; perder no quita nada. Lo que sí hace el
   Guardián en las dos es decir DÓNDE se falló: una evaluación que no explica
   el error no sirve de nada a un niño de nueve años. */
function renderGuardianResult(r) {
  const b = branchDef(r.branchId);
  sello(r.superada ? 'map' : 'idol', r.superada);
  $('#result-title').textContent = r.superada
    ? '¡Fragmento del Atlas recuperado!'
    : 'El Guardián no te deja pasar… todavía';

  /* Reparto de fallos por estrato: el mapa del error, no solo la nota */
  const desglose = (r.strata || []).map(sId => {
    const meta = STRATA_META[sId];
    const err = r.errorsByStratum[sId] || 0;
    return `<div class="reward-row"><span>${ico(ICO_ESTRATO[sId])} ${meta.label}</span>
      <strong>${err ? err + (err === 1 ? ' fallo' : ' fallos') : 'sin fallos'}</strong></div>`;
  }).join('');

  $('#result-rewards').innerHTML = `
    <div class="reward-row"><span>Aciertos a la primera</span>
      <strong>${r.firstTryCorrect}/${r.total} (${Math.round(r.accuracy * 100)}%)</strong></div>
    <div class="reward-row"><span>Hacía falta</span><strong>${Math.round(r.umbral * 100)}%</strong></div>
    ${desglose}
    ${r.pe ? `<div class="reward-row"><span>${ico('star')} Puntos de Expedición</span><strong>+${r.pe}</strong></div>` : ''}
    ${r.coins ? `<div class="reward-row"><span>${ico('coin')} Doblones</span><strong>+${r.coins}</strong></div>` : ''}
    ${r.restored ? `<div class="reward-row"><span>${ico('vessel')} Hallazgos restaurados</span><strong>${r.restored}</strong></div>` : ''}
    ${r.leveledUp ? `<div class="reward-levelup">🎉 ¡Has subido al nivel ${r.newLevel}! Ahora eres ${rankForLevel(r.newLevel).name}.</div>` : ''}
    ${r.fragment ? `<div class="reward-levelup">${ico('map')} Llevas ${r.fragmentsTotal} fragmento(s) del Atlas de Ossian.</div>` : ''}
    ${!r.superada ? `<div class="reward-note">No has perdido nada: ni PE, ni Doblones, ni dominio.
      El Guardián quiere que repases <strong>${STRATA_META[r.weakStratum] ? STRATA_META[r.weakStratum].label : ''}</strong>
      en un Encargo del Bazar y vuelvas.</div>` : ''}`;

  const bruno = r.superada
    ? `«¡LO HAS HECHO! Mil años esperando y llega ${esc(S.profile.explorer_name)} y lo resuelve antes de merendar.
       Yo tardé tres expediciones… y en la primera me quedé encerrado dentro.»`
    : `«¡Uf! El Guardián ha dicho que no. A mí me dijo que no tantas veces que me aprendí su cara de memoria.
       Mira dónde has fallado, hazte un Encargo del Bazar y vuelve. Sigue estando todo tuyo: no has perdido ni un Doblón.»`;
  $('#result-dialog').innerHTML = `<span class="dialog-avatar">🧔🏻‍♂️</span>
    <div class="dialog-text"><strong>Prof. Bruno Ocaña</strong><p>${bruno}</p></div>`;
  renderHud();
}

/* ── Campamento y almacén ── */
function renderCamp() {
  renderTaller();
  renderHud();
  applyTextSize();
  $('#camp-avatar').innerHTML = avatarDelExplorador();
  const equipped = $('#camp-gear-equipped');
  equipped.innerHTML = S.inventory.gear_equipped.length
    ? S.inventory.gear_equipped.map(id => {
        const item = shopCatalog().find(i => i.id === id);
        return `<span class="gear-chip" title="${esc(item.name)}">${esc(item.icon)}</span>`;
      }).join('')
    : '<small>Aún sin equipo. ¡Visita el almacén!</small>';

  pintarEscenaDelCampamento();

  renderFund();

  const list = $('#shop-list');
  list.innerHTML = '';
  for (const item of shopCatalog()) {
    const owned = item.type !== 'treat' && (S.inventory.gear_owned.includes(item.id) || S.inventory.camp_items.includes(item.id));
    const equippedNow = S.inventory.gear_equipped.includes(item.id);
    const row = document.createElement('div');
    row.className = 'shop-item';
    row.innerHTML = `<span class="shop-icon">${esc(item.icon)}</span>
      <div class="shop-info"><strong>${esc(item.name)}</strong><small>${item.cost} ${ico('coin')}</small></div>`;
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary btn-small';
    if (owned && item.type === 'gear') {
      btn.textContent = equippedNow ? 'Quitar' : 'Ponérselo';
      btn.addEventListener('click', () => { toggleEquip(item.id); renderCamp(); });
    } else if (owned) {
      btn.textContent = 'En el campamento';
      btn.disabled = true;
    } else {
      btn.textContent = 'Comprar';
      btn.disabled = S.progression.doubloons_balance < item.cost;
      btn.addEventListener('click', () => {
        const res = buyItem(item.id);
        if (res.ok) {
          toast(item.type === 'treat' ? '¡Tobías da volteretas de alegría! 🐕' : `¡${item.name} conseguido! ${item.icon}`);
          renderCamp();
        } else {
          toast('No tienes Doblones suficientes.');
        }
      });
    }
    row.appendChild(btn);
    list.appendChild(row);
  }
}

/* ── Fondo de la Sociedad Geográfica ──
   El almacén se agota en tres o cuatro semanas; a partir de ahí los Doblones
   dejan de significar nada. El Fondo es un sumidero sin fondo y cooperativo:
   lo donado no vuelve, no da ninguna ventaja y los hitos son de la clase
   entera, no de quien más done (por eso no se muestra quién ha donado qué). */
function fundTotal() {
  const f = ATLAS_CONFIG.fund || {};
  const mio = (S.progression.fund_donated) || 0;
  /* El total de clase lo anota el docente leyendo todos los diarios, así que
     YA incluye lo de este niño: sumarle lo suyo lo contaría dos veces. Se coge
     el mayor de los dos, que además evita que la barra retroceda cuando el
     apunte del docente va por detrás de la realidad.
     Consecuencia que conviene tener presente: si el total de clase va por
     delante, una donación pequeña no mueve la barra. Lo que sí confirma
     siempre que ha llegado es el aviso al donar y la línea de «tú has
     aportado», que salen de la bolsa del propio niño. */
  return Math.max(Number(f.classTotal) || 0, mio);
}

function renderFund() {
  const f = ATLAS_CONFIG.fund || {};
  const block = $('#fund-block');
  if (!block) return;
  block.classList.toggle('hidden', !f.enabled);
  if (!f.enabled) return;

  $('#fund-title').textContent = '🌍 ' + (f.name || 'Fondo de la Sociedad Geográfica');
  $('#fund-blurb').textContent = f.blurb || '';

  const total = fundTotal();
  const { alcanzados, siguiente } = fundMilestoneFor(total);
  const desde = alcanzados.length ? alcanzados[alcanzados.length - 1].at : 0;
  const hasta = siguiente ? siguiente.at : desde;
  const pct = hasta > desde ? Math.min(100, Math.round((total - desde) / (hasta - desde) * 100)) : 100;

  $('#fund-progress').innerHTML = `
    <div class="fund-bar"><div class="fund-bar-fill" style="width:${pct}%"></div></div>
    <div class="fund-bar-legend">
      <strong>${total} ${ico('coin')}</strong> reunidos entre toda la clase
      ${siguiente ? `<span>· faltan <strong>${Math.max(0, hasta - total)}</strong> para ${esc(siguiente.icon)} ${esc(siguiente.name)}</span>` : ''}
    </div>`;

  const hitos = (f.milestones || []).concat(
    alcanzados.filter(m => !(f.milestones || []).some(x => x.at === m.at)));
  $('#fund-milestones').innerHTML = hitos.map(m => {
    const hecho = total >= m.at;
    return `<div class="fund-milestone ${hecho ? 'fund-done' : ''}">
      <span class="fund-icon">${hecho ? esc(m.icon) : ico('lock')}</span>
      <div><strong>${esc(m.name)}</strong><small>${hecho ? esc(m.desc) : `Se abre con ${m.at} ${ico('coin')} de la clase`}</small></div>
    </div>`;
  }).join('');

  const cont = $('#fund-buttons');
  cont.innerHTML = '';
  for (const n of (f.steps || [5, 10, 25, 50])) {
    const b = document.createElement('button');
    b.className = 'btn btn-secondary btn-small';
    b.innerHTML = `${n} ${ico('coin')}`;
    b.disabled = S.progression.doubloons_balance < n;
    b.addEventListener('click', () => {
      const res = donateToFund(n);
      if (!res.ok) { toast('No tienes Doblones suficientes.'); return; }
      const antes = fundMilestoneFor(total).alcanzados.length;
      const ahora = fundMilestoneFor(fundTotal()).alcanzados.length;
      toast(ahora > antes
        ? '¡Hito conseguido! La Sociedad se pone manos a la obra 🎉'
        : `¡Gracias! ${n} doblones para el Fondo.`);
      renderCamp();
    });
    cont.appendChild(b);
  }

  const mio = S.progression.fund_donated || 0;
  /* Va por innerHTML porque lleva el icono del doblón dentro. Con textContent
     el niño leía el `<svg viewBox=...>` entero en mitad de la frase. */
  $('#fund-mine').innerHTML = mio
    ? `Tú has aportado ${Number(mio) || 0} ${ico('coin')} al Fondo. Donar no da ninguna ventaja: es por las ruinas.`
    : 'Donar es voluntario y no da ninguna ventaja en las excavaciones.';
}

/* ══════════ TALLER DE CARTOGRAFÍA ══════════
   Lo que ve el niño: un formulario para inventar un reto y la lista de los
   suyos con en qué estado están. La parte deliberada es la marca de la
   respuesta correcta: se elige con un radio junto a cada opción, igual que en
   el banco del docente, para que sea imposible enviar un reto sin decir cuál
   es la buena. */
function renderTaller() {
  const caja = $('#taller-block');
  if (!caja) return;
  caja.classList.toggle('hidden', !tallerActivo());
  if (!tallerActivo()) return;

  const hechos = creacionesHoy();
  const tope = tallerConfig().perDay || 3;
  const quedan = Math.max(0, tope - hechos);

  $('#taller-estado').innerHTML = quedan
    ? `<span class="taller-quedan">Te ${quedan === 1 ? 'queda' : 'quedan'} <strong>${quedan}</strong>
       ${quedan === 1 ? 'acertijo' : 'acertijos'} por inventar hoy · ${tallerConfig().coinsSend || 15} ${ico('coin')} al enviarlo</span>`
    : `<span class="taller-quedan">Ya has inventado ${tope} hoy. ¡Mañana más!</span>`;
  $('#taller-form').classList.toggle('hidden', quedan === 0);

  /* Las cuatro opciones se pintan aquí para no repetirlas en el HTML */
  $('#taller-opciones').innerHTML = [0, 1, 2, 3].map(i => `
    <label class="taller-opcion">
      <input type="radio" name="taller-ok" value="${i}"${i === 0 ? ' checked' : ''}
             title="Marcar como la correcta">
      <input type="text" class="taller-op" data-i="${i}" maxlength="80"
             placeholder="Respuesta ${i + 1}${i === 0 ? ' (marcada como correcta)' : ''}">
    </label>`).join('');

  const mios = (S.creations || []).slice().reverse();
  $('#taller-mios').innerHTML = !mios.length ? '' : `
    <h4 class="taller-h4">Tus acertijos</h4>
    ${mios.map(c => {
      const tono = { aprobado: 'ok', devuelto: 'aviso', pendiente: 'nota' }[c.status] || 'nota';
      const etiqueta = { aprobado: '✓ En el mapa', devuelto: '↩ Para repasarlo',
                         pendiente: '⏳ Esperando al Prof. Ocaña' }[c.status] || c.status;
      return `<div class="taller-mio taller-${tono}">
        <div class="taller-mio-cabeza"><strong>${esc(c.question)}</strong>
          <span class="taller-tag">${etiqueta}</span></div>
        ${c.nota ? `<small class="taller-nota">Prof. Ocaña: «${esc(c.nota)}»</small>` : ''}
      </div>`;
    }).join('')}`;
}

const TALLER_MOTIVOS = {
  'cerrado': 'El taller está cerrado ahora mismo.',
  'tope': 'Ya has inventado todos los de hoy. ¡Mañana más!',
  'pregunta-corta': 'La pregunta es muy cortita. Escríbela entera, como si se la contaras a un compañero.',
  'faltan-opciones': 'Faltan respuestas: hacen falta las cuatro.',
  'opciones-repetidas': 'Hay dos respuestas iguales. Las cuatro tienen que ser distintas.',
  'sin-correcta': 'Marca cuál es la respuesta correcta.'
};

function wireTaller() {
  const form = $('#taller-form');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const opciones = [0, 1, 2, 3].map(i => ($(`.taller-op[data-i="${i}"]`) || {}).value || '');
    const marcada = document.querySelector('input[name="taller-ok"]:checked');
    const res = crearReto({
      question: $('#taller-q').value,
      options: opciones,
      answer: marcada ? Number(marcada.value) : -1,
      explanation: $('#taller-exp').value
    });
    const err = $('#taller-error');
    if (!res.ok) {
      err.textContent = TALLER_MOTIVOS[res.reason] || 'Algo no cuadra: revísalo.';
      err.classList.remove('hidden');
      return;
    }
    err.classList.add('hidden');
    $('#taller-q').value = ''; $('#taller-exp').value = '';
    toast(`¡Acertijo enviado! +${res.coins} doblones. El Prof. Ocaña lo leerá.`, 3600);
    renderCamp();
    renderHud();
  });
}

/* ── Bitácora ── */
function renderLogbook() {
  renderHud();
  const lb = S.logbook;
  $('#logbook-summary').innerHTML = `
    <div class="logbook-stat"><strong>${lb.stamps_lifetime}</strong><span>sellos ganados</span></div>
    <div class="logbook-stat"><strong>${lb.current_weeks}</strong><span>semanas seguidas</span></div>
    <div class="logbook-stat"><strong>${lb.active_days_this_week.length}/3</strong><span>días esta semana</span></div>
    <div class="logbook-stat"><strong>${(lb.free_rope_used_this_week ? 0 : 1) + lb.rescue_ropes}</strong><span>cuerdas de rescate</span></div>
    <div class="logbook-stat"><strong>${fragmentsRecovered()}</strong><span>fragmentos del Atlas</span></div>`;

  const stamps = $('#logbook-stamps');
  const history = lb.history.slice(-12);
  stamps.innerHTML = '<div class="stamps-route">' +
    history.map(h => `<span class="stamp ${h.stamped ? 'stamp-earned' : h.protected ? 'stamp-protected' : 'stamp-missed'}"
      title="${h.week_id}">${h.stamped ? '📍' : h.protected ? '🪢' : '·'}</span>`).join('<span class="route-line"></span>') +
    (history.length ? '<span class="route-line"></span>' : '') +
    `<span class="stamp stamp-current" title="Semana actual">${lb.active_days_this_week.length >= 3 ? '📍' : '⏳'}</span>` +
    '</div>';
}

/* ── Dashboard docente ── */
function renderDashboard() {
  renderHud();
  const acc = rollingAccuracy();
  const last7 = S.metrics.sessions_log.filter(e =>
    (new Date(todayStr()) - new Date(e.date)) / 86400000 < 7);
  const minutes7 = last7.reduce((a, e) => a + e.minutes, 0);
  const selfCorrRate = S.metrics.first_try_total
    ? S.metrics.self_corrections / Math.max(1, S.metrics.first_try_total - S.metrics.first_try_correct)
    : 0;

  const kpis = [
    { label: 'Tiempo de excavación (7 días)', value: `${minutes7} min`, note: 'Time-on-Task real, sin menús' },
    { label: 'Precisión móvil (últimas 10)', value: acc === null ? '—' : Math.round(acc * 100) + '%', note: flowZoneStatus() },
    { label: 'Dificultad adaptativa', value: `Nivel ${S.adaptive.tier}/5`, note: 'objetivo: 70–85% de acierto' },
    { label: 'Autocorrección', value: Math.round(selfCorrRate * 100) + '%', note: `${S.metrics.self_corrections} hallazgos restaurados` },
    { label: 'Días activos (semana)', value: S.logbook.active_days_this_week.length, note: `${S.logbook.stamps_lifetime} sellos en total` }
  ];
  renderCourse();
  $('#dashboard-kpis').innerHTML = kpis.map(k =>
    `<div class="kpi-card"><span class="kpi-value">${k.value}</span><span class="kpi-label">${k.label}</span><small>${k.note}</small></div>`).join('');

  /* mastery por estrato */
  let html = '';
  for (const branchId of playableBranchIds()) {
    const b = branchDef(branchId);
    html += `<div class="dash-branch"><h4>${esc(b.icon)} ${esc(b.name)}</h4><div class="dash-strata">`;
    for (const sId of STRATA_ORDER) {
      if (!stratumHasContent(b, sId)) continue;
      const st = getStratum(branchId, sId);
      const key = `${branchId}.${sId}`;
      const err = S.metrics.errors_by_skill[key];
      const errRate = err && err.attempts ? Math.round((err.errors / err.attempts) * 100) : null;
      /* El candado iba al final de la cifra y se leía como parte del dato;
         ahora acompaña a la etiqueta, que es de lo que informa. */
      /* Los dos números de esta fila NO miden lo mismo: el dominio son las
         últimas cuatro sesiones y el error es de todo el historial del pozo.
         Puestos juntos y sin decirlo, «90 % · err 45 %» parece una
         contradicción. Se dice, aquí y en la leyenda de abajo. */
      html += `<div class="dash-row" title="Dominio: últimas ${MASTERY_WINDOW} sesiones. Error: todo el historial de este estrato.">
        <span class="dash-row-label">${STRATA_META[sId].label}${st.status === 'locked' ? ' 🔒' : ''}</span>
        <div class="mastery-bar"><div class="mastery-fill${st.mastery >= 0.8 ? ' gold' : ''}" style="width:${Math.round(st.mastery * 100)}%"></div></div>
        <span class="dash-row-num">${Math.round(st.mastery * 100)}%${errRate !== null ? ` · err ${errRate}%` : ''}</span>
      </div>`;
    }
    html += '</div></div>';
  }
  if (html) {
    html += `<p class="dash-leyenda">El <strong>dominio</strong> es la media de las últimas
      ${MASTERY_WINDOW} sesiones de ese estrato: se mueve con lo reciente. El <strong>error</strong>
      es de todo su historial en él y no baja aunque mejore, así que sirve para ver de dónde
      viene, no cómo va hoy.</p>`;
  }
  /* ── Conceptos flojos de ESTE alumno ──
     El dominio por estrato dice cuánto; esto dice qué. Es lo que se mira
     antes de sentarse cinco minutos con un niño. */
  const flojos = typeof conceptosFlojos === 'function' ? conceptosFlojos(5) : [];
  if (flojos.length) {
    html += `<div class="dash-branch dash-conceptos">
      <h4>${ico('target')} Le está costando</h4>
      <p class="dash-leyenda">De sus últimos ${CONCEPTO_VENTANA} intentos en cada concepto: lo que
      le cuesta AHORA, no lo que le costó en octubre.</p>
      ${flojos.map(c => {
        const info = conceptoInfo(c.id);
        return `<div class="dash-row">
          <span class="dash-row-label">${esc(info.label)} <em>${esc(info.area)}</em></span>
          <div class="mastery-bar"><div class="mastery-fill" style="width:${Math.round(c.tasa * 100)}%"></div></div>
          <span class="dash-row-num">${c.errors}/${c.attempts} fallos</span>
        </div>`;
      }).join('')}
    </div>`;
  }

  $('#dashboard-mastery').innerHTML = html;

  /* señales */
  const signals = [];
  if (lowQualityFlag()) signals.push('⚠️ Muchas respuestas en <2 s: posible sesión de baja calidad (responder al azar). Revisar en persona, sin penalizar.');
  if (acc !== null && acc < 0.6) signals.push('⚠️ Precisión por debajo del canal de flujo: el motor ya bajó la dificultad; considerar repaso guiado.');
  if (isFatigued()) signals.push('ℹ️ Fatiga de expedición activa hoy: las misiones extra dan 50% de PE.');
  const decayed = [];
  for (const branchId of playableBranchIds()) {
    for (const sId of STRATA_ORDER) {
      if (!stratumHasContent(branchDef(branchId), sId)) continue;
      const st = getStratum(branchId, sId);
      if (st.status === 'mastered' && sandCover(st) > 0.3) decayed.push(`${esc(branchDef(branchId).name)} · ${STRATA_META[sId].label}`);
    }
  }
  if (decayed.length) signals.push(`🏜️ Estratos cubriéndose de arena (repaso recomendado): ${decayed.join(', ')}.`);
  if (!signals.length) signals.push('✅ Sin alertas: el alumno trabaja en su zona de flujo.');
  $('#dashboard-signals').innerHTML = signals.map(s => `<div class="signal-row">${s}</div>`).join('');
}

/* ── Cuadrilla de Excavación ── */
function renderTeam() {
  renderHud();
  const t = ATLAS_CONFIG.teams;
  const body = $('#team-body');

  if (!t || !t.enabled) {
    body.innerHTML = '<p class="empty-note">Las cuadrillas están desactivadas en esta clase.</p>';
    return;
  }
  const team = myTeam();
  if (!team) {
    body.innerHTML = `<div class="dialog bruno"><span class="dialog-avatar">🧔🏻‍♂️</span>
      <div class="dialog-text"><strong>Prof. Bruno Ocaña</strong>
      <p>«Todavía no te he asignado cuadrilla, ${esc(S.profile.explorer_name)}. ¡Paciencia!
      En cuanto lo haga, aparecerá aquí tu equipo.»</p></div></div>`;
    return;
  }

  const share = teamGoalShare();
  const mine = Math.round(S.progression.team_contribution);
  const pct = share ? Math.min(100, Math.round((mine / share) * 100)) : 0;
  const miRol = rolDe(S.profile.explorer_name, team);

  body.innerHTML = `
    <div class="team-banner">
      <span class="team-icon">${esc(team.icon)}</span>
      <div><h3>${esc(team.name)}</h3>
        <p>${(team.members || []).length} exploradores</p></div>
    </div>

    <div class="team-goal">
      <strong>${esc(t.goalLabel)}</strong>
      <p class="team-goal-note">Toda la clase excava hacia la misma meta. Cada Doblón que ganas
      aporta un poco, y <em>no se descuenta de tu bolsa</em>: cooperar no cuesta nada.</p>
      <div class="mastery-bar"><div class="mastery-fill${pct >= 100 ? ' gold' : ''}" style="width:${pct}%"></div></div>
      <div class="team-goal-nums"><span>Tu aportación: <strong>${mine} ${ico('coin')}</strong></span>
        <span>Tu parte de la meta: <strong>${share} ${ico('coin')}</strong></span></div>
    </div>

    ${miRol ? `<div class="team-rol-mio">
      ${avatarDeRol(miRol, 'rol-grande')}
      <div>
        <span class="team-rol-eti">Tu papel en la cuadrilla</span>
        <h3>${esc(miRol.personaje)}</h3>
        <p class="team-rol-que">${esc(miRol.rol)}</p>
        <p class="team-rol-desc">${esc(miRol.desc)}</p>
      </div>
    </div>` : ''}

    <h3>Tus compañeros de cuadrilla</h3>
    <div class="team-members">
      ${(team.members || []).map(m => {
        const me = m.trim().toLowerCase() === (S.profile.explorer_name || '').trim().toLowerCase();
        const r = rolDe(m, team);
        /* El nombre sale de la lista de clase, que el docente teclea y que
           viaja con los ajustes: escapado como todo lo demás. */
        return `<span class="team-member${me ? ' team-me' : ''}">${
          r ? avatarDeRol(r) : '<span class="rol-emoji" aria-hidden="true">🧒</span>'
        }<span class="team-member-quien">${esc(m)}${me ? ' (tú)' : ''}${
          r ? `<small>${esc(r.personaje.split(',')[0])}</small>` : ''}</span></span>`;
      }).join('')}
    </div>

    ${t.showComparison ? `<h3>Las demás cuadrillas</h3>
      <div class="team-others">${t.list.filter(x => x.id !== team.id).map(x =>
        `<div class="team-other"><span>${esc(x.icon)}</span> ${esc(x.name)}
         <small>${(x.members || []).length} exploradores</small></div>`).join('')}</div>` : ''}`;
}

/* ── Méritos de Campamento ── */
function meritStats() {
  const byId = {};
  let coins = 0;
  for (const e of S.behavior_log) {
    const b = ATLAS_CONFIG.behaviors.find(x => x.id === e.id);
    if (!b) continue; /* mérito retirado del catálogo por el docente */
    byId[e.id] = (byId[e.id] || 0) + 1;
    coins += b.coins;
  }
  return { total: S.behavior_log.length, coins, byId };
}

function renderMerits() {
  renderHud();
  const st = meritStats();
  const tri = S.course.trimesters[currentTrimesterIndex()];
  $('#merits-summary').innerHTML = `
    <div class="logbook-stat"><strong>${st.total}</strong><span>méritos ganados</span></div>
    <div class="logbook-stat"><strong>${st.coins}</strong><span>${ico('coin')} por comportamiento</span></div>
    <div class="logbook-stat"><strong>${tri.merits}</strong><span>este trimestre</span></div>`;

  /* lo conseguido hoy, con el tope a la vista */
  const today = todayStr();
  $('#merits-today').innerHTML = ATLAS_CONFIG.behaviors.map(b => {
    const n = S.behavior_log.filter(e => e.id === b.id && e.date === today).length;
    return `<div class="merit-row${n ? ' merit-earned' : ''}">
      <span class="merit-icon">${esc(b.icon)}</span>
      <div class="merit-info"><strong>${esc(b.name)}</strong><small>${b.coins} ${ico('coin')} · hasta ${b.perDay} al día</small></div>
      <span class="merit-count">${n ? '⭐'.repeat(Math.min(n, 5)) : '—'}</span>
    </div>`;
  }).join('');

  /* diario: agrupado por día, del más reciente al más antiguo */
  const days = {};
  for (const e of S.behavior_log) (days[e.date] = days[e.date] || []).push(e);
  const orderedDays = Object.keys(days).sort().reverse().slice(0, 7);
  $('#merits-history').innerHTML = orderedDays.length
    ? orderedDays.map(d => {
        const icons = days[d].map(e => {
          const b = ATLAS_CONFIG.behaviors.find(x => x.id === e.id);
          return b ? `<span title="${esc(b.name)}">${esc(b.icon)}</span>` : '';
        }).join('');
        return `<div class="history-day"><span class="history-date">${formatDay(d)}</span>
          <span class="history-icons">${icons}</span></div>`;
      }).join('')
    : '<p class="empty-note">Aún no hay méritos. ¡El Prof. Ocaña está observando! 🧔🏻‍♂️</p>';
}

function formatDay(d) {
  const today = todayStr();
  if (d === today) return 'Hoy';
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (d === yest) return 'Ayer';
  const [y, m, day] = d.split('-');
  return `${day}/${m}`;
}

/* El portal del docente está abierto en esta sesión. Lo abre UNA puerta y solo
   una —el PIN de la portada— y se cierra al salir de él. Antes lo abría también
   un portillo dentro de la pantalla de méritos del propio niño, y con él se
   abría todo lo demás. */
let teacherUnlocked = false;

/* ══════════ MIS CLASES ══════════
   Con varios docentes en el mismo despliegue, cada uno entra con su cuenta y
   ve solo sus clases. El aislamiento lo garantizan los permisos de Appwrite;
   esta pantalla es el camino para llegar a ellas. */

/* ── El curso por trimestres (cuaderno docente) ── */
function renderCourse() {
  const now = currentTrimesterIndex();
  const rows = ATLAS_CONFIG.course.trimesters.map((t, i) => {
    const c = S.course.trimesters[i];
    const state = i === now ? 'en curso' : (i < now ? 'cerrado' : 'por venir');
    return `<div class="tri-card${i === now ? ' tri-current' : ''}">
      <div class="tri-head"><strong>${esc(t.name)}</strong><span class="tri-state">${state}</span></div>
      <div class="tri-dates">${t.start.split('-').reverse().slice(0,2).join('/')} – ${t.end.split('-').reverse().slice(0,2).join('/')}</div>
      <div class="tri-stats">
        <span><strong>${c.strata}</strong> estratos</span>
        <span><strong>${c.pe}</strong> PE</span>
        <span><strong>${c.stamps}</strong> sellos</span>
        <span><strong>${c.merits}</strong> méritos</span>
      </div>
    </div>`;
  }).join('');
  $('#dashboard-course').innerHTML =
    `<p class="course-label">${esc(ATLAS_CONFIG.course.label)}</p><div class="tri-grid">${rows}</div>`;
}
