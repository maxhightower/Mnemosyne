// ---------------------------------------------------------------------------
// Image generation — STUBBED for the MVP.
//
// The MVP stores prompt records rather than generating images. This module is
// the seam where a real provider (OpenAI Images, Stability, Replicate, a local
// ComfyUI/Automatic1111 endpoint, etc.) would be wired in.
//
// TODO(image-gen): implement generateImage() against a provider:
//   - read IMAGE_GEN_ENABLED + provider keys from env
//   - call the provider with the expanded + negative prompt
//   - persist the returned image (object storage / local /public/generated)
//   - return a stable URL to store on VisualReference.imageUrl
// TODO(consistency): feed canonical image references back as init/reference
//   images so characters & locations stay visually consistent across scenes.
// ---------------------------------------------------------------------------

export function imageGenEnabled(): boolean {
  return process.env.IMAGE_GEN_ENABLED === "true";
}

export interface ImageGenResult {
  imageUrl: string | null;
  note: string;
}

export async function generateImage(_args: {
  expandedPrompt: string;
  negativePrompt: string;
}): Promise<ImageGenResult> {
  if (!imageGenEnabled()) {
    return {
      imageUrl: null,
      note: "Image generation is disabled for the MVP. Prompt saved as a text-only visual reference.",
    };
  }
  // Not implemented yet — see TODOs above.
  return {
    imageUrl: null,
    note: "Image generation is enabled but no provider is implemented yet (stub).",
  };
}
