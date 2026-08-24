import { describe, expect, it } from "vitest";
import {
  getDCByLevel,
  parseCheckDCInput,
  resolveCheckDC,
} from "../src/module/check-dc";
import { buildCheckInline } from "../src/module/checks";

describe("check DC input", () => {
  it.each([
    ["", { mode: "none" }],
    ["23", { mode: "level", level: 23 }],
    ["DC 23", { mode: "fixed", dc: 23 }],
    ["dc 23", { mode: "fixed", dc: 23 }],
    ["Dc    23", { mode: "fixed", dc: 23 }],
    ["DC: 23", { mode: "fixed", dc: 23 }],
  ])("parses %j", (input, expected) => {
    expect(parseCheckDCInput(input)).toEqual(expected);
  });

  it.each(["foo", "DC foo", "23.5", "23foo", "2d6", "+23", "DC -5", "DC23foo"])(
    "rejects invalid input %j",
    (input) => expect(parseCheckDCInput(input)).toEqual({ mode: "invalid" }),
  );

  it.each([
    [-1, 13], [0, 14], [5, 20], [10, 27], [20, 40], [23, 46], [25, 50],
  ])("uses PF2e V14's DC for level %i", (level, dc) => {
    expect(getDCByLevel(level)).toBe(dc);
  });

  it.each([-2, 26, 999, 1.5])("rejects unsupported level %s", (level) => {
    expect(getDCByLevel(level)).toBeUndefined();
  });

  it("keeps level 10 distinct from fixed DC 10 through the complete resolve flow", () => {
    const level = resolveCheckDC(parseCheckDCInput("10"));
    const fixed = resolveCheckDC(parseCheckDCInput("DC 10"));

    expect(level).toEqual({ valid: true, dc: 27 });
    expect(fixed).toEqual({ valid: true, dc: 10 });
    expect(buildCheckInline("reflex", { dc: level.valid ? level.dc : undefined }))
      .toBe("@Check[type:reflex|dc:27]");
    expect(buildCheckInline("reflex", { dc: fixed.valid ? fixed.dc : undefined }))
      .toBe("@Check[type:reflex|dc:10]");
  });
});
