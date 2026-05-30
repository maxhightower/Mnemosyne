// Image provider abstraction. Implementations: MockProvider (no GPU, used in dev
// and CI) and — later — ComfyUIProvider (compiles a graph to a ComfyUI API
// workflow and runs it on a local headless ComfyUI GPU kernel).

export interface Txt2ImgArgs {
  positive: string;
  negative: string;
  width: number;
  height: number;
  seed?: number;
  steps?: number;
  cfg?: number;
}

export interface ImageResult {
  bytes: Buffer;
  ext: string; // png | jpg | webp | svg
  meta?: Record<string, unknown>;
}

export interface ImageProvider {
  readonly name: string;
  txt2img(args: Txt2ImgArgs): Promise<ImageResult>;
}
