# Los cinco emblemas de cuadrilla

Cóndor, Jaguar, Tortuga, Tigre y Flamenco. Es lo único que queda en la
pantalla del alumno dibujado con un emoji del sistema, y se ve grande: un
medallón de 58 px en la cabecera de «Tu Cuadrilla», encima del cuero oscuro.

**El código ya está listo.** Cada cuadrilla tiene su campo `img` vacío en
`js/config.js` y en `js/demo.js`; en cuanto tenga ruta, se ve el dibujo en las
cuatro pantallas donde sale el emblema. Mientras esté vacío, sigue el emoji y
no se rompe nada.

---

## Lo que tienen que cumplir

| | |
|---|---|
| **Formato** | PNG con **fondo transparente** (yo lo paso a WebP) |
| **Tamaño** | **512 × 512 px**, cuadrado |
| **Encuadre** | Busto del animal —cabeza y pecho—, centrado, mirando un poco de lado, llenando el cuadro con un margen pequeño |
| **Sin** | Texto, marco, círculo, escudo ni sombra: el marco lo pone la app |

El encuadre importa más de lo que parece: en la app va dentro de un cuadrado
redondeado de 58 px sobre cuero oscuro. Un animal de cuerpo entero a ese
tamaño no se reconoce; una cabeza sí.

## El estilo de la casa

Tus 67 dibujos tienen un estilo muy reconocible y estos cinco tienen que
entrar en él sin cantar. Lo que los define:

- Ilustración **de dibujo animado**, amable, no realista.
- **Contorno oscuro y grueso**, marrón muy oscuro, no negro puro.
- Sombreado **plano por zonas**, con brillos suaves; nada de degradados
  fotográficos ni texturas.
- Paleta **cálida**: arenas, ocres, latón, cuero, verde selva. Si el animal
  pide azul o rosa, que sean apagados y terrosos, nunca saturados. El rojo y
  el azul vivos son los dos colores que peor casan con el pergamino.
- Expresión **noble y simpática**, nunca agresiva: son los equipos de una
  clase de primaria, no mascotas de un equipo de fútbol. Ni colmillos, ni
  gruñidos, ni ojos furiosos.

---

## Los cinco prompts

En inglés, que es con lo que mejor responden los generadores de imagen.
Después de cada uno, entre paréntesis, lo que hay que cuidar en ese animal.

**Base común** (va al principio de los cinco):

> Children's book cartoon illustration, friendly and noble expression, bold
> dark-brown outline, flat cel shading with soft highlights, warm earthy
> palette of sand, ochre, brass and leather tones, no gradients, no texture,
> centered head-and-chest bust filling the square, slight three-quarter turn,
> fully transparent background, no frame, no border, no text, 512x512.

### 1 · Cóndor — `img/cuadrillas/condor.png`
> …**an Andean condor**, dark charcoal-brown plumage with a soft white neck
> ruff, calm dignified gaze, bald head in muted ochre.

*(El cóndor real tiene la cabeza pelada y arrugada: pídela suavizada y
redondeada, o sale desagradable a este tamaño.)*

### 2 · Jaguar — `img/cuadrillas/jaguar.png`
> …**a jaguar**, warm golden-ochre fur with dark rosette spots, relaxed alert
> expression, mouth closed.

*(«Mouth closed» es importante: con la boca abierta salen los colmillos y deja
de ser el equipo de un niño de ocho años.)*

### 3 · Tortuga — `img/cuadrillas/tortuga.png`
> …**a tortoise**, olive-green skin with a warm amber and brown patterned
> shell, gentle wise smile, head extended forward.

*(Que asome bien el cuello: una tortuga metida en el caparazón es una piedra a
58 px.)*

### 4 · Tigre — `img/cuadrillas/tigre.png`
> …**a tiger**, warm amber-orange fur with dark brown stripes, white muzzle
> and chest, friendly confident expression, mouth closed.

*(Ojo con el naranja: pídelo ámbar cálido y no naranja de señal, que se pelea
con el latón de la app.)*

### 5 · Flamenco — `img/cuadrillas/flamenco.png`
> …**a flamingo**, dusty rose and coral plumage in muted earthy tones, elegant
> curved neck, cheerful expression, black-tipped beak.

*(Este es el que más se puede ir de tono. Insiste en «muted», «dusty» y
«earthy»: un rosa de chicle rompe la paleta entera. Y el cuello curvado, no
estirado, para que el busto llene el cuadro.)*

---

## Cuando los tengas

Mándamelos y yo los recorto, los paso a WebP, los meto en `img/cuadrillas/`,
relleno las rutas en los dos sitios y subo la versión. Si prefieres hacerlo tú
son dos pasos:

1. Deja los archivos en `img/cuadrillas/`.
2. Escribe la ruta en el campo `img` de cada cuadrilla, en `js/config.js`
   (las cinco) y en `js/demo.js` (las tres de la demostración), y añádelos a
   la lista `ASSETS` de `sw.js` para que se vean sin wifi.

Y si alguno no acaba de convencerte, no pasa nada por dejarlo con su emoji:
las cuadrillas no tienen por qué ir todas dibujadas a la vez.
