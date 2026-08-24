// src/module/checks.ts
var SAVE_AND_PERCEPTION_CHECKS = ["fortitude", "reflex", "will", "perception"];
var SAVE_LABELS = {
  fortitude: "PF2E.SavesFortitude",
  reflex: "PF2E.SavesReflex",
  will: "PF2E.SavesWill",
  perception: "PF2E.PerceptionLabel"
};
function prepareCheckButtons(skills, localize) {
  const checks = SAVE_AND_PERCEPTION_CHECKS.map((slug) => ({
    slug,
    label: localize(SAVE_LABELS[slug])
  }));
  const skillButtons = Object.entries(skills).map(([slug, data]) => ({
    slug,
    label: localize(typeof data === "string" ? data : data.label)
  })).sort((a, b) => a.label.localeCompare(b.label));
  return { checks, skills: skillButtons };
}
function getAvailableChecks() {
  return /* @__PURE__ */ new Set([...SAVE_AND_PERCEPTION_CHECKS, ...Object.keys(CONFIG?.PF2E?.skills ?? {})]);
}
function buildCheckInline(type, options = {}) {
  const parameters = [`type:${type}`];
  if (options.dc !== void 0)
    parameters.push(`dc:${options.dc}`);
  return `@Check[${parameters.join("|")}]`;
}
async function postCheck(check, options = {}) {
  const slug = check.trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(slug) || !getAvailableChecks().has(slug)) {
    ui?.notifications?.warn?.("PF2e Quick Rolls: Unbekannter Check.");
    return false;
  }
  if (options.dc !== void 0 && (!Number.isSafeInteger(options.dc) || options.dc < 0)) {
    ui?.notifications?.warn?.("PF2e Quick Rolls: Ung\xFCltiger fixer DC.");
    return false;
  }
  if (typeof ChatMessage === "undefined" || typeof ChatMessage.create !== "function") {
    ui?.notifications?.warn?.("PF2e Quick Rolls: Chat nicht verf\xFCgbar.");
    return false;
  }
  try {
    await ChatMessage.create({ content: buildCheckInline(slug, options) });
    return true;
  } catch (error) {
    console.error("PF2e Quick Rolls | Posting check failed:", error);
    ui?.notifications?.warn?.("PF2e Quick Rolls: Check konnte nicht im Chat ver\xF6ffentlicht werden.");
    return false;
  }
}

// src/module/check-dc.ts
var DC_BY_LEVEL = /* @__PURE__ */ new Map([
  [-1, 13],
  [0, 14],
  [1, 15],
  [2, 16],
  [3, 18],
  [4, 19],
  [5, 20],
  [6, 22],
  [7, 23],
  [8, 24],
  [9, 26],
  [10, 27],
  [11, 28],
  [12, 30],
  [13, 31],
  [14, 32],
  [15, 34],
  [16, 35],
  [17, 36],
  [18, 38],
  [19, 39],
  [20, 40],
  [21, 42],
  [22, 44],
  [23, 46],
  [24, 48],
  [25, 50]
]);
function parseCheckDCInput(rawInput) {
  const input = rawInput.trim();
  if (!input)
    return { mode: "none" };
  if (/^-?\d+$/.test(input)) {
    const level = Number(input);
    return Number.isSafeInteger(level) ? { mode: "level", level } : { mode: "invalid" };
  }
  const fixedMatch = input.match(/^dc(?:\s+|:\s*)(\d+)$/i);
  if (fixedMatch) {
    const dc = Number(fixedMatch[1]);
    return Number.isSafeInteger(dc) ? { mode: "fixed", dc } : { mode: "invalid" };
  }
  return { mode: "invalid" };
}
function getDCByLevel(level) {
  return Number.isSafeInteger(level) ? DC_BY_LEVEL.get(level) : void 0;
}
function resolveCheckDC(input) {
  if (input.mode === "none")
    return { valid: true };
  if (input.mode === "invalid")
    return { valid: false, reason: "input" };
  if (input.mode === "fixed") {
    return Number.isSafeInteger(input.dc) && input.dc >= 0 ? { valid: true, dc: input.dc } : { valid: false, reason: "fixed" };
  }
  const dc = getDCByLevel(input.level);
  return dc === void 0 ? { valid: false, reason: "level" } : { valid: true, dc };
}

// src/module/damage.ts
var STANDARD_DAMAGE_TYPES = [
  "bludgeoning",
  "piercing",
  "slashing",
  "bleed",
  "acid",
  "cold",
  "electricity",
  "fire",
  "force",
  "sonic",
  "mental",
  "poison",
  "spirit",
  "vitality",
  "void",
  "untyped"
];
var DAMAGE_TYPE_ICONS = {
  bleed: "droplet",
  acid: "vial",
  bludgeoning: "hammer",
  cold: "snowflake",
  electricity: "bolt",
  fire: "fire",
  force: "sparkles",
  mental: "brain",
  piercing: "bow-arrow",
  poison: "spider",
  slashing: "axe",
  sonic: "waveform-lines",
  spirit: "ghost",
  vitality: "sun",
  void: "skull",
  untyped: null
};
var LEGACY_ALIASES = {
  positive: "vitality",
  negative: "void"
};
var SHORT_ALIASES = {
  aci: "acid",
  blu: "bludgeoning",
  blud: "bludgeoning",
  col: "cold",
  ele: "electricity",
  elec: "electricity",
  fir: "fire",
  men: "mental",
  pie: "piercing",
  poi: "poison",
  sla: "slashing",
  son: "sonic",
  vit: "vitality",
  voi: "void",
  pos: "vitality",
  neg: "void"
};
function getAvailableDamageTypes() {
  const configured = Object.keys(CONFIG?.PF2E?.damageTypes ?? {});
  return new Set(configured.length > 0 ? configured : STANDARD_DAMAGE_TYPES);
}
function resolveDamageType(value) {
  const token = value.trim().toLowerCase();
  const normalized = LEGACY_ALIASES[token] ?? SHORT_ALIASES[token] ?? token;
  return getAvailableDamageTypes().has(normalized) ? normalized : null;
}
function buildDamageFormula(formula, damageType) {
  const normalizedFormula = formula.replace(/\s+/g, "");
  const resolvedType = resolveDamageType(damageType);
  if (!normalizedFormula || !resolvedType || !/^[0-9dD+\-*/()]+$/.test(normalizedFormula))
    return null;
  return `(${normalizedFormula})[${resolvedType}]`;
}
async function rollDamage(formula, damageType) {
  const damageFormula = buildDamageFormula(formula, damageType);
  if (!damageFormula) {
    ui?.notifications?.warn?.("PF2e Quick Rolls: Ung\xFCltige Schadensformel oder Schadensart.");
    return false;
  }
  const command = `/r ${damageFormula}`;
  try {
    if (ui?.chat?.processMessage) {
      await ui.chat.processMessage(command, {});
      return true;
    }
  } catch (error) {
    console.error("PF2e Quick Rolls | Damage roll failed:", error);
  }
  ui?.notifications?.warn?.("PF2e Quick Rolls: W\xFCrfelmechanik nicht verf\xFCgbar.");
  return false;
}

// src/module/parser.ts
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
var ACTION_ALIASES = {
  trip: "trip",
  disarm: "disarm",
  shove: "shove",
  push: "shove",
  grapple: "grapple",
  grab: "grapple",
  escape: "escape",
  demoralize: "demoralize",
  demoralise: "demoralize",
  feint: "feint",
  aid: "aid",
  seek: "seek",
  tripup: "trip",
  tumble: "tumbleThrough",
  "tumblethrough": "tumbleThrough",
  "tumble-through": "tumbleThrough",
  "tumblethru": "tumbleThrough",
  "recallknowledge": "recallKnowledge",
  "recall-knowledge": "recallKnowledge",
  recall: "recallKnowledge"
};
var FALLBACK_CONDITION_SLUGS = [
  "blinded",
  "broken",
  "clumsy",
  "concealed",
  "confused",
  "controlled",
  "dazzled",
  "deafened",
  "doomed",
  "drained",
  "dying",
  "encumbered",
  "enfeebled",
  "fascinated",
  "fatigued",
  "flat-footed",
  "fleeing",
  "frightened",
  "grabbed",
  "hidden",
  "immobilized",
  "invisible",
  "paralyzed",
  "persistent-damage",
  "petrified",
  "prone",
  "quickened",
  "restrained",
  "sickened",
  "slowed",
  "stunned",
  "stupefied",
  "unconscious",
  "undetected",
  "wounded"
];
async function parseQuickRollInput(rawInput) {
  const trimmedInput = rawInput.trim();
  if (!trimmedInput) {
    console.warn("PF2e Quick Rolls | Ignoring empty quick roll input.");
    return false;
  }
  console.log(`PF2e Quick Rolls | Parsing quick roll input: ${trimmedInput}`);
  try {
    if (trimmedInput.startsWith("/")) {
      return await parseConditionCommand(trimmedInput);
    }
    if (/^[0-9]/.test(trimmedInput)) {
      return await parseDamageCommand(trimmedInput);
    }
    const normalizedAliasKey = trimmedInput.toLowerCase().replace(/\s+/g, "");
    const actionSlug = ACTION_ALIASES[normalizedAliasKey];
    if (actionSlug) {
      return await invokeActionMacro(actionSlug);
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
async function parseConditionCommand(input) {
  const conditionInput = input.slice(1).trim();
  const match = conditionInput.match(/^([a-zA-Z-]+)(?:\s+(\d+))?$/);
  if (!match) {
    notifyUser("PF2e Quick Rolls: Condition nicht erkannt. Verwende z.B. '/prone' oder '/clumsy 1'.");
    return false;
  }
  const [, aliasToken, valueToken] = match;
  const slug = resolveConditionSlug(aliasToken);
  if (!slug) {
    notifyUser(`PF2e Quick Rolls: Unbekannte Condition '${aliasToken.toLowerCase()}'.`);
    return false;
  }
  const value = valueToken ? Number.parseInt(valueToken, 10) : void 0;
  if (value !== void 0 && (Number.isNaN(value) || value <= 0)) {
    notifyUser("PF2e Quick Rolls: Condition-Wert muss eine positive Zahl sein.");
    return false;
  }
  const selectedToken = canvas?.tokens?.controlled?.[0];
  const actor = selectedToken?.actor;
  if (!actor) {
    notifyUser("PF2e Quick Rolls: Bitte w\xE4hle einen Token aus, um eine Condition zu setzen.");
    return false;
  }
  const options = value === void 0 ? void 0 : { value };
  if (typeof actor.increaseCondition === "function") {
    await actor.increaseCondition(slug, options);
    return true;
  }
  if (typeof actor.toggleCondition === "function") {
    await actor.toggleCondition(slug, { active: true, ...options ?? {} });
    return true;
  }
  if (typeof actor.addCondition === "function") {
    await actor.addCondition(slug, options);
    return true;
  }
  notifyUser("PF2e Quick Rolls: Condition-API nicht verf\xFCgbar.");
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
  const damageType = resolveDamageType(damageAlias);
  if (!damageType) {
    notifyUser(`PF2e Quick Rolls: Unbekannte Schadensart '${damageAlias}'.`);
    return false;
  }
  if (!formula) {
    notifyUser("PF2e Quick Rolls: Keine Schadensformel gefunden.");
    return false;
  }
  return rollDamage(formula, damageType);
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
  if (qualifier === "level") {
    dc = getDCByLevel(value);
    if (dc === void 0) {
      notifyUser("PF2e Quick Rolls: Standard-DCs sind nur f\xFCr Stufen 0\u201325 verf\xFCgbar.");
      return false;
    }
  } else {
    const resolved = resolveCheckDC(parseCheckDCInput(`DC ${value}`));
    if (!resolved.valid || resolved.dc === void 0) {
      notifyUser("PF2e Quick Rolls: Ung\xFCltige DC-Eingabe.");
      return false;
    }
    dc = resolved.dc;
  }
  if (!ChatMessage?.create) {
    console.warn("PF2e Quick Rolls | ChatMessage.create ist nicht verf\xFCgbar.");
    notifyUser("PF2e Quick Rolls: Chat nicht verf\xFCgbar.");
    return false;
  }
  const content = buildCheckInline(skill, { dc });
  await ChatMessage.create({ content });
  return true;
}
async function invokeActionMacro(slug) {
  const actions = game?.pf2e?.actions;
  const mappedAction = actions?.get?.(slug);
  if (mappedAction?.use) {
    await mappedAction.use();
    return true;
  }
  const legacyEntry = actions?.[slug];
  if (typeof legacyEntry === "function") {
    await legacyEntry();
    return true;
  }
  const legacyUse = legacyEntry && legacyEntry.use;
  if (typeof legacyUse === "function") {
    await legacyUse();
    return true;
  }
  notifyUser(`PF2e Quick Rolls: Aktion '${slug}' nicht verf\xFCgbar.`);
  return false;
}
function notifyUser(message) {
  if (ui?.notifications?.warn) {
    ui.notifications.warn(message);
    return;
  }
  console.warn(message);
}
function resolveConditionSlug(alias) {
  const normalizedAlias = normalizeConditionToken(alias);
  const slugs = getAvailableConditionSlugs();
  const exactMatch = slugs.find((slug) => normalizeConditionToken(slug) === normalizedAlias);
  if (exactMatch) {
    return exactMatch;
  }
  if (normalizedAlias.length < 3) {
    return null;
  }
  const prefixMatches = slugs.filter(
    (slug) => normalizeConditionToken(slug).startsWith(normalizedAlias)
  );
  return prefixMatches.length === 1 ? prefixMatches[0] : null;
}
function getAvailableConditionSlugs() {
  const configSlugs = Object.keys(CONFIG?.PF2E?.conditionTypes ?? {});
  const slugs = configSlugs.length > 0 ? configSlugs : FALLBACK_CONDITION_SLUGS;
  return Array.from(new Set(slugs));
}
function normalizeConditionToken(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// src/module/app/QuickRollPrompt.ts
var BaseApplication = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
);
var GROUPS = {
  Physical: ["bludgeoning", "piercing", "slashing", "bleed"],
  Energy: ["acid", "cold", "electricity", "fire", "force", "sonic"],
  Other: ["mental", "poison", "spirit", "vitality", "void", "untyped"]
};
var QuickRollPrompt2 = class extends BaseApplication {
  constructor() {
    super(...arguments);
    this.selectedDamageType = null;
  }
  async _prepareContext() {
    const available = getAvailableDamageTypes();
    const labels = CONFIG?.PF2E?.damageTypes ?? {};
    const groups = Object.entries(GROUPS).map(([label, types]) => ({
      label,
      types: types.filter((type) => available.has(type)).map((type) => ({
        type,
        label: ["bludgeoning", "piercing", "slashing"].includes(type) ? type[0].toUpperCase() : this.localize(labels[type] ?? type),
        title: this.localize(labels[type] ?? type),
        icon: DAMAGE_TYPE_ICONS[type] ?? null
      }))
    }));
    const grouped = new Set(STANDARD_DAMAGE_TYPES);
    const extraTypes = [...available].filter((type) => !grouped.has(type));
    if (extraTypes.length) {
      groups.push({ label: "Additional", types: extraTypes.map((type) => ({ type, label: this.localize(labels[type] ?? type), title: this.localize(labels[type] ?? type), icon: DAMAGE_TYPE_ICONS[type] ?? null })) });
    }
    const { checks, skills } = prepareCheckButtons(
      CONFIG?.PF2E?.skills ?? {},
      (label) => this.localize(label)
    );
    return { groups, checks, skills };
  }
  _onRender(_context, _options) {
    const root = this.element;
    const input = root.querySelector("[name=quick-roll-input]");
    if (!input)
      return;
    input.focus();
    input.addEventListener("keydown", (event) => void this.handleKeydown(event, input));
    root.querySelectorAll("[data-damage-type]").forEach((button) => {
      button.addEventListener("click", () => {
        this.selectedDamageType = this.selectedDamageType === button.dataset.damageType ? null : button.dataset.damageType ?? null;
        root.querySelectorAll("[data-damage-type]").forEach((element) => {
          const selected = element.getAttribute("data-damage-type") === this.selectedDamageType;
          element.classList.toggle("is-selected", selected);
          element.setAttribute("aria-pressed", String(selected));
        });
        input.focus();
      });
    });
    root.querySelectorAll("[data-check]").forEach((button) => {
      button.addEventListener("click", async () => {
        const resolved = resolveCheckDC(parseCheckDCInput(input.value));
        if (!resolved.valid) {
          const message = resolved.reason === "level" ? "PF2e Quick Rolls: Ung\xFCltiges Level f\xFCr DC-by-Level (g\xFCltig: -1 bis 25)." : "PF2e Quick Rolls: Ung\xFCltige DC-Eingabe.";
          ui?.notifications?.warn?.(message);
          input.focus();
          return;
        }
        const posted = resolved.dc === void 0 ? await postCheck(button.dataset.check ?? "") : await postCheck(button.dataset.check ?? "", { dc: resolved.dc });
        if (posted)
          await this.close();
      });
    });
  }
  async handleKeydown(event, input) {
    if (event.key === "Escape") {
      event.preventDefault();
      await this.close();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const value = input.value.trim();
      if (!value)
        return;
      const processed = this.selectedDamageType ? await rollDamage(value, this.selectedDamageType) : await parseQuickRollInput(value);
      if (processed)
        await this.close();
    }
  }
  localize(label) {
    const localized = game?.i18n?.localize?.(label);
    if (localized && localized !== label)
      return localized;
    return label.replace(/(^|-)(\w)/g, (_match, separator, letter) => `${separator}${letter.toUpperCase()}`);
  }
};
QuickRollPrompt2.DEFAULT_OPTIONS = {
  id: "pf2e-quick-rolls-quick-roll-prompt",
  classes: ["pf2e-quick-rolls", "quick-roll-prompt"],
  window: { title: "PF2e Quick Rolls" },
  position: { width: 760, height: "auto" }
};
QuickRollPrompt2.PARTS = {
  prompt: { template: "modules/pf2e-quick-rolls/templates/quick-roll-prompt.hbs" }
};

// src/module/keybindings.ts
function openQuickRollPrompt() {
  if (typeof QuickRollPrompt === "function") {
    console.debug(
      "PF2e Quick Rolls | openQuickRollPrompt invoked; instantiating QuickRollPrompt"
    );
    void new QuickRollPrompt().render({ force: true });
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
    restricted: false,
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