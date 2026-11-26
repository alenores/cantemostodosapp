"use client";

import CancioneroSubpageShell from "@/components/cancionero/CancioneroSubpageShell";
import AddButton from "@/components/ui/AddButton";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { TapButton } from "@/components/ui/TapFeedback";
import SolicitarCancionSheet from "@/components/cancionero/SolicitarCancionSheet";
import VincularSolicitudSheet from "@/components/cancionero/VincularSolicitudSheet";
import { useAutor } from "@/hooks/useAutor";
import { useCategoriaUsuario } from "@/hooks/useCategoriaUsuario";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { useNavigateWithProgress } from "@/hooks/useNavigateWithProgress";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSolicitudes } from "@/hooks/useSolicitudes";
import {
  ESTADOS_PROCESADOS,
  SOLICITUDES_HREF,
  marcarAvisosVistos,
  resolverSolicitud,
  type EstadoSolicitud,
  type Solicitud,
} from "@/lib/solicitudes";
import { createClient } from "@/lib/supabase/client";
import { ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type Pestana = "pendientes" | "procesadas" | "revisar";

const SNACKBAR_MS = 3000;

const CHIP: Record<EstadoSolicitud, { texto: string; clase: string; nota?: string }> = {
  pendiente: { texto: "Pendiente", clase: "bg-accent/15 text-accent" },
  cargada: { texto: "Ya está", clase: "bg-solicitud-ok/15 text-solicitud-ok" },
  ya_existia: {
    texto: "Ya estaba",
    clase: "bg-solicitud-ya/15 text-solicitud-ya",
    nota: "Ya la había cargado otra persona.",
  },
  en_revision: {
    texto: "En revisión",
    clase: "bg-solicitud-revision/15 text-solicitud-revision",
    nota: "El agente no pudo cargarla; la estamos revisando.",
  },
  no_se_pudo: {
    texto: "No se pudo",
    clase: "bg-solicitud-no/15 text-solicitud-no",
    nota: "No se pudo cargar.",
  },
};

function Avatar({ userId }: { userId: string }) {
  const autor = useAutor(userId);
  const inicial = (autor?.nombre ?? "?").trim().charAt(0).toUpperCase();
  return autor?.avatar_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={autor.avatar_url} alt="" className="size-9 shrink-0 rounded-full object-cover" />
  ) : (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bg-darker text-xs font-bold text-text-secondary">
      {inicial}
    </span>
  );
}

function Fila({
  numero,
  userId,
  nombre,
  artista,
  mia,
  chip,
  nota,
  onClick,
  acciones,
}: {
  numero?: number;
  userId: string;
  nombre: string;
  artista: string;
  mia: boolean;
  chip?: { texto: string; clase: string };
  nota?: string;
  onClick?: () => void;
  acciones?: ReactNode;
}) {
  const contenido = (
    <>
      {numero != null ? (
        <span className="w-5 shrink-0 text-center text-xs text-text-muted">{numero}</span>
      ) : null}
      <Avatar userId={userId} />
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[15px] font-bold text-text-primary">{nombre}</span>
        <span className="block truncate text-[13px] text-text-muted">{artista}</span>
        {nota ? <span className="mt-0.5 block text-xs text-text-muted">{nota}</span> : null}
      </span>
      {chip ? (
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${chip.clase}`}>
          {chip.texto}
        </span>
      ) : null}
      {onClick ? <ChevronRight className="size-4 shrink-0 text-text-muted" aria-hidden="true" /> : null}
    </>
  );
  const clase = `flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 ${
    mia ? "border-2 border-accent bg-accent/10" : "border-border bg-bg-card"
  }`;

  return (
    <li>
      {onClick ? (
        <TapButton type="button" onClick={onClick} className={clase}>
          {contenido}
        </TapButton>
      ) : (
        <div className={clase}>{contenido}</div>
      )}
      {acciones}
    </li>
  );
}

export default function SolicitudesPageClient() {
  const supabase = useMemo(() => createClient(), []);
  const navigate = useNavigateWithProgress();
  const isDesktop = useIsDesktop();
  const online = useOnlineStatus();
  const categoria = useCategoriaUsuario();
  const esDueno = categoria === "dueno";
  const { userId, lista, sinEnviar, avisos, repetidas, limpiarRepetidas } = useSolicitudes();

  const [pestana, setPestana] = useState<Pestana>("pendientes");
  const [formAbierto, setFormAbierto] = useState(false);
  const [pedirLogin, setPedirLogin] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [vinculando, setVinculando] = useState<Solicitud | null>(null);
  const [descartando, setDescartando] = useState<Solicitud | null>(null);

  const pendientes = useMemo(() => lista.filter((s) => s.estado === "pendiente"), [lista]);
  const procesadas = useMemo(
    () =>
      lista
        .filter((s) => ESTADOS_PROCESADOS.includes(s.estado))
        .sort((a, b) => (b.procesada_en ?? b.created_at).localeCompare(a.procesada_en ?? a.created_at)),
    [lista],
  );
  const enRevision = useMemo(() => lista.filter((s) => s.estado === "en_revision"), [lista]);

  // Abrir la pantalla apaga la campanita de esta cuenta.
  useEffect(() => {
    if (userId && avisos > 0) void marcarAvisosVistos(supabase, userId);
  }, [avisos, supabase, userId]);

  // Pedidos hechos sin señal que, al enviarse, ya estaban pedidos o cargados.
  const avisoRepetidas =
    repetidas.length === 0
      ? null
      : repetidas.length === 1
        ? `«${repetidas[0].nombre}» ya la habían pedido o ya estaba en el Cancionero.`
        : `${repetidas.length} pedidos ya estaban pedidos o en el Cancionero.`;
  const mensaje = snackbar ?? avisoRepetidas;

  useEffect(() => {
    if (!mensaje) return;
    const t = window.setTimeout(() => {
      setSnackbar(null);
      limpiarRepetidas();
    }, SNACKBAR_MS);
    return () => window.clearTimeout(t);
  }, [limpiarRepetidas, mensaje]);

  function abrirFormulario() {
    if (userId === undefined) return;
    if (!userId) {
      setPedirLogin(true);
      return;
    }
    setFormAbierto(true);
  }

  function verCancion(id: number | null) {
    if (id != null) navigate(`/canciones/cancionero?ver=${id}`);
  }

  async function confirmarDescarte() {
    const solicitud = descartando;
    setDescartando(null);
    if (!solicitud) return;
    const error = await resolverSolicitud(supabase, solicitud.id, null);
    setSnackbar(error ? "No se pudo guardar. Probá de nuevo con señal." : "Marcada como «No se pudo».");
  }

  const pestanas: { id: Pestana; texto: string }[] = [
    { id: "pendientes", texto: `Pendientes (${pendientes.length + sinEnviar.length})` },
    { id: "procesadas", texto: "Procesadas" },
    ...(esDueno ? [{ id: "revisar" as const, texto: `Revisar (${enRevision.length})` }] : []),
  ];

  return (
    <>
      <CancioneroSubpageShell
        title="Solicitudes"
        backHref="/"
        backAriaLabel="Volver al inicio"
        headerAction={isDesktop ? <AddButton ariaLabel="Solicitar canción" onClick={abrirFormulario} /> : undefined}
      >
        <p className="text-sm text-text-muted">Pedí una canción y un agente de IA la suma al Cancionero.</p>

        <div className="flex rounded-2xl bg-bg-darker p-1" role="tablist">
          {pestanas.map((p) => (
            <TapButton
              key={p.id}
              type="button"
              role="tab"
              aria-selected={pestana === p.id}
              onClick={() => setPestana(p.id)}
              className={`flex-1 rounded-xl px-2 py-2 text-[13px] font-bold ${
                pestana === p.id ? "bg-bg-card text-text-primary shadow-sm" : "text-text-muted"
              }`}
            >
              {p.texto}
            </TapButton>
          ))}
        </div>

        {pestana === "pendientes" ? (
          pendientes.length + sinEnviar.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-muted">No hay canciones pendientes.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pendientes.map((s, i) => (
                <Fila
                  key={s.id}
                  numero={i + 1}
                  userId={s.user_id}
                  nombre={s.nombre}
                  artista={s.artista}
                  mia={s.user_id === userId}
                  chip={s.user_id === userId ? { texto: "Tuya", clase: "bg-accent text-white" } : undefined}
                />
              ))}
              {sinEnviar.map((s, i) => (
                <Fila
                  key={s.localId}
                  numero={pendientes.length + i + 1}
                  userId={s.userId}
                  nombre={s.nombre}
                  artista={s.artista}
                  mia
                  chip={{ texto: "Sin enviar", clase: "bg-bg-darker text-text-muted" }}
                  nota="Se envía cuando haya señal."
                />
              ))}
            </ul>
          )
        ) : null}

        {pestana === "procesadas" ? (
          procesadas.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-muted">Todavía no hay solicitudes procesadas.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {procesadas.map((s) => {
                const chip = CHIP[s.estado];
                const abre = (s.estado === "cargada" || s.estado === "ya_existia") && s.cancion_id != null;
                return (
                  <Fila
                    key={s.id}
                    userId={s.user_id}
                    nombre={s.nombre}
                    artista={s.artista}
                    mia={s.user_id === userId}
                    chip={chip}
                    nota={chip.nota}
                    onClick={abre ? () => verCancion(s.cancion_id) : undefined}
                  />
                );
              })}
            </ul>
          )
        ) : null}

        {pestana === "revisar" && esDueno ? (
          enRevision.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-muted">No hay solicitudes para revisar.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {enRevision.map((s) => (
                <Fila
                  key={s.id}
                  userId={s.user_id}
                  nombre={s.nombre}
                  artista={s.artista}
                  mia={false}
                  chip={CHIP.en_revision}
                  acciones={
                    <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                      <TapButton
                        type="button"
                        disabled={!online}
                        onClick={() => navigate(`/canciones/editor?desde=solicitudes&solicitud=${s.id}`)}
                        className="rounded-xl bg-accent px-2 py-2 text-xs font-bold text-white disabled:opacity-45"
                      >
                        Cargar en editor
                      </TapButton>
                      <TapButton
                        type="button"
                        disabled={!online}
                        onClick={() => setVinculando(s)}
                        className="rounded-xl border border-accent px-2 py-2 text-xs font-bold text-accent disabled:opacity-45"
                      >
                        Ya está cargada
                      </TapButton>
                      <TapButton
                        type="button"
                        disabled={!online}
                        onClick={() => setDescartando(s)}
                        className="rounded-xl border border-solicitud-no px-2 py-2 text-xs font-bold text-solicitud-no disabled:opacity-45"
                      >
                        No se puede
                      </TapButton>
                    </div>
                  }
                />
              ))}
            </ul>
          )
        ) : null}
      </CancioneroSubpageShell>

      {!isDesktop ? (
        <TapButton
          type="button"
          aria-label="Solicitar canción"
          onClick={abrirFormulario}
          className="fixed right-5 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 84px)" }}
        >
          <Plus className="size-7" aria-hidden="true" />
        </TapButton>
      ) : null}

      {formAbierto && userId ? (
        <SolicitarCancionSheet
          userId={userId}
          onClose={() => setFormAbierto(false)}
          onResultado={(mensaje) => {
            setFormAbierto(false);
            setPestana("pendientes");
            setSnackbar(mensaje);
          }}
          onVerCancion={(id) => {
            setFormAbierto(false);
            verCancion(id);
          }}
        />
      ) : null}

      {vinculando ? (
        <VincularSolicitudSheet
          solicitud={vinculando}
          onClose={() => setVinculando(null)}
          onListo={(error) => {
            setVinculando(null);
            setSnackbar(error ? "No se pudo vincular. Probá de nuevo con señal." : "Vinculada: ya figura como cargada.");
          }}
        />
      ) : null}

      <ConfirmDialog
        open={pedirLogin}
        message="Para pedir canciones, iniciá sesión."
        confirmLabel="Iniciar sesión"
        onConfirm={() => {
          setPedirLogin(false);
          navigate(`/auth/login?next=${SOLICITUDES_HREF}`);
        }}
        onCancel={() => setPedirLogin(false)}
      />

      <ConfirmDialog
        open={descartando !== null}
        message={descartando ? `¿Marcar «${descartando.nombre}» como que no se puede cargar? Le avisa a quien la pidió.` : ""}
        confirmLabel="No se puede"
        onConfirm={() => void confirmarDescarte()}
        onCancel={() => setDescartando(null)}
      />

      {mensaje ? (
        <div
          role="status"
          className="fixed inset-x-4 z-50 mx-auto max-w-md rounded-xl bg-bg-darker px-4 py-3 text-center text-sm font-semibold text-text-primary shadow-lg"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 150px)" }}
        >
          {mensaje}
        </div>
      ) : null}
    </>
  );
}
