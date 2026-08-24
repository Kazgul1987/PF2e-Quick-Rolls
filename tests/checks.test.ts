import { beforeEach, describe, expect, it, vi } from "vitest";
import { postCheck } from "../src/module/checks";

describe("PF2e inline checks", () => {
  beforeEach(() => {
    globalThis.CONFIG = { PF2E: { skills: Object.fromEntries([
      "acrobatics", "athletics", "medicine", "stealth",
    ].map((slug) => [slug, { label: slug }])) } } as never;
    globalThis.ChatMessage = { create: vi.fn().mockResolvedValue(undefined) } as never;
    globalThis.ui = { notifications: { warn: vi.fn() } } as never;
    globalThis.game = { actorRoll: vi.fn() } as never;
  });

  it.each(["fortitude", "reflex", "will", "perception"])("posts the %s check", async (slug) => {
    expect(await postCheck(slug)).toBe(true);
    expect(globalThis.ChatMessage.create).toHaveBeenCalledWith({ content: `@Check[${slug}]` });
    expect((globalThis.game as never as { actorRoll: ReturnType<typeof vi.fn> }).actorRoll).not.toHaveBeenCalled();
  });

  it.each(["athletics", "acrobatics", "medicine", "stealth"])("posts the %s skill", async (slug) => {
    expect(await postCheck(slug)).toBe(true);
    expect(globalThis.ChatMessage.create).toHaveBeenCalledWith({ content: `@Check[${slug}]` });
  });

  it("rejects unknown skills without creating a message or rolling", async () => {
    expect(await postCheck("not-a-skill")).toBe(false);
    expect(globalThis.ChatMessage.create).not.toHaveBeenCalled();
    expect((globalThis.game as never as { actorRoll: ReturnType<typeof vi.fn> }).actorRoll).not.toHaveBeenCalled();
  });
});
