import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { ok, badRequest, serverError } from "@/lib/apiHelpers";

// POST /api/uploads  (multipart/form-data, field "file")
// Saves an uploaded image under public/uploads and returns its served URL.
//
// Storage note: files live on the local disk (public/uploads). In an ephemeral
// container they are lost on reset unless committed. Pasting an image URL
// instead avoids local storage entirely. See README.

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest("Expected multipart/form-data with a 'file' field.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return badRequest("No file provided.");
  if (file.size === 0) return badRequest("Empty file.");
  if (file.size > MAX_BYTES) return badRequest("File exceeds the 8 MB limit.");

  const ext = ALLOWED[file.type];
  if (!ext) {
    return badRequest("Unsupported image type (png, jpg, webp, gif).");
  }

  try {
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), bytes);
    return ok({ url: `/uploads/${filename}` });
  } catch (e) {
    return serverError(`Failed to store upload: ${(e as Error).message}`);
  }
}
