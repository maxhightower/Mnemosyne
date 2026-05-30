import { NextResponse } from "next/server";

export function ok(data: unknown, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function created(data: unknown) {
  return NextResponse.json(data, { status: 201 });
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message: string) {
  return NextResponse.json({ error: message }, { status: 500 });
}

export async function readJson<T = Record<string, unknown>>(
  req: Request
): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

/** Pick only defined keys from an object (so PATCH bodies update partially). */
export function pickDefined<T extends Record<string, unknown>>(
  obj: T,
  keys: (keyof T)[]
): Partial<T> {
  const out: Partial<T> = {};
  for (const k of keys) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}
