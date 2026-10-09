"use client";

import { TapButton } from "@/components/ui/TapFeedback";
import { colorPorUsuario } from "@/lib/presence";
import {
  agregarPersonaASala,
  buscarPersonasParaSala,
  type PersonaBuscada,
} from "@/lib/sala-miembros";
import type { SalaMiembro } from "@/types";
import { useEffect, useRef, useState } from "react";

export function FotoPersona({
  nombre,
  avatarUrl,
  userId,
  sizeClassName = "size-16",
}: {
  nombre: string;
  avatarUrl?: string | null;
  userId: string;
  sizeClassName?: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className={`${sizeClassName} shrink-0 rounded-full object-cover`}
      />
    );
  }

  const inicial = (nombre.trim()[0] ?? "?").toUpperCase();

  return (
    <span
      className={`flex ${sizeClassName} shrink-0 items-center justify-center rounded-full text-xl font-bold text-white`}
      style={{ background: colorPorUsuario(userId) }}
      aria-hidden="true"
    >
      {inicial}
    </span>
  );
}

export function FilaPersonaSala({
  miembro,
  esVos = false,
  puedeSacar = false,
  disabled = false,
  onSacar,
}: {
  miembro: SalaMiembro;
  esVos?: boolean;
  puedeSacar?: boolean;
  disabled?: boolean;
  onSacar?: (userId: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 py-1.5">
      <FotoPersona
        nombre={miembro.nombre}
        avatarUrl={miembro.avatar_url}
        userId={miembro.user_id}
        sizeClassName="size-16"
      />
      <p className="min-w-0 flex-1 text-[17px] font-semibold leading-snug text-text-primary">
        <span className="break-words">{miembro.nombre}</span>
        {esVos ? (
          <span className="font-medium text-text-muted"> (vos)</span>
        ) : null}
        {miembro.rol === "owner" ? (
          <span className="font-medium text-text-muted"> (creador)</span>
        ) : null}
      </p>
      {puedeSacar && miembro.rol === "member" ? (
        <TapButton
          type="button"
          aria-label={`Sacar a ${miembro.nombre}`}
          disabled={disabled}
          onClick={() => onSacar?.(miembro.user_id)}
          className="shrink-0 px-1 text-sm text-text-muted disabled:opacity-50"
        >
          Sacar
        </TapButton>
      ) : null}
    </li>
  );
}

export function ResultadoParaSumar({
  persona,
  sumando = false,
  disabled = false,
  onSumar,
}: {
  persona: PersonaBuscada;
  sumando?: boolean;
  disabled?: boolean;
  onSumar: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-2">
      <FotoPersona
        nombre={persona.nombre}
        avatarUrl={persona.avatar_url}
        userId={persona.user_id}
        sizeClassName="size-20"
      />
      <p className="min-w-0 flex-1 text-[17px] font-semibold leading-snug text-text-primary">
        <span className="break-words">{persona.nombre}</span>
        {persona.ya_esta ? (
          <span className="mt-0.5 block text-sm font-medium text-text-muted">
            Ya está en la sala
          </span>
        ) : null}
      </p>
      {persona.ya_esta ? null : (
        <TapButton
          type="button"
          disabled={disabled}
          onClick={onSumar}
          className="shrink-0 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {sumando ? "Sumando…" : "Sumar"}
        </TapButton>
      )}
    </li>
  );
}

export function SumarPersona({
  salaId,
  onSumada,
}: {
  salaId: number;
  onSumada: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [resultados, setResultados] = useState<PersonaBuscada[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [sumandoId, setSumandoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const pedido = useRef(0);

  useEffect(() => {
    const consulta = nombre.trim();
    if (consulta.length < 2) {
      setResultados([]);
      setBuscando(false);
      setAviso(null);
      return;
    }

    const id = ++pedido.current;
    const timer = setTimeout(() => {
      setBuscando(true);
      setAviso(null);
      void buscarPersonasParaSala(salaId, consulta)
        .then((personas) => {
          if (pedido.current !== id) {
            return;
          }
          setResultados(personas);
          setAviso(
            personas.length === 0 ? "No hay nadie con ese nombre" : null,
          );
        })
        .catch((err: unknown) => {
          if (pedido.current !== id) {
            return;
          }
          setResultados([]);
          setAviso(
            err instanceof Error
              ? err.message
              : "No se pudo buscar a esa persona",
          );
        })
        .finally(() => {
          if (pedido.current === id) {
            setBuscando(false);
          }
        });
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [nombre, salaId]);

  async function handleSumar(persona: PersonaBuscada) {
    setSumandoId(persona.user_id);
    setAviso(null);
    try {
      await agregarPersonaASala(salaId, persona.user_id);
      setResultados((actual) =>
        actual.map((item) =>
          item.user_id === persona.user_id ? { ...item, ya_esta: true } : item,
        ),
      );
      onSumada();
    } catch (err) {
      setAviso(
        err instanceof Error ? err.message : "No se pudo sumar a esa persona",
      );
    } finally {
      setSumandoId(null);
    }
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor={`sumar-persona-${salaId}`}
        className="block text-sm font-semibold text-text-primary"
      >
        Sumar a alguien
      </label>
      <input
        id={`sumar-persona-${salaId}`}
        type="text"
        autoComplete="off"
        placeholder="Escribí su nombre"
        value={nombre}
        onChange={(event) => setNombre(event.target.value)}
        className="min-h-11 w-full rounded-2xl border border-border bg-bg-app px-4 text-base text-text-primary outline-none focus:border-accent"
      />
      {buscando ? (
        <p className="text-sm text-text-muted">Buscando…</p>
      ) : null}
      {resultados.length > 0 ? (
        <ul className="space-y-1">
          {resultados.map((persona) => (
            <ResultadoParaSumar
              key={persona.user_id}
              persona={persona}
              sumando={sumandoId === persona.user_id}
              disabled={sumandoId !== null}
              onSumar={() => void handleSumar(persona)}
            />
          ))}
        </ul>
      ) : null}
      {aviso ? (
        <p className="text-sm text-text-muted" role="status">
          {aviso}
        </p>
      ) : null}
    </div>
  );
}
