type ActionUseOptions = {
  event?: unknown;
  actors?: {
    token?: boolean;
    selected?: boolean;
    party?: boolean;
  };
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

const DAMAGE_TYPE_ALIASES: Record<string, string> = {
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
  sla: "slashing",
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

const STANDARD_DC_BY_LEVEL: number[] = [
  14, 15, 16, 18, 19, 20, 22, 23, 24, 26, 27, 28, 30,
  31, 32, 34, 35, 36, 38, 39, 40, 42, 44, 46, 48, 50,
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

export async function parseDamageCommand(input: string): Promise<boolean> {
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
  if (!game?.dice?.roll) {
    try {
      if (ui?.chat?.processMessage) {
        await ui.chat.processMessage(command, {});
        return true;
      }
    } catch (error) {
      console.error("PF2e Quick Rolls | Chat-Verarbeitung fehlgeschlagen:", error);
    }

    console.warn("PF2e Quick Rolls | game.dice.roll ist nicht verfügbar.");
    notifyUser("PF2e Quick Rolls: Würfelmechanik nicht verfügbar.");
    return false;
  }

  await game.dice.roll(command);
  return true;
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

  let dc: number;
  if (qualifier === "dc") {
    dc = value;
  } else {
    if (value < 0 || value >= STANDARD_DC_BY_LEVEL.length) {
      notifyUser("PF2e Quick Rolls: Standard-DCs sind nur für Stufen 0–25 verfügbar.");
      return false;
    }
    dc = STANDARD_DC_BY_LEVEL[value];
  }

  if (!ChatMessage?.create) {
    console.warn("PF2e Quick Rolls | ChatMessage.create ist nicht verfügbar.");
    notifyUser("PF2e Quick Rolls: Chat nicht verfügbar.");
    return false;
  }

  const content = `@Check[${skill}|dc:${dc}]`;
  await ChatMessage.create({ content });
  return true;
}

async function invokeActionMacro(slug: string): Promise<boolean> {
  const actions = game?.pf2e?.actions;
  const defaultOptions: ActionUseOptions = {
    event: undefined,
    actors: {
      token: true,
      selected: true,
    },
  };

  const mappedAction = actions?.get?.(slug);
  if (mappedAction?.use) {
    await mappedAction.use(defaultOptions);
    return true;
  }

  const legacyEntry = actions?.[slug];
  if (typeof legacyEntry === "function") {
    await legacyEntry(defaultOptions);
    return true;
  }

  if (legacyEntry && typeof (legacyEntry as PF2eActionMacro).use === "function") {
    await (legacyEntry as PF2eActionMacro).use(defaultOptions);
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
