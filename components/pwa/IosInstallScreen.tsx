"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { TapButton } from "@/components/ui/TapFeedback";
import { PWA_HOME_ICON_LABEL, PWA_HOME_ICON_SRC } from "@/lib/pwa-home-label";
import { linkWhatsappSoporte } from "@/lib/soporte";

/** Azul real de Safari. No es color de la app: no se cambia. */
const SAFARI_AZUL = "#378ADD";

function IconoWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M20.5 3.5A11.6 11.6 0 0 0 2.1 17.4L1 23l5.8-1.5a11.5 11.5 0 0 0 5.2 1.3h.1A11.6 11.6 0 0 0 20.5 3.5Zm-8.4 17.3a9.6 9.6 0 0 1-4.9-1.3l-.4-.2-3.4.9.9-3.3-.2-.4a9.6 9.6 0 1 1 8 4.3Zm5.3-7.2c-.3-.1-1.8-.9-2.1-1-.3-.1-.5-.1-.8.2l-.6.8c-.2.2-.3.3-.6.1s-1.2-.4-2.2-1.3c-.8-.7-1.3-1.6-1.5-1.8-.1-.3 0-.4.1-.6l.4-.4.3-.5c.1-.2.1-.4 0-.6s-.8-2-1.1-2.7c-.3-.7-.6-.6-.8-.6h-.7c-.2 0-.6.1-.9.4s-1.1 1.1-1.1 2.7 1.1 3.1 1.2 3.3c.2.2 2.2 3.5 5.4 4.9.8.3 1.4.5 1.9.6.8.3 1.5.2 2 .1.6-.1 1.8-.8 2.1-1.5.2-.8.2-1.4.2-1.5-.1-.2-.3-.3-.6-.4Z" />
    </svg>
  );
}

function BotonCerrar({ onClose }: { onClose: () => void }) {
  return (
    <TapButton
      type="button"
      onClick={onClose}
      aria-label="Cerrar"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white"
    >
      <X size={19} strokeWidth={2.4} />
    </TapButton>
  );
}

function IconoCompartirSafari({ grande = false, lado }: { grande?: boolean; lado?: number }) {
  const size = lado ?? (grande ? 29 : 13);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v10" stroke={SAFARI_AZUL} strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M8.5 6.5L12 3l3.5 3.5"
        stroke={SAFARI_AZUL}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 13v6a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19v-6"
        stroke={SAFARI_AZUL}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DibujoCompartir() {
  return (
    <span
      aria-hidden
      className="relative block overflow-hidden rounded-[11px] border-2 border-[var(--rock-light)] bg-[var(--chalk)]"
      style={{ width: 62, height: 78 }}
    >
      <span
        className="absolute rounded-[5px] opacity-50"
        style={{
          inset: "4px 4px 20px",
          background:
            "repeating-linear-gradient(to bottom, var(--chalk-dark) 0 3px, transparent 3px 9px)",
        }}
      />
      <span
        className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t-[1.5px] border-[var(--chalk-dark)] bg-[var(--chalk)]"
        style={{ height: 20 }}
      >
        <span className="h-[5px] w-[5px] rounded-full bg-[var(--chalk-dark)]" />
        <span className="relative flex h-5 w-5 items-center justify-center">
          <span
            className="ios-install-halo absolute rounded-full"
            style={{ inset: -3, border: `2px solid ${SAFARI_AZUL}` }}
          />
          <IconoCompartirSafari />
          <span
            className="ios-install-dedo absolute left-1/2 text-[17px]"
            style={{ bottom: -8, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))" }}
          >
            👆
          </span>
        </span>
        <span className="h-[5px] w-[5px] rounded-full bg-[var(--chalk-dark)]" />
      </span>
    </span>
  );
}

function DibujoAgregar() {
  return (
    <span
      aria-hidden
      className="grid gap-[5px] rounded-[10px] border-2 border-[var(--rock-light)] bg-[var(--chalk)] px-[7px] py-2"
      style={{ width: 76 }}
    >
      <span className="h-[7px] rounded-[3px] bg-[var(--chalk-dark)]" />
      <span className="ios-install-opcion flex items-center justify-center rounded-[4px] text-[6px] font-extrabold">
        Agregar a inicio
      </span>
      <span className="h-[7px] rounded-[3px] bg-[var(--chalk-dark)]" />
      <span className="ios-install-agregar mt-[3px] flex items-center justify-center rounded-[4px] text-[6.5px] font-black">
        Agregar
      </span>
    </span>
  );
}

function DibujoIcono() {
  return (
    <span
      aria-hidden
      className="grid content-start items-center gap-x-[5px] gap-y-[4px] rounded-[11px] border-2 border-[var(--rock-light)] bg-[var(--chalk)] px-[6px] py-[7px]"
      style={{ width: 76, height: 86, gridTemplateColumns: "14px 28px 14px" }}
    >
      <span className="h-[13px] rounded-[4px] bg-[var(--chalk-dark)]" />
      <img
        src={PWA_HOME_ICON_SRC}
        alt=""
        className="ios-install-nuestra h-[28px] w-[28px] rounded-[7px] object-cover"
      />
      <span className="h-[13px] rounded-[4px] bg-[var(--chalk-dark)]" />
      <span className="col-span-3 text-center text-[6.5px] font-bold leading-none text-[var(--rock-mid)]">
        {PWA_HOME_ICON_LABEL}
      </span>
      <span className="h-[13px] rounded-[4px] bg-[var(--chalk-dark)]" />
      <span className="h-[13px] justify-self-center rounded-[4px] bg-[var(--chalk-dark)]" style={{ width: 14 }} />
      <span className="h-[13px] rounded-[4px] bg-[var(--chalk-dark)]" />
    </span>
  );
}

type PasoProps = {
  numero: number;
  dibujo: React.ReactNode;
  frase: React.ReactNode;
  detalle: React.ReactNode;
  ojo?: React.ReactNode;
};

function Paso({ numero, dibujo, frase, detalle, ojo }: PasoProps) {
  return (
    <li
      className={`ios-install-paso ios-install-paso-${numero} grid items-start`}
      style={{ gridTemplateColumns: "22px 80px minmax(0, 1fr)", columnGap: 10 }}
    >
      <span
        aria-hidden
        className="relative z-[1] mt-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-black text-white shadow-[0_0_0_3px_var(--chalk)]"
      >
        {numero}
      </span>
      <span className="flex justify-center">{dibujo}</span>
      <span className="grid min-w-0 gap-[3px] pt-0.5">
        <span className="text-[14.5px] font-bold leading-tight text-[var(--rock)]">{frase}</span>
        <span className="text-[11.5px] leading-snug text-[var(--rock-mid)]">{detalle}</span>
        {ojo ? (
          <span className="mt-[3px] text-[10.5px] italic leading-snug text-[var(--rock-light)]">{ojo}</span>
        ) : null}
      </span>
    </li>
  );
}

function AyudaInstalacion({ onVolver, onClose }: { onVolver: () => void; onClose: () => void }) {
  const whatsappUrl = linkWhatsappSoporte(
    "Hola, estoy intentando instalar Cantemos Todos en mi iPhone y no lo logro. Me trabé en este paso: ",
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <TapButton type="button" onClick={onVolver} className="min-h-10 text-[13px] font-bold text-[var(--accent)]">
          ‹&nbsp; Instalación
        </TapButton>
        <BotonCerrar onClose={onClose} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <h2 className="mb-0 mt-4 text-center text-[25px] font-black tracking-tight text-[var(--rock)]">
          No logro instalar la app
        </h2>
        <p className="mb-3.5 mt-4 text-center text-[15px] font-semibold leading-snug text-[var(--rock)]">
          ¿Dónde te trabaste?
        </p>

        <ol className="m-0 flex list-none flex-col p-0">
          <li
            className="ios-install-paso ios-install-paso-1 grid items-start"
            style={{ gridTemplateColumns: "22px minmax(0, 1fr)", columnGap: 12 }}
          >
            <span
              aria-hidden
              className="relative z-[1] mt-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-black text-white shadow-[0_0_0_3px_var(--chalk)]"
            >
              1
            </span>
            <div className="min-w-0 pt-0.5">
              <h3 className="m-0 text-[14.5px] font-bold leading-tight text-[var(--rock)]">
                No encuentro el ícono de la flecha
              </h3>
              <span
                className="my-2 flex h-[50px] w-[50px] items-center justify-center rounded-xl bg-[#378ADD]/10"
                role="img"
                aria-label="Cuadrado con una flecha hacia arriba"
              >
                <IconoCompartirSafari grande />
              </span>
              <p className="m-0 text-[12.5px] leading-[1.45] text-[var(--rock-mid)]">
                <span className="block">Está abajo, en la barra de Safari.</span>
                <span className="mt-1 block">Si solo ves la dirección, tocala para que aparezca.</span>
                <span className="mt-1 block">
                  ¿No lo ves? Tocá <strong>«•••»</strong> y elegí <strong>«Compartir»</strong>.
                </span>
              </p>
            </div>
          </li>

          <li
            className="ios-install-paso ios-install-paso-2 grid items-start"
            style={{ gridTemplateColumns: "22px minmax(0, 1fr)", columnGap: 12 }}
          >
            <span
              aria-hidden
              className="relative z-[1] mt-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-black text-white shadow-[0_0_0_3px_var(--chalk)]"
            >
              2
            </span>
            <div className="min-w-0 pt-0.5">
              <h3 className="m-0 text-[14.5px] font-bold leading-tight text-[var(--rock)]">
                No aparece «Agregar a Inicio»
              </h3>
              <p className="mb-0 mt-1.5 text-[12.5px] leading-[1.45] text-[var(--rock-mid)]">
                Después de tocar el ícono, <strong>deslizá hacia abajo</strong> por la lista. Puede decir{" "}
                <strong>«Agregar a Inicio»</strong> o <strong>«Añadir a pantalla de inicio»</strong>. Si no aparece, bajá
                hasta <strong>«Editar acciones»</strong> y agregá esa opción. Después tocá <strong>«Agregar»</strong>.
              </p>
            </div>
          </li>
        </ol>

        <div className="mt-5 border-t border-[var(--chalk-dark)] pt-4 text-center">
          <h3 className="m-0 text-[15px] font-extrabold text-[var(--rock)]">¿Seguís sin poder instalarla?</h3>
          <p className="mb-3 mt-1 text-[12.5px] leading-snug text-[var(--rock-mid)]">
            Escribime y contame en cuál de los pasos te trabaste.
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--chalk-dark)] bg-[var(--chalk-mid)] px-4 py-2 text-[13px] font-bold text-[var(--rock)] shadow-md"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
              <IconoWhatsApp className="h-4 w-4 fill-current" />
            </span>
            Escribime por WhatsApp
          </a>
        </div>
      </div>
    </>
  );
}

function IosInstallScreen({ onClose }: { onClose: () => void }) {
  const [ayudaAbierta, setAyudaAbierta] = useState(false);

  useHardwareBack(true, () => {
    if (ayudaAbierta) setAyudaAbierta(false);
    else onClose();
  });

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cómo instalar la app"
      className="pwa-install-tema fixed inset-0 z-[500] flex flex-col overflow-hidden bg-[var(--chalk)] px-[18px] pt-4"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)",
      }}
    >
      {ayudaAbierta ? (
        <AyudaInstalacion onVolver={() => setAyudaAbierta(false)} onClose={onClose} />
      ) : (
        <>
          <div className="flex justify-end">
            <BotonCerrar onClose={onClose} />
          </div>

          <h2 className="m-0 text-center text-[25px] font-black tracking-tight text-[var(--rock)]">Instalá la app</h2>
          <p className="mt-[5px] text-center text-[12.5px] italic leading-snug text-[var(--rock-mid)]">
            «agregar a pantalla de inicio»
          </p>

          <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="my-auto">
              <p className="mb-3.5 text-center text-[15px] font-semibold leading-snug text-[var(--rock)]">
                Sin salir de esta pantalla
              </p>
              <ol className="m-0 flex list-none flex-col p-0">
                <Paso
                  numero={1}
                  dibujo={<DibujoCompartir />}
                  frase={
                    <>
                      Buscá este ícono{" "}
                      <span className="inline-block align-[-5px]">
                        <IconoCompartirSafari lado={22} />
                      </span>{" "}
                      y tocalo
                    </>
                  }
                  detalle={
                    <>
                      <span className="block">Si solo ves la dirección, tocala para que aparezca.</span>
                      <span className="mt-1 block">
                        ¿No lo ves? Tocá <strong>«•••»</strong> y elegí <strong>«Compartir»</strong>.
                      </span>
                    </>
                  }
                />
                <Paso
                  numero={2}
                  dibujo={<DibujoAgregar />}
                  frase={
                    <>
                      Buscá <span className="text-[var(--accent)]">«Agregar a inicio»</span>
                    </>
                  }
                  detalle={
                    <>
                      <strong>Deslizá hacia abajo</strong> por la lista hasta encontrarlo. Después tocá{" "}
                      <strong>«Agregar»</strong>, arriba a la derecha.
                    </>
                  }
                  ojo="Tu teléfono puede decir «Añadir a pantalla de inicio»."
                />
                <Paso
                  numero={3}
                  dibujo={<DibujoIcono />}
                  frase={
                    <>
                      Cerrá esta pantalla y buscá la app desde el ícono
                    </>
                  }
                  detalle={
                    <>
                      Se llama <strong className="text-[var(--accent)]">«{PWA_HOME_ICON_LABEL}»</strong> y queda en tu
                      pantalla de inicio.
                    </>
                  }
                />
              </ol>
            </div>
          </div>
          <TapButton
            type="button"
            onClick={() => setAyudaAbierta(true)}
            className="mt-2 min-h-10 w-full rounded-xl border border-[var(--chalk-dark)] bg-[var(--chalk-mid)] px-3 py-2 text-[13px] font-bold text-[var(--rock)]"
          >
            No logro instalar la app
          </TapButton>
        </>
      )}
    </div>,
    document.body,
  );
}

/** En el iPhone el botón no instala: abre la pantalla que explica cómo hacerlo. */
export function IosInstallCta({ abierta, onClose }: { abierta: boolean; onClose: () => void }) {
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  if (!montado || !abierta) return null;
  return <IosInstallScreen onClose={onClose} />;
}
