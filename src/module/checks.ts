type SkillConfig = Record<string, { label: string } | string>;

declare const CONFIG: { PF2E?: { skills?: SkillConfig } };
declare const ChatMessage: { create(data: { content: string }): Promise<unknown> | unknown };
declare const ui: { notifications?: { warn?: (message: string) => void } };

export const SAVE_AND_PERCEPTION_CHECKS = ["fortitude", "reflex", "will", "perception"] as const;

export function getAvailableChecks(): Set<string> {
  return new Set([...SAVE_AND_PERCEPTION_CHECKS, ...Object.keys(CONFIG?.PF2E?.skills ?? {})]);
}

/** Post a PF2e inline check without resolving an actor or initiating a roll. */
export async function postCheck(check: string): Promise<boolean> {
  const slug = check.trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(slug) || !getAvailableChecks().has(slug)) {
    ui?.notifications?.warn?.("PF2e Quick Rolls: Unbekannter Check.");
    return false;
  }

  try {
    await ChatMessage.create({ content: `@Check[${slug}]` });
    return true;
  } catch (error) {
    console.error("PF2e Quick Rolls | Posting check failed:", error);
    ui?.notifications?.warn?.("PF2e Quick Rolls: Check konnte nicht im Chat veröffentlicht werden.");
    return false;
  }
}
