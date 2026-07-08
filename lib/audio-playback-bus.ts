export type AudioPlaybackBus = {
  /** Conectar aquí en lugar de audioContext.destination */
  output: GainNode;
  track(source: AudioScheduledSourceNode): void;
  /** Silencia y detiene todas las fuentes activas al instante */
  cut(): void;
  /** Prepara un bus limpio para una nueva sesión de reproducción */
  reset(): void;
};

export function createPlaybackBus(audioContext: AudioContext): AudioPlaybackBus {
  let output = audioContext.createGain();
  output.gain.value = 1;
  output.connect(audioContext.destination);

  const sources = new Set<AudioScheduledSourceNode>();

  function cut(): void {
    const now = audioContext.currentTime;

    try {
      output.gain.cancelScheduledValues(now);
      output.gain.setValueAtTime(0, now);
    } catch {
      // El contexto puede estar cerrado
    }

    for (const source of sources) {
      try {
        source.stop(now);
      } catch {
        // Ya detenido o en estado inválido
      }
    }

    sources.clear();
  }

  function reset(): void {
    cut();

    try {
      output.disconnect();
    } catch {
      // ignore
    }

    output = audioContext.createGain();
    output.gain.value = 1;
    output.connect(audioContext.destination);
  }

  return {
    get output() {
      return output;
    },
    track(source: AudioScheduledSourceNode) {
      sources.add(source);
    },
    cut,
    reset,
  };
}
