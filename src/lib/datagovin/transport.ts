import { Agent, fetch as undiciFetch } from "undici";

/**
 * data.gov.in's edge intermittently stalls TLS handshakes whose ClientHello carries the
 * post-quantum X25519MLKEM768 key share that Node 24 (OpenSSL 3.5) sends by default:
 * ~50% of handshakes hung in testing on 2026-09-17, versus 8/8 successes with classical
 * curves. We offer classical ECDHE curves for this host only. Certificate verification is
 * unchanged. See DECISIONS.md D-006.
 */
export const DATAGOVIN_ECDH_CURVES = "X25519:P-256:P-384";

let dispatcher: Agent | undefined;

export function dataGovInFetch(input: string | URL, init?: RequestInit): Promise<Response> {
  dispatcher ??= new Agent({
    connect: { ecdhCurve: DATAGOVIN_ECDH_CURVES, timeout: 15_000 },
    keepAliveTimeout: 10_000,
  });
  // undici's fetch returns its own Response class, which is compatible with the global one
  // at runtime; the cast bridges the separate type declarations.
  return undiciFetch(input, { ...(init as object), dispatcher }) as unknown as Promise<Response>;
}
