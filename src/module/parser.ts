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

  // TODO: Implement full parsing and rolling logic.
  return true;
}
