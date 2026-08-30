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
| **Runtime** | **Node.js 18.0** o superior |

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

## 4. La clave (opcional aquí)

Si quieres que **cada docente use la suya**, no toques nada: se pega en el
panel de la app y ya está. Es lo recomendable en un claustro, porque cada uno
paga lo suyo.

Si prefieres **una clave del centro** para quien no tenga la suya:
*Settings → Variables* → **Create variable**:

| Key | Value |
|---|---|
| `ANTHROPIC_API_KEY` | tu clave `sk-ant-…` |

Las dos pueden convivir: manda la del docente y la del centro es la reserva.

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

Importante: en **Root directory** pon `functions/generador`. Si lo dejas
vacío, Appwrite intenta desplegar el repositorio entero y falla.

---

## 6. Comprobar que ha subido bien

En **Deployments** debe salir en verde con estado **Ready**. Si sale
**Failed**, pulsa encima y lee el registro de compilación: casi siempre es que
`npm install` no ha encontrado el `package.json`, y eso es que el `.tar.gz`
lleva una carpeta de más o el **Root directory** está mal.

---

## 7. Pegar el ID en la app

Arriba de la pantalla de la función, junto a su nombre, hay un identificador
—algo como `6a9f12ab003c…`—. Cópialo.

En Expedición Atlas: **Configuración → 🔐 Acceso y nube → Function ID
(generador de retos)**. Pégalo ahí.

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
