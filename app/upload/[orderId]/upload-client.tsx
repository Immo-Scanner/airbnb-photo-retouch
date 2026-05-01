"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

interface FileState {
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

export function UploadClient({
  orderId,
  maxPhotos,
  userId,
}: {
  orderId: string;
  maxPhotos: number;
  userId: string;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<FileState[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPick(picked: FileList | null) {
    if (!picked) return;
    const newOnes = Array.from(picked)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, maxPhotos - files.length)
      .map<FileState>((f) => ({ file: f, status: "queued", progress: 0 }));
    setFiles((prev) => [...prev, ...newOnes]);
  }

  async function uploadAll() {
    setSubmitting(true);
    setError(null);
    const supabase = createBrowserSupabase();

    try {
      // 1. Upload each photo to Supabase Storage (originals bucket)
      const uploadedFiles: { path: string; filename: string; sizeBytes: number }[] = [];
      for (let i = 0; i < files.length; i++) {
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "uploading", progress: 50 } : f))
        );
        const f = files[i].file;
        const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${userId}/${orderId}/${Date.now()}_${i}_${safeName}`;
        const { error: upErr } = await supabase.storage.from("originals").upload(path, f, {
          contentType: f.type,
          upsert: false,
        });
        if (upErr) throw upErr;
        uploadedFiles.push({ path, filename: f.name, sizeBytes: f.size });
        setFiles((prev) =>
          prev.map((file, idx) => (idx === i ? { ...file, status: "done", progress: 100 } : file))
        );
      }

      // 2. Tell the server we're done — it will register photos in DB,
      // push them to AutoEnhance, schedule the human-like delivery time.
      const res = await fetch(`/api/upload-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, files: uploadedFiles }),
      });
      if (!res.ok) throw new Error(`upload-complete failed: ${await res.text()}`);

      router.push(`/dashboard/order/${orderId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'upload");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <label
        className="block border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50/40 rounded-2xl p-12 text-center cursor-pointer transition"
      >
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
          disabled={submitting}
        />
        <p className="text-slate-700 font-medium">
          Cliquez ou glissez-déposez vos photos ({files.length}/{maxPhotos})
        </p>
        <p className="text-xs text-slate-500 mt-2">JPG, PNG ou HEIC — Max {maxPhotos}</p>
      </label>

      {files.length > 0 && (
        <ul className="mt-6 space-y-2">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex justify-between items-center px-4 py-2.5 bg-slate-50 rounded-lg text-sm"
            >
              <span className="truncate">{f.file.name}</span>
              <span
                className={
                  f.status === "done"
                    ? "text-green-600"
                    : f.status === "error"
                    ? "text-red-600"
                    : f.status === "uploading"
                    ? "text-blue-600"
                    : "text-slate-400"
                }
              >
                {f.status === "queued" && "En attente"}
                {f.status === "uploading" && "Envoi…"}
                {f.status === "done" && "✓"}
                {f.status === "error" && (f.error ?? "Erreur")}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <button
        onClick={uploadAll}
        disabled={files.length === 0 || submitting}
        className="mt-8 w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white px-4 py-3 rounded-lg font-semibold transition"
      >
        {submitting ? "Envoi en cours…" : `Envoyer ${files.length} photo${files.length > 1 ? "s" : ""} à Geoffrey`}
      </button>
    </div>
  );
}
