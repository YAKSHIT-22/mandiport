/** Base class for every failure raised by the data.gov.in client. */
export class DataGovInError extends Error {
  override name = "DataGovInError";
  /** Whether retrying the same request might succeed. */
  readonly retryable: boolean;

  constructor(message: string, options: { retryable: boolean; cause?: unknown }) {
    super(message, { cause: options.cause });
    this.retryable = options.retryable;
  }
}

/** HTTP 403 "Key not authorised". Retrying will not help. */
export class DataGovInAuthError extends DataGovInError {
  override name = "DataGovInAuthError";
  constructor(message = "data.gov.in rejected the API key (HTTP 403). Check DATAGOVIN_API_KEY.") {
    super(message, { retryable: false });
  }
}

/** Resource ID does not exist ("Meta not found"). */
export class DataGovInResourceNotFoundError extends DataGovInError {
  override name = "DataGovInResourceNotFoundError";
  constructor(resourceId: string) {
    super(`data.gov.in has no resource with ID ${resourceId}.`, { retryable: false });
  }
}

/**
 * The API is backed by Elasticsearch with index.max_result_window = 10,000:
 * offset + limit must stay ≤ 10,000. Callers must narrow the query with filters instead.
 */
export class DataGovInResultWindowError extends DataGovInError {
  override name = "DataGovInResultWindowError";
  constructor(offset: number, limit: number, maxWindow: number) {
    super(
      `offset ${offset} + limit ${limit} exceeds the data.gov.in result window of ${maxWindow}. Split the query with filters.`,
      { retryable: false },
    );
  }
}

/** TLS certificate problem on the endpoint. Logged and retried once, never bypassed. */
export class DataGovInTlsError extends DataGovInError {
  override name = "DataGovInTlsError";
  constructor(message: string, cause: unknown) {
    super(message, { retryable: false, cause });
  }
}

/** Response body could not be parsed as JSON or CSV. */
export class DataGovInParseError extends DataGovInError {
  override name = "DataGovInParseError";
  constructor(message: string, cause?: unknown) {
    super(message, { retryable: true, cause });
  }
}

/**
 * HTTP 429 "Rate limit exceeded" from the Tyk gateway in front of the API. The limit is not
 * published and the response carries no Retry-After header.
 */
export class DataGovInRateLimitError extends DataGovInError {
  override name = "DataGovInRateLimitError";
  constructor() {
    super("data.gov.in rate limit exceeded (HTTP 429).", { retryable: true });
  }
}
