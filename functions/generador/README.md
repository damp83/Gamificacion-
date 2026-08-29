# Función «generador» — retos escritos por IA

Escribe retos para el banco a partir del currículo, y **no escribe nada en la
plataforma**: devuelve una lista que el docente aprueba, devuelve o edita en su
panel. Igual que con los acertijos que inventan los niños, nada llega a una
clase sin que alguien lo haya leído.

## Por qué es una función y no código en la app

La clave de la API **no puede vivir en el navegador**. La app es un sitio
estático que se sirve a cada niño, y los ajustes de la clase viajan a su
tablet: una clave ahí la lee cualquiera con ver el código fuente. Aquí vive en
la variable de entorno de la función y no sale de este servidor.

Una prueba (`test/generador.test.js`) comprueba que la clave no aparezca en
nada que se sirva al navegador.

## Qué hace, en orden

1. **Comprueba que quien llama tiene sesión de docente.** Sin esto, cualquiera
   con la URL de la función gasta la cuenta de la API del centro.
2. **Pide los retos** con el esquema de salida obligado: cuatro opciones, un
   índice de 0 a 3, dos pistas, explicación, concepto del catálogo y la cita
   literal del criterio del currículo.
3. **Los valida** con el mismo código que usa la tablet (`js/generador.js`).
4. **Los resuelve otra vez, sin ver cuál está marcada**, y tira los que no
   coinciden. Es lo que caza el fallo que más caro cuesta: una respuesta
   correcta mal señalada le dice «has fallado» a un niño que acertó.
5. **Devuelve lo que sobrevive y lo que se ha tirado, con el motivo.**

## Desplegarla

1. **Sincroniza el validador** antes de subir nada:

   ```
   python3 tools/sync-generador.py
   ```

   Copia `js/generador.js` y el catálogo de conceptos dentro de `src/`. Los dos
   ficheros generados llevan aviso de que no se editan a mano.

2. En la consola de Appwrite: **Functions → Create function**.
   - Nombre: `generador`
   - Runtime: **Node 18** o superior
   - Entrypoint: `src/main.js`
   - Build command: `npm install`

3. **Settings → Variables**, añade:

   | Variable | Valor |
   |---|---|
   | `ANTHROPIC_API_KEY` | Tu clave de console.anthropic.com |

4. **Settings → Execute access**: marca **Users**. Así solo ejecuta quien tiene
   sesión; con `Any` la URL queda abierta a cualquiera.

5. **Settings → Timeout: 300 segundos.** De fábrica son 15 y no bastan: diez
   retos con currículo, más la segunda pasada que los vuelve a resolver, pasan
   de un minuto. Con 15 s la función se corta y el panel dice «ha fallado» sin
   que haya fallado nada.

6. Sube la carpeta `functions/generador/` (o conecta el repositorio y apunta el
   directorio raíz de la función a esa ruta).

7. Copia el **Function ID** y ponlo en la app: *Configuración → Acceso y nube*.

## Lo que cuesta

Con Claude Opus 5, una tanda de diez retos son unos **6 céntimos**: el currículo
y las instrucciones de entrada, y unos 1 200 tokens de salida. El currículo va
cacheado, así que la segunda tanda de la misma área cuesta bastante menos.

El banco de un curso entero —40 pozos × 4 estratos × 10 retos— ronda los **9 €**
una sola vez.

La respuesta trae `usados` con los tokens de entrada, cacheados y salida de cada
generación, por si quieres llevar la cuenta.

## Lo que NO hace

- **No escribe en el banco.** Devuelve; aprueba el docente.
- **No garantiza que el reto esté bien.** Reduce mucho los fallos —esquema,
  validador, comprobación aritmética y segunda pasada— pero la última lectura
  es de una persona. Un modelo que se equivoca en una cuenta y un docente que
  aprueba sin leer dan el mismo resultado.
- **No sabe qué currículo es el tuyo.** Se lo mandas tú, y si lo que ibas a
  preguntar no está en ese texto, se le pide que no lo pregunte.
