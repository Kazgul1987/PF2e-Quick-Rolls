import { resolveDamageType, rollDamage } from "./damage";
import { buildCheckInline } from "./checks";
import { getDCByLevel, parseCheckDCInput, resolveCheckDC } from "./check-dc";

type ActionUseOptions = {
  event?: unknown;
};

type PF2eActionMacro = {
  use?: (options?: ActionUseOptions) => Promise<unknown> | unknown;
};

type PF2eLegacyAction = (
  options?: ActionUseOptions,
) => Promise<unknown> | unknown;

type PF2eActions = {
  get?: (slug: string) => PF2eActionMacro | undefined;
} & Record<string, PF2eLegacyAction | PF2eActionMacro | undefined>;

declare const game: {
  dice?: {
    roll?: (formula: string) => Promise<unknown> | unknown;
  };
  pf2e?: {
    actions?: PF2eActions;
  };
};

declare const ChatMessage: {
  create?: (data: { content: string }) => Promise<unknown> | unknown;
};

declare const ui: {
  notifications?: {
    warn?: (message: string) => void;
  };
  chat?: {
    processMessage?: (
      content: string,
      options: Record<string, unknown>,
    ) => Promise<unknown> | unknown;
  };
};

declare const canvas: {
  tokens?: {
    controlled?: Array<{
      actor?: Record<string, unknown>;
    }>;
  };
};

declare const CONFIG: {
  PF2E?: {
    conditionTypes?: Record<string, unknown>;
  };
};

const SKILL_AND_SAVE_ALIASES: Record<string, string> = {
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
  wil: "will",
};

const ACTION_ALIASES: Record<string, string> = {
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
  recall: "recallKnowledge",
};

const FALLBACK_CONDITION_SLUGS: string[] = [
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
  "wounded",
];

/**
 * Central quick-roll parser responsible for interpreting user input.
 *
 * @param rawInput - The text entered by the user.
 * @returns Whether the input was successfully processed.
 */
export async function parseQuickRollInput(rawInput: string): Promise<boolean> {
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

export async function parseConditionCommand(input: string): Promise<boolean> {
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

  const value = valueToken ? Number.parseInt(valueToken, 10) : undefined;
  if (value !== undefined && (Number.isNaN(value) || value <= 0)) {
    notifyUser("PF2e Quick Rolls: Condition-Wert muss eine positive Zahl sein.");
    return false;
  }

  const selectedToken = canvas?.tokens?.controlled?.[0];
  const actor = selectedToken?.actor as {
    increaseCondition?: (slug: string, options?: Record<string, unknown>) => Promise<unknown> | unknown;
    toggleCondition?: (slug: string, options?: Record<string, unknown>) => Promise<unknown> | unknown;
    addCondition?: (slug: string, options?: Record<string, unknown>) => Promise<unknown> | unknown;
  } | undefined;

  if (!actor) {
    notifyUser("PF2e Quick Rolls: Bitte wähle einen Token aus, um eine Condition zu setzen.");
    return false;
  }

  const options = value === undefined ? undefined : { value };

  if (typeof actor.increaseCondition === "function") {
    await actor.increaseCondition(slug, options);
    return true;
  }

  if (typeof actor.toggleCondition === "function") {
    await actor.toggleCondition(slug, { active: true, ...(options ?? {}) });
    return true;
  }

  if (typeof actor.addCondition === "function") {
    await actor.addCondition(slug, options);
    return true;
  }

  notifyUser("PF2e Quick Rolls: Condition-API nicht verfügbar.");
  return false;
}

export async function parseDamageCommand(input: string): Promise<boolean> {
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

export async function parseCheckCommand(input: string): Promise<boolean> {
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

  let qualifier: "dc" | "level" = "level";
  let valueText: string | undefined;

  if (qualifierMatch || compactQualifierMatch) {
    const [, qualifierToken, valueToken] = qualifierMatch ?? compactQualifierMatch!;
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

  let dc: number | undefined;
  if (qualifier === "level") {
    dc = getDCByLevel(value);
    if (dc === undefined) {
      notifyUser("PF2e Quick Rolls: Standard-DCs sind nur für Stufen 0–25 verfügbar.");
      return false;
    }
  } else {
    const resolved = resolveCheckDC(parseCheckDCInput(`DC ${value}`));
    if (!resolved.valid || resolved.dc === undefined) {
      notifyUser("PF2e Quick Rolls: Ungültige DC-Eingabe.");
      return false;
    }
    dc = resolved.dc;
  }

  if (!ChatMessage?.create) {
    console.warn("PF2e Quick Rolls | ChatMessage.create ist nicht verfügbar.");
    notifyUser("PF2e Quick Rolls: Chat nicht verfügbar.");
    return false;
  }

  const content = buildCheckInline(skill, { dc });
  await ChatMessage.create({ content });
  return true;
}

async function invokeActionMacro(slug: string): Promise<boolean> {
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

  const legacyUse = legacyEntry && (legacyEntry as PF2eActionMacro).use;
  if (typeof legacyUse === "function") {
    await legacyUse();
    return true;
  }

  notifyUser(`PF2e Quick Rolls: Aktion '${slug}' nicht verfügbar.`);
  return false;
}

function notifyUser(message: string): void {
  if (ui?.notifications?.warn) {
    ui.notifications.warn(message);
    return;
  }

  console.warn(message);
}

function resolveConditionSlug(alias: string): string | null {
  const normalizedAlias = normalizeConditionToken(alias);
  const slugs = getAvailableConditionSlugs();

  const exactMatch = slugs.find((slug) => normalizeConditionToken(slug) === normalizedAlias);
  if (exactMatch) {
    return exactMatch;
  }

  if (normalizedAlias.length < 3) {
    return null;
  }

  const prefixMatches = slugs.filter((slug) =>
    normalizeConditionToken(slug).startsWith(normalizedAlias),
  );

  return prefixMatches.length === 1 ? prefixMatches[0] : null;
}

function getAvailableConditionSlugs(): string[] {
  const configSlugs = Object.keys(CONFIG?.PF2E?.conditionTypes ?? {});
  const slugs = configSlugs.length > 0 ? configSlugs : FALLBACK_CONDITION_SLUGS;
  return Array.from(new Set(slugs));
}

function normalizeConditionToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
