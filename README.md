# Discord+ for Valenced

A port of [Discord+](https://plusinsta.github.io/discord-plus) 3.4.1 by PlusInsta to
[Valenced](https://github.com/Valenced), built from the desktop theme's configuration file
(`DiscordPlus.theme.css`). This repository **is** the theme plugin — the file layout here
matches the plugin ZIP (`manifest.json`, `index.js`, `assets/`), with the TypeScript source
under `js/` alongside it.

It registers a **Discord+** group with two color themes and two font packs.

## What's included

| Registered | ID | Contents |
| --- | --- | --- |
| Theme | `discord-plus/dark` | Plum surfaces, accent `hsl(320, 60%, 31%)` (#7e205f), Moonlit Dusk backdrop. Applies to the `dark`, `darker` and `midnight` bases. |
| Theme | `discord-plus/light` | Rose surfaces, same accent, Dawn backdrop. Applies to the `light` base. |
| Font pack | `discord-plus/poppins` | `--dplus-font-ui`: Poppins (static, OFL) replacing gg sans. |
| Font pack | `discord-plus/roboto` | `--dplus-font-body`: Roboto (variable, OFL/Apache) replacing gg sans. |

## Installing

Package (or download) the repository contents as
`com.plusinsta.discordplus@3.4.1.zip` — the ZIP needs `manifest.json` and `index.js` at its
root and `assets/` beside them — then add it to a Valenced plugin source / install it via
the Valenced manager. The committed `index.js` is the current prebuilt bundle, so no JS
toolchain is needed just to install.

## How the desktop config maps to Valenced

Discord+ on desktop is a CSS variable config layered over its source stylesheet. Valenced
themes override Discord's color tokens instead, so the port re-creates the same palette
from the config's values:

- `--dplus-accent-color-hue/saturation/lightness` → the `BRAND_*` raw colors become an
  accent ramp around `hsl(320, 60%, 31%)`, with the hover variant (`saturation x1.1,
  lightness /1.5`) as `BRAND_560`; `TEXT_BRAND` and `BACKGROUND_ACCENT` semantics follow.
- `--dplus-background-color-hue` (320) with the source theme's 50% surface saturation →
  every `PRIMARY_*` raw color is re-hued to 320° at 50% saturation while keeping Discord's
  lightness ladder, so dark surfaces are deep plum and light surfaces are soft rose.
- Other neutrals (`GREY_*`, `WHITE_*`, `BLACK_*`, …) are re-hued to 320° but keep their
  original saturation, so they stay neutral with a plum cast. Achromatic colors are
  unaffected by hue rotation by construction.
- `--dplus-foreground-color-hue-base` (210) is Discord's own text hue, so text keeps
  Discord's defaults; `--dplus-foreground-color-hue-links` (197) becomes `TEXT_LINK`:
  `hsl(197, 70%, 60%)` on dark, `hsl(197, 85%, 35%)` on light.
- Status colors (`GREEN_*`, `RED_*`, `YELLOW_*`, …) are left at Discord's defaults, as
  Discord+ keeps them recognizable.
- `--dplus-backdrop` → bundled, downscaled copies of the theme's backdrop images
  (`assets/background-dark.webp` = Moonlit Dusk, `assets/background-light.webp` = Dawn).
- `--dplus-background-color-alpha` (0.8) → the background `dimming` value, which controls
  how opaque surfaces are over the backdrop image.

Because the palette is *derived* from Discord's raw colors at pick time (via
`getColors(discord)`), it follows Discord's lightness steps and adapts to palette changes
across Discord versions, the same way the desktop theme derives from Discord's variables.

## Not portable to Valenced

These config variables have no equivalent token on Discord mobile and are dropped:

- `--dplus-radius-ui/avatar/server` (corner rounding)
- `--dplus-spacing-ui/app` (padding and margins)
- `--dplus-icon-avatar-chat/list/profile` (avatar sizes)
- `--dplus-font-header` (Righteous): mobile Discord requests a single UI font family
  (`ggsans-*`) with no header role, so only Poppins and Roboto are provided.

## Building from source

Drop this folder into a clone of the
[valenced-plugin-template](https://github.com/Valenced/valenced-plugin-template) under
`themes/`, then from that repository's root (Node >= 22.18 or Bun):

```
node_modules/.bin/valenced-plugin build --plugins-dir themes discord-plus   # JS bundle
./gradlew packageDiscordPlus                                               # ZIP into build/dist/
```

Copy the produced `build/js/index.js` back to this repository's root to refresh the
prebuilt bundle. Type-checking (`tsc -b`) needs the `@valenced/types` and
`@valenced/themes-api` packages from the template's `node_modules`.

## Credits

- Discord+ by [PlusInsta](https://plusinsta.xyz) (original theme, config values, backdrop
  images) — see the [upstream repo](https://github.com/PlusInsta/discord-plus).
- Poppins by Indian Type Foundry, Roboto by Christian Robertson — both under their
  respective OFL licenses included in `assets/fonts/`.
