import type { ImageProvider } from "./types";
import { MockImageProvider } from "./mock";

// Factory: choose the image provider from env. MockProvider is the default so the
// pipeline runs with no GPU. When the ComfyUI kernel lands, add:
//   case "comfyui": return new ComfyUIImageProvider();
// (set IMAGE_PROVIDER=comfyui and COMFYUI_BASE_URL=http://127.0.0.1:8188)
export function getImageProvider(): ImageProvider {
  const which = (process.env.IMAGE_PROVIDER || "mock").toLowerCase();
  switch (which) {
    case "mock":
    default:
      return new MockImageProvider();
  }
}

export type { ImageProvider, Txt2ImgArgs, ImageResult } from "./types";
