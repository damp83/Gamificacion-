# El sonido del tráiler

Dos pistas, independientes la una de la otra:

| | archivo | dura | estado |
|---|---|---|---|
| **Música de fondo** | `donde-apunta-la-brujula.mp3` | 62,4 s | puesta |
| **Voz en off** | `voz-trailer.mp3` | 75,9 s | puesta |

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

El bucle de la música se cierra **a mano** en el segundo 58,8, no con el
`loop` del navegador: la pista se desvanece a partir de ahí y deja tres
segundos y medio de silencio al final, que en bucle serían casi cinco
segundos de agujero por debajo de la escena 7.

## La voz

`voz-trailer.mp3` — 75,9 segundos. Manda ella: **las escenas dejan el reloj y
siguen al locutor**.

El segundo en el que entra cada escena está escrito en `desde`, dentro de
`TRAILER_GUION`:

```js
{ tipo: 'escenario', desde: 13.55, img: '...', titulo: '...', ... }
```

Esos números **no están puestos a ojo**. Se sacaron midiendo la onda del mp3
para saber dónde calla el locutor, y colocando cada corte dentro de un
silencio de verdad: así una escena nunca cambia a mitad de palabra. Por eso
llevan dos decimales.

Si una escena entra pronto o tarde, se cambia **solo ese número**. Y si algún
día se sustituye la grabación por otra, se borran todos los `desde` y el
tráiler vuelve a repartir solo, por la longitud del texto de cada escena.

El texto que se lee está en `docs/voz-del-trailer.md`.

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
