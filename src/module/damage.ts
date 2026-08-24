export type DamageType = string;

type PF2eConfig = {
  damageTypes?: Record<string, string>;
};

declare const CONFIG: { PF2E?: PF2eConfig };
declare const ui: {
  notifications?: { warn?: (message: string) => void };
  chat?: {
    processMessage?: (content: string, options: Record<string, unknown>) => Promise<unknown> | unknown;
  };
};

export const STANDARD_DAMAGE_TYPES = [
  "bludgeoning", "piercing", "slashing", "bleed",
  "acid", "cold", "electricity", "fire", "force", "sonic",
  "mental", "poison", "spirit", "vitality", "void", "untyped",
] as const;

const LEGACY_ALIASES: Record<string, string> = {
  positive: "vitality",
  negative: "void",
};

const SHORT_ALIASES: Record<string, string> = {
  aci: "acid", blu: "bludgeoning", blud: "bludgeoning", col: "cold",
  ele: "electricity", elec: "electricity", fir: "fire", men: "mental",
  pie: "piercing", poi: "poison", sla: "slashing", son: "sonic",
  vit: "vitality", voi: "void", pos: "vitality", neg: "void",
};

export function getAvailableDamageTypes(): Set<string> {
  const configured = Object.keys(CONFIG?.PF2E?.damageTypes ?? {});
  return new Set(configured.length > 0 ? configured : STANDARD_DAMAGE_TYPES);
}

export function resolveDamageType(value: string): DamageType | null {
  const token = value.trim().toLowerCase();
  const normalized = LEGACY_ALIASES[token] ?? SHORT_ALIASES[token] ?? token;
  return getAvailableDamageTypes().has(normalized) ? normalized : null;
}

export function buildDamageFormula(formula: string, damageType: string): string | null {
  const normalizedFormula = formula.replace(/\s+/g, "");
  const resolvedType = resolveDamageType(damageType);
  // Quick Rolls intentionally accepts only basic dice/arithmetic syntax.
  // Advanced Foundry roll expressions should be entered through chat.
  if (!normalizedFormula || !resolvedType || !/^[0-9dD+\-*/()]+$/.test(normalizedFormula)) return null;
  return `(${normalizedFormula})[${resolvedType}]`;
}

/** Roll through the chat command API PF2e V14 extends to parse typed damage terms. */
export async function rollDamage(formula: string, damageType: string): Promise<boolean> {
  const damageFormula = buildDamageFormula(formula, damageType);
  if (!damageFormula) {
    ui?.notifications?.warn?.("PF2e Quick Rolls: Ungültige Schadensformel oder Schadensart.");
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

  ui?.notifications?.warn?.("PF2e Quick Rolls: Würfelmechanik nicht verfügbar.");
  return false;
}
