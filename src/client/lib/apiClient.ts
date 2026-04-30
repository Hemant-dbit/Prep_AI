/**
 * Lightweight API client for frontend fetch calls.
 * Automatically attaches the auth token from localStorage.
 */

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
};

export async function apiRequest<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = getToken();
  const { method = "GET", body, headers = {} } = options;

  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json();
  return data as T;
}

/** Multipart form upload — does NOT set Content-Type (browser sets it with boundary) */
export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const token = getToken();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  const data = await response.json();
  return data as T;
}
