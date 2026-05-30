"use client";

// Tiny fetch wrapper for the browser. Throws on non-2xx with the server message.
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del: <T>(url: string) => request<T>(url, { method: "DELETE" }),
};
