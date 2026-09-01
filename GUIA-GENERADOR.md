# Desplegar el generador de retos, paso a paso

Lo que vas a montar: una **función** en Appwrite que escribe retos a partir de
tu currículo. Está en tu repositorio, en `functions/generador/`.

Tarda unos quince minutos. No hace falta saber programar, pero sí ir con
cuidado en el paso 5, que es donde se atasca todo el mundo.

---

## Antes de empezar

**Una clave de la API de Anthropic.** Entra en
[console.anthropic.com](https://console.anthropic.com) → **API keys** →
**Create key**.

> **Ponle límite de gasto.** En *Settings → Limits* fijas un tope mensual. Una
> tanda de diez retos cuesta unos 6 céntimos, así que con 10 € al mes vas
> sobradísimo — y si algo va mal, no puede irse de las manos.

Copia la clave (empieza por `sk-ant-`) y guárdala: la consola no vuelve a
enseñártela.

---

## 1. Preparar los ficheros

En el repositorio, ejecuta:

```
python3 tools/sync-generador.py
```

Copia el validador y el catálogo de conceptos dentro de la carpeta de la
función. **Hazlo siempre antes de subir**, o el servidor validará con una
versión vieja.

---

## 2. Crear la función en Appwrite

Consola de Appwrite → tu proyecto **Expedición Atlas** → menú izquierdo,
**Functions** → botón **Create function**.

Elige **Manual** (no la plantilla de ejemplo) y rellena:

| Campo | Valor |
|---|---|
| **Name** | `generador` |
| **Runtime** | **Node.js 18.0** o **22.0**. Evita la última recién salida (Node 26): compila peor y esta función no la necesita |

Dale a **Create**.

---

## 3. Los ajustes de la función

Ya dentro de la función, pestaña **Settings**:

| Ajuste | Valor | Por qué |
|---|---|---|
| **Entrypoint** | `src/main.js` | El fichero por el que entra |
| **Build settings → Commands** | `npm install` | Instala el SDK de Anthropic |
| **Execute access** | **Users** | Solo con sesión de docente. Con `Any`, cualquiera con la URL gasta la cuenta |
| **Timeout** | **300** | De fábrica son 15 segundos y **no bastan** |

> **El timeout es el error más común.** Diez retos, más la segunda pasada que
> los vuelve a resolver para comprobar la respuesta marcada, pasan del minuto.
> Con 15 segundos la función se corta y el panel dice «ha fallado» sin que
> haya fallado nada.

---

## 4. La clave: cada docente la suya

**No pongas ninguna clave en la función.** Cada docente pega la suya en
*Configuración → 🤖 Retos con IA*, se queda en su navegador y se le pasa a la
función en cada petición, que no la guarda. Cada uno paga lo suyo.

Esto no es solo una cuestión de facturas, y conviene entender por qué antes
de cambiarlo:

> El **Function ID viene ya puesto en la app**, para que nadie tenga que
> teclearlo. Eso significa que el identificador **viaja también a las tablets
> del alumnado**, porque `config.js` se sirve a todos. Y las cuentas del
> alumnado tienen sesión de Appwrite, que es justo lo que pide *Execute
> access: Users*.
>
> Lo único que impide que una cuenta de alumno ejecute el generador y gaste
> la cuenta de alguien es que **la función no tenga clave**: sin clave corta
> con «No hay clave de API» y no llama a nadie. Un alumno curioso encuentra
> una puerta que no da a ninguna parte.

Si algún día pones `ANTHROPIC_API_KEY` en *Settings → Variables* para tener
una clave del centro, esa puerta pasa a dar a tu factura. Si aun así lo
necesitas, hazlo con dos cosas a la vez:

- Un **límite de gasto** en `console.anthropic.com`, bajo.
- Y quita el Function ID de `js/config.js`, dejándolo en `''`, para que cada
  docente lo teclee en *Acceso y nube* y no viaje en lo que se sirve.

---

## 5. Subir el código

Dos caminos. **El segundo es más cómodo si ya tienes el repositorio en GitHub.**

### A) A mano

En tu ordenador, comprime el **contenido** de `functions/generador/` — es
decir, que dentro del `.tar.gz` estén `package.json` y la carpeta `src/`, no
una carpeta `generador` envolviéndolo:

```
cd functions/generador
tar --exclude node_modules -czf ../../generador.tar.gz .
```

En Appwrite, pestaña **Deployments** → **Create deployment** → **Manual** →
sube `generador.tar.gz`. Deja **Activate** marcado.

### B) Conectando el repositorio

**Deployments → Create deployment → Git** → conecta tu cuenta de GitHub y elige
`damp83/Gamificacion-`.

Dos campos hay que mirarlos con lupa, porque Appwrite los rellena solo y casi
siempre los rellena mal:

| Campo | Valor exacto | Si está mal |
|---|---|---|
| **Root directory** | `functions/generador` | Sin barra delante ni detrás. Vacío, Appwrite empaqueta el repositorio entero y falla |
| **Production branch** | `claude/new-session-5sbfxo` | Appwrite propone `main` de fábrica, **y en este repositorio no existe ninguna rama `main`** |

Si la rama que pone no existe, Appwrite no encuentra nada que empaquetar, y el
despliegue falla con la caja vacía: **Total size 0 B**.

---

## 6. Comprobar que ha subido bien

En **Deployments** debe salir en verde con estado **Ready**. Si sale
**Failed**, pulsa encima: lo primero que hay que mirar no es el mensaje de
error, es el **Total size**.

| Lo que ves en el despliegue fallido | Lo que pasa |
|---|---|
| **Total size 0 B** (y dura 3–5 segundos) | Appwrite no ha empaquetado nada. Es el **Root directory** o la **Production branch**: revisa la tabla de arriba. El mensaje de error da igual, no ha llegado a compilar |
| Total size de algunos cientos de KB, error en `npm install` | Ahí sí llegó el código. Suele ser que el `.tar.gz` lleva una carpeta de más: dentro del `.tar.gz` el `package.json` tiene que estar en la raíz, no dentro de `generador/` |
| «An internal error occurred while building» | Es el mensaje genérico de Appwrite, sirve para cualquiera de los dos casos. Si el tamaño es 0 B, no le hagas caso: es el empaquetado |

Dos cosas más que valen un intento antes de escribir a nadie:

1. **Redeploy**, una vez. El propio mensaje de Appwrite dice «try again», y a
   veces es verdad.
2. **Baja el runtime.** Si elegiste Node 26, cámbialo a **Node 22** o **Node
   18**: son las versiones asentadas. Esta función no necesita nada posterior
   a Node 18 —el `package.json` lo declara así— y las imágenes de
   compilación recién salidas fallan más.


### Comprobar que dentro está nuestro código y no la plantilla

Si creaste la función desde la plantilla de ejemplo de Appwrite, puede que
siga ahí. Se sale de dudas en diez segundos: **Execute**, con el cuerpo
vacío, y mira la ejecución en la pestaña **Executions**.

| Lo que responde | Qué es |
|---|---|
| `400` con `content-length: 119` | **Es nuestro código.** Son los 119 bytes exactos del aviso «Falta el currículo». Que te dé un error es lo correcto: has llamado sin currículo y lo ha rechazado |
| `401` con `content-length: 104` | También es nuestro código: te ha rechazado por no ir identificado |
| `200` con «Hello, World!» | Es la plantilla. Revisa en *Settings* que **Entrypoint** sea `src/main.js` y **Build settings → Commands** sea `npm install`, y vuelve a desplegar |

El texto completo está en **Response → Body**. Ojo, que la consola abre por
*Headers* y ahí no se lee nada.

---

## 7. El ID en la app

**Normalmente no hay que hacer nada**: el Function ID de la función del
centro viene ya escrito en `js/config.js`, así que ningún docente lo teclea.
Comprueba solo que coincide con el que sale arriba de la pantalla de la
función, junto a su nombre.

Si montas **otra** función distinta —la tuya, en tu propio proyecto—, copia
su identificador y pégalo en **Configuración → 🔐 Acceso y nube → Function ID
(generador de retos)**. Lo que escribas ahí manda sobre lo que trae la app, y
se queda solo en ese equipo.

---

## 8. La primera generación

**Configuración → 🤖 Retos con IA**:

1. Pega tu clave, si vas a usar la tuya.
2. Pega el currículo de tu área y ciclo, o sube un `.txt`.
3. Elige pozo, estrato, curso y cuántos. **Empieza con 3**, no con 10: si algo
   está mal configurado, lo sabrás por seis céntimos menos.
4. **Generar retos.** Tarda. Es normal.

Deberías ver los retos en la cola y, debajo, los que se hayan tirado con el
motivo.

---

## Si algo no va

| Lo que ves | Lo que pasa |
|---|---|
| «Entra con tu cuenta de docente» | No hay sesión. Ve a *Mis clases* y entra |
| «Falta el ID de la función» | El paso 7 |
| «No existe ninguna función con ese ID» | El ID está mal copiado |
| «Tu cuenta no puede ejecutar la función» | *Execute access* no está en **Users** |
| **«La función ha fallado»** | Casi siempre el **timeout**. Ponlo en 300 |
| «No hay clave de API» | Ni la tuya en el panel ni la del centro en la función |
| «La clave de la API no vale» | Mal copiada, o borrada en la consola de Anthropic |
| «La cuenta se ha quedado sin saldo» | Recarga en console.anthropic.com |
| Se tiran casi todos los retos | El currículo pegado no cubre lo que pides. Mira los motivos |

Para ver qué pasó de verdad: en Appwrite, la función → pestaña **Executions**
→ pincha la última. Ahí están los registros y el error.

---

## Lo que cuesta

| | |
|---|---|
| Una tanda de 10 retos | ~6 céntimos |
| El banco de un curso entero (~1 600 retos) | ~9 €, una vez |

El currículo se cachea, así que la segunda tanda de la misma área cuesta menos
que la primera. En el panel te sale el gasto en tokens de cada generación.
