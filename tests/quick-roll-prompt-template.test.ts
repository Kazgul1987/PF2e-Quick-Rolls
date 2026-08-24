import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("quick-roll prompt template", () => {
  it("binds save and skill button data-check values to technical slugs", () => {
    const template = readFileSync("module/templates/quick-roll-prompt.hbs", "utf8");

    expect(template.match(/data-check="{{slug}}"/g)).toHaveLength(2);
    expect(template).not.toContain('data-check="{{check}}"');
  });
});
