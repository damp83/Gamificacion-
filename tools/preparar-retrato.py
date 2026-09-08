#!/usr/bin/env python3
"""Prepara el retrato de un rol: quita el fondo, recorta cuadrado y encoge.

El fondo no siempre es blanco: hay damero de transparencia aplastado a JPEG y
hay degradados beige. Por eso NO se borra por color suelto —eso agujerearía el
papel del cuaderno o el cristal de una lupa—, sino que se rellena DESDE EL
BORDE, que es lo único que con seguridad es fondo."""
from PIL import Image, ImageFilter
from collections import deque
import sys

def sat(p):
    return max(p) - min(p)

def quitar_fondo(ruta, modo, tol=14):
    im = Image.open(ruta).convert('RGB')
    w, h = im.size
    px = im.load()

    def parece_fondo(p):
        if modo == 'blanco':
            return p[0] > 238 and p[1] > 238 and p[2] > 238
        if modo == 'damero':
            v = sum(p) / 3
            return sat(p) <= 12 and (v > 238 or 160 <= v <= 210)
        # 'degradado': el fondo es un beige claro con viñeta. Se exige que el
        # píxel sea CLARO además de parecerse a su vecino: sin esa condición la
        # cadena de tolerancias trepa por el degradado del contorno y se cuela
        # dentro del dibujo, que es lo que dejó a Leo sin chaleco.
        return sum(p) / 3 >= 190

    fondo = bytearray(w * h)
    q = deque()
    def sembrar(x, y):
        if not fondo[y*w+x] and parece_fondo(px[x, y]):
            fondo[y*w+x] = 1; q.append((x, y))
    for x in range(w):
        sembrar(x, 0); sembrar(x, h-1)
    for y in range(h):
        sembrar(0, y); sembrar(w-1, y)

    while q:
        x, y = q.popleft()
        c = px[x, y]
        for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx, ny = x+dx, y+dy
            if not (0 <= nx < w and 0 <= ny < h) or fondo[ny*w+nx]:
                continue
            n = px[nx, ny]
            if not parece_fondo(n):
                continue
            if modo == 'degradado' and max(abs(n[i]-c[i]) for i in range(3)) > tol:
                continue
            fondo[ny*w+nx] = 1; q.append((nx, ny))

    # Los huecos cerrados —entre el brazo y el cuerpo, entre las piernas— no
    # los alcanza el relleno desde el borde, y ahí el damero se quedaba puesto.
    # No vale con borrar su color: el papel del cuaderno es igual de blanco. Lo
    # que distingue al damero es que MEZCLA los dos tonos, así que se buscan las
    # manchas que llevan gris y blanco juntos; una hoja de papel no lleva gris.
    if modo == 'damero':
        def gris(p):
            v = sum(p)/3
            return sat(p) <= 14 and 155 <= v <= 215
        def claro(p):
            return sat(p) <= 14 and sum(p)/3 > 232
        marca = bytearray(1 if (gris(px[i % w, i // w]) or claro(px[i % w, i // w])) else 0
                          for i in range(w * h))
        visto2 = bytearray(w * h)
        for i in range(w * h):
            if not marca[i] or visto2[i]:
                continue
            cola = deque([i]); visto2[i] = 1; trozo = [i]; grises = 0
            while cola:
                j = cola.popleft()
                x, y = j % w, j // w
                if gris(px[x, y]):
                    grises += 1
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = x+dx, y+dy
                    k = ny*w + nx
                    if 0 <= nx < w and 0 <= ny < h and marca[k] and not visto2[k]:
                        visto2[k] = 1; cola.append(k); trozo.append(k)
            if grises > len(trozo) * 0.12:
                for j in trozo:
                    fondo[j] = 1

    # El JPEG deja un fleco de píxeles intermedios en los saltos del damero y
    # en el borde del dibujo. Se come lo claro y sin color que toque al fondo;
    # la línea oscura del dibujo lo para.
    for _ in range(3):
        nuevos = []
        for y in range(h):
            for x in range(w):
                if fondo[y*w+x]:
                    continue
                p = px[x, y]
                if not (sum(p)/3 > 150 and sat(p) <= 18):
                    continue
                for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                    nx, ny = x+dx, y+dy
                    if 0 <= nx < w and 0 <= ny < h and fondo[ny*w+nx]:
                        nuevos.append(y*w+x); break
        if not nuevos:
            break
        for i in nuevos:
            fondo[i] = 1

    # Estas láminas traen una marca de agua tenue y, al aplastar el damero a
    # JPEG, motas sueltas. Todo eso queda «no fondo» sin tocar al niño, así que
    # se descarta quedándose SOLO con la mancha grande: el dibujo.
    visto = bytearray(w * h)
    mejor, mejor_n = None, 0
    for i in range(w * h):
        if fondo[i] or visto[i]:
            continue
        cola = deque([i]); visto[i] = 1; trozo = [i]
        while cola:
            j = cola.popleft()
            x, y = j % w, j // w
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                nx, ny = x+dx, y+dy
                k = ny*w + nx
                if 0 <= nx < w and 0 <= ny < h and not fondo[k] and not visto[k]:
                    visto[k] = 1; cola.append(k); trozo.append(k)
        if len(trozo) > mejor_n:
            mejor, mejor_n = trozo, len(trozo)
    dibujo = bytearray(w * h)
    for i in mejor:
        dibujo[i] = 1

    alfa = Image.frombytes('L', (w, h), bytes(255 if v else 0 for v in dibujo))
    alfa = alfa.filter(ImageFilter.GaussianBlur(0.8))
    out = im.copy(); out.putalpha(alfa)
    return out

def preparar(origen, destino, modo, caja=None, lado=400, colores=96):
    im = quitar_fondo(origen, modo)
    im = im.crop(tuple(caja) if caja else im.getbbox())
    # Cuadrado: el avatar se ve dentro de un círculo y un rectángulo se
    # recortaría por donde no toca.
    l = max(im.size)
    cua = Image.new('RGBA', (l, l), (0, 0, 0, 0))
    cua.paste(im, ((l - im.width) // 2, (l - im.height) // 2), im)
    cua = cua.resize((lado, lado), Image.LANCZOS)
    # Paleta corta: un dibujo plano no pierde nada y baja de 250 a 40 KB, que
    # con seis retratos es la diferencia entre pesar poco o pesar como la app.
    cua = cua.filter(ImageFilter.SMOOTH).quantize(
        colors=colores, method=Image.FASTOCTREE, dither=Image.NONE)
    cua.save(destino, optimize=True)
    return destino


if __name__ == '__main__':
    import argparse
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('origen')
    p.add_argument('destino')
    p.add_argument('--modo', choices=('blanco', 'damero', 'degradado'), required=True,
                   help='cómo es el fondo del original: blanco liso, damero de '
                        'transparencia aplastado a JPEG, o un color/degradado claro')
    p.add_argument('--caja', help='recorte x1,y1,x2,y2 sobre el original; sin él '
                                  'se ajusta a la figura, que suele quedar demasiado '
                                  'lejos para un avatar')
    p.add_argument('--lado', type=int, default=400)
    a = p.parse_args()
    caja = [int(v) for v in a.caja.split(',')] if a.caja else None
    ruta = preparar(a.origen, a.destino, a.modo, caja, a.lado)
    import os
    print(f'{ruta}  ({os.path.getsize(ruta) / 1024:.0f} KB)')
