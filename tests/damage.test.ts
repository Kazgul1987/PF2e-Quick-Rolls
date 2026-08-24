import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildDamageFormula, rollDamage } from "../src/module/damage";

describe("damage rolls", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.CONFIG = { PF2E: { damageTypes: Object.fromEntries([
      "acid", "bleed", "bludgeoning", "cold", "electricity", "fire", "force", "mental",
      "piercing", "poison", "slashing", "sonic", "spirit", "untyped", "vitality", "void",
    ].map((type) => [type, type])) } } as never;
    globalThis.game = { dice: { roll: vi.fn() } } as never;
    globalThis.ui = {
      notifications: { warn: vi.fn() },
      chat: { processMessage: vi.fn().mockResolvedValue(undefined) },
    } as never;
  });

  it.each([
    ["8", "fire", "(8)[fire]"],
    ["2d6+4", "spirit", "(2d6+4)[spirit]"],
    ["3d8", "cold", "(3d8)[cold]"],
    ["1d6", "vitality", "(1d6)[vitality]"],
    ["4d6", "void", "(4d6)[void]"],
    ["2d6", "positive", "(2d6)[vitality]"],
    ["2d6", "negative", "(2d6)[void]"],
  ])("builds %s %s", (formula, type, expected) => {
    expect(buildDamageFormula(formula, type)).toBe(expected);
  });

  it("rejects empty formulas and unknown types", () => {
    expect(buildDamageFormula("", "fire")).toBeNull();
    expect(buildDamageFormula("2d6", "radiant")).toBeNull();
  });

  it("executes the normalized PF2e chat formula", async () => {
    expect(await rollDamage("8", "fire")).toBe(true);
    expect(globalThis.ui.chat.processMessage).toHaveBeenCalledWith("/r (8)[fire]", {});
  });

  it("reports unavailable rolling when the PF2e chat API is absent", async () => {
    globalThis.ui = {
      notifications: { warn: vi.fn() },
      chat: {},
    } as never;
    const diceRoll = globalThis.game.dice.roll;

    expect(await rollDamage("2d6", "fire")).toBe(false);
    expect(diceRoll).not.toHaveBeenCalled();
    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(
      "PF2e Quick Rolls: Würfelmechanik nicht verfügbar.",
    );
  });

  it("supports untyped damage configured by PF2e", () => {
    expect(buildDamageFormula("2d6", "untyped")).toBe("(2d6)[untyped]");
  });
});
