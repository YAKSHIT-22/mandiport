import type { Logger } from "@/lib/datagovin";

/** Structured one-line logs for scripts and GitHub Actions. */
export const logger: Logger & { error(message: string, data?: Record<string, unknown>): void } = {
  info: (message, data) => console.log(JSON.stringify({ level: "info", message, ...data })),
  warn: (message, data) => console.warn(JSON.stringify({ level: "warn", message, ...data })),
  error: (message, data) => console.error(JSON.stringify({ level: "error", message, ...data })),
};
