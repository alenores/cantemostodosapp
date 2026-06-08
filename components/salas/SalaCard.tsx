import type { Sala } from "@/types";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type SalaCardProps = {
  sala: Pick<Sala, "id" | "nombre" | "descripcion">;
};

export default function SalaCard({ sala }: SalaCardProps) {
  return (
    <Link
      href={`/salas/${sala.id}`}
      className="flex min-h-11 items-center gap-3 rounded-[12px] border border-border bg-bg-card px-4 py-3"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-text-primary">
          {sala.nombre}
        </p>
        {sala.descripcion && (
          <p className="truncate text-sm text-text-muted">{sala.descripcion}</p>
        )}
      </div>
      <ArrowRight
        className="size-5 shrink-0 text-text-muted"
        aria-hidden="true"
      />
    </Link>
  );
}
