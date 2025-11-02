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
  restricted?: boolean;
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
    console.debug(
      "PF2e Quick Rolls | openQuickRollPrompt invoked; instantiating QuickRollPrompt"
    );
    new QuickRollPrompt().render(true);
    return;
  }

  console.debug(
    "PF2e Quick Rolls | openQuickRollPrompt invoked; QuickRollPrompt unavailable, issuing warning"
  );
  console.warn(
    "PF2e Quick Rolls | QuickRollPrompt constructor is unavailable; cannot open prompt via keybinding."
  );
}

export function registerKeybindings(): void {
  console.debug("PF2e Quick Rolls | registerKeybindings() invoked");

  const namespace = "pf2e-quick-rolls";
  const bindingName = "openQuickRollPrompt";
  const registerFn = game.keybindings?.register;
  const hasRegister = typeof registerFn === "function";

  console.debug(
    `PF2e Quick Rolls | game.keybindings.register is ${hasRegister ? "available" : "unavailable"}`
  );

  if (!hasRegister) {
    console.warn(
      "PF2e Quick Rolls | game.keybindings.register is unavailable; skipping keybinding registration."
    );
    return;
  }

  console.debug(
    `PF2e Quick Rolls | Registering keybinding ${namespace}.${bindingName}`
  );

  registerFn.call(game.keybindings, namespace, bindingName, {
    name: "PF2e Quick Rolls | Open Quick Roll Prompt",
    hint: "Open the PF2e Quick Roll Prompt.",
    restricted: false,
    onDown: () => {
      openQuickRollPrompt();
      return true;
    },
  });

  console.debug(
    `PF2e Quick Rolls | Completed registration for keybinding ${namespace}.${bindingName}`
  );
}
