import { parseQuickRollInput } from "../parser";

type ApplicationRenderOptions = Record<string, unknown>;
type ApplicationCloseOptions = { force?: boolean };

type ApplicationOptions = {
  id?: string;
  classes?: string[];
  template?: string;
  width?: number;
  height?: number;
  title?: string;
};

declare class Application {
  constructor(options?: ApplicationOptions);
  static get defaultOptions(): ApplicationOptions;
  render(force?: boolean, options?: ApplicationRenderOptions): void;
  close(options?: ApplicationCloseOptions): Promise<void>;
  activateListeners(html: unknown): void;
}

/**
 * Quick-roll prompt application presenting a single text input to the user.
 */
export class QuickRollPrompt extends Application {
  static override get defaultOptions(): ApplicationOptions {
    const options = super.defaultOptions ?? {};
    const classes = new Set(["pf2e-quick-rolls", "quick-roll-prompt"]);

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
      title: options.title ?? "PF2e Quick Roll",
    } satisfies ApplicationOptions;
  }

  override activateListeners(html: unknown): void {
    super.activateListeners(html);

    const root = this.extractRootElement(html);
    const input = root?.querySelector<HTMLInputElement>("input[name=\"quick-roll-input\"]");

    if (!input) {
      console.warn("PF2e Quick Rolls | QuickRollPrompt rendered without an input element.");
      return;
    }

    input.focus();
    input.addEventListener("keydown", (event) => void this.handleKeydown(event, input));
  }

  private extractRootElement(html: unknown): HTMLElement | null {
    if (!html) {
      return null;
    }

    if (html instanceof HTMLElement) {
      return html;
    }

    if (typeof html === "object" && 0 in (html as { [index: number]: unknown })) {
      const candidate = (html as { [index: number]: unknown })[0];
      if (candidate instanceof HTMLElement) {
        return candidate;
      }
    }

    return null;
  }

  private async handleKeydown(event: KeyboardEvent, input: HTMLInputElement): Promise<void> {
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
}
