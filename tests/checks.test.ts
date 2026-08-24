import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCheckInline, postCheck, prepareCheckButtons } from "../src/module/checks";

describe("PF2e inline checks", () => {
  beforeEach(() => {
    globalThis.CONFIG = { PF2E: { skills: Object.fromEntries([
      "acrobatics", "athletics", "medicine", "stealth",
    ].map((slug) => [slug, { label: slug }])) } } as never;
    globalThis.ChatMessage = { create: vi.fn().mockResolvedValue(undefined) } as never;
    globalThis.ui = { notifications: { warn: vi.fn() } } as never;
    globalThis.game = { actorRoll: vi.fn() } as never;
  });

  it("prepares technical slugs separately from localized labels", () => {
    const context = prepareCheckButtons(
      {
        athletics: { label: "PF2E.SkillAthletics" },
        medicine: "PF2E.SkillMedicine",
        stealth: { label: "PF2E.SkillStealth" },
      },
      (label) => `localized:${label}`,
    );

    expect(context.checks.map(({ slug }) => slug)).toEqual([
      "fortitude", "reflex", "will", "perception",
    ]);
    expect(context.skills.map(({ slug }) => slug)).toEqual([
      "athletics", "medicine", "stealth",
    ]);
    expect(context.skills[0]).toEqual({
      slug: "athletics",
      label: "localized:PF2E.SkillAthletics",
    });
  });

  it.each(["reflex", "fortitude", "will", "perception", "athletics", "medicine", "stealth"])(
    "builds the canonical inline syntax for %s",
    (slug) => expect(buildCheckInline(slug)).toBe(`@Check[type:${slug}]`),
  );

  it("includes a DC after the explicit check type", () => {
    expect(buildCheckInline("perception", { dc: 19 })).toBe("@Check[type:perception|dc:19]");
  });

  it.each([
    ["reflex", 23],
    ["athletics", 31],
  ])("posts %s with a fixed DC", async (slug, dc) => {
    expect(await postCheck(slug, { dc })).toBe(true);
    expect(globalThis.ChatMessage.create).toHaveBeenCalledWith({
      content: `@Check[type:${slug}|dc:${dc}]`,
    });
  });

  it("rejects an invalid fixed DC", async () => {
    expect(await postCheck("reflex", { dc: -5 })).toBe(false);
    expect(globalThis.ChatMessage.create).not.toHaveBeenCalled();
  });

  it.each(["fortitude", "reflex", "will", "perception"])("posts the %s check", async (slug) => {
    expect(await postCheck(slug)).toBe(true);
    expect(globalThis.ChatMessage.create).toHaveBeenCalledWith({ content: `@Check[type:${slug}]` });
    expect((globalThis.game as never as { actorRoll: ReturnType<typeof vi.fn> }).actorRoll).not.toHaveBeenCalled();
  });

  it.each(["athletics", "acrobatics", "medicine", "stealth"])("posts the %s skill", async (slug) => {
    expect(await postCheck(slug)).toBe(true);
    expect(globalThis.ChatMessage.create).toHaveBeenCalledWith({ content: `@Check[type:${slug}]` });
  });

  it("rejects unknown skills without creating a message or rolling", async () => {
    expect(await postCheck("not-a-skill")).toBe(false);
    expect(globalThis.ChatMessage.create).not.toHaveBeenCalled();
    expect((globalThis.game as never as { actorRoll: ReturnType<typeof vi.fn> }).actorRoll).not.toHaveBeenCalled();
    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(
      "PF2e Quick Rolls: Unbekannter Check.",
    );
  });

  it("warns without throwing when the chat API is unavailable", async () => {
    globalThis.ChatMessage = {} as never;
    expect(await postCheck("reflex")).toBe(false);
    expect(globalThis.ui.notifications.warn).toHaveBeenCalledWith(
      "PF2e Quick Rolls: Chat nicht verfügbar.",
    );
  });
});
