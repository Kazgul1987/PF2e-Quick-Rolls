export type SkillConfig = Record<string, { label: string } | string>;

export type CheckButton = { slug: string; label: string };

declare const CONFIG: { PF2E?: { skills?: SkillConfig } };
declare const ChatMessage: {
  create?: (data: { content: string }) => Promise<unknown> | unknown;
};
declare const ui: { notifications?: { warn?: (message: string) => void } };

export const SAVE_AND_PERCEPTION_CHECKS = ["fortitude", "reflex", "will", "perception"] as const;

const SAVE_LABELS: Record<(typeof SAVE_AND_PERCEPTION_CHECKS)[number], string> = {
  fortitude: "PF2E.SavesFortitude",
  reflex: "PF2E.SavesReflex",
  will: "PF2E.SavesWill",
  perception: "PF2E.PerceptionLabel",
};

/** Keep technical PF2e slugs separate from the localized button labels. */
export function prepareCheckButtons(
  skills: SkillConfig,
  localize: (label: string) => string,
): { checks: CheckButton[]; skills: CheckButton[] } {
  const checks = SAVE_AND_PERCEPTION_CHECKS.map((slug) => ({
    slug,
    label: localize(SAVE_LABELS[slug]),
  }));
  const skillButtons = Object.entries(skills)
    .map(([slug, data]) => ({
      slug,
      label: localize(typeof data === "string" ? data : data.label),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return { checks, skills: skillButtons };
}

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
export async function postCheck(check: string, options: { dc?: number } = {}): Promise<boolean> {
  const slug = check.trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/.test(slug) || !getAvailableChecks().has(slug)) {
    ui?.notifications?.warn?.("PF2e Quick Rolls: Unbekannter Check.");
    return false;
  }

  if (options.dc !== undefined && (!Number.isSafeInteger(options.dc) || options.dc < 0)) {
    ui?.notifications?.warn?.("PF2e Quick Rolls: Ungültiger fixer DC.");
    return false;
  }

  if (typeof ChatMessage === "undefined" || typeof ChatMessage.create !== "function") {
    ui?.notifications?.warn?.("PF2e Quick Rolls: Chat nicht verfügbar.");
    return false;
  }

  try {
    await ChatMessage.create({ content: buildCheckInline(slug, options) });
    return true;
  } catch (error) {
    console.error("PF2e Quick Rolls | Posting check failed:", error);
    ui?.notifications?.warn?.("PF2e Quick Rolls: Check konnte nicht im Chat veröffentlicht werden.");
    return false;
  }
}
