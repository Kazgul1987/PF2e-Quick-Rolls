import { postCheck, prepareCheckButtons } from "../checks";
import { parseCheckDCInput, resolveCheckDC } from "../check-dc";
import { DAMAGE_TYPE_ICONS, getAvailableDamageTypes, rollDamage, STANDARD_DAMAGE_TYPES } from "../damage";
import { parseQuickRollInput } from "../parser";

type RenderOptions = Record<string, unknown>;
type ApplicationV2Instance = {
  readonly element: HTMLElement;
  render(options?: RenderOptions): Promise<unknown>;
  close(options?: Record<string, unknown>): Promise<void>;
};
type ApplicationV2Constructor = new (options?: Record<string, unknown>) => ApplicationV2Instance;

declare const foundry: {
  applications: { api: {
    ApplicationV2: ApplicationV2Constructor;
    HandlebarsApplicationMixin: (base: ApplicationV2Constructor) => ApplicationV2Constructor;
  } };
};
declare const CONFIG: { PF2E?: {
  damageTypes?: Record<string, string>;
  skills?: Record<string, { label: string } | string>;
} };
declare const game: { i18n?: { localize?: (key: string) => string } };
declare const ui: { notifications?: { warn?: (message: string) => void } };

const BaseApplication = foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2,
);

const GROUPS = {
  Physical: ["bludgeoning", "piercing", "slashing", "bleed"],
  Energy: ["acid", "cold", "electricity", "fire", "force", "sonic"],
  Other: ["mental", "poison", "spirit", "vitality", "void", "untyped"],
} as const;

export class QuickRollPrompt extends BaseApplication {
  static DEFAULT_OPTIONS = {
    id: "pf2e-quick-rolls-quick-roll-prompt",
    classes: ["pf2e-quick-rolls", "quick-roll-prompt"],
    window: { title: "PF2e Quick Rolls" },
    position: { width: 760, height: "auto" },
  };

  static PARTS = {
    prompt: { template: "modules/pf2e-quick-rolls/templates/quick-roll-prompt.hbs" },
  };

  private selectedDamageType: string | null = null;

  protected async _prepareContext(): Promise<Record<string, unknown>> {
    const available = getAvailableDamageTypes();
    const labels = CONFIG?.PF2E?.damageTypes ?? {};
    const groups: Array<{ label: string; types: Array<{ type: string; label: string; title: string; icon: string | null }> }> = Object.entries(GROUPS).map(([label, types]) => ({
      label,
      types: types.filter((type) => available.has(type)).map((type) => ({
        type,
        label: ["bludgeoning", "piercing", "slashing"].includes(type)
          ? type[0].toUpperCase()
          : this.localize(labels[type] ?? type),
        title: this.localize(labels[type] ?? type),
        icon: DAMAGE_TYPE_ICONS[type] ?? null,
      })),
    }));
    const grouped = new Set(STANDARD_DAMAGE_TYPES);
    const extraTypes = [...available].filter((type) => !grouped.has(type as typeof STANDARD_DAMAGE_TYPES[number]));
    if (extraTypes.length) {
      groups.push({ label: "Additional", types: extraTypes.map((type) => ({ type, label: this.localize(labels[type] ?? type), title: this.localize(labels[type] ?? type), icon: DAMAGE_TYPE_ICONS[type] ?? null })) });
    }
    const { checks, skills } = prepareCheckButtons(
      CONFIG?.PF2E?.skills ?? {},
      (label) => this.localize(label),
    );
    return { groups, checks, skills };
  }

  protected _onRender(_context: unknown, _options: RenderOptions): void {
    const root = this.element;
    const input = root.querySelector<HTMLInputElement>("[name=quick-roll-input]");
    if (!input) return;
    input.focus();
    input.addEventListener("keydown", (event) => void this.handleKeydown(event, input));
    root.querySelectorAll<HTMLButtonElement>("[data-damage-type]").forEach((button) => {
      button.addEventListener("click", () => {
        this.selectedDamageType = this.selectedDamageType === button.dataset.damageType
          ? null
          : button.dataset.damageType ?? null;
        root.querySelectorAll("[data-damage-type]").forEach((element) => {
          const selected = element.getAttribute("data-damage-type") === this.selectedDamageType;
          element.classList.toggle("is-selected", selected);
          element.setAttribute("aria-pressed", String(selected));
        });
        input.focus();
      });
    });
    root.querySelectorAll<HTMLButtonElement>("[data-check]").forEach((button) => {
      button.addEventListener("click", async () => {
        const resolved = resolveCheckDC(parseCheckDCInput(input.value));
        if (!resolved.valid) {
          const message = resolved.reason === "level"
            ? "PF2e Quick Rolls: Ungültiges Level für DC-by-Level (gültig: -1 bis 25)."
            : "PF2e Quick Rolls: Ungültige DC-Eingabe.";
          ui?.notifications?.warn?.(message);
          input.focus();
          return;
        }

        const posted = resolved.dc === undefined
          ? await postCheck(button.dataset.check ?? "")
          : await postCheck(button.dataset.check ?? "", { dc: resolved.dc });
        if (posted) await this.close();
      });
    });
  }

  private async handleKeydown(event: KeyboardEvent, input: HTMLInputElement): Promise<void> {
    if (event.key === "Escape") {
      event.preventDefault();
      await this.close();
    } else if (event.key === "Enter") {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) return;
      const processed = this.selectedDamageType
        ? await rollDamage(value, this.selectedDamageType)
        : await parseQuickRollInput(value);
      if (processed) await this.close();
    }
  }

  private localize(label: string): string {
    const localized = game?.i18n?.localize?.(label);
    if (localized && localized !== label) return localized;
    return label.replace(/(^|-)(\w)/g, (_match, separator: string, letter: string) => `${separator}${letter.toUpperCase()}`);
  }
}
