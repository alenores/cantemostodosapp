import {
  CANCIONERO_HUB_MODULES,
  type HubModuleSection,
} from "@/lib/cancionero-hub-modules";
import {
  HUB_DESTINATION_AFINADOR_DESCRIPTION,
  HUB_DESTINATION_CANCIONERO_DESCRIPTION,
  HUB_DESTINATION_INDIVIDUAL_DESCRIPTION,
  HUB_DESTINATION_PRACTICA_DESCRIPTION,
  HUB_DESTINATION_SALAS_DESCRIPTION,
  HUB_SECTION_CANCIONES_LABEL,
  HUB_SECTION_HERRAMIENTAS_LABEL,
  HUB_SECTION_PRACTICA_LABEL,
} from "@/lib/herramientas-product";
import {
  Library,
  MicVocal,
  Music2,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type PcNavSection = {
  id: HubModuleSection;
  label: string;
  items: (typeof CANCIONERO_HUB_MODULES)[number][];
};

export type PcSidebarLinkSection = {
  type: "link";
  id: "individual" | "salas";
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  isActive: (pathname: string) => boolean;
};

export type PcSidebarExpandableSection = {
  type: "expandable";
  id: HubModuleSection;
  label: string;
  description: string;
  icon: LucideIcon;
  items: (typeof CANCIONERO_HUB_MODULES)[number][];
};

export type PcSidebarSection = PcSidebarLinkSection | PcSidebarExpandableSection;

export const PC_SIDEBAR_SECTIONS: PcSidebarSection[] = [
  {
    type: "expandable",
    id: "canciones",
    label: HUB_SECTION_CANCIONES_LABEL,
    description: HUB_DESTINATION_CANCIONERO_DESCRIPTION,
    icon: Library,
    items: CANCIONERO_HUB_MODULES.filter((module) => module.section === "canciones"),
  },
  {
    type: "link",
    id: "individual",
    label: "Individual",
    description: HUB_DESTINATION_INDIVIDUAL_DESCRIPTION,
    icon: Music2,
    href: "/individual",
    isActive: (pathname) =>
      pathname === "/individual" || pathname.startsWith("/individual/"),
  },
  {
    type: "link",
    id: "salas",
    label: "Salas",
    description: HUB_DESTINATION_SALAS_DESCRIPTION,
    icon: Users,
    href: "/salas",
    isActive: (pathname) =>
      pathname === "/salas" || pathname.startsWith("/salas/"),
  },
  {
    type: "expandable",
    id: "herramientas",
    label: HUB_SECTION_HERRAMIENTAS_LABEL,
    description: HUB_DESTINATION_AFINADOR_DESCRIPTION,
    icon: Wrench,
    items: CANCIONERO_HUB_MODULES.filter(
      (module) => module.section === "herramientas",
    ),
  },
  {
    type: "expandable",
    id: "practica",
    label: HUB_SECTION_PRACTICA_LABEL,
    description: HUB_DESTINATION_PRACTICA_DESCRIPTION,
    icon: MicVocal,
    items: CANCIONERO_HUB_MODULES.filter((module) => module.section === "practica"),
  },
];

export const PC_NAV_SECTIONS: PcNavSection[] = PC_SIDEBAR_SECTIONS.filter(
  (section): section is PcSidebarExpandableSection => section.type === "expandable",
).map(({ id, label, items }) => ({ id, label, items }));

const PC_TOOL_PREFIXES = ["/canciones/", "/herramientas/", "/practica/"] as const;

export function isPcToolRoute(pathname: string): boolean {
  return PC_TOOL_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function getPcNavSectionForPath(
  pathname: string,
): HubModuleSection | null {
  for (const section of PC_NAV_SECTIONS) {
    if (
      section.items.some(
        (item) => item.href && pathname.startsWith(item.href),
      )
    ) {
      return section.id;
    }
  }

  return null;
}

export function isPcNavItemActive(pathname: string, href?: string): boolean {
  if (!href) {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
