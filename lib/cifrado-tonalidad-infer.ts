import {
  normalizeNotaIndex,
  type AcordePos,
  type Modificador,
  type NotaIndex,
} from "@/lib/cifrado";
import {
  formatTonalidadDetectLabel,
  type TonalidadLineDetectResult,
} from "@/lib/cifrado-import";
import {
  getModificadorPorDefecto,
  isNotaEnEscala,
  type ModoTonal,
} from "@/lib/cifrado-escala";

export type TonalidadInferCandidate = TonalidadLineDetectResult & {
  score: number;
  label: string;
};

export type TonalidadInferResult = {
  candidates: TonalidadInferCandidate[];
  multipleTonalidades: boolean;
};

const MIN_ACORDES_PARA_INFERIR = 3;
const MIN_SCORE_RELATIVO = 0.55;
const CANDIDATE_SCORE_GAP = 0.05;

function sameTonalidad(
  a: TonalidadLineDetectResult,
  b: TonalidadLineDetectResult,
): boolean {
  return a.tonalidadIndex === b.tonalidadIndex && a.modoTonal === b.modoTonal;
}

function primerAcordeTieBreakRank(
  primerAcorde: AcordePos | null,
  candidate: TonalidadLineDetectResult,
): number {
  if (!primerAcorde) {
    return 0;
  }

  if (primerAcorde.noteIndex !== candidate.tonalidadIndex) {
    return 0;
  }

  if (
    candidate.modoTonal === "menor" &&
    (primerAcorde.modifier === "m" || primerAcorde.modifier === "m7")
  ) {
    return 2;
  }

  if (candidate.modoTonal === "mayor" && primerAcorde.modifier !== "m") {
    return 2;
  }

  return 1;
}

function sortCandidatesByPrimerAcorde(
  candidates: TonalidadInferCandidate[],
  primerAcorde: AcordePos | null,
): TonalidadInferCandidate[] {
  return [...candidates].sort((a, b) => {
    const rankDiff =
      primerAcordeTieBreakRank(primerAcorde, b) -
      primerAcordeTieBreakRank(primerAcorde, a);

    if (rankDiff !== 0) {
      return rankDiff;
    }

    return b.score - a.score;
  });
}

function chordFitsTonalidad(
  noteIndex: NotaIndex,
  modifier: Modificador,
  tonalidadIndex: NotaIndex,
  modoTonal: ModoTonal,
): number {
  if (!isNotaEnEscala(noteIndex, tonalidadIndex, modoTonal)) {
    return 0;
  }

  const suggested = getModificadorPorDefecto(
    noteIndex,
    tonalidadIndex,
    modoTonal,
  );

  if (suggested === null) {
    return 1;
  }

  if (modifier === suggested) {
    return 1.5;
  }

  if (modifier === "7" || modifier === "maj7" || modifier === "m7") {
    return 1.25;
  }

  return 1;
}

function scoreAcordesForTonalidad(
  acordes: readonly AcordePos[],
  tonalidadIndex: NotaIndex,
  modoTonal: ModoTonal,
): number {
  if (acordes.length === 0) {
    return 0;
  }

  const total = acordes.reduce((sum, acorde) => {
    return (
      sum +
      chordFitsTonalidad(
        acorde.noteIndex,
        acorde.modifier,
        tonalidadIndex,
        modoTonal,
      )
    );
  }, 0);

  return total / (acordes.length * 1.5);
}

function getAllTonalidadCandidates(): TonalidadLineDetectResult[] {
  const candidates: TonalidadLineDetectResult[] = [];

  for (let index = 0; index < 12; index += 1) {
    const tonalidadIndex = index as NotaIndex;
    candidates.push({ tonalidadIndex, modoTonal: "mayor" });
    candidates.push({ tonalidadIndex, modoTonal: "menor" });
  }

  return candidates;
}

function areRelativeKeys(
  a: TonalidadLineDetectResult,
  b: TonalidadLineDetectResult,
): boolean {
  if (a.modoTonal === b.modoTonal) {
    return false;
  }

  if (a.modoTonal === "mayor" && b.modoTonal === "menor") {
    return normalizeNotaIndex(a.tonalidadIndex - 3) === b.tonalidadIndex;
  }

  if (a.modoTonal === "menor" && b.modoTonal === "mayor") {
    return normalizeNotaIndex(b.tonalidadIndex - 3) === a.tonalidadIndex;
  }

  return false;
}

function pickTopCandidates(
  scored: TonalidadInferCandidate[],
  primerAcorde: AcordePos | null,
): TonalidadInferCandidate[] {
  if (scored.length === 0) {
    return [];
  }

  const bestScore = scored[0]?.score ?? 0;

  if (bestScore < MIN_SCORE_RELATIVO) {
    return [];
  }

  const threshold = bestScore - CANDIDATE_SCORE_GAP;
  const withinThreshold = scored.filter((item) => item.score >= threshold);
  const result: TonalidadInferCandidate[] = [];

  for (const candidate of withinThreshold) {
    if (result.some((item) => sameTonalidad(item, candidate))) {
      continue;
    }

    const isTopTier = candidate.score >= bestScore - 0.001;
    const isRelativeOfIncluded = result.some((item) =>
      areRelativeKeys(item, candidate),
    );

    if (isTopTier || isRelativeOfIncluded) {
      result.push(candidate);
    }

    if (result.length >= 4) {
      break;
    }
  }

  return sortCandidatesByPrimerAcorde(result, primerAcorde);
}

function detectMultipleTonalidades(
  acordes: readonly AcordePos[],
): boolean {
  if (acordes.length < MIN_ACORDES_PARA_INFERIR * 2) {
    return false;
  }

  const lineIndices = [...new Set(acordes.map((acorde) => acorde.lineIndex))].sort(
    (a, b) => a - b,
  );

  if (lineIndices.length < 2) {
    return false;
  }

  const pivot = lineIndices[Math.floor(lineIndices.length / 2)] ?? 0;
  const firstHalf = acordes.filter((acorde) => acorde.lineIndex <= pivot);
  const secondHalf = acordes.filter((acorde) => acorde.lineIndex > pivot);

  if (
    firstHalf.length < MIN_ACORDES_PARA_INFERIR ||
    secondHalf.length < MIN_ACORDES_PARA_INFERIR
  ) {
    return false;
  }

  const bestFirst = pickTopCandidates(scoreAllTonalidades(firstHalf), null)[0];
  const bestSecond = pickTopCandidates(scoreAllTonalidades(secondHalf), null)[0];

  if (!bestFirst || !bestSecond) {
    return false;
  }

  return (
    bestFirst.tonalidadIndex !== bestSecond.tonalidadIndex ||
    bestFirst.modoTonal !== bestSecond.modoTonal
  );
}

function scoreAllTonalidades(
  acordes: readonly AcordePos[],
): TonalidadInferCandidate[] {
  return getAllTonalidadCandidates()
    .map((candidate) => {
      const score = scoreAcordesForTonalidad(
        acordes,
        candidate.tonalidadIndex,
        candidate.modoTonal,
      );

      return {
        ...candidate,
        score,
        label: formatTonalidadDetectLabel(candidate),
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function inferTonalidadFromAcordes(
  acordes: readonly AcordePos[],
  primerAcorde: AcordePos | null = null,
): TonalidadInferResult | null {
  if (acordes.length < MIN_ACORDES_PARA_INFERIR) {
    return null;
  }

  const scored = scoreAllTonalidades(acordes);
  const candidates = pickTopCandidates(scored, primerAcorde);

  if (candidates.length === 0) {
    return null;
  }

  return {
    candidates,
    multipleTonalidades: detectMultipleTonalidades(acordes),
  };
}
