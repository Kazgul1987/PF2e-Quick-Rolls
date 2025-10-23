# PF2e Quick Rolls

This repository contains the source code for the **PF2e Quick Rolls** Foundry VTT module. The project is structured for TypeScript development with a small build pipeline that outputs bundled code to the module directory expected by Foundry.

## Project layout

```
module/
  module.json        # Foundry manifest with module metadata
  packs/             # Placeholder for compendium packs
  lang/              # Localization files
  styles/            # CSS bundled with the module
  scripts/           # Bundled JavaScript output
  templates/         # Handlebars templates
src/                 # TypeScript source files
```

## Requirements

- Node.js 18+
- npm 9+

## Installation

1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the module bundle:
   ```bash
   npm run build
   ```

The compiled JavaScript will be emitted to `module/scripts`. Copy the entire `module/` directory into your Foundry VTT `Data/modules` folder (or symlink it during development). The module will appear in Foundry under the name **PF2e Quick Rolls**.

## Development

- **One-off build:**
  ```bash
  npm run build
  ```
- **Watch mode:**
  ```bash
  npm run dev
  ```
- **Run tests:**
  ```bash
  npm test
  ```

During development you can symlink the `module/` directory into your Foundry data path to test live changes. When using watch mode, tsup will rebuild the bundle whenever a file inside `src/` changes.
