"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { X, Plus, Pencil, Trash2, Upload, Save, User as UserIcon } from "lucide-react";
import { TapButton } from "@/components/ui/TapFeedback";
import { createClient } from "@/lib/supabase/client";
import { getArtistas, addArtista, updateArtista, deleteArtista, uploadAvatar } from "@/lib/artistas";
import { buscarArtistaCoincidente } from "@/lib/artistas-match";
import ArtistaSugerencias from "@/components/cifrado/ArtistaSugerencias";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Artista } from "@/types";

type Dialogo = {
  message: string;
  confirmLabel?: string;
  deleteConfirm?: boolean;
  /** Sin acción: solo un aviso con «Entendido». */
  onConfirm?: () => void;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function ArtistasManagerModal({ isOpen, onClose }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [artistas, setArtistas] = useState<Artista[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [nombre, setNombre] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadArtistas();
    }
  }, [isOpen, supabase]);

  async function loadArtistas() {
    setLoading(true);
    const data = await getArtistas(supabase);
    setArtistas(data);
    setLoading(false);
  }

  function resetForm() {
    setNombre("");
    setAvatarUrl(null);
    setAvatarFile(null);
    setAvatarPreview(null);
    setEditingId(null);
  }

  function handleEdit(artista: Artista) {
    setEditingId(artista.id);
    setNombre(artista.nombre);
    setAvatarUrl(artista.avatar_url);
    setAvatarFile(null);
    setAvatarPreview(artista.avatar_url);
  }

  function handleDelete(id: string) {
    setDialogo({
      message: "¿Seguro que querés borrar este artista?",
      confirmLabel: "Borrar",
      deleteConfirm: true,
      onConfirm: () => void borrarArtista(id),
    });
  }

  async function borrarArtista(id: string) {
    const ok = await deleteArtista(supabase, id);
    if (ok) {
      setArtistas(prev => prev.filter(a => a.id !== id));
    }
  }

  async function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 128;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", { type: "image/webp" }));
            } else {
              resolve(file);
            }
          }, "image/webp", 0.8);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const compressedFile = await compressImage(file);
    setAvatarFile(compressedFile);
    setAvatarPreview(URL.createObjectURL(compressedFile));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) return;

    const { exacto, parecidos } = buscarArtistaCoincidente(nombre, artistas, {
      excluirId: editingId,
    });
    if (exacto) {
      setDialogo({ message: `Ya existe «${exacto.nombre}». Usá ese artista.` });
      return;
    }
    if (parecidos.length > 0) {
      setDialogo({
        message: `Se parece a: ${parecidos.map((a) => a.nombre).join(", ")}.\n¿Guardar «${nombre.trim()}» igual?`,
        confirmLabel: "Guardar igual",
        onConfirm: () => void guardarArtista(),
      });
      return;
    }

    await guardarArtista();
  }

  async function guardarArtista() {
    setSaving(true);
    let finalAvatarUrl = avatarUrl;

    if (avatarFile) {
      // Necesitamos un ID temporal si es nuevo, pero Supabase lo genera. 
      // Subiremos la foto despues de crear el artista si es nuevo, o antes si ya existe.
      if (editingId) {
        const url = await uploadAvatar(supabase, avatarFile, editingId);
        if (url) finalAvatarUrl = url;
      }
    }

    if (editingId) {
      const updated = await updateArtista(supabase, editingId, nombre, finalAvatarUrl);
      if (updated) {
        setArtistas(prev => prev.map(a => a.id === editingId ? updated : a));
      }
    } else {
      const created = await addArtista(supabase, nombre, finalAvatarUrl);
      if (created) {
        if (avatarFile) {
          const url = await uploadAvatar(supabase, avatarFile, created.id);
          if (url) {
            const fullyCreated = await updateArtista(supabase, created.id, nombre, url);
            if (fullyCreated) {
              setArtistas(prev => [...prev, fullyCreated].sort((a, b) => a.nombre.localeCompare(b.nombre)));
            }
          }
        } else {
          setArtistas(prev => [...prev, created].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        }
      }
    }

    setSaving(false);
    resetForm();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/50 p-4">
          <h2 className="text-xl font-bold text-text-primary">Gestión de Artistas</h2>
          <TapButton onClick={onClose} className="rounded-full p-2 hover:bg-bg-card-hover">
            <X className="size-5 text-text-secondary" />
          </TapButton>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          {/* Formulario */}
          <div className="border-b border-border/50 p-4 md:w-1/2 md:border-b-0 md:border-r">
            <h3 className="mb-4 text-lg font-semibold text-text-primary">
              {editingId ? "Editar Artista" : "Nuevo Artista"}
            </h3>
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-secondary">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-xl bg-bg-darker p-3 text-text-primary outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder="Ej: Abel Pintos"
                  required
                />
                {!editingId ? (
                  <ArtistaSugerencias
                    texto={nombre}
                    artistas={artistas}
                    onElegir={handleEdit}
                  />
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-text-secondary">Foto (Opcional)</label>
                <div className="flex items-center gap-4">
                  <div 
                    className="flex size-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border/50 bg-bg-darker hover:bg-bg-card-hover"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="size-full object-cover" />
                    ) : (
                      <UserIcon className="size-6 text-text-secondary" />
                    )}
                  </div>
                  <TapButton 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-xl bg-bg-darker px-4 py-2 text-sm text-text-primary hover:bg-bg-card-hover"
                  >
                    <Upload className="size-4" />
                    Subir foto
                  </TapButton>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                </div>
                <p className="mt-2 text-xs text-text-secondary">
                  La foto se achicará automáticamente a muy poco peso.
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                <TapButton
                  type="submit"
                  disabled={saving || !nombre.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent p-3 font-semibold text-white disabled:opacity-50"
                >
                  <Save className="size-5" />
                  {saving ? "Guardando..." : "Guardar"}
                </TapButton>
                {editingId && (
                  <TapButton
                    type="button"
                    onClick={resetForm}
                    disabled={saving}
                    className="flex items-center justify-center rounded-xl bg-bg-darker p-3 text-text-secondary hover:bg-bg-card-hover"
                  >
                    Cancelar
                  </TapButton>
                )}
              </div>
            </form>
          </div>

          {/* Lista */}
          <div className="flex flex-1 flex-col overflow-hidden p-4">
            <h3 className="mb-4 text-lg font-semibold text-text-primary">Artistas Guardados</h3>
            <div className="flex-1 overflow-y-auto pr-2">
              {loading ? (
                <div className="text-center text-text-secondary">Cargando...</div>
              ) : artistas.length === 0 ? (
                <div className="text-center text-text-secondary">No hay artistas cargados.</div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {artistas.map((artista) => (
                    <li key={artista.id} className="flex items-center justify-between rounded-xl bg-bg-darker p-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-card">
                          {artista.avatar_url ? (
                            <img src={artista.avatar_url} alt={artista.nombre} className="size-full object-cover" />
                          ) : (
                            <UserIcon className="size-5 text-text-secondary" />
                          )}
                        </div>
                        <span className="truncate text-text-primary font-medium">{artista.nombre}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <TapButton
                          onClick={() => handleEdit(artista)}
                          className="rounded-lg p-2 text-text-secondary hover:bg-accent/10 hover:text-accent"
                        >
                          <Pencil className="size-4" />
                        </TapButton>
                        <TapButton
                          onClick={() => handleDelete(artista.id)}
                          className="rounded-lg p-2 text-text-secondary hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="size-4" />
                        </TapButton>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={dialogo !== null}
        message={dialogo?.message ?? ""}
        confirmLabel={dialogo?.onConfirm ? (dialogo.confirmLabel ?? "Confirmar") : "Entendido"}
        deleteConfirm={dialogo?.deleteConfirm}
        hideCancel={!dialogo?.onConfirm}
        zIndex={500}
        onCancel={() => setDialogo(null)}
        onConfirm={() => {
          const accion = dialogo?.onConfirm;
          setDialogo(null);
          accion?.();
        }}
      />
    </div>
  );
}
