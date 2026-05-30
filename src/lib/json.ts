// Helpers for the JSON-encoded-string columns described in schema.prisma.

export function parseList(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((v) => String(v));
    return [];
  } catch {
    // Fall back to treating a bare string as a single-item list.
    return value.trim() ? [value.trim()] : [];
  }
}

export function stringifyList(value: string[] | undefined | null): string {
  return JSON.stringify(value ?? []);
}

export function parseObject<T = Record<string, unknown>>(
  value: string | null | undefined
): T | null {
  if (!value || !value.trim()) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function stringifyObject(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/** Accept either a JSON array string or a comma/newline separated string. */
export function coerceList(input: unknown): string[] {
  if (Array.isArray(input)) return input.map((v) => String(v).trim()).filter(Boolean);
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      const parsed = parseList(trimmed);
      if (parsed.length) return parsed;
    }
    return trimmed
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}
