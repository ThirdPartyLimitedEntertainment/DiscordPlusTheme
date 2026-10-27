/**
 * Discord+ for Valenced — a port of Discord+ 3.4.1 by PlusInsta (https://plusinsta.xyz)
 * to Discord mobile, built from the theme's configuration (DiscordPlus.theme.css).
 *
 * How the desktop theme's variables map here:
 * - --dplus-accent-color-*          → BRAND_* raw colors and accent semantics, hsl(320, 60%, 31%)
 * - --dplus-background-color-*      → surface palette re-hued to 320 at the source theme's 50%
 *                                      surface saturation, keeping Discord's lightness steps
 * - --dplus-background-color-alpha  → background `dimming` (surfaces translucent over the image)
 * - --dplus-backdrop                → bundled Moonlit Dusk (dark) / Dawn (light) images
 * - --dplus-foreground-color-*      → text keeps Discord's hue 210 base; links move to hue 197
 * - --dplus-font-ui / -body         → Poppins and Roboto font packs replacing gg sans
 *
 * Not portable to Valenced: --dplus-radius-*, --dplus-spacing-* and --dplus-icon-avatar-*
 * (Discord mobile exposes no such tokens), and the Righteous header font (mobile has a
 * single UI font role).
 */

/// <reference types="@valenced/themes-api" />

import type {
	DiscordColors,
	FontVariant,
	ThemeBase,
	ThemeColors,
} from '@valenced/themes-api/types'

const groupId = 'discord-plus'

/** --dplus-background-color-hue and --dplus-accent-color-hue. */
const Hue = 320
/** Surface saturation Discord+ paints backgrounds with (saturation amount is 1). */
const SurfaceSaturation = 0.5
/** --dplus-accent-color-saturation / -lightness. */
const Accent = hsl(Hue, 0.6, 0.31)
/** Discord+'s hover accent: saturation x1.1, lightness /1.5. */
const AccentHover = hsl(Hue, 0.66, 0.21)
/** --dplus-foreground-color-hue-links, on dark and on light surfaces. */
const LinkDark = hsl(197, 0.7, 0.6)
const LinkLight = hsl(197, 0.85, 0.35)
/** --dplus-background-color-alpha, as surface opacity over the backdrop. */
const Dimming = 0.8

const DarkBackground = 'assets/background-dark.webp'
const LightBackground = 'assets/background-light.webp'

// ---------------------------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------------------------

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value))
}

/** Formats HSL parts (all 0–1, hue in degrees) as `#RRGGBB`. */
function hsl(h: number, s: number, l: number): string {
	const c = (1 - Math.abs(2 * l - 1)) * s
	const hp = (((h % 360) + 360) % 360) / 60
	const x = c * (1 - Math.abs((hp % 2) - 1))
	const [r, g, b] =
		hp < 1
			? [c, x, 0]
			: hp < 2
				? [x, c, 0]
				: hp < 3
					? [0, c, x]
					: hp < 4
						? [0, x, c]
						: hp < 5
							? [x, 0, c]
							: [c, 0, x]
	const m = l - c / 2
	const channel = (v: number) =>
		Math.round(clamp01(v + m) * 255)
			.toString(16)
			.padStart(2, '0')
	return `#${channel(r)}${channel(g)}${channel(b)}`
}

interface Hsla {
	h: number
	s: number
	l: number
	a: number
}

function parseHsla(color: string): Hsla | null {
	const match = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color.trim())
	if (!match) return null
	const digits = match[1]
	const r = Number.parseInt(digits.slice(0, 2), 16) / 255
	const g = Number.parseInt(digits.slice(2, 4), 16) / 255
	const b = Number.parseInt(digits.slice(4, 6), 16) / 255
	const a = match[2] ? Number.parseInt(match[2], 16) / 255 : 1

	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	const l = (max + min) / 2
	let h = 0
	let s = 0
	if (max !== min) {
		const d = max - min
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
		h =
			max === r
				? (g - b) / d + (g < b ? 6 : 0)
				: max === g
					? (b - r) / d + 2
					: (r - g) / d + 4
		h *= 60
	}
	return { h, s, l, a }
}

/**
 * Re-tints a color the way Discord+ does: the hue is replaced outright while saturation
 * and lightness carry over, scaled by the theme's amount multipliers (all 1.0 here).
 */
function retint(
	color: string,
	hue: number,
	saturationAmount = 1,
	lightnessAmount = 1,
	saturationOverride?: number,
): string {
	const parts = parseHsla(color)
	if (!parts) return color
	const s = saturationOverride ?? parts.s * saturationAmount
	const l = clamp01(parts.l * lightnessAmount)
	const out = hsl(hue, clamp01(s), l)
	return parts.a < 1
		? out +
				Math.round(parts.a * 255)
					.toString(16)
					.padStart(2, '0')
		: out
}

// ---------------------------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------------------------

/**
 * --dplus-accent-ui is hsl(320, 60%, 31%) and Discord+ assigns it to every brand surface.
 * The ramp keeps hover/pressed depth and light tints for selected/mention backgrounds.
 */
const BrandColors: Record<string, string> = {
	BRAND_100: hsl(Hue, 0.45, 0.96),
	BRAND_160: hsl(Hue, 0.5, 0.93),
	BRAND_200: hsl(Hue, 0.52, 0.9),
	BRAND_230: hsl(Hue, 0.55, 0.87),
	BRAND_260: Accent,
	BRAND_300: hsl(Hue, 0.58, 0.33),
	BRAND_360: hsl(Hue, 0.6, 0.29),
	BRAND_500: Accent,
	BRAND_560: AccentHover,
	BRAND_600: hsl(Hue, 0.66, 0.18),
}

/** Color families that carry meaning (online, danger, warning); Discord+ keeps them as-is. */
const StatusFamilies =
	/^(?:GREEN|RED|YELLOW|ORANGE|INFO|SUCCESS|DANGER|WARNING)_/

/**
 * Derives the Discord+ palette from Discord's own colors: surfaces move to hue 320 at 50%
 * saturation, greys are re-hued but keep their neutrality, brand becomes the accent and
 * status colors keep their hue so they stay recognizable.
 */
function deriveRawColors(discord: DiscordColors): ThemeColors['raw'] {
	const raw: ThemeColors['raw'] = {}
	for (const [name, color] of Object.entries(discord.raw)) {
		if (name in BrandColors) {
			raw[name] = BrandColors[name]
		} else if (StatusFamilies.test(name)) {
			// Keep Discord's status colors untouched.
		} else if (name.startsWith('PRIMARY_')) {
			// The surface ladder: hue 320, 50% saturation, Discord's lightness steps.
			raw[name] = retint(color, Hue, 1, 1, SurfaceSaturation)
		} else {
			raw[name] = retint(color, Hue)
		}
	}
	return raw
}

/** Semantic overrides on top of the raw palette, per Discord+ foreground hues. */
const DarkSemantic: Record<string, string> = {
	TEXT_LINK: LinkDark,
	TEXT_BRAND: Accent,
	BACKGROUND_ACCENT: Accent,
}

const LightSemantic: Record<string, string> = {
	TEXT_LINK: LinkLight,
	TEXT_BRAND: Accent,
	BACKGROUND_ACCENT: Accent,
}

function discordPlusColors(
	semantic: Record<string, string>,
	bases: ThemeBase[],
): (discord: DiscordColors) => ThemeColors {
	return discord => {
		const semanticColors: NonNullable<ThemeColors['semantic']> = {}
		for (const base of bases) semanticColors[base] = { ...semantic }
		return { raw: deriveRawColors(discord), semantic: semanticColors }
	}
}

// ---------------------------------------------------------------------------------------------
// Font packs
// ---------------------------------------------------------------------------------------------

/** Discord asks for these family names; the style is part of the name. */
const Weights: Record<string, number> = {
	Normal: 400,
	Medium: 500,
	Semibold: 600,
	Bold: 700,
	ExtraBold: 800,
}

/** --dplus-font-ui. Poppins ships as static files, one per style and posture. */
function poppinsFamilies(): Record<string, FontVariant[]> {
	// Poppins names its 400 weight "Regular"/"Italic" rather than "Normal".
	const fileFor: Record<string, string> = {
		Normal: 'Regular',
		Medium: 'Medium',
		Semibold: 'SemiBold',
		Bold: 'Bold',
		ExtraBold: 'ExtraBold',
	}
	const families: Record<string, FontVariant[]> = {}
	for (const [style, weight] of Object.entries(Weights)) {
		const file = fileFor[style]
		families[`ggsans-${style}`] = [
			{ path: `assets/fonts/Poppins-${file}.ttf`, weight },
			{ path: `assets/fonts/Poppins-${file}Italic.ttf`, weight, italic: true },
		]
	}
	return families
}

/** --dplus-font-body. Roboto ships as variable fonts; each variant pins its axes. */
function robotoFamilies(): Record<string, FontVariant[]> {
	const roman = 'assets/fonts/Roboto-Variable.ttf'
	const italic = 'assets/fonts/Roboto-ItalicVariable.ttf'
	const families: Record<string, FontVariant[]> = {}
	for (const [style, weight] of Object.entries(Weights)) {
		families[`ggsans-${style}`] = [
			{ path: roman, weight, axes: { wght: weight, wdth: 100 } },
			{ path: italic, weight, italic: true, axes: { wght: weight, wdth: 100 } },
		]
	}
	return families
}

// ---------------------------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------------------------

export default plugin({
	preInit({ themes }) {
		themes.registerGroup(groupId, {
			name: 'Discord+',
			description:
				"PlusInsta's Discord+ theme, backdrops and fonts for Discord mobile",
		})

		themes.registerTheme(groupId, 'dark', {
			name: 'Discord+ Dark',
			description:
				'Moonlit Dusk backdrop over plum surfaces (accent hsl 320, 60%, 31%)',
			getColors: discordPlusColors(DarkSemantic, [
				'dark',
				'darker',
				'midnight',
			]),
			background: { path: DarkBackground, dimming: Dimming },
		})

		themes.registerTheme(groupId, 'light', {
			name: 'Discord+ Light',
			description:
				'Dawn backdrop over rose surfaces (accent hsl 320, 60%, 31%)',
			getColors: discordPlusColors(LightSemantic, ['light']),
			background: { path: LightBackground, dimming: Dimming },
		})

		themes.registerFontPack(groupId, 'poppins', {
			name: 'Poppins (Discord+ UI)',
			description: "Discord+'s UI font, replacing gg sans",
			families: poppinsFamilies(),
		})

		themes.registerFontPack(groupId, 'roboto', {
			name: 'Roboto (Discord+ body)',
			description: "Discord+'s body font, replacing gg sans",
			families: robotoFamilies(),
		})
	},
})
