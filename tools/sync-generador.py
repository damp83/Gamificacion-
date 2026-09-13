#!/usr/bin/env python3
"""Copia js/generador.js dentro de la función de Appwrite.

El validador tiene que ser EL MISMO en la tablet y en el servidor. Si fueran
dos ficheros, el día que alguien afine una regla en uno la función aceptaría lo
que el panel rechaza, o al revés, y nadie se enteraría hasta que un reto malo
llegara a un niño.

La app carga `js/generador.js` como <script> clásico; la función lo importa
como módulo ESM. La diferencia son cuatro líneas de `export`, así que la copia
se genera aquí y `test/generador.test.js` comprueba que no se quede vieja.
"""
import pathlib, sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
ORIGEN = RAIZ / 'js' / 'generador.js'
CONTENIDO = RAIZ / 'js' / 'content.js'
DESTINO = RAIZ / 'functions' / 'generador' / 'src' / 'generador.js'
CATALOGO = RAIZ / 'functions' / 'generador' / 'src' / 'catalogo.js'

EXPORTA = [
    'AREAS_IA', 'conceptosDe', 'normalizarReto', 'validarRetoIA', 'validarTanda',
    'comprobarAritmetica', 'promptGenerador', 'esquemaRetos',
    'esquemaYacimiento', 'promptYacimiento', 'limpiarYacimiento',
    'promptVerificacion', 'esquemaVerificacion', 'cruzarVerificacion',
    'esquemaCriterios', 'promptCriterios', 'limpiarCriterios',
]

CABECERA = ('/* GENERADO por tools/sync-generador.py — no editar a mano.\n'
            '   El original es {origen}. Una prueba comprueba que esta copia no\n'
            '   se quede vieja: si el validador de la tablet y el del servidor se\n'
            '   separan, uno acepta lo que el otro rechaza y nadie se entera. */\n\n')


PAREJA = {'{': '}', '[': ']', '(': ')'}


def literal(fuente: str, nombre: str, abre: str = '{') -> str:
    """El literal `const NOMBRE = {...}` (o `[...]`) de content.js.

    Se copia el literal en vez de importar content.js entero porque la función
    no tiene navegador: content.js trae generadores, emoji y medio catálogo de
    yacimientos que aquí no pintan nada.
    """
    cierra = PAREJA[abre]
    marca = f'const {nombre} = {abre}'
    i = fuente.index(marca) + len(marca) - 1
    prof, j, en_cadena, comilla, escapa = 0, i, False, '', False
    while j < len(fuente):
        c = fuente[j]
        if en_cadena:
            if escapa: escapa = False
            elif c == '\\': escapa = True
            elif c == comilla: en_cadena = False
        elif c in '\'"`':
            en_cadena, comilla = True, c
        elif c == abre: prof += 1
        elif c == cierra:
            prof -= 1
            if prof == 0:
                return fuente[i:j + 1]
        j += 1
    sys.exit(f'ERROR: no se ha podido leer {nombre} de content.js')


def funcion(fuente: str, nombre: str) -> str:
    """El cuerpo entero de `function NOMBRE(...) { ... }`.

    Copiar la función en vez de reescribirla aquí es lo que garantiza que la
    tablet y el servidor apliquen LA MISMA regla: si se escribieran dos veces,
    el día que una cambie la otra se queda vieja en silencio.
    """
    marca = f'function {nombre}('
    i = fuente.index(marca)
    j = fuente.index('{', i)
    prof, k, en_cadena, comilla, escapa = 0, j, False, '', False
    while k < len(fuente):
        c = fuente[k]
        if en_cadena:
            if escapa: escapa = False
            elif c == '\\': escapa = True
            elif c == comilla: en_cadena = False
        elif c in '\'"`':
            en_cadena, comilla = True, c
        elif c == '{': prof += 1
        elif c == '}':
            prof -= 1
            if prof == 0:
                return fuente[i:k + 1]
        k += 1
    sys.exit(f'ERROR: no se ha podido leer la función {nombre} de content.js')


def generar(fuente: str) -> str:
    return (
        CABECERA.format(origen='js/generador.js')
        + "import { CONCEPTOS, STRATA_META, OAOA_VETADO, pegasOAOA,\n"
          "         OAOA_ESTRATEGIAS, estrategiasOAOA } from './catalogo.js';\n\n"
        + fuente.rstrip('\n')
        + '\n\nexport {\n  ' + ',\n  '.join(EXPORTA) + '\n};\n'
    )


def generar_catalogo(contenido: str) -> str:
    return (
        CABECERA.format(origen='js/content.js')
        + 'export const STRATA_META = ' + literal(contenido, 'STRATA_META') + ';\n\n'
        + 'export const CONCEPTOS = ' + literal(contenido, 'CONCEPTOS') + ';\n\n'
        # El reglamento OAOA viaja entero: el validador del servidor tiene que
        # rechazar exactamente lo mismo que el de la tablet.
        + 'export const OAOA_VETADO = ' + literal(contenido, 'OAOA_VETADO', '[') + ';\n\n'
        + 'export ' + funcion(contenido, 'pegasOAOA') + '\n\n'
        + 'export const OAOA_ESTRATEGIAS = ' + literal(contenido, 'OAOA_ESTRATEGIAS') + ';\n\n'
        + 'export ' + funcion(contenido, 'estrategiasOAOA') + '\n'
    )

def main() -> int:
    fuente = ORIGEN.read_text(encoding='utf-8')
    # `CONCEPTOS` y `STRATA_META` viven en content.js, que la función no carga.
    # Se le pasan como módulo aparte para no arrastrar el catálogo entero.
    if 'CONCEPTOS' not in fuente:
        sys.exit('ERROR: el generador ya no usa CONCEPTOS; revisa esta herramienta.')
    contenido = CONTENIDO.read_text(encoding='utf-8')
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text(generar(fuente), encoding='utf-8')
    CATALOGO.write_text(generar_catalogo(contenido), encoding='utf-8')
    print(f'{DESTINO.relative_to(RAIZ)} · {len(fuente)} caracteres')
    print(f'{CATALOGO.relative_to(RAIZ)} · CONCEPTOS y STRATA_META')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
