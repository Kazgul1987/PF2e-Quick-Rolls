declare const game: {
  dice?: {
    roll?: (formula: string) => Promise<unknown> | unknown;
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

    console.warn("PF2e Quick Rolls | game.dice.roll ist nicht verfügbar.");
    notifyUser("PF2e Quick Rolls: Würfelmechanik nicht verfügbar.");
    return false;
  }

  await game.dice.roll(command);
  return true;
}

export async function parseCheckCommand(input: string): Promise<boolean> {
  const match = input.match(/^([a-zA-Z]+)\s+(\d+)$/);
  if (!match) {
    notifyUser("PF2e Quick Rolls: Check nicht erkannt. Verwende z.B. 'perc 20'.");
    return false;
  }

  const skillAlias = match[1].toLowerCase();
  const dc = match[2];
  const skill = SKILL_AND_SAVE_ALIASES[skillAlias];

  if (!skill) {
    notifyUser(`PF2e Quick Rolls: Unbekannter Skill/Safe '${skillAlias}'.`);
    return false;
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

function notifyUser(message: string): void {
  if (ui?.notifications?.warn) {
    ui.notifications.warn(message);
    return;
  }

  console.warn(message);
}
