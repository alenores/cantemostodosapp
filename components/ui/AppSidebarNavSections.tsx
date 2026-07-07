"use client";

import { TapLink } from "@/components/ui/TapFeedback";
import { OFFLINE_GUEST_USUARIO } from "@/lib/auth/offline-entry";
import {
  getPcNavSectionForPath,
  isPcNavItemActive,
  PC_SIDEBAR_SECTIONS,
  type PcSidebarExpandableSection,
  type PcSidebarLinkSection,
} from "@/lib/pc-navigation";
import type { UsuarioActivo } from "@/types";
import { ChevronDown, WifiOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type AppSidebarNavSectionsProps = {
  usuario: UsuarioActivo;
  online: boolean;
  salaNombre: string | null;
  conectados: number;
};

function sectionHeaderClass(active: boolean, disabled = false) {
  if (disabled) {
    return "text-text-faint";
  }

  return active
    ? "bg-accent-dim text-accent"
    : "text-text-muted hover:bg-bg-card hover:text-text-primary";
}

function SidebarLinkSection({
  section,
  pathname,
  online,
  salaNombre,
  conectados,
}: {
  section: PcSidebarLinkSection;
  pathname: string;
  online: boolean;
  salaNombre: string | null;
  conectados: number;
}) {
  const { href, label, description, icon: Icon, isActive } = section;
  const active = isActive(pathname);
  const isSalasTab = section.id === "salas";
  const salasUnavailable = isSalasTab && !online;
  const inSala = isSalasTab && salaNombre !== null && online;
  const displayLabel = inSala && salaNombre ? salaNombre : label;
  const showBadge = isSalasTab && conectados > 0 && online;

  return (
    <TapLink
      href={href}
      ariaLabel={
        salasUnavailable
          ? "Salas no disponible sin conexión"
          : `${displayLabel}: ${description}`
      }
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${sectionHeaderClass(active, salasUnavailable)}`}
    >
      {active ? (
        <span
          className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent"
          aria-hidden="true"
        />
      ) : null}

      <span className="relative shrink-0">
        <Icon
          className={`size-5 ${salasUnavailable ? "opacity-50" : ""}`}
          aria-hidden="true"
        />
        {salasUnavailable ? (
          <WifiOff
            className="absolute -right-1 -top-1 size-3 text-text-faint"
            aria-hidden="true"
          />
        ) : null}
        {showBadge ? (
          <span className="absolute -right-1.5 -top-1.5 flex size-[18px] items-center justify-center rounded-full border-2 border-bg-darker bg-accent text-[9px] font-bold text-white">
            {conectados}
          </span>
        ) : null}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-sm font-semibold ${
            inSala ? "text-accent" : ""
          }`}
          title={inSala && salaNombre ? salaNombre : undefined}
        >
          {displayLabel}
        </span>
        <span className="block truncate text-[11px] opacity-70">{description}</span>
      </span>
    </TapLink>
  );
}

function SidebarExpandableSection({
  section,
  pathname,
  isLoggedIn,
  isExpanded,
  onToggle,
}: {
  section: PcSidebarExpandableSection;
  pathname: string;
  isLoggedIn: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const visibleItems = section.items.filter(
    (item) => !item.requiresAuth || isLoggedIn,
  );

  if (visibleItems.length === 0) {
    return null;
  }

  const sectionActive = getPcNavSectionForPath(pathname) === section.id;
  const Icon = section.icon;

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={onToggle}
        className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors ${sectionHeaderClass(sectionActive)}`}
      >
        {sectionActive ? (
          <span
            className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent"
            aria-hidden="true"
          />
        ) : null}

        <Icon className="size-5 shrink-0" aria-hidden="true" />

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {section.label}
          </span>
          <span className="block truncate text-[11px] opacity-70">
            {section.description}
          </span>
        </span>

        <ChevronDown
          className={`size-4 shrink-0 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isExpanded ? (
        <div className="ml-3 flex flex-col gap-0.5 border-l border-border/70 pl-2">
          {visibleItems.map((item) => {
            const href = item.href ?? "/";
            const active = isPcNavItemActive(pathname, href);
            const ItemIcon = item.icon;

            return (
              <TapLink
                key={item.id}
                href={href}
                ariaLabel={item.label}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                  active
                    ? "bg-accent-dim text-accent"
                    : "text-text-muted hover:bg-bg-card hover:text-text-primary"
                }`}
              >
                <ItemIcon
                  className="size-4 shrink-0"
                  style={{ color: item.iconColor }}
                  aria-hidden="true"
                />
                <span className="truncate text-sm font-medium">{item.label}</span>
              </TapLink>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export default function AppSidebarNavSections({
  usuario,
  online,
  salaNombre,
  conectados,
}: AppSidebarNavSectionsProps) {
  const pathname = usePathname();
  const isLoggedIn = usuario.id !== OFFLINE_GUEST_USUARIO.id;
  const activeSection = getPcNavSectionForPath(pathname);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    activeSection,
  );

  useEffect(() => {
    if (activeSection) {
      setExpandedSection(activeSection);
    }
  }, [activeSection]);

  return (
    <>
      {PC_SIDEBAR_SECTIONS.map((section) => {
        if (section.type === "link") {
          return (
            <SidebarLinkSection
              key={section.id}
              section={section}
              pathname={pathname}
              online={online}
              salaNombre={salaNombre}
              conectados={conectados}
            />
          );
        }

        return (
          <SidebarExpandableSection
            key={section.id}
            section={section}
            pathname={pathname}
            isLoggedIn={isLoggedIn}
            isExpanded={expandedSection === section.id}
            onToggle={() =>
              setExpandedSection((current) =>
                current === section.id ? null : section.id,
              )
            }
          />
        );
      })}
    </>
  );
}
