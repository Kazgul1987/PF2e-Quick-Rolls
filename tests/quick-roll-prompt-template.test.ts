import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("quick-roll prompt template", () => {
  it("binds save and skill button data-check values to technical slugs", () => {
    const template = readFileSync("module/templates/quick-roll-prompt.hbs", "utf8");

    expect(template.match(/data-check="{{slug}}"/g)).toHaveLength(2);
    expect(template).not.toContain('data-check="{{check}}"');
  });

  it("keeps the command line available to both check and damage workflows", () => {
    const source = readFileSync("src/module/app/QuickRollPrompt.ts", "utf8");

    expect(source).toContain("resolveCheckDC(parseCheckDCInput(input.value))");
    expect(source).toContain("await rollDamage(value, this.selectedDamageType)");
  });
});
