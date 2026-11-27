/**
 * Tapa negra del arranque. Se pinta con la primera página, encima del inicio,
 * y se corre sola cuando el inicio ya está armado (ver SplashScreen).
 */

function Figura({ tipo }: { tipo: "negra" | "corchea" | "semicorchea" }) {
  if (tipo === "negra") {
    return (
      <svg viewBox="0 0 32 40" className="presentacion-figura" aria-hidden="true">
        <ellipse cx="12" cy="30" rx="9" ry="6.5" fill="currentColor" />
        <line x1="21" y1="30" x2="21" y2="4" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      </svg>
    );
  }

  if (tipo === "corchea") {
    return (
      <svg viewBox="0 0 36 40" className="presentacion-figura" aria-hidden="true">
        <ellipse cx="12" cy="30" rx="9" ry="6.5" fill="currentColor" />
        <path d="M21 30 V4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
        <path d="M21 4 Q30 10 21 18" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 36 40" className="presentacion-figura" aria-hidden="true">
      <ellipse cx="12" cy="30" rx="9" ry="6.5" fill="currentColor" />
      <path d="M21 30 V4" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M21 4 Q30 9 21 15" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
      <path d="M21 15 Q30 20 21 26" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
    </svg>
  );
}

export default function PresentacionArranque() {
  return (
    <div id="inline-splash" className="presentacion" role="status" aria-label="Abriendo Cantemos Todos">
      <div className="presentacion-fondo">
        <div className="presentacion-escena">
          <p className="presentacion-palabra presentacion-pieza presentacion-cantemos">cantemos</p>
          <p className="presentacion-palabra presentacion-pieza presentacion-todos">todos</p>
          <div className="presentacion-notas">
            <span className="presentacion-pieza presentacion-nota">
              <Figura tipo="negra" />
            </span>
            <span className="presentacion-pieza presentacion-nota">
              <Figura tipo="corchea" />
            </span>
            <span className="presentacion-pieza presentacion-nota">
              <Figura tipo="semicorchea" />
            </span>
            <span className="presentacion-pieza presentacion-nota">
              <Figura tipo="corchea" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
