type SkillConfig = Record<string, { label: string } | string>;

declare const CONFIG: { PF2E?: { skills?: SkillConfig } };
declare const ChatMessage: {
  create?: (data: { content: string }) => Promise<unknown> | unknown;
};
declare const ui: { notifications?: { warn?: (message: string) => void } };

export const SAVE_AND_PERCEPTION_CHECKS = ["fortitude", "reflex", "will", "perception"] as const;

export function getAvailableChecks(): Set<string> {
  return new Set([...SAVE_AND_PERCEPTION_CHECKS, ...Object.keys(CONFIG?.PF2E?.skills ?? {})]);
}

/** Build the canonical PF2e V14 inline-check syntax. */
export function buildCheckInline(type: string, options: { dc?: number } = {}): string {
  const parameters = [`type:${type}`];
  if (options.dc !== undefined) parameters.push(`dc:${options.dc}`);
  return `@Check[${parameters.join("|")}]`;
}

/** Post a PF2e inline check without resolving an actor or initiating a roll. */
export async function postCheck(check: string): Promise<boolean> {
  const slug = check.trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(slug) || !getAvailableChecks().has(slug)) {
    ui?.notifications?.warn?.("PF2e Quick Rolls: Unbekannter Check.");
    return false;
  }

  if (typeof ChatMessage === "undefined" || typeof ChatMessage.create !== "function") {
    ui?.notifications?.warn?.("PF2e Quick Rolls: Chat nicht verfügbar.");
    return false;
  }

  try {
    await ChatMessage.create({ content: buildCheckInline(slug) });
    return true;
  } catch (error) {
    console.error("PF2e Quick Rolls | Posting check failed:", error);
    ui?.notifications?.warn?.("PF2e Quick Rolls: Check konnte nicht im Chat veröffentlicht werden.");
    return false;
  }
}
