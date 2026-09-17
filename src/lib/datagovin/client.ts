import { parseCsvRecords } from "./csv";
import {
  DataGovInAuthError,
  DataGovInError,
  DataGovInParseError,
  DataGovInRateLimitError,
  DataGovInResourceNotFoundError,
  DataGovInResultWindowError,
  DataGovInTlsError,
} from "./errors";
import { normalizeFieldName } from "./fields";
import { dataGovInFetch } from "./transport";

export const DATAGOVIN_BASE_URL = "https://api.data.gov.in/resource";

/** Elasticsearch index.max_result_window behind the API (verified 2026-09-17). */
export const MAX_RESULT_WINDOW = 10_000;

export type Filters = Record<string, string>;

export interface ResourceField {
  id: string;
  name: string;
  type: string;
}

export interface PageRequest {
  resourceId: string;
  offset?: number;
  limit?: number;
  filters?: Filters;
}

export interface Page {
  records: Record<string, unknown>[];
  /** `null` when the body was CSV, which carries no total. */
  total: number | null;
  format: "json" | "csv";
  meta: ResourceMeta | null;
}

export interface ResourceMeta {
  title: string | null;
  org: string[];
  updatedDate: string | null;
  fields: ResourceField[];
  fieldsExposed: ResourceField[];
}

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
}

export interface ClientOptions {
  apiKey: string;
  baseUrl?: string;
  /** Defaults to a fetch tuned for data.gov.in's TLS edge (see transport.ts). */
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  logger?: Logger;
  /** Pause between consecutive pages. SPEC §6.1: ~300 ms. */
  pageDelayMs?: number;
  /** Wait before each retry. Length = number of retries. SPEC §6.1: 1s, 4s, 15s. */
  retryDelaysMs?: number[];
  /** Wait before each retry after HTTP 429. The gateway limit is unpublished. */
  rateLimitDelaysMs?: number[];
  /** Minimum gap between any two requests, to stay under the gateway limit. */
  minRequestIntervalMs?: number;
  /** Per-request timeout. */
  timeoutMs?: number;
  /** Elasticsearch result window; defaults to the verified 10,000. */
  maxResultWindow?: number;
  /** Clock, injectable for tests. */
  now?: () => number;
}

const TLS_ERROR_CODES = new Set([
  "CERT_HAS_EXPIRED",
  "CERT_NOT_YET_VALID",
  "DEPTH_ZERO_SELF_SIGNED_CERT",
  "SELF_SIGNED_CERT_IN_CHAIN",
  "UNABLE_TO_GET_ISSUER_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "ERR_TLS_CERT_ALTNAME_INVALID",
]);

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const silentLogger: Logger = { info: () => {}, warn: () => {} };

export function findTlsErrorCode(error: unknown): string | null {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && TLS_ERROR_CODES.has(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause as { code?: string; message?: string } | undefined;
  return cause ? `${error.message} (${cause.code ?? cause.message ?? "unknown cause"})` : error.message;
}

function toFields(value: unknown): ResourceField[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((f) => {
    if (!f || typeof f !== "object") return [];
    const { id, name, type } = f as Record<string, unknown>;
    return typeof id === "string" ? [{ id, name: String(name ?? id), type: String(type ?? "") }] : [];
  });
}

export class DataGovInClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly logger: Logger;
  private readonly pageDelayMs: number;
  private readonly retryDelaysMs: number[];
  private readonly rateLimitDelaysMs: number[];
  private readonly minRequestIntervalMs: number;
  private readonly timeoutMs: number;
  private readonly now: () => number;
  readonly maxResultWindow: number;
  private lastRequestAt = Number.NEGATIVE_INFINITY;

  constructor(options: ClientOptions) {
    if (!options.apiKey) throw new DataGovInAuthError("DATAGOVIN_API_KEY is empty.");
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DATAGOVIN_BASE_URL;
    this.fetchImpl = options.fetch ?? (dataGovInFetch as typeof fetch);
    this.sleep = options.sleep ?? defaultSleep;
    this.logger = options.logger ?? silentLogger;
    this.pageDelayMs = options.pageDelayMs ?? 300;
    this.retryDelaysMs = options.retryDelaysMs ?? [1_000, 4_000, 15_000];
    this.rateLimitDelaysMs = options.rateLimitDelaysMs ?? [60_000, 120_000, 300_000];
    this.minRequestIntervalMs = options.minRequestIntervalMs ?? 0;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.now = options.now ?? Date.now;
    this.maxResultWindow = options.maxResultWindow ?? MAX_RESULT_WINDOW;
  }

  buildUrl({ resourceId, offset = 0, limit = 100, filters = {} }: PageRequest): string {
    const url = new URL(`${this.baseUrl}/${encodeURIComponent(resourceId)}`);
    url.searchParams.set("api-key", this.apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(limit));
    for (const [field, value] of Object.entries(filters)) {
      url.searchParams.set(`filters[${field}]`, value);
    }
    return url.toString();
  }

  /** Fetches one page, retrying transient failures with backoff. */
  async fetchPage(request: PageRequest): Promise<Page> {
    const offset = request.offset ?? 0;
    const limit = request.limit ?? 100;
    if (offset + limit > this.maxResultWindow) {
      throw new DataGovInResultWindowError(offset, limit, this.maxResultWindow);
    }

    let tlsRetried = false;
    let retries = 0;
    let rateLimitRetries = 0;
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.fetchPageOnce({ ...request, offset, limit });
      } catch (error) {
        const context = { resourceId: request.resourceId, offset, attempt };

        const tlsCode = findTlsErrorCode(error);
        if (tlsCode) {
          this.logger.warn("data.gov.in TLS certificate error", { ...context, code: tlsCode });
          if (tlsRetried) {
            throw new DataGovInTlsError(
              `TLS certificate error (${tlsCode}) for resource ${request.resourceId}. Not bypassing verification.`,
              error,
            );
          }
          tlsRetried = true;
          await this.sleep(this.retryDelaysMs[0] ?? 1_000);
          continue;
        }

        if (error instanceof DataGovInRateLimitError) {
          const delay = this.rateLimitDelaysMs[rateLimitRetries++];
          if (delay === undefined) throw error;
          this.logger.warn("data.gov.in rate limit hit, waiting", { ...context, delayMs: delay });
          await this.sleep(delay);
          continue;
        }

        const retryable = error instanceof DataGovInError ? error.retryable : true;
        const delay = this.retryDelaysMs[retries++];
        if (!retryable || delay === undefined) throw error;

        this.logger.warn("data.gov.in request failed, retrying", {
          ...context,
          delayMs: delay,
          error: describeError(error),
        });
        await this.sleep(delay);
      }
    }
  }

  private async fetchPageOnce(request: Required<Omit<PageRequest, "filters">> & PageRequest): Promise<Page> {
    const wait = this.lastRequestAt + this.minRequestIntervalMs - this.now();
    if (wait > 0) await this.sleep(wait);
    this.lastRequestAt = this.now();

    const response = await this.fetchImpl(this.buildUrl(request), {
      headers: { accept: "application/json, text/csv;q=0.9" },
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    const body = await response.text();
    if (response.status === 403) throw new DataGovInAuthError();
    if (response.status === 429) throw new DataGovInRateLimitError();
    if (response.status >= 500) {
      throw new DataGovInError(`data.gov.in HTTP ${response.status}`, { retryable: true });
    }
    if (!response.ok) {
      throw new DataGovInError(`data.gov.in HTTP ${response.status}: ${body.slice(0, 200)}`, {
        retryable: false,
      });
    }

    const contentType = response.headers.get("content-type") ?? "";
    const looksLikeJson = /^\s*[{[]/.test(body);
    if (contentType.includes("csv") || (!contentType.includes("json") && !looksLikeJson)) {
      return { records: parseCsvRecords(body), total: null, format: "csv", meta: null };
    }

    let json: Record<string, unknown>;
    try {
      json = JSON.parse(body) as Record<string, unknown>;
    } catch (cause) {
      throw new DataGovInParseError("data.gov.in returned invalid JSON", cause);
    }

    // Errors often arrive as HTTP 200 with status "error" and an Elasticsearch message.
    if (json.status === "error" || typeof json.error === "string") {
      const message = String(json.message ?? json.error ?? "unknown error");
      if (message === "Meta not found") throw new DataGovInResourceNotFoundError(request.resourceId);
      if (message.includes("Result window is too large")) {
        throw new DataGovInResultWindowError(request.offset, request.limit, this.maxResultWindow);
      }
      if (/not authori[sz]ed/i.test(message)) throw new DataGovInAuthError();
      throw new DataGovInError(`data.gov.in error: ${message.slice(0, 300)}`, { retryable: true });
    }

    const records = Array.isArray(json.records) ? (json.records as Record<string, unknown>[]) : [];
    const totalNumber = Number(json.total);
    return {
      records,
      total: Number.isFinite(totalNumber) ? totalNumber : null,
      format: "json",
      meta: {
        title: typeof json.title === "string" ? json.title : null,
        org: Array.isArray(json.org) ? json.org.map(String) : [],
        updatedDate: typeof json.updated_date === "string" ? json.updated_date : null,
        fields: toFields(json.field),
        fieldsExposed: toFields(json.field_exposed),
      },
    };
  }

  /**
   * Yields every page for a query.
   *
   * WARNING: result order is not stable between requests, so multi-page reads can repeat
   * some rows and skip others. Use it only where that is acceptable (small resources, or
   * CSV fallbacks). Mandi ingestion uses `fetchPartition`, one request per partition.
   *
   * Stops at the first empty page (the API can return an
   * empty `records` array before `total` is reached) or once `total` is reached.
   */
  async *paginate(request: Omit<PageRequest, "offset">): AsyncGenerator<Page> {
    const pageSize = request.limit ?? 100;
    let offset = 0;
    for (let pageIndex = 0; ; pageIndex++) {
      // Rows can be added while we page; never request past the result window.
      const limit = Math.min(pageSize, this.maxResultWindow - offset);
      if (limit <= 0) {
        this.logger.warn("reached result window while paging; narrow the query", {
          resourceId: request.resourceId,
          offset,
        });
        return;
      }
      if (pageIndex > 0) await this.sleep(this.pageDelayMs);
      const page = await this.fetchPage({ ...request, offset, limit });
      if (page.records.length === 0) {
        if (page.total !== null && offset < page.total) {
          this.logger.warn("empty page before total reached; treating as end", {
            resourceId: request.resourceId,
            offset,
            total: page.total,
          });
        }
        return;
      }
      yield page;
      offset += page.records.length;
      if (page.total !== null && offset >= page.total) return;
    }
  }

  /**
   * Checks a filter before looping (SPEC §6.1). Verified behaviour (2026-09-17):
   * - field names and values are case-sensitive;
   * - plain fields (`state`) are full-text matches ranked by relevance, so
   *   "Uttar Pradesh" also returns other "... Pradesh" rows; `<field>.keyword` is exact;
   * - filters on some fields (e.g. `arrival_date`) are silently ignored.
   * Samples a page and reports "ignored" when no row matches and "inexact" when only some do.
   */
  async verifyFilter(resourceId: string, field: string, value: string, sampleSize = 1): Promise<FilterCheck> {
    const filtered = await this.fetchPage({ resourceId, limit: sampleSize, filters: { [field]: value } });
    if (filtered.records.length === 0 || filtered.total === 0) {
      return { status: "no-match", total: 0 };
    }
    const key = normalizeFieldName(field.replace(/\.keyword$/, ""));
    const matches = filtered.records.filter((record) => {
      const entry = Object.entries(record).find(([k]) => normalizeFieldName(k) === key);
      return entry !== undefined && String(entry[1]) === value;
    }).length;
    if (matches === 0) return { status: "ignored", total: filtered.total };
    if (matches < filtered.records.length) return { status: "inexact", total: filtered.total };
    return { status: "ok", total: filtered.total };
  }
}

export type FilterCheck =
  | { status: "ok"; total: number | null }
  | { status: "no-match"; total: 0 }
  /** No returned row matches the filter value: the filter was ignored. */
  | { status: "ignored"; total: number | null }
  /** Some returned rows do not match exactly: full-text match. Use `<field>.keyword`. */
  | { status: "inexact"; total: number | null };
