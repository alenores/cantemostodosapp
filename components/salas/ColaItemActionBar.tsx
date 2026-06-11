"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import {
  getColaItemActions,
  type ColaItemActionId,
} from "@/lib/cola-logic";
import type { ColaItem } from "@/types";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronDown,
  ChevronUp,
  Play,
  Trash2,
} from "lucide-react";

type ColaItemActionBarProps = {
  item: ColaItem;
  items: ColaItem[];
  onAction: (actionId: ColaItemActionId, itemId: number) => void;
};

const ACTION_META: Record<
  ColaItemActionId,
  { label: string; icon: typeof Play; danger?: boolean }
> = {
  activar: { label: "Activar", icon: Play },
  subir: { label: "Subir", icon: ChevronUp },
  bajar: { label: "Bajar", icon: ChevronDown },
  proxima: { label: "Sig.", icon: ArrowUpToLine },
  fondo: { label: "Fondo", icon: ArrowDownToLine },
  eliminar: { label: "Quitar", icon: Trash2, danger: true },
};

export default function ColaItemActionBar({
  item,
  items,
  onAction,
}: ColaItemActionBarProps) {
  const actions = getColaItemActions(item, items);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div
      className="cola-item-actions"
      role="toolbar"
      aria-label="Acciones de la canción"
    >
      {actions.map((actionId) => {
        const meta = ACTION_META[actionId];
        const Icon = meta.icon;

        return (
          <TapButton
            key={actionId}
            type="button"
            aria-label={meta.label}
            title={meta.label}
            onClick={() => onAction(actionId, item.id)}
            className={`cola-item-action-btn${
              meta.danger ? " cola-item-action-btn--danger" : ""
            }`}
          >
            <Icon className="size-[18px] shrink-0" strokeWidth={2.25} aria-hidden />
            <span className="cola-item-action-label">{meta.label}</span>
          </TapButton>
        );
      })}
    </div>
  );
}
