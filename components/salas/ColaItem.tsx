import UserAvatar from "@/components/perfil/UserAvatar";
import LetraFuenteIcon from "@/components/salas/LetraFuenteIcon";
import {
  getColaItemIconoTipo,
  resolverNombreArtistaDisplay,
} from "@/lib/buscador";
import { getColaVariant, type ColaVariant } from "@/lib/cola-logic";
import {
  estimateColaCenterDistance,
  getColaRollerStyle,
  getColaRollerTransform,
  shouldShowTocadaChip,
  type ColaCenterDistance,
} from "@/lib/cola-roller";
import type { ColaItem } from "@/types";
import ColaSiguienteButton from "@/components/salas/ColaSiguienteButton";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";

type ColaItemProps = {
  item: ColaItem;
  items: ColaItem[];
  index: number;
  centerDistance?: ColaCenterDistance;
  isFocalRow?: boolean;
  useViewportScaleOnly?: boolean;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
  onFinalize?: (id: number) => void;
};

function stopDragPointer(event: ReactPointerEvent) {
  event.stopPropagation();
}

function variantClasses(variant: ColaVariant): string {
  switch (variant) {
    case "tocada":
      return "border-border-subtle/60 bg-bg-card";
    case "activa":
      return "border-accent bg-accent shadow-[0_4px_18px_rgba(244,132,95,0.42)]";
    case "pendiente":
      return "border-border-card bg-bg-card";
    case "proxima":
      return "";
  }
}

function buildRollerStyle(
  items: ColaItem[],
  index: number,
  centerDistance: ColaCenterDistance,
  isSelected: boolean,
  isFocalRow: boolean,
  useViewportScaleOnly: boolean,
): CSSProperties | undefined {
  if (isSelected) {
    return {
      transform: "scale(1)",
      transformOrigin: "center center",
      opacity: 1,
      marginBottom: 0,
    };
  }

  const roller = getColaRollerStyle(
    items,
    index,
    centerDistance,
    isFocalRow,
    useViewportScaleOnly,
  );

  return {
    transform: getColaRollerTransform(roller),
    transformOrigin: roller.transformOrigin,
    opacity: roller.opacity,
    filter: roller.filter,
    marginBottom: roller.marginBottom,
    zIndex: roller.zIndex,
  };
}

export default function ColaItemCard({
  item,
  items,
  index,
  centerDistance,
  isFocalRow = false,
  useViewportScaleOnly = false,
  isSelected = false,
  onSelect,
  onFinalize,
}: ColaItemProps) {
  const variant = getColaVariant(item, items);
  const iconoTipo = getColaItemIconoTipo(item);
  const { nombre, artista } = resolverNombreArtistaDisplay(
    item.nombre,
    item.artista,
  );
  const isPendiente = item.estado === "pendiente";
  const isActiva = variant === "activa";
  const isProxima = variant === "proxima";
  const showAvatar = isPendiente;
  const showTocadaChip = shouldShowTocadaChip(items, index);
  const resolvedCenterDistance =
    centerDistance ?? estimateColaCenterDistance(items, index);
  const rollerStyle = buildRollerStyle(
    items,
    index,
    resolvedCenterDistance,
    isSelected,
    isFocalRow,
    useViewportScaleOnly,
  );

  const songText = (
    <div className="min-w-0 flex-1">
      <p
        className={`truncate select-none ${
          isActiva
            ? "text-[18px] font-bold leading-snug text-bg-darker"
            : "text-[16px] font-semibold leading-snug text-text-primary"
        }`}
      >
        {nombre}
      </p>
      {artista && (
        <p
          className={`truncate select-none ${
            isActiva
              ? "text-[15px] font-semibold leading-snug text-bg-darker/75"
              : "text-[13px] leading-snug text-text-muted"
          }`}
        >
          {artista}
        </p>
      )}
    </div>
  );

  const songIcon = (
    <div
      className="flex size-5 shrink-0 items-center justify-center self-center"
      aria-hidden="true"
    >
      <LetraFuenteIcon tipo={iconoTipo} uniform />
    </div>
  );

  const songContent = (
    <div
      role={isPendiente && !isSelected ? "button" : undefined}
      tabIndex={isPendiente && !isSelected ? 0 : undefined}
      onClick={() => isPendiente && !isSelected && onSelect?.(item.id)}
      onKeyDown={(event) => {
        if (
          isPendiente &&
          !isSelected &&
          (event.key === "Enter" || event.key === " ")
        ) {
          event.preventDefault();
          onSelect?.(item.id);
        }
      }}
      aria-label={isPendiente ? `Activar ${nombre}` : undefined}
      className={`flex min-w-0 flex-1 items-center gap-2 text-left select-none ${
        isPendiente && !isSelected ? "cursor-pointer" : "cursor-default"
      }`}
    >
      {songIcon}
      {songText}
    </div>
  );

  const avatarSlot = showAvatar ? (
    <div
      className="pointer-events-none flex size-8 shrink-0 items-center justify-center px-1"
      aria-label={
        item.agregado_nombre
          ? `Agregada por ${item.agregado_nombre}`
          : "Agregada por usuario desconocido"
      }
      title={item.agregado_nombre ?? undefined}
    >
      <UserAvatar
        nombre={item.agregado_nombre ?? ""}
        email=""
        avatarUrl={item.agregado_avatar_url ?? null}
        size={28}
      />
    </div>
  ) : null;

  if (isProxima) {
    return (
      <div className="cola-roller-item overflow-visible" style={rollerStyle}>
        <div
          className="flex overflow-hidden rounded-[10px]"
          onContextMenu={(event) => event.preventDefault()}
        >
          <div
            className="flex w-6 shrink-0 items-center justify-center bg-accent/85"
            aria-hidden="true"
          >
            <span className="text-[8px] font-extrabold uppercase tracking-[0.5px] text-white [transform:rotate(180deg)] [writing-mode:vertical-rl]">
              Próx
            </span>
          </div>

          <div className="flex flex-1 items-center gap-3 rounded-r-[10px] border border-l-0 border-border-card bg-bg-card px-3 py-2.5">
            {songContent}
            {avatarSlot}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cola-roller-item overflow-visible" style={rollerStyle}>
      <div
        className={`flex items-stretch overflow-hidden rounded-[12px] border ${
          isActiva ? "min-h-[68px]" : "items-center py-2.5 px-3"
        } ${variantClasses(variant)}`}
        onContextMenu={isPendiente ? (event) => event.preventDefault() : undefined}
      >
        {isActiva && (
          <div
            className="flex w-6 shrink-0 items-center justify-center self-stretch bg-letra-bg"
            aria-hidden="true"
          >
            <span
              className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              Activa
            </span>
          </div>
        )}

        <div
          className={`flex min-w-0 flex-1 items-center ${
            isActiva ? "gap-2 py-4 pl-2 pr-2" : "gap-2"
          }`}
        >
          {!isPendiente && !isActiva ? (
            <div className="w-6 shrink-0" aria-hidden="true" />
          ) : null}

          {songContent}

          {showTocadaChip && (
            <span
              className="shrink-0 rounded-full border border-transparent px-1.5 py-px text-[8px] text-text-muted/35"
              aria-label="Canción ya tocada"
            >
              Tocada
            </span>
          )}

          {isActiva && items.some((i) => i.estado === "pendiente") && (
            <ColaSiguienteButton
              onClick={(event) => {
                event.stopPropagation();
                onFinalize?.(item.id);
              }}
              onPointerDown={stopDragPointer}
            />
          )}

          {avatarSlot}
        </div>
      </div>
    </div>
  );
}
