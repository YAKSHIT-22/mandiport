/**
 * Read-only queries for pages that must still render when the database is unreachable
 * (a build with no database, or a brief outage). The failure is logged and the page shows its
 * empty or error state: it never invents data.
 */
export async function tryQuery<T>(label: string, query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "database query failed; rendering fallback",
        query: label,
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return fallback;
  }
}
