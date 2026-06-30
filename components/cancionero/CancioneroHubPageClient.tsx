"use client";

import AppReadyMarker from "@/components/AppReadyMarker";
import PwaInstallBanners from "@/components/pwa/PwaInstallBanners";
import HubModuleCard from "@/components/ui/HubModuleCard";
import AfinadorModal from "@/components/ui/AfinadorModal";
import EntrenadorVocalModal from "@/components/ui/EntrenadorVocalModal";
import MetronomoModal from "@/components/ui/MetronomoModal";
import { useAfinador } from "@/hooks/useAfinador";
import { useMetronomo } from "@/hooks/useMetronomo";
import { useVoz } from "@/hooks/useVoz";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { useHardwareBack } from "@/hooks/useHardwareBack";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { CANCIONERO_HUB_MODULES } from "@/lib/cancionero-hub-modules";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import { getCancioneroLocalAsCancionero } from "@/lib/offline/cancionero-store";
import { CANCIONERO_SYNC_EVENT } from "@/lib/offline/cancionero-events";
import type { UsuarioActivo } from "@/types";
import { WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type CancioneroHubPageClientProps = {
  usuario: UsuarioActivo;
  globalCountInicial: number;
};

export default function CancioneroHubPageClient({
  usuario,
  globalCountInicial,
}: CancioneroHubPageClientProps) {
  const pathname = usePathname();
  const navigateWithProgress = useNavigateWithProgress();
  const online = useOnlineStatus();
  const [globalCount, setGlobalCount] = useState(globalCountInicial);
  const [afinadorOpen, setAfinadorOpen] = useState(false);
  const [metronomoOpen, setMetronomoOpen] = useState(false);
  const [vozOpen, setVozOpen] = useState(false);
  const [pendingModuleId, setPendingModuleId] = useState<string | null>(null);
  const {
    detection: afinadorDetection,
    micError: afinadorMicError,
    micPermissionGranted: afinadorMicPermissionGranted,
    micReady: afinadorMicReady,
    micStarting: afinadorMicStarting,
    start: startAfinador,
    stop: stopAfinador,
  } = useAfinador();
  const {
    bpm: metronomoBpm,
    isPlaying: metronomoIsPlaying,
    beatPattern: metronomoBeatPattern,
    patternLength: metronomoPatternLength,
    currentBeat: metronomoCurrentBeat,
    micActivo: metronomoMicActivo,
    micPermissionGranted: metronomoMicPermissionGranted,
    micError: metronomoMicError,
    micReady: metronomoMicReady,
    micStarting: metronomoMicStarting,
    hits: metronomoHits,
    beatMarkers: metronomoBeatMarkers,
    start: startMetronomo,
    stop: stopMetronomo,
    setBpm: setMetronomoBpm,
    setPatternLength: setMetronomoPatternLength,
    cycleBeatPatternSlot: cycleMetronomoBeatPatternSlot,
    tapTempo: tapMetronomoTempo,
    tapTempoTapCount: metronomoTapTempoTapCount,
    toggleMic: toggleMetronomoMic,
    requestMic: requestMetronomoMic,
  } = useMetronomo();
  const {
    detection: vozDetection,
    micError: vozMicError,
    micPermissionGranted: vozMicPermissionGranted,
    micReady: vozMicReady,
    micStarting: vozMicStarting,
    target: vozTarget,
    setTarget: setVozTarget,
    octaveExact: vozOctaveExact,
    setOctaveExact: setVozOctaveExact,
    targetFrequency: vozTargetFrequency,
    referenceLabel: vozReferenceLabel,
    centsFromTarget: vozCentsFromTarget,
    accuracy: vozAccuracy,
    feedbackLabel: vozFeedbackLabel,
    historySamples: vozHistorySamples,
    instantAttempts: vozInstantAttempts,
    holdTargetSeconds: vozHoldTargetSeconds,
    setHoldTargetSeconds: setVozHoldTargetSeconds,
    holdCalibre: vozHoldCalibre,
    setHoldCalibre: setVozHoldCalibre,
    celebrationKey: vozCelebrationKey,
    ritmoPlaying: vozRitmoPlaying,
    toggleRitmoPlaying: toggleVozRitmoPlaying,
    stopRitmo: stopVozRitmo,
    ritmoBpm: vozRitmoBpm,
    setRitmoBpm: setVozRitmoBpm,
    ritmoPattern: vozRitmoPattern,
    toggleRitmoPatternSlot: toggleVozRitmoPatternSlot,
    beatMarkers: vozBeatMarkers,
    ritmoVoiceSamples: vozRitmoVoiceSamples,
    start: startVoz,
    stop: stopVoz,
  } = useVoz();

  const refreshGlobalCount = useCallback(async () => {
    const canciones = await getCancioneroLocalAsCancionero();
    setGlobalCount(canciones.length);
  }, []);

  useEffect(() => {
    if (online) {
      setGlobalCount(globalCountInicial);
      return;
    }

    void refreshGlobalCount();
  }, [globalCountInicial, online, refreshGlobalCount]);

  useEffect(() => {
    function handleSyncFinished() {
      void refreshGlobalCount();
    }

    window.addEventListener(CANCIONERO_SYNC_EVENT, handleSyncFinished);

    return () => {
      window.removeEventListener(CANCIONERO_SYNC_EVENT, handleSyncFinished);
    };
  }, [refreshGlobalCount]);

  useHardwareBack(afinadorOpen, () => {
    stopAfinador();
    setAfinadorOpen(false);
  });

  useHardwareBack(metronomoOpen, () => {
    stopMetronomo();
    setMetronomoOpen(false);
  });

  useHardwareBack(vozOpen, () => {
    stopVoz();
    setVozOpen(false);
  });

  useEffect(() => {
    setPendingModuleId(null);
  }, [pathname]);

  const isLoggedIn = usuario.id !== OFFLINE_GUEST_USUARIO.id;

  function handleModuleClick(moduleId: string, href?: string) {
    const moduleDef = CANCIONERO_HUB_MODULES.find((item) => item.id === moduleId);

    if (!moduleDef) {
      return;
    }

    if (moduleDef.requiresAuth && !isLoggedIn) {
      return;
    }

    if (moduleDef.kind === "afinador") {
      setAfinadorOpen(true);
      if (afinadorMicPermissionGranted) {
        void startAfinador();
      }
      return;
    }

    if (moduleDef.kind === "metronomo") {
      setMetronomoOpen(true);
      return;
    }

    if (moduleDef.kind === "voz") {
      setVozOpen(true);
      if (vozMicPermissionGranted) {
        void startVoz();
      }
      return;
    }

    if (href) {
      setPendingModuleId(moduleId);
      navigateWithProgress(href);
    }
  }

  const visibleModules = CANCIONERO_HUB_MODULES.filter(
    (module) => !module.requiresAuth || isLoggedIn,
  );

  const toolModalOpen = afinadorOpen || metronomoOpen || vozOpen;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-app">
      <div
        className={`flex min-h-0 flex-1 flex-col ${
          toolModalOpen
            ? "overflow-hidden"
            : "touch-pan-y overflow-y-auto overscroll-y-contain"
        }`}
      >
        <AppReadyMarker />

        <main className="flex flex-col gap-3 px-4 py-6">
        <PwaInstallBanners />

        {!online && (
          <p
            className="flex items-center gap-2 rounded-[10px] border border-border bg-bg-card px-3 py-2.5 text-sm text-text-muted"
            role="status"
          >
            <WifiOff className="size-4 shrink-0" aria-hidden="true" />
            Sin conexión · mostrando copia local cuando aplique
          </p>
        )}

        <div className="grid grid-cols-2 gap-[10px]">
          {visibleModules.map((module) => {
            const ctaClassName =
              module.ctaVariant === "accent"
                ? "w-full rounded-lg bg-accent px-3 py-[9px] text-center text-sm font-bold text-white"
                : "w-full rounded-lg bg-[#3A3A3A] px-3 py-[9px] text-center text-sm text-white";

            const ctaContent =
              module.id === "cancionero" ? (
                <div className={ctaClassName}>
                  <span className="font-bold">{module.ctaLabel} </span>
                  <span className="font-normal opacity-70">({globalCount})</span>
                </div>
              ) : (
                <span className={ctaClassName}>{module.ctaLabel}</span>
              );

            return (
              <HubModuleCard
                key={module.id}
                label={module.label}
                icon={module.icon}
                iconColor={module.iconColor}
                ariaLabel={
                  module.kind === "afinador"
                    ? "Abrir afinador"
                    : module.kind === "metronomo"
                      ? "Abrir metrónomo"
                      : module.kind === "voz"
                        ? "Abrir entrenador vocal"
                        : `Abrir ${module.label}`
                }
                onClick={() => handleModuleClick(module.id, module.href)}
                pending={pendingModuleId === module.id}
                cta={ctaContent}
              />
            );
          })}
        </div>

        {!isLoggedIn && (
          <p className="text-center text-sm text-text-muted">
            Iniciá sesión para acceder a Mis canciones.
          </p>
        )}
      </main>
      </div>

      <AfinadorModal
        open={afinadorOpen}
        detection={afinadorDetection}
        micError={afinadorMicError}
        micPermissionGranted={afinadorMicPermissionGranted}
        micReady={afinadorMicReady}
        micStarting={afinadorMicStarting}
        onRequestMic={() => void startAfinador()}
        onClose={() => {
          stopAfinador();
          setAfinadorOpen(false);
        }}
      />

      <EntrenadorVocalModal
        open={vozOpen}
        detection={vozDetection}
        micError={vozMicError}
        micPermissionGranted={vozMicPermissionGranted}
        micReady={vozMicReady}
        micStarting={vozMicStarting}
        target={vozTarget}
        onSetTarget={setVozTarget}
        octaveExact={vozOctaveExact}
        onSetOctaveExact={setVozOctaveExact}
        targetFrequency={vozTargetFrequency}
        referenceLabel={vozReferenceLabel}
        centsFromTarget={vozCentsFromTarget}
        accuracy={vozAccuracy}
        feedbackLabel={vozFeedbackLabel}
        historySamples={vozHistorySamples}
        instantAttempts={vozInstantAttempts}
        holdTargetSeconds={vozHoldTargetSeconds}
        onSetHoldTargetSeconds={setVozHoldTargetSeconds}
        holdCalibre={vozHoldCalibre}
        onSetHoldCalibre={setVozHoldCalibre}
        celebrationKey={vozCelebrationKey}
        ritmoPlaying={vozRitmoPlaying}
        onToggleRitmoPlaying={toggleVozRitmoPlaying}
        onStopRitmo={stopVozRitmo}
        ritmoBpm={vozRitmoBpm}
        onSetRitmoBpm={setVozRitmoBpm}
        ritmoPattern={vozRitmoPattern}
        onToggleRitmoPatternSlot={toggleVozRitmoPatternSlot}
        beatMarkers={vozBeatMarkers}
        ritmoVoiceSamples={vozRitmoVoiceSamples}
        onRequestMic={() => void startVoz()}
        onClose={() => {
          stopVoz();
          setVozOpen(false);
        }}
      />

      <MetronomoModal
        open={metronomoOpen}
        bpm={metronomoBpm}
        isPlaying={metronomoIsPlaying}
        beatPattern={metronomoBeatPattern}
        patternLength={metronomoPatternLength}
        currentBeat={metronomoCurrentBeat}
        micActivo={metronomoMicActivo}
        micPermissionGranted={metronomoMicPermissionGranted}
        micError={metronomoMicError}
        micReady={metronomoMicReady}
        micStarting={metronomoMicStarting}
        hits={metronomoHits}
        beatMarkers={metronomoBeatMarkers}
        onStart={startMetronomo}
        onStop={stopMetronomo}
        onSetBpm={setMetronomoBpm}
        onSetPatternLength={setMetronomoPatternLength}
        onCycleBeatPatternSlot={cycleMetronomoBeatPatternSlot}
        onTapTempo={tapMetronomoTempo}
        tapTempoTapCount={metronomoTapTempoTapCount}
        onToggleMic={toggleMetronomoMic}
        onRequestMic={() => void requestMetronomoMic()}
        onClose={() => {
          stopMetronomo();
          setMetronomoOpen(false);
        }}
      />
    </div>
  );
}
