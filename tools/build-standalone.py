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

html = (RAIZ / 'index.html').read_text(encoding='utf-8')

# Cuerpo: de <body> a </body>, sin las etiquetas <script src=...>
cuerpo = html[html.index('<body>') + len('<body>'):html.index('</body>')]
cuerpo = re.sub(r'\s*<script src="[^"]+"></script>', '', cuerpo)

# Orden de carga idéntico al de index.html (menos el SDK remoto)
ORDEN = ['content', 'config', 'cloud', 'state', 'game', 'classview', 'teacher', 'app']
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

doc = f"""<meta charset="utf-8">
<title>Expedición Atlas</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bree+Serif&family=Nunito:wght@400;600;700;800&display=swap">
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
