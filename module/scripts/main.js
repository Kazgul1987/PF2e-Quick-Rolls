// src/module/parser.ts
var DAMAGE_TYPE_ALIASES = {
  acid: "acid",
  aci: "acid",
  cold: "cold",
  col: "cold",
  electricity: "electricity",
  ele: "electricity",
  elec: "electricity",
  fire: "fire",
  fir: "fire",
  force: "force",
  sonic: "sonic",
  son: "sonic",
  poison: "poison",
  poi: "poison",
  mental: "mental",
  men: "mental",
  negative: "negative",
  neg: "negative",
  positive: "positive",
  pos: "positive",
  bludgeoning: "bludgeoning",
  blu: "bludgeoning",
  blud: "bludgeoning",
  piercing: "piercing",
  pie: "piercing",
  slashing: "slashing",
  sla: "slashing"
};
var SKILL_AND_SAVE_ALIASES = {
  acrobatics: "acrobatics",
  acro: "acrobatics",
  arcana: "arcana",
  arc: "arcana",
  athletics: "athletics",
  ath: "athletics",
  crafting: "crafting",
  cra: "crafting",
  deception: "deception",
  dec: "deception",
  diplomacy: "diplomacy",
  dip: "diplomacy",
  intimidation: "intimidation",
  int: "intimidation",
  medicine: "medicine",
  med: "medicine",
  nature: "nature",
  nat: "nature",
  occultism: "occultism",
  occ: "occultism",
  perception: "perception",
  perc: "perception",
  performance: "performance",
  perf: "performance",
  religion: "religion",
  rel: "religion",
  society: "society",
  soc: "society",
  stealth: "stealth",
  ste: "stealth",
  survival: "survival",
  sur: "survival",
  thievery: "thievery",
  thi: "thievery",
  fortitude: "fortitude",
  fort: "fortitude",
  reflex: "reflex",
  ref: "reflex",
  will: "will",
  wil: "will"
};
var STANDARD_DC_BY_LEVEL = [
  14,
  15,
  16,
  18,
  19,
  20,
  22,
  23,
  24,
  26,
  27,
  28,
  30,
  31,
  32,
  34,
  35,
  36,
  38,
  39,
  40,
  42,
  44,
  46,
  48,
  50
];
async function parseQuickRollInput(rawInput) {
  const trimmedInput = rawInput.trim();
  if (!trimmedInput) {
    console.warn("PF2e Quick Rolls | Ignoring empty quick roll input.");
    return false;
  }
  console.log(`PF2e Quick Rolls | Parsing quick roll input: ${trimmedInput}`);
  try {
    if (/^[0-9]/.test(trimmedInput)) {
      return await parseDamageCommand(trimmedInput);
    }
    if (/^[a-zA-Z]/.test(trimmedInput)) {
      return await parseCheckCommand(trimmedInput);
    }
  } catch (error) {
    console.error("PF2e Quick Rolls | Failed to parse input:", error);
    notifyUser("PF2e Quick Rolls: Eingabe konnte nicht verarbeitet werden.");
    return false;
  }
  notifyUser("PF2e Quick Rolls: Eingabeformat nicht erkannt.");
  return false;
}
async function parseDamageCommand(input) {
  const match = input.match(/^([0-9dD+\-*/()\s]+)\s*([a-zA-Z]+)$/);
  if (!match) {
    notifyUser("PF2e Quick Rolls: Schaden nicht erkannt. Verwende z.B. '2d6+4 fir'.");
    return false;
  }
  const formula = match[1].replace(/\s+/g, "");
  const damageAlias = match[2].toLowerCase();
  const damageType = DAMAGE_TYPE_ALIASES[damageAlias];
  if (!damageType) {
    notifyUser(`PF2e Quick Rolls: Unbekannte Schadensart '${damageAlias}'.`);
    return false;
  }
  if (!formula) {
    notifyUser("PF2e Quick Rolls: Keine Schadensformel gefunden.");
    return false;
  }
  const command = `/r (${formula})[${damageType}]`;
  const chatCommand = `(${command})`;
  if (!game?.dice?.roll) {
    try {
      if (ui?.chat?.processMessage) {
        await ui.chat.processMessage(chatCommand, {});
        return true;
      }
    } catch (error) {
      console.error("PF2e Quick Rolls | Chat-Verarbeitung fehlgeschlagen:", error);
    }
    console.warn("PF2e Quick Rolls | game.dice.roll ist nicht verf\xFCgbar.");
    notifyUser("PF2e Quick Rolls: W\xFCrfelmechanik nicht verf\xFCgbar.");
    return false;
  }
  await game.dice.roll(command);
  return true;
}
async function parseCheckCommand(input) {
  const trimmed = input.trim();
  const match = trimmed.match(/^([a-zA-Z]+)\s+(.+)$/);
  if (!match) {
    notifyUser("PF2e Quick Rolls: Check nicht erkannt. Verwende z.B. 'perc 20'.");
    return false;
  }
  const skillAlias = match[1].toLowerCase();
  const remainder = match[2].trim();
  const skill = SKILL_AND_SAVE_ALIASES[skillAlias];
  if (!skill) {
    notifyUser(`PF2e Quick Rolls: Unbekannter Skill/Safe '${skillAlias}'.`);
    return false;
  }
  const qualifierMatch = remainder.match(/^(dc|lvl|level)\s*[:=]?\s*(\d+)$/i);
  const compactQualifierMatch = remainder.match(/^(dc|lvl|level)(\d+)$/i);
  let qualifier = "level";
  let valueText;
  if (qualifierMatch || compactQualifierMatch) {
    const [, qualifierToken, valueToken] = qualifierMatch ?? compactQualifierMatch;
    qualifier = qualifierToken.toLowerCase() === "dc" ? "dc" : "level";
    valueText = valueToken;
  } else {
    const bareMatch = remainder.match(/^(\d+)$/);
    if (!bareMatch) {
      notifyUser("PF2e Quick Rolls: Check nicht erkannt. Verwende z.B. 'perc 20'.");
      return false;
    }
    valueText = bareMatch[1];
  }
  const value = Number.parseInt(valueText ?? "", 10);
  if (Number.isNaN(value)) {
    notifyUser("PF2e Quick Rolls: Check nicht erkannt. Verwende z.B. 'perc 20'.");
    return false;
  }
  let dc;
  if (qualifier === "dc") {
    dc = value;
  } else {
    if (value < 0 || value >= STANDARD_DC_BY_LEVEL.length) {
      notifyUser("PF2e Quick Rolls: Standard-DCs sind nur f\xFCr Stufen 0\u201325 verf\xFCgbar.");
      return false;
    }
    dc = STANDARD_DC_BY_LEVEL[value];
  }
  if (!ChatMessage?.create) {
    console.warn("PF2e Quick Rolls | ChatMessage.create ist nicht verf\xFCgbar.");
    notifyUser("PF2e Quick Rolls: Chat nicht verf\xFCgbar.");
    return false;
  }
  const content = `@Check[${skill}|dc:${dc}]`;
  await ChatMessage.create({ content });
  return true;
}
function notifyUser(message) {
  if (ui?.notifications?.warn) {
    ui.notifications.warn(message);
    return;
  }
  console.warn(message);
}

// src/module/app/QuickRollPrompt.ts
var QuickRollPrompt2 = class extends Application {
  static get defaultOptions() {
    const options = super.defaultOptions ?? {};
    const classes = /* @__PURE__ */ new Set(["pf2e-quick-rolls", "quick-roll-prompt"]);
    for (const cssClass of options.classes ?? []) {
      classes.add(cssClass);
    }
    return {
      ...options,
      id: "pf2e-quick-rolls-quick-roll-prompt",
      classes: Array.from(classes),
      template: "modules/pf2e-quick-rolls/templates/quick-roll-prompt.hbs",
      width: options.width ?? 360,
      height: options.height ?? 120,
      title: options.title ?? "PF2e Quick Roll"
    };
  }
  activateListeners(html) {
    super.activateListeners(html);
    const root = this.extractRootElement(html);
    const input = root?.querySelector('input[name="quick-roll-input"]');
    if (!input) {
      console.warn("PF2e Quick Rolls | QuickRollPrompt rendered without an input element.");
      return;
    }
    input.focus();
    input.addEventListener("keydown", (event) => void this.handleKeydown(event, input));
  }
  extractRootElement(html) {
    if (!html) {
      return null;
    }
    if (html instanceof HTMLElement) {
      return html;
    }
    if (typeof html === "object" && 0 in html) {
      const candidate = html[0];
      if (candidate instanceof HTMLElement) {
        return candidate;
      }
    }
    return null;
  }
  async handleKeydown(event, input) {
    if (event.key === "Escape") {
      event.preventDefault();
      await this.close();
      return;
    }
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    const rawValue = input.value.trim();
    if (!rawValue) {
      await this.close();
      return;
    }
    try {
      const wasProcessed = await parseQuickRollInput(rawValue);
      if (wasProcessed !== false) {
        await this.close();
      }
    } catch (error) {
      console.error("PF2e Quick Rolls | Failed to process quick roll input:", error);
    }
  }
};

// src/module/keybindings.ts
function openQuickRollPrompt() {
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
function registerKeybindings() {
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
    onDown: () => {
      openQuickRollPrompt();
      return true;
    }
  });
  console.debug(
    `PF2e Quick Rolls | Completed registration for keybinding ${namespace}.${bindingName}`
  );
}

// src/main.ts
Hooks.once("init", () => {
  console.log("PF2e Quick Rolls | Module initializing");
  globalThis.QuickRollPrompt = QuickRollPrompt2;
  console.debug("PF2e Quick Rolls | Starting keybinding registration from main.ts");
  registerKeybindings();
  console.debug("PF2e Quick Rolls | Finished keybinding registration from main.ts");
});
Hooks.once("ready", () => {
  console.log("PF2e Quick Rolls | Ready to roll!");
});
//# sourceMappingURL=out.js.map
//# sourceMappingURL=main.js.map