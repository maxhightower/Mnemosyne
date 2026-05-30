import { ok } from "@/lib/apiHelpers";
import { aiEnabled } from "@/lib/ai";
import { imageGenEnabled } from "@/lib/imageGen";

// Lightweight capability probe used by the UI to show what's available.
export async function GET() {
  return ok({
    aiEnabled: aiEnabled(),
    imageGenEnabled: imageGenEnabled(),
  });
}
