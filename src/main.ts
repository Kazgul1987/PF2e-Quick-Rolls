/**
 * Entry point for the PF2e Quick Rolls Foundry VTT module.
 *
 * This file is bundled into {@link module/scripts/main.js} via tsup.
 */

import { registerKeybindings } from "./module/keybindings";

declare const Hooks: {
  once(event: string, callback: () => void): void;
};

declare const game: Game;

interface Game {
  i18n?: {
    format?: (key: string, data?: Record<string, unknown>) => string;
  };
}

Hooks.once("init", () => {
  console.log("PF2e Quick Rolls | Module initializing");
});

Hooks.once("ready", () => {
  console.log("PF2e Quick Rolls | Ready to roll!");
  registerKeybindings();
});
