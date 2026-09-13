# El sonido del tráiler

Dos pistas, independientes la una de la otra:

| | archivo | estado |
|---|---|---|
| **Música de fondo** | `donde-apunta-la-brujula.mp3` | puesta |
| **Voz en off** | — | falta |

Lo que falte, no existe: esa pista se olvida sin decir nada, y si no queda
ninguna el botón del altavoz ni se pinta. Un archivo que falta no puede romper
la portada.

## La música

`donde-apunta-la-brujula.mp3` — 62 segundos, 192 kbps, 1,5 MB. Se repite en
bucle por debajo de las escenas, al 38 % de volumen. Cuando haya voz bajará
sola al 18 %: el fondo es fondo.

Está generada con la IA de música de Google y lleva dentro su marca de agua
SynthID y el manifiesto C2PA que lo declara. **No los quites**: son 6 KB y son
la trazabilidad de que esto lo compuso una máquina, que en una plataforma para
menores conviene poder demostrar.

## Para añadir la voz en off

1. Deja el archivo aquí en **.mp3** (el .ogg no lo lee Safari y en un colegio
   hay iPads).
2. Abre `js/trailer.js` y escribe la ruta:

   ```js
   const TRAILER_AUDIO = {
     musica: { src: 'audio/donde-apunta-la-brujula.mp3', volumen: .38 },
     voz:    { src: 'audio/voz-trailer.mp3', volumen: 1 }
   };
   ```

3. Sube `ATLAS_VERSION` en `js/config.js` y `CACHE` en `sw.js`, que si no las
   tabletas siguen con la versión guardada.

Con voz, **las escenas dejan el reloj y siguen al locutor**: el sitio donde
empieza cada una se reparte según lo largo que es su texto, que es lo que
tarda en decirse. Si alguna frase cae donde no toca, se escribe su segundo
exacto dentro de la escena, en `TRAILER_GUION`:

```js
{ tipo: 'escenario', img: '...', desde: 14.8, titulo: '...', ... }
```

El texto para grabar está en `docs/voz-del-trailer.md`.

## Tres cosas que conviene saber

- **El audio NO va en la lista `ASSETS` de `sw.js`, y es adrede.** Son 1,5 MB,
  más que los sesenta y siete dibujos juntos; meterlos en la instalación
  doblaría lo que se descarga la primera vez una tableta de colegio, para algo
  que además nace apagado. En su lugar, la primera vez que alguien enciende el
  sonido se pide el archivo entero una vez y queda guardado: a partir de ahí
  suena sin conexión. (Hace falta pedirlo aparte porque un `<audio>` pide el
  archivo por trozos, el servidor contesta 206, y una respuesta parcial no se
  puede guardar en la caché.)
- **Arranca siempre apagado**, y cada equipo recuerda su elección. Que suene
  tiene que ser una decisión de quien mira, no lo que pasa por defecto:
  veinticinco tabletas descubriendo a la vez que esto habla es un problema de
  aula, no una función.
- **La versión de un solo archivo va muda.** `tools/build-standalone.py`
  incrusta los dibujos y las tipografías, no el audio: un mp3 en base64
  engordaría el archivo más que los sesenta y siete dibujos juntos. El
  `Expedicion-Atlas.html` suelto enseña el tráiler en silencio, y está bien
  así.
