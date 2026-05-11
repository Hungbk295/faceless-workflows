export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

interface ApiOptions {
  signal?: AbortSignal;
  body?: unknown;
}

async function request<T>(method: string, path: string, opts: ApiOptions = {}): Promise<T> {
  const init: RequestInit = {
    method,
    headers: opts.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  };

  const res = await fetch(path, init);
  const text = await res.text();
  let parsed: unknown = null;
  if (text.length > 0) {
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }

  if (!res.ok) {
    const message = (() => {
      if (parsed && typeof parsed === 'object' && 'message' in parsed) {
        const m = (parsed as { message?: unknown }).message;
        if (typeof m === 'string') return m;
      }
      if (typeof parsed === 'string' && parsed.length > 0) return parsed;
      return `HTTP ${res.status} ${res.statusText}`;
    })();
    throw new ApiError(res.status, message, parsed);
  }

  return parsed as T;
}

export const api = {
  get: <T>(path: string, opts?: ApiOptions) => request<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: ApiOptions) => request<T>('POST', path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: ApiOptions) => request<T>('PUT', path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: ApiOptions) => request<T>('PATCH', path, { ...opts, body }),
  del: <T>(path: string, opts?: ApiOptions) => request<T>('DELETE', path, opts),
};
