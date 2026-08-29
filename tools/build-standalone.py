#!/usr/bin/env python3
"""Construye la versión de un solo archivo de Expedición Atlas.

Un único HTML autocontenido: CSS y JS incrustados, sin service worker y sin
el SDK de Appwrite (un Artifact no puede pedir nada a otro servidor, así que
el SDK nunca cargaría y la app degrada sola a modo local). Sirve para
publicar la demo o para pasarla por USB a una tablet sin red.

    python3 tools/build-standalone.py [salida.html]
"""
import re, sys, pathlib

RAIZ = pathlib.Path(__file__).resolve().parent.parent
SALIDA = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / 'dist' / 'Expedicion-Atlas.html'

# Orden de carga idéntico al de index.html (menos el SDK remoto)
ORDEN = ['content', 'generador', 'config', 'cloud', 'state', 'game', 'classview',
         'ui', 'play', 'aula', 'teacher', 'app']

html = (RAIZ / 'index.html').read_text(encoding='utf-8')

# Cuerpo: de <body> a </body>, sin las etiquetas <script src=...>
# El patrón admite atributos y saltos de línea porque la del SDK lleva su
# `integrity` y su `crossorigin` repartidos en varias líneas; con el patrón
# anterior se quedaba dentro y el archivo suelto pedía el SDK a un CDN que en
# un Artifact no puede contestar. Se traga también el comentario que la
# precede, que aquí no explica nada.
cuerpo = html[html.index('<body>') + len('<body>'):html.index('</body>')]
PATRON_SCRIPT = re.compile(
    r'\s*(?:<!--(?:(?!-->).)*-->\s*)?<script\s+src="[^"]*"[^>]*></script>', re.S)
cuerpo, n_scripts = PATRON_SCRIPT.subn('', cuerpo)
if n_scripts != len(ORDEN) + 1:      # los ocho de js/ más el SDK del CDN
    sys.exit(f'ERROR: se esperaban {len(ORDEN) + 1} etiquetas <script src=...> y se han '
             f'quitado {n_scripts}. La versión de un solo archivo no se ha generado.')
if re.search(r'<script\s+src', cuerpo):
    sys.exit('ERROR: queda alguna etiqueta <script src=...> en el cuerpo. Un archivo suelto '
             'no puede pedir nada a otro servidor.')

js = '\n'.join((RAIZ / 'js' / f'{n}.js').read_text(encoding='utf-8') for n in ORDEN)

# El service worker no existe en un archivo suelto: registrarlo daría un error.
# El bloque entero se sustituye por un comentario; si algún día cambia de forma,
# el aviso de abajo lo dice en vez de dejar un archivo roto en silencio.
BLOQUE_SW = re.compile(
    r"  if \('serviceWorker' in navigator\) \{\n"
    r"    navigator\.serviceWorker\.register\('sw\.js'\)\.catch\(\(\) => \{\}\);\n"
    r"  \}\n")
js, n = BLOQUE_SW.subn("  /* sin service worker en la versión de un solo archivo */\n", js)
if n != 1:
    sys.exit('ERROR: no se encontró el registro del service worker en app.js '
             '(¿cambió de forma?). La versión de un solo archivo no se ha generado.')

css = (RAIZ / 'css' / 'styles.css').read_text(encoding='utf-8')

# Las tipografías se incrustan en el propio archivo: un HTML suelto no tiene
# carpeta fonts/ al lado, y en un Artifact tampoco podría pedirla.
import base64
for nombre in ('bree-serif-latin', 'nunito-latin', 'nunito-italic-latin'):
    ruta = RAIZ / 'fonts' / f'{nombre}.woff2'
    b64 = base64.b64encode(ruta.read_bytes()).decode('ascii')
    antes = css
    css = css.replace(f"url('../fonts/{nombre}.woff2')",
                      f"url('data:font/woff2;base64,{b64}')")
    if css == antes:
        sys.exit(f'ERROR: no se encontró la referencia a {nombre}.woff2 en styles.css')

# Las tres etiquetas que pedían las tipografías a Google se han quitado: son
# de antes de servirlas desde fonts/, y ya solo hacían daño. Sin red —en un
# colegio, o abriendo el archivo suelto— eran tres peticiones fallidas en cada
# arranque, y con red mandaban a Google la visita de cada niño sin necesidad,
# porque las letras ya viajan incrustadas aquí abajo.
doc = f"""<meta charset="utf-8">
<title>Expedición Atlas</title>
<style>
{css}
</style>
{cuerpo}
<script>
{js}
</script>
"""

SALIDA.parent.mkdir(parents=True, exist_ok=True)
SALIDA.write_text(doc, encoding='utf-8')
print(f'{SALIDA}  ({len(doc.encode("utf-8")) / 1024:.0f} KB)')
