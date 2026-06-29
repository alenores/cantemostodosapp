export const COLA_INDIVIDUAL_CHANGED_EVENT = "cola-individual-changed";

export function dispatchColaIndividualChanged(): void {
  window.dispatchEvent(new CustomEvent(COLA_INDIVIDUAL_CHANGED_EVENT));
}
