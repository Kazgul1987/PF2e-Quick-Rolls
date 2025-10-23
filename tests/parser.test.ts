import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseQuickRollInput } from "../src/module/parser";

declare global {
  // eslint-disable-next-line no-var
  var game: { dice?: { roll?: (formula: string) => Promise<unknown> | unknown } } | undefined;
  // eslint-disable-next-line no-var
  var ChatMessage: { create?: (data: { content: string }) => Promise<unknown> | unknown } | undefined;
  // eslint-disable-next-line no-var
  var ui:
    | {
        notifications?: { warn?: (message: string) => void };
        chat?: {
          processMessage?: (
            content: string,
            options: Record<string, unknown>,
          ) => Promise<unknown> | unknown;
        };
      }
    | undefined;
}

describe("parseQuickRollInput", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    globalThis.game = {
      dice: {
        roll: vi.fn().mockResolvedValue(undefined),
      },
    };

    globalThis.ChatMessage = {
      create: vi.fn().mockResolvedValue(undefined),
    };

    globalThis.ui = {
      notifications: {
        warn: vi.fn(),
      },
      chat: {
        processMessage: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  it("rolls damage for shorthand damage type aliases", async () => {
    const result = await parseQuickRollInput("3d6+4 fir");

    expect(result).toBe(true);
    expect(globalThis.game?.dice?.roll).toHaveBeenCalledWith("/r (3d6+4)[fire]");
    expect(globalThis.ui?.notifications?.warn).not.toHaveBeenCalled();
  });

  it("rolls damage for full damage type names with wrapped formulas", async () => {
    const result = await parseQuickRollInput("3d6+4 acid");

    expect(result).toBe(true);
    expect(globalThis.game?.dice?.roll).toHaveBeenCalledWith("/r (3d6+4)[acid]");
    expect(globalThis.ui?.notifications?.warn).not.toHaveBeenCalled();
  });

  it("creates a check chat card for known skill aliases", async () => {
    const result = await parseQuickRollInput("perc 19");

    expect(result).toBe(true);
    expect(globalThis.ChatMessage?.create).toHaveBeenCalledWith({
      content: "@Check[perception|dc:19]",
    });
    expect(globalThis.ui?.notifications?.warn).not.toHaveBeenCalled();
  });

  it("warns when the damage type alias is unknown", async () => {
    const result = await parseQuickRollInput("2d6+4 xyz");

    expect(result).toBe(false);
    expect(globalThis.game?.dice?.roll).not.toHaveBeenCalled();
    expect(globalThis.ui?.notifications?.warn).toHaveBeenCalledWith(
      "PF2e Quick Rolls: Unbekannte Schadensart 'xyz'.",
    );
  });

  it("rejects malformed check commands with punctuation", async () => {
    const result = await parseQuickRollInput("perc, 19");

    expect(result).toBe(false);
    expect(globalThis.ChatMessage?.create).not.toHaveBeenCalled();
    expect(globalThis.ui?.notifications?.warn).toHaveBeenCalledWith(
      "PF2e Quick Rolls: Check nicht erkannt. Verwende z.B. 'perc 20'.",
    );
  });

  it("fällt auf die Chat-Verarbeitung zurück, wenn game.dice.roll fehlt", async () => {
    globalThis.game = { dice: {} };

    const result = await parseQuickRollInput("3d6+4 acid");

    expect(result).toBe(true);
    expect(globalThis.ui?.chat?.processMessage).toHaveBeenCalledWith(
      "(/r (3d6+4)[acid])",
      {},
    );
    expect(globalThis.ui?.notifications?.warn).not.toHaveBeenCalled();
  });

  it("warnt, wenn weder game.dice.roll noch ui.chat.processMessage verfügbar sind", async () => {
    globalThis.game = { dice: {} };
    globalThis.ui = {
      notifications: {
        warn: vi.fn(),
      },
      chat: {},
    };

    const result = await parseQuickRollInput("2d6 fir");

    expect(result).toBe(false);
    expect(globalThis.ui?.notifications?.warn).toHaveBeenCalledWith(
      "PF2e Quick Rolls: Würfelmechanik nicht verfügbar.",
    );
  });
});
