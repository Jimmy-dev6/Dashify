"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { PhotoIcon, XMarkIcon, StarIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  uploadPropertyPhoto,
  deletePropertyPhoto,
  extractPathFromPublicUrl,
} from "@/lib/photos/upload";

type PhotoUploaderProps = {
  propertyId: string;
  initialCoverUrl: string | null;
  initialPhotos: string[];
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  cover_image_url?: string | null;
  photos?: string[];
  action?: string;
  role?: string;
};

export function PhotoUploader({
  propertyId,
  initialCoverUrl,
  initialPhotos,
}: PhotoUploaderProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl);
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOverCover, setDragOverCover] = useState(false);
  const [dragOverGallery, setDragOverGallery] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    async (file: File, role: "cover" | "gallery") => {
      setError(null);
      if (role === "cover") setUploadingCover(true);
      else setUploadingGallery(true);

      try {
        // 1. Upload to Supabase Storage
        const uploadResult = await uploadPropertyPhoto(file, propertyId);
        if (!uploadResult.ok) {
          setError(uploadResult.error);
          return;
        }

        // 2. Save URL in DB via API
        const res = await fetch(`/api/properties/${propertyId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: uploadResult.url, role, action: "upload" }),
        });
        const json = (await res.json()) as ApiResponse;
        if (!res.ok || !json.ok) {
          // Rollback : supprime du bucket
          await deletePropertyPhoto(uploadResult.path);
          setError(json.error ?? "Erreur enregistrement.");
          return;
        }

        // 3. Update local state depuis la réponse API (source de vérité)
        if (typeof json.cover_image_url !== "undefined") {
          setCoverUrl(json.cover_image_url);
        }
        if (Array.isArray(json.photos)) {
          setPhotos(json.photos);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue.");
      } finally {
        if (role === "cover") setUploadingCover(false);
        else setUploadingGallery(false);
      }
    },
    [propertyId],
  );

  const handleDelete = useCallback(
    async (url: string, role: "cover" | "gallery") => {
      if (!confirm("Supprimer cette photo ?")) return;
      setError(null);

      try {
        // 1. Supprime de la DB
        const res = await fetch(`/api/properties/${propertyId}/photos`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const json = (await res.json()) as ApiResponse;
        if (!res.ok || !json.ok) {
          setError(json.error ?? "Suppression impossible.");
          return;
        }

        // 2. Supprime du bucket (on ignore l'erreur)
        const path = extractPathFromPublicUrl(url);
        if (path) {
          await deletePropertyPhoto(path);
        }

        // 3. Update local state
        if (role === "cover") {
          setCoverUrl(null);
        } else {
          setPhotos((prev) => prev.filter((u) => u !== url));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue.");
      }
    },
    [propertyId],
  );

  const handleSetAsCover = useCallback(
    async (url: string) => {
      setError(null);
      try {
        const res = await fetch(`/api/properties/${propertyId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, action: "set_as_cover" }),
        });
        const json = (await res.json()) as ApiResponse;
        if (!res.ok || !json.ok) {
          setError(json.error ?? "Impossible de définir comme couverture.");
          return;
        }
        // Swap : on remplace entièrement l'état local avec la réponse API
        if (typeof json.cover_image_url !== "undefined") {
          setCoverUrl(json.cover_image_url);
        }
        if (Array.isArray(json.photos)) {
          setPhotos(json.photos);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue.");
      }
    },
    [propertyId],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, role: "cover" | "gallery") => {
      e.preventDefault();
      if (role === "cover") setDragOverCover(false);
      else setDragOverGallery(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      if (role === "cover") {
        void handleFileUpload(files[0], "cover");
      } else {
        // Upload séquentiel pour les galeries
        (async () => {
          for (const file of files) {
            if (photos.length >= 10) break;
            await handleFileUpload(file, "gallery");
          }
        })();
      }
    },
    [handleFileUpload, photos.length],
  );

  return (
    <section className="rounded-xl border border-gray-700 bg-gray-800/80 p-6 shadow-sm">
      <h2 className="text-base font-semibold text-white">Photos</h2>
      <p className="mt-0.5 text-xs text-gray-400">
        Une photo de couverture + jusqu&apos;à 10 photos supplémentaires. Formats : JPG, PNG, WEBP,
        GIF (max 5 Mo).
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* COVER */}
      <div className="mt-5">
        <label className="text-sm font-medium text-gray-200">Photo principale</label>
        <p className="mt-0.5 text-xs text-gray-500">
          C&apos;est la photo qu&apos;on voit partout : dashboard, page de paiement, devis.
        </p>

        {coverUrl ? (
          <div className="mt-3 relative group">
            <div className="aspect-video overflow-hidden rounded-xl border-2 border-teal-500/40">
              <Image
                src={coverUrl}
                alt="Cover"
                width={800}
                height={450}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
            <button
              type="button"
              onClick={() => handleDelete(coverUrl, "cover")}
              className="absolute top-3 right-3 rounded-lg bg-red-500/90 p-2 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 hover:bg-red-500"
              aria-label="Supprimer"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverCover(true);
            }}
            onDragLeave={() => setDragOverCover(false)}
            onDrop={(e) => handleDrop(e, "cover")}
            onClick={() => coverInputRef.current?.click()}
            className={`mt-3 flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors ${
              dragOverCover
                ? "border-teal-500 bg-teal-500/10"
                : "border-gray-600 bg-gray-900/50 hover:border-teal-500/50 hover:bg-gray-900"
            }`}
          >
            {uploadingCover ? (
              <ArrowPathIcon className="h-10 w-10 animate-spin text-teal-400" />
            ) : (
              <>
                <PhotoIcon className="h-12 w-12 text-gray-500" />
                <p className="mt-3 text-sm font-medium text-gray-300">
                  Dépose une photo ou clique pour choisir
                </p>
                <p className="mt-1 text-xs text-gray-500">Format paysage recommandé</p>
              </>
            )}
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileUpload(file, "cover");
                e.target.value = "";
              }}
            />
          </div>
        )}
      </div>

      {/* GALERIE */}
      <div className="mt-6">
        <label className="text-sm font-medium text-gray-200">
          Galerie <span className="text-gray-500">({photos.length}/10)</span>
        </label>
        <p className="mt-0.5 text-xs text-gray-500">
          Photos supplémentaires. Clique l&apos;étoile pour définir une photo comme couverture.
        </p>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((url) => (
            <div key={url} className="relative group">
              <div className="aspect-video overflow-hidden rounded-lg border border-gray-700">
                <Image
                  src={url}
                  alt="Photo"
                  width={400}
                  height={225}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleSetAsCover(url)}
                  className="rounded-md bg-teal-500/90 p-1.5 text-black shadow-lg hover:bg-teal-400"
                  aria-label="Définir comme couverture"
                  title="Définir comme couverture"
                >
                  <StarIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(url, "gallery")}
                  className="rounded-md bg-red-500/90 p-1.5 text-white shadow-lg hover:bg-red-500"
                  aria-label="Supprimer"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {photos.length < 10 && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverGallery(true);
              }}
              onDragLeave={() => setDragOverGallery(false)}
              onDrop={(e) => handleDrop(e, "gallery")}
              onClick={() => galleryInputRef.current?.click()}
              className={`flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                dragOverGallery
                  ? "border-teal-500 bg-teal-500/10"
                  : "border-gray-600 bg-gray-900/50 hover:border-teal-500/50 hover:bg-gray-900"
              }`}
            >
              {uploadingGallery ? (
                <ArrowPathIcon className="h-6 w-6 animate-spin text-teal-400" />
              ) : (
                <>
                  <PhotoIcon className="h-8 w-8 text-gray-500" />
                  <p className="mt-2 text-xs text-gray-400">Ajouter</p>
                </>
              )}
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  (async () => {
                    for (const file of files) {
                      if (photos.length >= 10) break;
                      await handleFileUpload(file, "gallery");
                    }
                  })();
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}