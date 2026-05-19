"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FileStatus = "queued" | "uploading" | "done" | "error";
interface FileState {
  file: File;
  status: FileStatus;
  error?: string;
}

interface SignedUrl {
  path: string;
  signedUrl: string;
  filename: string;
}

type Stage = "idle" | "signing" | "uploading" | "finalizing" | "done";

export function UploadClient({ orderId, maxPhotos }: { orderId: string; maxPhotos: number }) {
  const router = useRouter();
  const [files, setFiles] = useState<FileState[]>([]);
  const [stage, setStage] = useState<Stage>("idle");
  const [uploadedCount, setUploadedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = stage !== "idle" && stage !== "done";
  const progressPct = useMemo(
    () => (files.length === 0 ? 0 : Math.round((uploadedCount / files.length) * 100)),
    [uploadedCount, files.length]
  );

  function onPick(picked: FileList | null) {
    if (!picked) return;
    const newOnes = Array.from(picked)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, maxPhotos - files.length)
      .map<FileState>((f) => ({ file: f, status: "queued" }));
    setFiles((prev) => [...prev, ...newOnes]);
  }

  function removeFile(idx: number) {
    if (isSubmitting) return;
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadAll() {
    setError(null);
    setUploadedCount(0);
    setStage("signing");

    try {
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

      setStage("uploading");
      const uploadedFiles: { path: string; filename: string; sizeBytes: number }[] = [];
      for (let i = 0; i < urls.length; i++) {
        setFiles((prev) => prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" } : f)));
        const f = files[i].file;
        const res = await fetch(urls[i].signedUrl, {
          method: "PUT",
          headers: { "Content-Type": f.type || "application/octet-stream" },
          body: f,
        });
        if (!res.ok) throw new Error(`Upload de ${f.name} échoué (HTTP ${res.status}).`);
        uploadedFiles.push({ path: urls[i].path, filename: f.name, sizeBytes: f.size });
        setFiles((prev) => prev.map((file, idx) => (idx === i ? { ...file, status: "done" } : file)));
        setUploadedCount(i + 1);
      }

      setStage("finalizing");
      const completeRes = await fetch(`/api/upload-complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, files: uploadedFiles }),
      });
      if (!completeRes.ok) throw new Error(`finalize failed: ${await completeRes.text()}`);

      setStage("done");
      router.push(`/order/${orderId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'upload");
      setStage("idle");
    }
  }

  return (
    <div className="relative">
      <label
        className={`block border-2 border-dashed rounded-2xl p-12 text-center transition ${
          isSubmitting
            ? "border-slate-200 bg-slate-50 cursor-not-allowed"
            : "border-slate-300 hover:border-brand hover:bg-brand-soft/40 cursor-pointer"
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
          disabled={isSubmitting}
        />
        <p className="text-ink font-medium text-lg">
          Cliquez ou glissez-déposez vos photos ({files.length}/{maxPhotos})
        </p>
        <p className="text-sm text-ink-muted mt-2">JPG, PNG ou HEIC — jusqu'à {maxPhotos} photos</p>
      </label>

      {files.length > 0 && (
        <ul className="mt-6 space-y-2">
          {files.map((f, i) => (
            <li
              key={i}
              className="flex items-center gap-3 px-4 py-2.5 bg-surface-alt rounded-lg text-sm border border-black/5"
            >
              <span className="truncate flex-1 text-ink">{f.file.name}</span>
              <FileStatusBadge status={f.status} />
              {!isSubmitting && (
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-ink-muted hover:text-red-600 transition text-xs"
                  aria-label="Retirer"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </p>
      )}

      <button
        onClick={uploadAll}
        disabled={files.length === 0 || isSubmitting}
        className="mt-8 w-full bg-brand hover:bg-brand-dark disabled:bg-slate-200 disabled:text-slate-400 text-white px-4 py-4 rounded-full font-bold tracking-tight transition shadow-sm"
      >
        {isSubmitting
          ? "Envoi en cours…"
          : `Envoyer ${files.length || ""} photo${files.length > 1 ? "s" : ""} à Geoffrey`}
      </button>

      {isSubmitting && <SubmittingOverlay stage={stage} pct={progressPct} total={files.length} done={uploadedCount} />}
    </div>
  );
}

function FileStatusBadge({ status }: { status: FileStatus }) {
  switch (status) {
    case "queued":
      return <span className="text-ink-muted text-xs">En attente</span>;
    case "uploading":
      return (
        <span className="inline-flex items-center gap-1.5 text-brand text-xs">
          <MiniSpinner /> Envoi…
        </span>
      );
    case "done":
      return <span className="text-emerald-600 text-xs font-bold">✓</span>;
    case "error":
      return <span className="text-red-600 text-xs">Erreur</span>;
  }
}

function MiniSpinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function SubmittingOverlay({
  stage,
  pct,
  total,
  done,
}: {
  stage: Stage;
  pct: number;
  total: number;
  done: number;
}) {
  const { title, subtitle } = stageCopy(stage, total, done);
  // The overlay sits inside the page (not full-viewport) so the surrounding
  // layout stays visible — feels less anxious than a blocking modal.
  return (
    <div className="fixed inset-x-0 bottom-0 md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:w-[420px] bg-white border border-black/10 md:rounded-2xl shadow-2xl px-6 py-5 z-50">
      <div className="flex items-center gap-3 mb-3">
        <MiniSpinner />
        <p className="font-bold text-ink tracking-tight">{title}</p>
      </div>
      <p className="text-sm text-ink-muted mb-3">{subtitle}</p>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand transition-all"
          style={{ width: stage === "finalizing" ? "100%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

function stageCopy(stage: Stage, total: number, done: number) {
  switch (stage) {
    case "signing":
      return {
        title: "Préparation de l'envoi",
        subtitle: "On sécurise le canal d'upload…",
      };
    case "uploading":
      return {
        title: `Envoi de vos photos (${done}/${total})`,
        subtitle: "Ne fermez pas l'onglet, ça part en direct chez Geoffrey.",
      };
    case "finalizing":
      return {
        title: "Transmission à Geoffrey",
        subtitle: "Vos photos arrivent dans son studio. Encore quelques secondes.",
      };
    case "done":
      return { title: "✓ Envoyé", subtitle: "Redirection…" };
    case "idle":
      return { title: "", subtitle: "" };
  }
}
