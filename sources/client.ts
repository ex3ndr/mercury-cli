import type { MercuryClient } from "./commands/types.js";
import { loadToken, getApiBaseUrl } from "./config.js";

export type ApiError = {
  error: string;
  message?: string;
  details?: unknown;
};

export class MercuryApiError extends Error {
  status: number;
  body: ApiError;

  constructor(status: number, body: ApiError) {
    super(body.message ?? body.error ?? `HTTP ${status}`);
    this.name = "MercuryApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Get proxy agent if HTTP_PROXY or HTTPS_PROXY is set.
 * Uses undici's ProxyAgent which is included with Node 18+.
 * Validates the proxy URL and falls back to direct connection on error.
 */
async function getProxyDispatcher(): Promise<import("undici").Dispatcher | undefined> {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || 
                   process.env.https_proxy || process.env.http_proxy;
  
  if (!proxyUrl) {
    return undefined;
  }

  try {
    // Validate URL format before passing to ProxyAgent
    new URL(proxyUrl);
    const { ProxyAgent } = await import("undici");
    return new ProxyAgent(proxyUrl);
  } catch (err) {
    // Invalid URL or undici not available - fall back to direct connection
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Warning: Invalid proxy URL "${proxyUrl}": ${message}. Using direct connection.`);
    return undefined;
  }
}

// Cache the dispatcher promise
let dispatcherPromise: Promise<import("undici").Dispatcher | undefined> | null = null;

export function createMercuryClient(): MercuryClient {
  const token = loadToken();
  const baseUrl = getApiBaseUrl();

  return {
    baseUrl,
    token,
    fetch: async <T>(path: string, init?: RequestInit): Promise<T> => {
      if (!token) {
        throw new Error("Not authenticated. Run 'mercury login' first.");
      }

      const url = path.startsWith("http") ? path : `${baseUrl}${path}`;

      // Get proxy dispatcher (cached)
      if (!dispatcherPromise) {
        dispatcherPromise = getProxyDispatcher();
      }
      const dispatcher = await dispatcherPromise;

      const fetchOptions: RequestInit & { dispatcher?: import("undici").Dispatcher } = {
        ...init,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          ...init?.headers,
        },
      };

      // Add dispatcher for proxy support if available
      if (dispatcher) {
        fetchOptions.dispatcher = dispatcher;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        let body: ApiError;
        try {
          body = await response.json() as ApiError;
        } catch {
          body = { error: `HTTP ${response.status}`, message: response.statusText };
        }
        throw new MercuryApiError(response.status, body);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    },
  };
}
