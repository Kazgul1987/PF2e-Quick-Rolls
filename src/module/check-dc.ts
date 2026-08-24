export type CheckDCInput =
  | { mode: "none" }
  | { mode: "level"; level: number }
  | { mode: "fixed"; dc: number }
  | { mode: "invalid" };

export type ResolvedCheckDC =
  | { valid: true; dc?: number }
  | { valid: false; reason: "input" | "level" | "fixed" };

/**
 * Normal DCs by level from PF2e V14's `src/module/dc.ts` (`dcByLevel`).
 * Kept local because that system module is not a supported runtime API.
 */
const DC_BY_LEVEL = new Map<number, number>([
  [-1, 13], [0, 14], [1, 15], [2, 16], [3, 18], [4, 19], [5, 20],
  [6, 22], [7, 23], [8, 24], [9, 26], [10, 27], [11, 28], [12, 30],
  [13, 31], [14, 32], [15, 34], [16, 35], [17, 36], [18, 38],
  [19, 39], [20, 40], [21, 42], [22, 44], [23, 46], [24, 48], [25, 50],
]);

/** Parse command-line input only in the context of a check-button click. */
export function parseCheckDCInput(rawInput: string): CheckDCInput {
  const input = rawInput.trim();
  if (!input) return { mode: "none" };

  if (/^-?\d+$/.test(input)) {
    const level = Number(input);
    return Number.isSafeInteger(level) ? { mode: "level", level } : { mode: "invalid" };
  }

  const fixedMatch = input.match(/^dc(?:\s+|:\s*)(\d+)$/i);
  if (fixedMatch) {
    const dc = Number(fixedMatch[1]);
    return Number.isSafeInteger(dc) ? { mode: "fixed", dc } : { mode: "invalid" };
  }

  return { mode: "invalid" };
}

export function getDCByLevel(level: number): number | undefined {
  return Number.isSafeInteger(level) ? DC_BY_LEVEL.get(level) : undefined;
}

export function resolveCheckDC(input: CheckDCInput): ResolvedCheckDC {
  if (input.mode === "none") return { valid: true };
  if (input.mode === "invalid") return { valid: false, reason: "input" };
  if (input.mode === "fixed") {
    return Number.isSafeInteger(input.dc) && input.dc >= 0
      ? { valid: true, dc: input.dc }
      : { valid: false, reason: "fixed" };
  }

  const dc = getDCByLevel(input.level);
  return dc === undefined ? { valid: false, reason: "level" } : { valid: true, dc };
}
