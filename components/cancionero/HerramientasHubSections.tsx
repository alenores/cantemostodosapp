import {
  HUB_SECTION_CANCIONES_LABEL,
  HUB_SECTION_HERRAMIENTAS_LABEL,
  HUB_SECTION_PRACTICA_LABEL,
} from "@/lib/herramientas-product";

export function HerramientasHubSectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
      {label}
    </p>
  );
}

export {
  HUB_SECTION_CANCIONES_LABEL,
  HUB_SECTION_HERRAMIENTAS_LABEL,
  HUB_SECTION_PRACTICA_LABEL,
};
