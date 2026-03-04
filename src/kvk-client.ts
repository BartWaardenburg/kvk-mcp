import { TtlCache } from "./cache.js";
import type {
  SearchParams,
  SearchResponse,
  Basisprofiel,
  Vestigingsprofiel,
  Naamgeving,
} from "./types.js";

export class KvkApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export interface RetryOptions {
  maxRetries: number;
}

const DEFAULT_RETRY: RetryOptions = { maxRetries: 3 };

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class KvkClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly retry: RetryOptions;
  private readonly cache: TtlCache;
  private readonly cachingEnabled: boolean;

  constructor(
    apiKey: string,
    baseUrl = "https://api.kvk.nl/api",
    cacheTtlMs?: number,
    retry: RetryOptions = DEFAULT_RETRY,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.retry = retry;
    this.cachingEnabled = cacheTtlMs !== 0;
    this.cache = new TtlCache(cacheTtlMs ?? 120_000);
  }

  private async cachedRequest<T>(cacheKey: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    if (!this.cachingEnabled || ttlMs <= 0) return fetcher();

    const cached = this.cache.get<T>(cacheKey);
    if (cached !== undefined) return cached;

    const result = await fetcher();
    this.cache.set(cacheKey, result, ttlMs);
    return result;
  }

  // --- Search ---

  async search(params: SearchParams): Promise<SearchResponse> {
    const query = new URLSearchParams();

    if (params.handelsnaam) query.set("handelsnaam", params.handelsnaam);
    if (params.kvkNummer) query.set("kvkNummer", params.kvkNummer);
    if (params.vestigingsnummer) query.set("vestigingsnummer", params.vestigingsnummer);
    if (params.straatnaam) query.set("straatnaam", params.straatnaam);
    if (params.plaats) query.set("plaats", params.plaats);
    if (params.postcode) query.set("postcode", params.postcode);
    if (params.type) query.set("type", params.type);
    if (params.pagina !== undefined) query.set("pagina", String(params.pagina));
    if (params.resultatenPerPagina !== undefined) query.set("resultatenPerPagina", String(params.resultatenPerPagina));

    const queryString = query.toString();
    const path = `/v2/zoeken${queryString ? `?${queryString}` : ""}`;

    return this.cachedRequest(
      `search:${queryString}`,
      300_000,
      () => this.request<SearchResponse>(path),
    );
  }

  // --- Basisprofielen ---

  async getBasisprofiel(kvkNummer: string): Promise<Basisprofiel> {
    return this.cachedRequest(
      `basisprofiel:${kvkNummer}`,
      600_000,
      () => this.request<Basisprofiel>(`/v1/basisprofielen/${encodeURIComponent(kvkNummer)}`),
    );
  }

  // --- Vestigingsprofielen ---

  async getVestigingsprofiel(vestigingsnummer: string): Promise<Vestigingsprofiel> {
    return this.cachedRequest(
      `vestigingsprofiel:${vestigingsnummer}`,
      600_000,
      () => this.request<Vestigingsprofiel>(`/v1/vestigingsprofielen/${encodeURIComponent(vestigingsnummer)}`),
    );
  }

  // --- Naamgevingen ---

  async getNaamgeving(kvkNummer: string): Promise<Naamgeving> {
    return this.cachedRequest(
      `naamgeving:${kvkNummer}`,
      600_000,
      () => this.request<Naamgeving>(`/v1/naamgevingen/kvknummer/${encodeURIComponent(kvkNummer)}`),
    );
  }

  // --- Private ---

  private static async parseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") ?? "";
    return contentType.includes("application/json")
      ? response.json().catch(() => null)
      : response.text().catch(() => "");
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("apikey", this.apiKey);
    headers.set("Content-Type", "application/json");

    const url = `${this.baseUrl}${path}`;
    const requestInit: RequestInit = { ...init, headers };

    const maxRetries = Math.max(0, this.retry.maxRetries);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const response = await fetch(url, requestInit);

      if (response.ok) {
        return await KvkClient.parseBody(response) as T;
      }

      if (response.status === 429 && attempt < maxRetries) {
        const retryAfter = response.headers.get("retry-after");
        const delayMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.pow(2, attempt) * 1000;
        await sleep(delayMs);
        continue;
      }

      throw new KvkApiError(
        `KVK API request failed: ${response.status} ${response.statusText}`,
        response.status,
        await KvkClient.parseBody(response),
      );
    }

    /* v8 ignore next */
    throw new Error("Retry loop exited unexpectedly");
  }
}
