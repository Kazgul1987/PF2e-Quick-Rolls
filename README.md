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

## Quick-roll prompt abbreviations

The quick-roll prompt accepts concise commands to trigger common checks and damage rolls. Use the following abbreviations when entering prompt text:

### Damage type aliases

| Eingabe | Vollständiger Schadens-Typ |
| --- | --- |
| `acid`, `aci` | Acid |
| `cold`, `col` | Cold |
| `electricity`, `ele`, `elec` | Electricity |
| `fire`, `fir` | Fire |
| `force` | Force |
| `sonic`, `son` | Sonic |
| `poison`, `poi` | Poison |
| `mental`, `men` | Mental |
| `negative`, `neg` | Negative |
| `positive`, `pos` | Positive |
| `bludgeoning`, `blu`, `blud` | Bludgeoning |
| `piercing`, `pie` | Piercing |
| `slashing`, `sla` | Slashing |

### Skill and save aliases

| Eingabe | Fertigkeit/Wurf |
| --- | --- |
| `acrobatics`, `acro` | Acrobatics |
| `arcana`, `arc` | Arcana |
| `athletics`, `ath` | Athletics |
| `crafting`, `cra` | Crafting |
| `deception`, `dec` | Deception |
| `diplomacy`, `dip` | Diplomacy |
| `intimidation`, `int` | Intimidation |
| `medicine`, `med` | Medicine |
| `nature`, `nat` | Nature |
| `occultism`, `occ` | Occultism |
| `perception`, `perc` | Perception |
| `performance`, `perf` | Performance |
| `religion`, `rel` | Religion |
| `society`, `soc` | Society |
| `stealth`, `ste` | Stealth |
| `survival`, `sur` | Survival |
| `thievery`, `thi` | Thievery |
| `fortitude`, `fort` | Fortitude Save |
| `reflex`, `ref` | Reflex Save |
| `will`, `wil` | Will Save |

Example damage command: `2d6+4 fir` rolls fire damage. Example check command: `perc 20` creates a Perception check against DC 20.
