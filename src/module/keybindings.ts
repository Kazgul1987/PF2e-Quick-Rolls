declare const game: KeybindingsGame;

declare const QuickRollPrompt: QuickRollPromptConstructor | undefined;

type ModifierKey = "ALT" | "ALTGR" | "CONTROL" | "META" | "SHIFT" | string;

type KeybindingAction = {
  key: string;
  modifiers?: ModifierKey[];
};

type KeybindingRegistration = {
  name: string;
  hint?: string;
  editable?: KeybindingAction[];
  onDown?: (context: unknown) => boolean | void;
  onUp?: (context: unknown) => boolean | void;
  repeat?: boolean;
};

type KeybindingsManager = {
  register(namespace: string, name: string, options: KeybindingRegistration): void;
};

type KeybindingsGame = {
  keybindings?: KeybindingsManager;
};

type QuickRollPromptInstance = {
  render(force?: boolean): void;
};

type QuickRollPromptConstructor = new () => QuickRollPromptInstance;

function openQuickRollPrompt(): void {
  if (typeof QuickRollPrompt === "function") {
    new QuickRollPrompt().render(true);
    return;
  }

  console.warn(
    "PF2e Quick Rolls | QuickRollPrompt constructor is unavailable; cannot open prompt via keybinding."
  );
}

export function registerKeybindings(): void {
  if (!game.keybindings?.register) {
    console.warn(
      "PF2e Quick Rolls | game.keybindings.register is unavailable; skipping keybinding registration."
    );
    return;
  }

  game.keybindings.register("pf2e-quick-rolls", "openQuickRollPrompt", {
    name: "PF2e Quick Rolls | Open Quick Roll Prompt",
    hint: "Open the PF2e Quick Roll Prompt.",
    editable: [
      {
        key: "Space",
        modifiers: ["CONTROL"],
      },
    ],
    onDown: () => {
      openQuickRollPrompt();
      return true;
    },
  });
}
