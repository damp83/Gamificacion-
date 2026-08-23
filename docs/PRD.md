# PRD — "EXPEDICIÓN ATLAS: Los Diarios Perdidos"
## Plataforma Educativa Gamificada de Aventura Arqueológica · Primaria (8–10 años)

**Versión:** 2.0 (re-skin narrativo de aventura + búsqueda de tesoros) · **Estado:** Listo para desarrollo

---

## 0. Contexto y Decisiones de Marco

| Variable | Valor |
|---|---|
| Público | 8–10 años (3º–5º primaria) |
| Materias | Currículo general: Matemáticas, Lengua, Naturales, Sociales |
| Género narrativo | Aventura arqueológica cómica + búsqueda de tesoros (estilo Tadeo Jones / Indiana Jones infantil) |
| Plataforma | PWA web + tablet. Sesiones de 10–20 min, aula y casa |
| Meta principal | **Motivación intrínseca y atención sostenida** |

**Nota de propiedad intelectual:** el diseño reproduce los *tropos del género* (explorador torpe y noble, templo con trampas, mapa que se dibuja solo, saqueadores rivales, sidekick parlanchín) con personajes 100% originales. Ninguna referencia visual, nominal o musical a franquicias existentes. Esto evita bloqueos legales en producción y permite construir marca propia.

### 0.1 Por qué este género es pedagógicamente superior a la fantasía genérica

| Tropo del género | Función instruccional real |
|---|---|
| Excavar por estratos | Metáfora directa de la profundidad cognitiva (Bloom 1 = superficie, Bloom 6 = cámara del tesoro) |
| Diario/bitácora del explorador | Registro metacognitivo: el niño documenta lo que aprende |
| Mapa que se completa | Visualización de progreso curricular sin barras abstractas |
| Descifrar jeroglíficos y acertijos | El reto ES el contenido: no hay "capa de juego" pegada encima |
| Museo personal de hallazgos | Portafolio de logros pedagógicos, visible y presumible |
| Rival saqueador | Antagonista externo (nunca un compañero) que canaliza la competición fuera del aula |

### 0.2 Restricciones éticas no negociables
1. Sin compras reales ni economía convertible a dinero (COPPA / GDPR-K).
2. Cofres siempre con contenido declarado y solo cosmético — nunca ventaja pedagógica.
3. Sin ranking público con nombres de niños. La competición se dirige contra NPC (los saqueadores), no entre alumnos.
4. Nada se pierde nunca por ausentarse. El rival **jamás roba progreso real** del niño.
5. Tono cómico obligatorio en el fracaso: caerse en una trampa es gracioso, no humillante.

---

## 1. Universo Narrativo

### 1.1 Premisa

La **Sociedad Geográfica de los Diarios Perdidos** lleva un siglo buscando el Atlas de Ossian: un mapa que reúne todo el saber del mundo, roto en fragmentos y escondido en ruinas de los cinco continentes. El alumno ingresa como **Explorador Aprendiz**. Cada conocimiento que domina de verdad recupera un fragmento del Atlas y dibuja una porción nueva del mapa mundial.

**Regla de oro narrativa:** el mapa solo se dibuja con aprendizaje demostrado. El progreso académico ES la historia.

### 1.2 Elenco (original)

| Personaje | Rol | Función de diseño |
|---|---|---|
| **Prof. Bruno Ocaña** | Mentor arqueólogo entrañablemente torpe: se cae en todas las trampas, pierde las gafas, confunde los mapas | Modela el **error sin vergüenza**. Cuando el niño falla, Bruno ya había fallado antes y peor. Reduce ansiedad de rendimiento |
| **Kira** | Escarabajo-autómata de latón, sarcástica, traductora de jeroglíficos | Sidekick permanente = andamiaje adaptativo con voz. Da pistas graduadas, nunca la respuesta |
| **Tobías** | Perro de la expedición, olfato para el tesoro, cero cerebro | Comic relief + señalizador visual de misiones cercanas |
| **Vera Kovak & los Saqueadores del Cuervo** | Rival elegante que quiere vender los tesoros a coleccionistas | Antagonista externo. Crea urgencia sin culpar al alumno. Sus "victorias" solo retrasan hallazgos opcionales |
| **Guardianes de piedra** | Autómatas centinelas de cada templo | Jefes = evaluación sumativa con cara |

### 1.3 Geografía curricular: los Yacimientos

| Yacimiento | Materia | Ambientación |
|---|---|---|
| **Ruinas de Kaldros** | Matemáticas | Templo de engranajes, relojes y bóvedas numéricas |
| **Biblioteca de Arena** | Lengua y Literatura | Ciudad enterrada de bibliotecas y jeroglíficos |
| **Valle Fósil** | Ciencias Naturales | Selva, volcán y esqueletos gigantes |
| **Puerto de las Mil Banderas** | Ciencias Sociales | Puerto histórico con barcos de todas las épocas |
| **Campamento Base** | Transversal / Crear | Tienda, taller de cartografía y **Museo personal** |

---

## 2. ENTREGABLE A — Economía y Progresión (Core Loop)

### 2.1 Core Loop (3–5 min)

```
  ┌──────────────────────────────────────────────────────────┐
  │ 1. ELEGIR yacimiento en el mapa (autonomía)              │
  │ 2. EXCAVAR: reto de aprendizaje adaptado (Kira asiste)   │
  │ 3. HALLAZGO: feedback inmediato + explicación del error  │
  │ 4. BOTÍN: Puntos de Expedición (PE) + Doblones           │
  │ 5. INVERTIR: equipo del explorador / Museo / Campamento  │
  │ 6. EL MAPA SE DIBUJA un poco más → volver a 1            │
  └──────────────────────────────────────────────────────────┘
```

Bucle largo (semanal): completar un yacimiento → **Cámara del Guardián** (jefe) → fragmento del Atlas → se abre un continente nuevo.

### 2.2 Doble moneda

| Moneda | Naturaleza | Se gana por | Se gasta en |
|---|---|---|---|
| **Puntos de Expedición (PE)** | XP. No gastable. Sube el Rango | Aprendizaje demostrado | Nada: solo rango y reputación |
| **Doblones 🪙** | Moneda blanda | Actividad, hábito, cooperación | Equipo cosmético, museo, utilidades |

Separación estricta: el niño nunca "gasta" su progreso académico. El Rango sigue siendo un indicador limpio para el docente.

### 2.3 Rangos de Explorador (identidad por nivel)

| Rango | Niveles | Desbloquea |
|---|---|---|
| Aprendiz de Mochila | 1–4 | Yacimiento inicial, Kira |
| Rastreador | 5–9 | Encargos del Bazar, primer cofre |
| Cartógrafo | 10–17 | Taller de Cartografía (crear misiones) |
| Arqueólogo | 18–29 | Museo personal público para la clase |
| Leyenda del Atlas | 30+ | Título, skin de mapa dorado, expediciones legendarias |

### 2.4 Fuentes (Sources) de Doblones

| Fuente | Cantidad | Tope diario | Racional |
|---|---|---|---|
| Expedición (misión principal) | 20–40 🪙 | sin tope | Comportamiento deseado |
| Encargo del Bazar (refuerzo) | 10–15 🪙 | 4/día | Refuerzo sí, grinding no |
| Primer desembarco del día | 15 🪙 | 1/día | Hábito de retorno |
| Sello semanal de bitácora | 50 🪙 | 1/semana | Constancia sin obsesión diaria |
| Rescate de compañero (coop) | 10 🪙 ambos | 3/día | Prosocial |
| Cámara del Guardián superada | 100 🪙 | — | Hito sumativo |
| **Restaurar un hallazgo roto** (corregir error propio) | 5 🪙 | 5/día | Premia metacognición |
| Adelantarse a los Saqueadores (evento semanal) | 30 🪙 | 1/semana | Urgencia sin castigo |

Ingreso medio objetivo: **90–130 🪙/día activo**.

### 2.5 Sumideros (Sinks)

| Sumidero | Coste | Tipo |
|---|---|---|
| Equipo del explorador (sombrero, chaqueta, mochila, botas) | 50–300 🪙 | Recurrente, catálogo rotatorio |
| Vitrinas y decoración del **Museo personal** | 80–400 🪙 | Recurrente — sink emocional principal |
| Mejoras del Campamento Base (tienda, hoguera, jeep) | 100–500 🪙 | Recurrente |
| Golosina para Tobías (animación cosmética) | 30 🪙 | Diario pequeño |
| **Cuerda de rescate** (protector de bitácora) | 150 🪙 | Utilidad, máx. 2 |
| Pista de Kira adicional (tras intentarlo) | 10 🪙 | Utilidad con fricción deliberada |
| Reliquia de temporada (evento) | 200–500 🪙 | Escasez suave |
| **Fondo de la Sociedad Geográfica** (meta de clase) | libre | Sink infinito, cooperativo |

Capacidad de gasto ≈ **110% del ingreso** → deseo constante sin frustración. El Fondo de la Sociedad absorbe la inflación de los veteranos.

### 2.6 Curva de progresión

```
PE_total(n) = 100 × n^1.55
ΔPE(n)      = 100 × [(n+1)^1.55 − n^1.55]
```

| Rango/Nivel | PE acumulados | Δ | Tiempo estimado |
|---|---|---|---|
| 2 | 293 | 293 | 1–2 días |
| 5 | 1 211 | ~350 | 1ª semana |
| 10 | 3 548 | ~500 | ~3 semanas |
| 20 | 10 390 | ~750 | ~2 meses |
| 40 | 30 400 | ~1 100 | curso completo |

Exponente 1.55 (frente al 2.0 clásico de RPG): a los 9 años la barra debe moverse **en cada sesión**.

### 2.7 Anti-grinding

1. **"Este yacimiento ya está excavado":** repetir contenido con mastery ≥90% da el 10% de PE. El tesoro está siempre en la frontera de aprendizaje.
2. **Fatiga de expedición:** desde la 6ª misión diaria, PE al 50% y Bruno propone acampar ("mañana seguimos, que Tobías tiene hambre").
3. **PE por primer acierto**, no por intento: responder al azar no genera economía.
4. **Auditoría silenciosa:** respuestas sistemáticas <2 s marcan sesión de baja calidad en el dashboard docente, sin penalizar al niño.

### 2.8 Retención (White Hat)

**Bitácora de Expedición (racha semanal, no diaria):**
- Unidad = semana con ≥3 días activos. Cada semana cumplida estampa un **sello** y traza una ruta nueva en el diario.
- Los sellos **nunca se borran**: romper la racha solo deja un tramo de ruta sin dibujar, jamás resetea a cero.

**Cuerdas de rescate (congeladores):** 1 automática gratis por semana; extras a 150 🪙 (máx. 2). El docente puede pausar la bitácora de toda la clase.

**Vidas/energía: NO.** Bloquear el acceso justo tras fallar es contrapedagógico. La contención viene de la fatiga narrativa (§2.7.2), no del castigo.

**Recompensas variables éticas:**
- **Cofre del Naufragio** diario: cosmético o Doblones, con tabla de botín pública y visible.
- **Fragmentos del Atlas:** al dominar una rama completa aparece un fragmento con variante cosmética semi-aleatoria → coleccionismo anclado a mastery real.
- Máximo ~1 sorpresa por sesión: curiosidad, no compulsión.

### 2.9 Mecánica de rival (uso controlado de la tensión)

Los Saqueadores del Cuervo avanzan hacia un tesoro **opcional** cada semana. Reglas de seguridad emocional:
- Nunca roban PE, Doblones, sellos ni hallazgos ya obtenidos del alumno.
- La carrera es **de clase contra NPC**, no de niño contra niño.
- Si ganan, se llevan una reliquia cosmética recuperable más adelante, y Bruno lo comenta con humor ("bueno, al menos no se llevaron mi bocadillo").
- Se puede desactivar por completo desde el panel docente para grupos con perfil ansioso.

---

## 3. ENTREGABLE B — Diseño Instruccional y Narrativa

### 3.1 Árbol de habilidades = **Corte estratigráfico de excavación**

Cada rama de contenido es un pozo de excavación. Cuanto más profundo se cava, más alto es el nivel de Bloom. La metáfora es literal y comprensible a los 8 años: *"lo fácil está en la superficie; el tesoro de verdad está abajo"*.

Ejemplo — pozo "Fracciones" (Ruinas de Kaldros):

```
 SUPERFICIE
 ═══════════════════════════════════════════════════════════
 ESTRATO 1 · RECORDAR      🧱 "Fragmentos de cerámica"
   Identificar ½, ⅓, ¼ y su vocabulario
 ───────────────────────────────────────────────────────────
 ESTRATO 2 · COMPRENDER    🏺 "Vasijas emparejadas"
   Unir fracción ↔ dibujo ↔ situación cotidiana
 ───────────────────────────────────────────────────────────
 ESTRATO 3 · APLICAR       ⚖️ "La balanza del mercader"
   Repartir cargamentos y raciones de la expedición
 ───────────────────────────────────────────────────────────
 ESTRATO 4 · ANALIZAR      🔍 "El plano falsificado"
   Encontrar el error en el reparto de Vera Kovak
 ───────────────────────────────────────────────────────────
 ESTRATO 5 · EVALUAR       ⚱️ "El juicio del Guardián"
   ¿Qué reparto es más justo? Justificar ante Kira
 ═══════════════════════════════════════════════════════════
 ESTRATO 6 · CREAR    💎 CÁMARA DEL TESORO
   Diseñar un acertijo de fracciones para otra clase
```

Reglas:
- **Desbloqueo por prerrequisito cognitivo:** mastery ≥80% del estrato superior, no por nivel de jugador.
- **Erosión suave (mastery decay):** los estratos se "cubren de arena" con el tiempo; los Encargos del Bazar los redescubren → repaso espaciado con excusa narrativa perfecta.
- La cima social del sistema es **crear y evaluar**: solo los Cartógrafos exhiben piezas en el Museo.

### 3.2 Tipología de misiones

| Tipo | Nombre en juego | Rol pedagógico | Duración | Recompensa |
|---|---|---|---|---|
| Principal | **Expedición** | Contenido core nuevo | 5–8 min | PE alto + 🪙 |
| Secundaria | **Encargo del Bazar** | Refuerzo y repaso espaciado | 3–5 min | 🪙 + poco PE (máx. 4/día) |
| Jefe | **Cámara del Guardián** | Evaluación sumativa de la rama | 10–15 min | Fragmento del Atlas + 100 🪙 |
| Cooperativa | **Gran Excavación de Clase** | Meta colectiva del docente | Semanal | Reliquia común para el aula |
| Creación | **Taller de Cartografía** | Producción libre (Bloom 6) | Libre | Pieza en el Museo + insignia |
| Evento | **Carrera del Cuervo** | Repaso mixto con urgencia | Semanal | 30 🪙 + reliquia de temporada |

**Diseño de la Cámara del Guardián** (evaluación con ansiedad minimizada):
1. **Antesala — "Preparar la mochila":** Kira lista qué estratos conviene repasar. *Esto es estudiar para el examen sin llamarlo examen.*
2. **Sala de trampas:** 8–12 retos encadenados de toda la rama, dificultad creciente.
3. **Fallar es cómico y gratuito:** cae una reja, Bruno se queda encerrado diciendo tonterías, Tobías ladra. No se pierde nada. El Guardián revela **qué tipo de error** se cometió.
4. **Remediación obligatoria pero corta:** reintento tras 1 Encargo del Bazar del área fallada.
5. El resultado alimenta el mastery real que ve el docente.

### 3.3 Identidad y personalización

- **Avatar explorador:** editor inclusivo (tonos de piel, pelo, gafas, sillas de ruedas, hiyab, prótesis) + equipo cosmético (sombrero, chaqueta, mochila, cantimplora, linterna). Nada estético afecta al rendimiento.
- **Campamento Base:** tienda, hoguera, jeep, tendedero de mapas. Espacio de propiedad (CD4).
- **Museo personal:** vitrina donde se exponen los hallazgos ganados con mastery real. Es el **portafolio pedagógico disfrazado de trofeo**; visible para familia y clase con permiso.
- **Títulos:** ganados, jamás comprados — "Cartógrafo de Kaldros", "Descifrador de la Biblioteca de Arena", "Explorador Constante" (8 sellos de bitácora).

### 3.4 Insignias = **Hallazgos del Museo**

Cada pieza del museo certifica un logro pedagógico verificable. Ninguna se otorga por métricas vacías de actividad.

| Hallazgo | Criterio pedagógico real |
|---|---|
| 🔍 **Lupa de Ocaña** | Restaurar 10 hallazgos rotos = corregir 10 errores propios usando la explicación |
| 🗺️ **Pluma del Cartógrafo** | Crear 3 acertijos que otros compañeros resuelvan (Bloom 6) |
| 🌿 **Sello de Arena** | Mantener mastery ≥80% en 5 estratos durante 4 semanas (retención real) |
| 🤝 **Cuerda Compartida** | 5 rescates a compañeros en Grandes Excavaciones |
| ⚖️ **Balanza del Guardián** | 5 retos de nivel Evaluar superados con justificación escrita |
| 🏆 **Fragmento del Atlas** | Cámara del Guardián superada a la primera |
| 🐦‍⬛ **Pluma de Cuervo** | Adelantarse a los Saqueadores 3 semanas seguidas |

---

## 4. Marcos teóricos aplicados al re-skin

### 4.1 MDA

| Mecánica | Dinámica | Estética |
|---|---|---|
| El mapa solo se dibuja con mastery | Exploración autodirigida del currículo | **Descubrimiento** |
| Excavación por estratos | Escalada cognitiva voluntaria hacia Bloom 6 | **Desafío** |
| Museo personal | Coleccionismo de logros reales, presumir en clase | **Expresión** + **Propiedad** |
| Bruno falla siempre primero | Normalización del error, reintento sin miedo | **Comedia** (baja ansiedad) |
| Saqueadores rivales | Urgencia externa, cohesión de grupo | **Narrativa** + **Compañerismo** |
| Grandes Excavaciones de clase | Ayuda entre pares con meta común | **Compañerismo** |

### 4.2 Octalysis (perfil 8–10 años, White Hat dominante)

| Core Drive | Peso | Implementación en Expedición Atlas |
|---|---|---|
| CD1 Significado Épico | ●●●●● | Recuperar el Atlas de Ossian: cada acierto dibuja el mundo |
| CD2 Logro y Desarrollo | ●●●● | Rangos, fragmentos, hallazgos del museo |
| CD3 Creatividad y Feedback | ●●●●● | Taller de Cartografía: crear acertijos y mapas propios |
| CD4 Propiedad | ●●●● | Avatar, Campamento Base, Museo personal |
| CD5 Influencia Social | ●●○ | Solo cooperativo + rivalidad canalizada hacia NPC |
| CD6 Escasez | ●○ | Reliquias de temporada, sin FOMO agresivo |
| CD7 Imprevisibilidad | ●●○ | Cofre del Naufragio con tabla pública; variantes de fragmento |
| CD8 Pérdida/Evitación | ○ | Neutralizado: nada se pierde, el rival no roba nada real |

### 4.3 Flujo (Csikszentmihalyi) → motor adaptativo

```
tasa_acierto_movil = aciertos_últimos_10 / 10

> 0.85  → subir 1 escalón de dificultad (evitar aburrimiento)
< 0.60  → bajar 1 escalón + Kira ofrece andamiaje (evitar ansiedad)
objetivo: 0.70–0.85
```

Sin cronómetros punitivos por defecto (opt-in docente). En la Carrera del Cuervo la urgencia es narrativa, no un reloj sobre el ejercicio: la presión temporal expulsa del canal de flujo a los perfiles ansiosos.

---

## 5. ENTREGABLE C — Esquema de datos (`user_state`)

```json
{
  "user_state": {
    "user_id": "usr_8f3a2c",
    "profile": {
      "explorer_name": "Vega",
      "age_band": "8-10",
      "grade": 4,
      "classroom_id": "cls_valle_4B",
      "locale": "es-ES",
      "accessibility": { "dyslexia_font": false, "audio_support": true, "reduced_motion": false, "rival_events_enabled": true },
      "consent": { "guardian_consent": true, "data_minimization": true, "consent_date": "2026-09-01" }
    },
    "progression": {
      "level": 12,
      "rank": "cartografo",
      "xp_total": 4310,
      "xp_to_next_level": 512,
      "doubloons_balance": 340,
      "doubloons_earned_today": 85,
      "daily_xp_multiplier": 1.0,
      "atlas_fragments_recovered": 3,
      "world_map_revealed_pct": 0.27
    },
    "logbook_streak": {
      "type": "weekly_stamp",
      "current_weeks": 6,
      "stamps_lifetime": 14,
      "active_days_this_week": 2,
      "rescue_ropes_available": 1,
      "free_rope_used_this_week": false,
      "paused_by_teacher": false
    },
    "dig_sites": {
      "kaldros_matematicas": {
        "fracciones": {
          "strata": {
            "recordar":   { "status": "mastered",    "mastery": 0.95, "last_practiced": "2026-08-20", "sand_cover": 0.05 },
            "comprender": { "status": "mastered",    "mastery": 0.88, "last_practiced": "2026-08-21", "sand_cover": 0.10 },
            "aplicar":    { "status": "in_progress", "mastery": 0.62, "last_practiced": "2026-08-22", "sand_cover": 0.0 },
            "analizar":   { "status": "locked",      "mastery": 0.0, "unlock_requirement": "aplicar>=0.80" },
            "evaluar":    { "status": "locked",      "mastery": 0.0 },
            "crear":      { "status": "locked",      "mastery": 0.0 }
          },
          "guardian_chamber": { "unlocked": false, "attempts": 0, "best_score": null, "error_types_last_attempt": [] }
        }
      }
    },
    "adaptive_engine": {
      "current_difficulty_tier": 3,
      "rolling_accuracy_last10": 0.78,
      "avg_response_time_ms": 8400,
      "flow_zone_status": "in_channel",
      "low_quality_flag": false,
      "kira_scaffolding_active": [],
      "hints_used_today": 2
    },
    "inventory": {
      "gear_owned": ["sombrero_ala_ancha", "chaqueta_kaldros", "linterna_laton"],
      "gear_equipped": ["sombrero_ala_ancha", "chaqueta_kaldros"],
      "camp_items": ["hoguera_grande", "jeep_oxidado"],
      "rescue_ropes": 1,
      "museum": {
        "display_cases_owned": 4,
        "artifacts_displayed": ["lupa_ocana", "sello_arena"],
        "featured_artifact": "lupa_ocana"
      },
      "atlas_fragments": [
        { "id": "frag_kaldros_01", "variant": "dorado", "earned_for": "master_branch:sumas_llevando" }
      ]
    },
    "achievements": {
      "artifacts_earned": [
        { "id": "lupa_ocana", "earned_at": "2026-07-15", "pedagogical_evidence": "10 self-corrections logged" }
      ],
      "titles_owned": ["cartografo_kaldros"],
      "title_equipped": "cartografo_kaldros"
    },
    "learning_metrics": {
      "sessions_last_7d": 5,
      "avg_session_minutes": 14.2,
      "time_on_task_quality_ratio": 0.91,
      "error_frequency_by_skill": { "fracciones.aplicar": 0.31 },
      "self_correction_rate": 0.44,
      "hint_usage_rate": 0.18,
      "spaced_review_compliance": 0.72,
      "decay_alerts": ["kaldros.sumas_llevando"]
    },
    "social": {
      "society_fund_contribution": 120,
      "coop_digs_completed": 7,
      "rescues_given": 5,
      "creations_published_to_class": 2,
      "raven_race_wins": 3
    },
    "session_meta": {
      "last_login": "2026-08-22T17:05:00Z",
      "sessions_today": 1,
      "missions_completed_today": 3,
      "expedition_fatigue_active": false
    }
  }
}
```

**Notas de implementación:** `dig_sites` se modela como grafo dirigido acíclico (los prerrequisitos pueden cruzar yacimientos); `sand_cover` implementa el decay de mastery para el repaso espaciado; `learning_metrics` se agrega en un warehouse separado del estado de juego; minimización de datos GDPR-K (sin apellidos, sin geolocalización, sin foto real).

---

## 6. ENTREGABLE D — Matriz de Métricas (Dashboard docente)

**Regla del dashboard: ninguna métrica de engagement se celebra sola.** Engagement alto con aprendizaje plano significa que el tesoro está canibalizando a la excavación.

| | **Mastery Rate** (estratos ≥80%) | **Error Frequency** (por habilidad) | **Self-Correction Rate** (hallazgos restaurados) | **Retención a 30 días** |
|---|---|---|---|---|
| **DAU / WAU** | ¿Los días activos producen estratos nuevos? *Salud:* +1 estrato/semana por alumno activo | DAU alto + errores crecientes = excavar sin comprender → revisar dificultad adaptativa | Uso frecuente debe correlacionar con más restauraciones (hábito metacognitivo) | ¿Volver a menudo consolida o solo entretiene? |
| **Churn / D7-D30** | Mapa de calor de **"estratos que expulsan"**: dónde se atascan los que abandonan | Churn tras picos de error = salida del canal de flujo (ansiedad) → bajar escalón | Los que se autocorrigen abandonan menos (hipótesis a validar) | Cohortes perdidas: ¿qué retuvieron? informa el onboarding |
| **Time on Task** (min de excavación real, no de menú/museo) | PE por minuto de excavación = eficiencia. *Alerta:* mucho tiempo en Museo y Campamento, poco en yacimientos | ToT alto con misma tasa de error = rueda de hámster → activar remediación dirigida | Tiempo releyendo la explicación de Kira tras fallar = **KPI directo de atención de calidad** | Sesiones de 10–20 min + repaso espaciado maximizan retención |
| **Sellos de Bitácora** | Semanas de constancia vs. estratos ganados: la constancia debe comprar aprendizaje, no solo sellos | Rachas largas con error estancado = asistencia sin reto | — | El repaso espaciado del Bazar es el mecanismo causal esperado |
| **Guardian Pass Rate** | ¿Coincide el mastery formativo con el sumativo? Si divergen, el árbol está inflado | La tipología de error del Guardián alimenta los Encargos de la semana siguiente | % de éxito en 2º intento tras remediación = eficacia del bucle | Re-test sorpresa opcional a 30 días |
| **Museo / creaciones publicadas** | Proxy de actividad Bloom 5–6: pensamiento de orden superior | Los creadores de acertijos suelen bajar su propia tasa de error (efecto protégé) | — | Crear contenido es el predictor más fuerte de retención a largo plazo |

**KPIs de cabecera (5 números para el docente):**
1. **Atención de calidad:** Time-on-Task de excavación por sesión *(meta principal del proyecto)*.
2. **Velocidad de excavación:** estratos dominados / semana / alumno.
3. **Zona de flujo:** % de alumnos con accuracy móvil entre 0.70 y 0.85.
4. **Alerta de rescate:** alumnos con 3 señales (caída de sesiones + pico de error + estrato atascado >7 días).
5. **Pulso de clase:** avance de la Gran Excavación semanal y del Fondo de la Sociedad.

---

## 7. Roadmap

| Fase | Alcance | Criterio de éxito |
|---|---|---|
| **MVP (T1)** | Ruinas de Kaldros (Mates), estratos 1–4, PE + Doblones, avatar y equipo básicos, Bruno + Kira, dashboard mínimo | ToT calidad ≥10 min/sesión · D7 ≥40% |
| **v1.1 (T2)** | Bitácora semanal, Cámaras del Guardián, motor adaptativo v1, primer fragmento del Atlas | ≥55% de alumnos en zona de flujo |
| **v1.5 (T3)** | Resto de yacimientos, Grandes Excavaciones de clase, Museo personal, Cofre del Naufragio | +1 estrato de mastery / semana / alumno |
| **v2 (T4)** | Taller de Cartografía (Bloom 5–6), Saqueadores del Cuervo, decay + repaso espaciado, informes a familias, editor docente de expediciones | Retención de contenido a 30 días ≥70% |

**Riesgos vigilados:** sobrejustificación (encuesta pictórica trimestral de motivación intrínseca), inflación de Doblones (revisar sources/sinks cada sprint), optimización del juego sobre el aprendizaje (auditoría de patrones de respuesta rápida) y **sobre-estimulación narrativa** (si el mapa y el museo consumen más tiempo que las excavaciones, recortar animaciones y acortar transiciones).
