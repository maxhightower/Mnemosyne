"use client";

import { useRef, useState } from "react";
import { TextInput } from "@/components/forms";

// Controlled editor for a list of reference-image URLs. Supports both pasting a
// URL and uploading a file (which is stored server-side via /api/uploads).
export default function ImageRefs({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function addUrl() {
    const u = url.trim();
    if (!u) return;
    if (value.includes(u)) {
      setUrl("");
      return;
    }
    onChange([...value, u]);
    setUrl("");
  }

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange([...value, data.url]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function remove(u: string) {
    onChange(value.filter((x) => x !== u));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {value.map((u) => (
            <div key={u} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt="reference art"
                className="h-24 w-24 rounded-md border border-ink-700 object-cover"
              />
              <button
                type="button"
                onClick={() => remove(u)}
                className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full
                           border border-red-900/60 bg-red-950 text-xs text-red-300 group-hover:flex"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <TextInput
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder="Paste an image URL…"
        />
        <button type="button" className="btn-secondary whitespace-nowrap" onClick={addUrl}>
          Add URL
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
          }}
          className="hidden"
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : "Upload image"}
        </button>
        <span className="text-xs text-stone-500">png, jpg, webp, gif · max 8 MB</span>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
