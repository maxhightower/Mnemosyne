import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { createHash } from "crypto";

// Content-addressed asset store. Generated images are written to
// public/generated/<sha256>.<ext> (git-ignored) and served statically at
// /generated/<sha256>.<ext>. Content addressing gives free dedupe and stable
// URLs that can be promoted to canonical references.

export interface StoredAsset {
  url: string;
  sha: string;
  ext: string;
  bytes: number;
}

export async function saveAsset(bytes: Buffer, ext: string): Promise<StoredAsset> {
  const sha = createHash("sha256").update(bytes).digest("hex").slice(0, 32);
  const dir = path.join(process.cwd(), "public", "generated");
  await mkdir(dir, { recursive: true });
  const filename = `${sha}.${ext}`;
  await writeFile(path.join(dir, filename), bytes);
  return { url: `/generated/${filename}`, sha, ext, bytes: bytes.length };
}
