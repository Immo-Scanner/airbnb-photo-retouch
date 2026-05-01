"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface FileState {
  file: File;
  status: "queued" | "uploading" | "done" | "error";
  error?: string;
}

interface SignedUrl {
  path: string;
  signedUrl: string;
  filename: string;
}

export function UploadClient({ orderId, maxPhotos }: { orderId: string; maxPhotos: number }) {
  const router = useRouter();
  const [files, setFiles] = useState<FileState[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onPick(picked: FileList | null) {
    if (!picked) return;
    const newOnes = Array.from(picked)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, maxPhotos - files.length)
      .map<FileState>((f) => ({ file: f, status: "queued" }));
    setFiles((prev) => [...prev, ...newOnes]);
  }

  async function uploadAll() {
    setSubmitting(true);
    setError(null);

    try {
      // 1. Ask the server for a signed upload URL per file.
      const signRes = await fetch(`/api/upload/sign-urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          files: files.map((f) => ({ filename: f.file.name, sizeBytes: f.file.size })),
        }),
      });
      if (!signRes.ok) throw new Error(`sign-urls failed: ${await signRes.text()}`);
      const { urls } = (await signRes.json()) as { urls: SignedUrl[] };

      // 2. PUT each file to its signed URL.
      const uploadedFiles: { path: string; filename: string; sizeBytes: number }[] = [];
      for (let i = 0; i < urls.length; i++) {
        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" } : f))
        );
        const f = files[i].file;
        const res = await fetch(urls[i].signedUrl, {
          method: "PUT",
          headers: { "Content-Type": f.type || "application/octet-stream" },
          body: f,
        });
        if (!res.ok) throw new Error(`upload failed for ${f.name}: ${res.status}`);
        uploadedFiles.push({ path: urls[i].path, filename: f.name, sizeBytes: f.size });
        setFiles((prev) =>
          prev.map((file, idx) => (idx === i ? { ...file, status: "done" } : file))
        );
      }

      // 3. Tell the server we're done. It registers photos, pushes them to
      // AutoEnhance, and schedules the human-like delivery time.
      const completeRes = await fetch(`/api/upload-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, files: uploadedFiles }),
      });
      if (!completeRes.ok) throw new Error(`upload-complete failed: ${await completeRes.text()}`);

      router.push(`/order/${orderId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'upload");
      setSubmitting(false);
    }
  }

  return (
    <div>
      <label className="block border-2 border-dashed border-slate-300 hover:border-orange-400 hover:bg-orange-50/40 rounded-2xl p-12 text-center cursor-pointer transition">
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
