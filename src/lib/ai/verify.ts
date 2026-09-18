/**
 * Checks that every number in an answer came from the tool results (SPEC §14 Phase 5).
 * Used both as a test and at runtime: an answer with unsupported figures is not shown.
 */

const NUMBER_PATTERN = /-?\d[\d,]*(?:\.\d+)?/g;

/** All numbers appearing anywhere in a tool result, including inside strings. */
export function collectNumbers(value: unknown, into = new Set<number>()): Set<number> {
  if (typeof value === "number" && Number.isFinite(value)) {
    into.add(value);
  } else if (typeof value === "string") {
    for (const match of value.match(NUMBER_PATTERN) ?? []) {
      const n = Number(match.replace(/,/g, ""));
      if (Number.isFinite(n)) into.add(n);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) collectNumbers(item, into);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectNumbers(item, into);
  }
  return into;
}

/** Numbers a reader can derive from returned figures: differences, sums and percentages. */
function derivedNumbers(source: Set<number>): Set<number> {
  const values = [...source];
  const derived = new Set<number>();
  for (let i = 0; i < values.length && i < 60; i++) {
    for (let j = 0; j < values.length && j < 60; j++) {
      if (i === j) continue;
      const a = values[i]!;
      const b = values[j]!;
      derived.add(Math.round((a - b) * 100) / 100);
      derived.add(Math.round((a + b) * 100) / 100);
      if (b !== 0) {
        const percent = ((a - b) / b) * 100;
        derived.add(Math.round(percent * 10) / 10);
        derived.add(Math.round(percent));
        derived.add(Math.round(Math.abs(percent) * 10) / 10);
        derived.add(Math.round(Math.abs(percent)));
      }
    }
  }
  return derived;
}

/** Numbers in `answer` that no tool returned and that cannot be derived from them. */
export function findUnsupportedNumbers(answer: string, toolResults: unknown[]): number[] {
  const supported = new Set<number>();
  for (const result of toolResults) collectNumbers(result, supported);
  const derived = derivedNumbers(supported);
  const unsupported: number[] = [];

  for (const match of answer.match(NUMBER_PATTERN) ?? []) {
    const n = Number(match.replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    // Years, small counts and ordinary words like "100 kg" are not claims about data.
    if (Number.isInteger(n) && Math.abs(n) <= 100) continue;
    if (Number.isInteger(n) && n >= 1900 && n <= 2100) continue;
    if (supported.has(n) || derived.has(n)) continue;
    // Allow a rounded version of a supported number (e.g. 2,449.6 → 2,450).
    if ([...supported].some((s) => Math.abs(s - n) < 1 || Math.abs(Math.round(s) - n) < 1)) continue;
    unsupported.push(n);
  }
  return unsupported;
}
