# El sonido del tráiler

Esta carpeta está vacía a propósito. El tráiler de la portada funciona sin
ella: mientras no haya archivo, las escenas pasan por reloj, el botón del
altavoz ni se pinta y nadie se entera de que falta nada.

## Para poner la voz en off

1. Deja aquí el archivo. Formato **.mp3** (lo entienden todos los navegadores
   que nos importan; el .ogg no lo lee Safari y en un colegio hay iPads).
2. Abre `js/trailer.js` y escribe la ruta:

   ```js
   const TRAILER_AUDIO = { src: 'audio/voz-trailer.mp3', tipo: 'voz' };
   ```

3. Añádelo a la lista `ASSETS` de `sw.js`, junto a los dibujos:

   ```js
   './audio/voz-trailer.mp3',
   ```

   Sin este paso el tráiler suena en el colegio con wifi y se queda mudo en
   el aula que no lo tiene.

4. Sube `ATLAS_VERSION` en `js/config.js` y `CACHE` en `sw.js`, que si no las
   tabletas siguen con la versión guardada y no se bajan el audio.

## `tipo: 'voz'` frente a `tipo: 'musica'`

- **`voz`** — es la narración. Las escenas dejan el reloj y **siguen al
  locutor**: el sitio donde empieza cada una se reparte según lo largo que
  sea su texto, que es lo que tarda en decirse. Si alguna escena canta, se
  escribe su segundo exacto en el guion, dentro de `TRAILER_GUION`:

  ```js
  { tipo: 'escenario', img: '...', desde: 14.8, titulo: '...', ... }
  ```

- **`musica`** — es fondo. Las escenas siguen con su reloj de 4,5 segundos y
  la música se repite por debajo.

## Dos cosas que conviene saber

- **Arranca siempre apagado.** Que suene es una decisión de quien mira, no lo
  que pasa por defecto: veinticinco tabletas descubriendo a la vez que esto
  habla es un problema de aula, no una función. Una vez encendido, ese equipo
  lo recuerda.
- **La versión de un solo archivo no lleva sonido.** `tools/build-standalone.py`
  incrusta los dibujos y las tipografías, no el audio: un mp3 de un minuto en
  base64 engorda el archivo más que los sesenta y siete dibujos juntos. El
  `Expedicion-Atlas.html` suelto enseña el tráiler mudo, y está bien así.

El texto para grabar está en `docs/voz-del-trailer.md`.
