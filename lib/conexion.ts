/**
 * ¿Hay señal **de verdad**? (2026-09-27)
 *
 * ## Por qué
 *
 * Hasta acá la app decidía con `navigator.onLine`, que solo contesta «¿el teléfono está enganchado
 * a alguna red?». Con una rayita de cobertura dice que sí aunque no pase nada: la app se creía con
 * internet, esperaba respuestas que no llegaban nunca y quedaba en un limbo — pantallas trabadas al
 * pasar de una a otra, la cola y el cancionero cargando para siempre. Con modo avión, en cambio,
 * `navigator.onLine` dice que no y el modo sin señal anda perfecto.
 *
 * Es lo mismo que se resolvió en Vías de Escalada el 2026-09-27.
 *
 * ## Qué hace
 *
 * Le pregunta a nuestro servidor si responde **a tiempo** (`/api/senal`, `TIEMPO_PRUEBA_MS`). Si
 * no responde, la señal está **débil**, y para la app eso es lo mismo que no tener señal:
 * `hayConexion()` da `false` y se avisa con `EVENTO_CONEXION`. El modo sin señal no cambia en nada:
 * es el de siempre, el del modo avión.
 *
 * Se prueba al arrancar, al volver a la app, cuando el teléfono avisa que volvió la red y cuando
 * un pedido a la base tarda de más o falla (`avisarFallaDeRed`, desde `lib/supabase/client.ts`).
 * Mientras la señal esté débil se vuelve a probar sola cada `REPRUEBA_MS`: apenas responda a
 * tiempo, la app vuelve al modo con señal sin que nadie toque nada.
 *
 * ## Qué NO hace
 *
 * - No cambia el modo sin señal ni qué se muestra en él.
 * - No frena la descarga de novedades del cancionero que pidió la persona: sus pedidos fallan
 *   solos si no hay señal.
 */

/** El mismo nombre para todo lo que escucha cambios de señal (`useOnlineStatus` y los sincronizadores). */
export const EVENTO_CONEXION = "conexion-cambio";

/**
 * Cuánto se espera la respuesta de la prueba. Es un archivo de nada: con señal normal vuelve en
 * décimas de segundo, y con 3G flojo en uno o dos. Si pasan cuatro, la señal no alcanza para usar
 * nada de lo que necesita internet.
 */
const TIEMPO_PRUEBA_MS = 4000;

/** Con señal débil, cada cuánto se vuelve a probar para salir sola del modo sin señal. */
const REPRUEBA_MS = 20_000;

/**
 * Pausa mínima entre pruebas disparadas por pedidos lentos o por volver a la app: una pantalla con
 * muchos pedidos que fallan juntos no tiene que disparar una prueba por cada uno.
 */
const PAUSA_ENTRE_PRUEBAS_MS = 10_000;

let senalDebil = false;
let pruebaEnCurso: Promise<boolean> | null = null;
let ultimaPrueba = 0;
let temporizadorReprueba: ReturnType<typeof setTimeout> | null = null;

/**
 * En el servidor no hay teléfono: se responde «hay red», como hacía la app antes de este archivo,
 * para que la primera pantalla dibujada coincida con la del servidor.
 */
function tieneRed(): boolean {
  return typeof navigator === "undefined" || navigator.onLine;
}

/**
 * ¿Se puede usar internet? Reemplaza a `navigator.onLine` en toda decisión de «intento la red o
 * uso lo guardado». Sin red, `false`; con red pero sin respuesta a tiempo, también `false`.
 */
export function hayConexion(): boolean {
  return tieneRed() && !senalDebil;
}

/** Hay red pero no responde: el gris del cerro. Para diagnóstico. */
export function haySenalDebil(): boolean {
  return tieneRed() && senalDebil;
}

function avisarCambio(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(EVENTO_CONEXION));
}

function programarReprueba(): void {
  if (temporizadorReprueba !== null) return;
  temporizadorReprueba = setTimeout(() => {
    temporizadorReprueba = null;
    if (!senalDebil || !tieneRed()) return;
    void probarConexion(true).then(() => {
      if (senalDebil) programarReprueba();
    });
  }, REPRUEBA_MS);
}

function cancelarReprueba(): void {
  if (temporizadorReprueba === null) return;
  clearTimeout(temporizadorReprueba);
  temporizadorReprueba = null;
}

function fijarSenalDebil(debil: boolean): void {
  if (debil === senalDebil) return;
  senalDebil = debil;
  if (debil) {
    programarReprueba();
  } else {
    cancelarReprueba();
  }
  avisarCambio();
}

async function preguntarAlServidor(): Promise<boolean> {
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), TIEMPO_PRUEBA_MS);
  try {
    const respuesta = await fetch(`/api/senal?t=${Date.now()}`, {
      cache: "no-store",
      signal: control.signal,
    });
    return respuesta.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(corte);
  }
}

/**
 * Prueba si el servidor responde a tiempo. Devuelve `true` si hay señal que sirve.
 *
 * Sin red no prueba nada: eso ya lo sabe el teléfono y lo avisa con su propio evento.
 */
export function probarConexion(forzar = false): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(true);
  if (!tieneRed()) {
    /** Sin red la señal débil no significa nada: al volver la red se prueba de cero. */
    if (senalDebil) {
      senalDebil = false;
      cancelarReprueba();
    }
    return Promise.resolve(false);
  }
  if (pruebaEnCurso) return pruebaEnCurso;
  if (!forzar && Date.now() - ultimaPrueba < PAUSA_ENTRE_PRUEBAS_MS) {
    return Promise.resolve(!senalDebil);
  }

  ultimaPrueba = Date.now();
  pruebaEnCurso = (async () => {
    /**
     * Para declarar la señal débil tiene que fallar **dos veces seguidas**: con 3G flojo y una
     * descarga grande ocupando la línea, una sola respuesta lenta no alcanza para decidir. Para
     * volver alcanza con una que llegue a tiempo.
     */
    let respondio = await preguntarAlServidor();
    if (!respondio && !senalDebil && tieneRed()) respondio = await preguntarAlServidor();
    /** Si en el medio se fue la red del todo, manda el teléfono: no es «señal débil». */
    if (!tieneRed()) return false;
    fijarSenalDebil(!respondio);
    return respondio;
  })().finally(() => {
    pruebaEnCurso = null;
  });
  return pruebaEnCurso;
}

/**
 * Un pedido a la base tardó de más o falló por la red. Si la app se cree con señal, vale la pena
 * confirmarlo: puede ser el gris del cerro.
 */
export function avisarFallaDeRed(): void {
  if (!tieneRed() || senalDebil) return;
  void probarConexion();
}

let vigilando = false;

/**
 * Arranca la vigilancia. Una sola vez por página (lo llaman `ConexionRunner` y `useOnlineStatus`);
 * llamarla de nuevo no hace nada.
 */
export function iniciarVigilanciaDeConexion(): void {
  if (vigilando || typeof window === "undefined") return;
  vigilando = true;

  window.addEventListener("online", () => {
    void probarConexion(true);
  });
  window.addEventListener("offline", () => {
    if (senalDebil) {
      senalDebil = false;
      cancelarReprueba();
    }
    avisarCambio();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void probarConexion();
  });

  void probarConexion(true);
}
