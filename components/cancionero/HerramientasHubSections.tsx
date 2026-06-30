import {
  HERRAMIENTAS_PRACTICE_PILLARS,
  HUB_SECTION_CANCIONES_LABEL,
  HUB_SECTION_PRACTICA_LABEL,
} from "@/lib/herramientas-product";

export function HerramientasHubSectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
      {label}
    </p>
  );
}

export function HerramientasHubPracticeIntro() {
  return (
    <div className="rounded-[10px] border border-border bg-bg-card px-3 py-2.5">
      <p className="text-[11px] font-semibold text-text-primary">
        Tres herramientas, tres preguntas
      </p>
      <ul className="mt-1.5 space-y-1">
        {HERRAMIENTAS_PRACTICE_PILLARS.map((pillar) => (
          <li
            key={pillar.id}
            className="text-[11px] leading-snug text-text-muted"
          >
            <span className="font-semibold text-text-secondary">
              {pillar.label}
            </span>
            {" · "}
            {pillar.question}
          </li>
        ))}
      </ul>
    </div>
  );
}

export {
  HUB_SECTION_CANCIONES_LABEL,
  HUB_SECTION_PRACTICA_LABEL,
};
