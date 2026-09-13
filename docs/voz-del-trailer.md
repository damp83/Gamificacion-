# Voz en off del tráiler

Texto para grabar o generar. Son **nueve frases, unos 50 segundos**, una por
escena del tráiler de la portada.

Está escrito para que **diga casi lo mismo que se lee en pantalla**. Eso no es
un descuido: los que abren esto tienen entre 6 y 12 años, y los de 1.º todavía
no leen con soltura. Oír el mismo renglón que están viendo es lectura
acompañada, que es justo lo que les hace falta. No conviene «mejorarlo»
escribiendo una narración distinta de lo que pone en pantalla: obliga a leer
una cosa y escuchar otra a la vez, y a esa edad eso no se sostiene.

---

## El texto

> **1.** Hace cien años, la Expedición Atlas salió a cartografiar el mundo entero.
>
> **2.** Nunca volvió. Solo quedaron sus diarios… rotos en mil pedazos y enterrados bajo la arena.
>
> **3.** Unas páginas están aquí, bajo el templo de los engranajes y los relojes.
>
> **4.** Otras, en una biblioteca que el desierto se tragó hace siglos.
>
> **5.** Y no eres el único que las busca. Vera Kovak quiere venderlas al mejor postor… pero se le dan fatal las cuentas.
>
> **6.** Aunque no vas solo. El profesor Ocaña, que ya se equivocó antes y peor. Kira, que traduce jeroglíficos. Y Tobías, que huele tesoros.
>
> **7.** Aquí se excava con la cabeza: cada cosa que aprendes de verdad desentierra una página. Y equivocarse no quita nada; es parte de cavar.
>
> **8.** Página a página, el mapa se dibuja… y tú subes de aprendiz a leyenda.
>
> **9.** El mapa lleva cien años esperándote. ¿Empezamos?

---

## Cómo decirlo

- **Tono:** el de quien cuenta algo alrededor de una hoguera, no el de un
  anuncio. Sin prisa y sin entusiasmo forzado.
- **Ritmo:** unas 160 palabras por minuto. Los puntos suspensivos son
  silencios de verdad, de medio segundo.
- **Las tres que cambian de registro:**
  - La **5** (Vera) baja de tono hasta «al mejor postor», y «se le dan fatal
    las cuentas» se dice con media sonrisa: es la broma que convierte a la
    mala en un problema de matemáticas.
  - La **7** es la frase importante para las familias. Despacio.
  - La **9** se dice mirando a quien escucha. Después, silencio: ahí aparece
    el botón de entrar.
- **Un segundo de silencio al principio y otro al final**, para que no empiece
  de golpe ni se corte en seco.

## Si lo grabas tú

Es la opción que recomiendo. Tus alumnos conocen tu voz y el Prof. Ocaña
existe por tu culpa; que sea la tuya la que cuenta la historia hace más por
la motivación que cualquier locutor.

Con el móvil basta: una habitación con cosas blandas (armario abierto, cama),
el teléfono a un palmo y hablando ligeramente de lado, no de frente. Exporta a
mp3.

## Si lo generas

**NotebookLM no es la herramienta para esto.** Su Audio Overview hace un
pódcast conversado entre dos presentadores de varios minutos; no sabe hacer
una narración de un solo locutor de cincuenta segundos, ni con instrucciones.
Saldría una charla sobre el tráiler en vez del tráiler.

Lo que sí encaja es un conversor de texto a voz con voz en español. Pide:
- español de España,
- voz adulta, registro narrativo,
- velocidad al 90 %,
- y respeta los silencios de los puntos suspensivos.

## Cuando tengas el archivo

Sigue los pasos de `audio/LEEME.md`. Sonará **encima de la música de fondo**,
que baja sola del 38 % al 18 % en cuanto hay alguien hablando.

El tráiler reparte solo el sitio
de cada escena según lo largo que es su texto, así que con este guion debería
cuadrar sin tocar nada. Si alguna frase se queda corta o larga, se escribe su
segundo exacto en `desde`, dentro de la escena, en `js/trailer.js`.
