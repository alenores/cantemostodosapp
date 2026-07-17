import { HubSectionLoadingSkeleton } from "@/components/ui/NavLoadingSkeleton";
import { CANCIONERO_HUB_MODULES } from "@/lib/cancionero-hub-modules";

const PRACTICA_MODULE_COUNT = CANCIONERO_HUB_MODULES.filter(
  (module) => module.section === "practica" && !module.desktopOnly,
).length;

export default function Loading() {
  return <HubSectionLoadingSkeleton cardCount={PRACTICA_MODULE_COUNT} />;
}
