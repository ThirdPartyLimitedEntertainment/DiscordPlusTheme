/**
 * Generates legacy (Bunny/Vendetta-family, spec 2) theme JSONs for the Discord+ port.
 *
 * The color logic mirrors the Valenced plugin in ../js/index.ts: surfaces re-hued to
 * hue 320 at 50% saturation, the brand family becomes the accent hsl(320, 60%, 31%),
 * links move to hue 197, and status colors keep Discord's defaults (omitted entirely).
 *
 * Usage: node generate.js   (writes DiscordPlus-Dark.json and DiscordPlus-Light.json)
 */

const fs = require('node:fs')
const path = require('node:path')

// ----- Discord+ configuration (from DiscordPlus.theme.css) -----

const Hue = 320
const Accent = hsl(Hue, 0.6, 0.31)
const AccentHover = hsl(Hue, 0.66, 0.21)
const LinkDark = hsl(197, 0.7, 0.6)
const LinkLight = hsl(197, 0.85, 0.35)

// ----- color helpers (same math as the Valenced plugin) -----

function clamp01(v) {
	return Math.min(1, Math.max(0, v))
}

function hsl(h, s, l) {
	const c = (1 - Math.abs(2 * l - 1)) * s
	const hp = (((h % 360) + 360) % 360) / 60
	const x = c * (1 - Math.abs((hp % 2) - 1))
	const [r, g, b] =
		hp < 1 ? [c, x, 0] :
		hp < 2 ? [x, c, 0] :
		hp < 3 ? [0, c, x] :
		hp < 4 ? [0, x, c] :
		hp < 5 ? [x, 0, c] :
			[c, 0, x]
	const m = l - c / 2
	const ch = v =>
		Math.round(clamp01(v + m) * 255)
			.toString(16)
			.padStart(2, '0')
	return `#${ch(r)}${ch(g)}${ch(b)}`
}

function parseHsla(color) {
	const m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(color.trim())
	if (!m) return null
	const d = m[1]
	const r = parseInt(d.slice(0, 2), 16) / 255
	const g = parseInt(d.slice(2, 4), 16) / 255
	const b = parseInt(d.slice(4, 6), 16) / 255
	const a = m[2] ? parseInt(m[2], 16) / 255 : 1
	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	const l = (max + min) / 2
	let h = 0
	let s = 0
	if (max !== min) {
		const d = max - min
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
		h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
		h *= 60
	}
	return { h, s, l, a }
}

function retint(color, hue, satOverride) {
	const c = parseHsla(color)
	if (!c) return color
	return hsl(hue, satOverride ?? c.s, c.l)
}

// ----- raw colors -----

/** Discord's default grey ladder, re-hued to 320 at the theme's 50% surface saturation. */
const PrimaryAnchors = {
	100: '#F2F3F5', 160: '#E3E5E8', 200: '#E3E5E8', 230: '#DBDEE1', 300: '#DBDEE1',
	330: '#CDD0D5', 345: '#C7CBD1', 360: '#C4C9CE', 400: '#B5BAC1', 430: '#9EA1A8',
	460: '#949BA4', 500: '#80848E', 530: '#767A83', 560: '#6D6F78', 600: '#4E5058',
	630: '#383A40', 645: '#2B2D31', 660: '#2B2D31', 700: '#1E1F22', 730: '#1A1B1E',
	800: '#111214', 830: '#0B0B0D',
}

function primaryRaw(name) {
	const n = Number(name.split('_')[1])
	const numbers = Object.keys(PrimaryAnchors).map(Number)
	let nearest = numbers[0]
	for (const num of numbers) if (Math.abs(num - n) < Math.abs(nearest - n)) nearest = num
	return retint(PrimaryAnchors[nearest], Hue, 0.5)
}

/** The accent ramp, keyed by shade number; brand, blue and blurple families all land here. */
function brandRaw(n) {
	if (n <= 100) return hsl(Hue, 0.45, 0.96)
	if (n <= 160) return hsl(Hue, 0.5, 0.93)
	if (n <= 200) return hsl(Hue, 0.52, 0.9)
	if (n <= 230) return hsl(Hue, 0.55, 0.87)
	if (n <= 345) return hsl(Hue, 0.6, 0.31 - (n - 260) * 0.0002)
	if (n <= 500) return Accent
	if (n <= 530) return hsl(Hue, 0.63, 0.26)
	if (n <= 560) return AccentHover
	return hsl(Hue, 0.66, Math.max(0.14, 0.18 - (n - 600) * 0.0004))
}

function withAlpha(hex, percent) {
	return hex + Math.round((percent / 100) * 255)
		.toString(16)
		.padStart(2, '0')
}

function buildRawColors() {
	const raw = {}
	// The surface ladder.
	for (const n of Object.keys(PrimaryAnchors)) raw[`PRIMARY_${n}`] = primaryRaw(`PRIMARY_${n}`)
	// Brand, blue and blurple families become the accent, like Discord+ replaces blurple.
	const brandFamilies = ['BRAND', 'BLUE', 'BLURPLE', 'BLUE_NEW']
	for (const family of brandFamilies) {
		// Shade numbers observed in Discord's palette for each family.
		const shades =
			family === 'BRAND' ? [100, 160, 200, 230, 260, 300, 330, 345, 360, 400, 430, 460, 500, 530, 560, 600] :
			family === 'BLUE' ? [160, 200, 230, 260, 300, 330, 345, 360, 400, 430, 460] :
			family === 'BLURPLE' ? Array.from({ length: 100 }, (_, i) => i + 1) :
				Array.from({ length: 55 }, (_, i) => i + 1)
		for (const n of shades) raw[`${family}_${n}`] = brandRaw(n)
	}
	// Brand colors at fixed opacity, matching Discord's OPACITY_BLURPLE/BLUE tokens.
	for (const family of ['OPACITY_BLURPLE', 'OPACITY_BLUE']) {
		for (let n = 1; n <= 96; n++) {
			if (n % 4 !== 0 && n !== 1 && n !== 12) continue
			raw[`${family}_${n}`] = withAlpha(Accent, n)
		}
	}
	// The neutral ramp (light at low numbers) with a subtle plum cast.
	for (let n = 1; n <= 100; n++) {
		raw[`NEUTRAL_${n}`] = hsl(Hue, 0.06, clamp01(0.99 - (n - 1) * 0.0092))
	}
	return raw
}

// ----- semantic colors -----

/** Ordered rules: first matching [regex, dark, light] wins. */
const Rules = [
	// Headings and text.
	[/^MOBILE_TEXT_HEADING_PRIMARY$/, '#f5f0f3', '#301025'],
	[/^TEXT_STRONG$/, '#f5f0f3', '#301025'],
	[/^TEXT_DEFAULT$/, '#f5f0f3', '#451736'],
	[/MUTED_TEXT|TEXT_MUTED|TEXT_SUBTLE/, '#b3a4ae', '#83586f'],
	[/^TEXT_LOW_CONTRAST$/, '#9c8c96', '#9a8593'],
	[/^TEXT_LINK$/, LinkDark, LinkLight],
	[/TEXT_FEEDBACK_CRITICAL|TEXT_STATUS_DND/, '#f23f43', '#a12833'],
	// Interactive text and icons.
	[/^INTERACTIVE_TEXT_DEFAULT$/, LinkDark, LinkLight],
	[/^INTERACTIVE_TEXT_ACTIVE$/, Accent, Accent],
	[/^INTERACTIVE_MUTED$/, '#581d4466', '#f0cce4'],
	[/ICON_ACTIVE|HEADER_ICON_ACTIVE/, Accent, Accent],
	[/ICON_HOVER/, '#efcee4', '#6f4c60'],
	[/INTERACTIVE_ICON|HEADER_ICON_DEFAULT|CHANNEL_ICON/, '#dd99c6', '#83586f'],
	// Base surfaces.
	[/BASE_LOWEST|APP_LAUNCHER/, '#1c0916', '#f9eef5'],
	[/BASE_LOWER/, '#301025', '#f0cce4'],
	[/BASE_LOW$/, '#451736', '#f0cce4'],
	[/BASE_MID|REDESIGN_CHAT_INPUT_BACKGROUND/, '#581d44', '#ffffff'],
	// Raised surfaces, panels, cards.
	[/BACKGROUND_FLOATING|SURFACE_OVERLAY|USER_PROFILE_CONTAINER|EXPRESSION_PICKER/, '#301025', '#ffffff'],
	[/BACKGROUND_SCRIM|NAVIGATION_SCRIM/, '#1c0916b3', '#1c091680'],
	[/PANEL_BG|GUILD_FOLDER_BACKGROUND|GUILDBAR_ICON_BACKGROUND|EMOJI_BUTTON_BACKGROUND|SEGMENTED_CONTROL_BACKGROUND/, '#451736', '#f0cce4'],
	[/SURFACE_HIGH|SURFACE_RAISED|CARD_SECONDARY_BG|CARD_MUTED_BG|MOD_MUTED|MOD_SUBTLE/, '#65224e', '#f9eef5'],
	[/CARD_BACKGROUND_DEFAULT|TABLEROW_BACKGROUND_DEFAULT|STAGE_CARD_PILL_BG|CARD_SECONDARY_BACKGROUND_DEFAULT/, '#581d44', '#ffffff'],
	[/TABLEROW_BACKGROUND_PRESSED|CARD_SECONDARY_BACKGROUND_ACTIVE|CARD_MUTED_PRESSED_BG|MOD_STRONG|MOD_NORMAL/, '#7d2a61', '#efcee4'],
	// Hovers and selections.
	[/MESSAGE_HOVER|MESSAGE_BACKGROUND_HOVER/, '#7d2a6126', '#f9eef5'],
	[/INTERACTIVE_BACKGROUND_HOVER/, '#7d2a6126', '#7e205f14'],
	[/INTERACTIVE_BACKGROUND_ACTIVE|INTERACTIVE_BACKGROUND_SELECTED|CHANNEL_ITEM_BACKGROUND_SELECTED/, '#7e205f33', '#7e205f21'],
	[/^INTERACTIVE_BACKGROUND_DEFAULT$/, '#00000000', '#00000000'],
	// Mentions, highlights and embeds.
	[/MENTIONED|KEYWORD_HIGHLIGHT|MESSAGE_HIGHLIGHT|AUTOMOD|MESSAGE_MENTIONED_BACKGROUND/, Accent + '40', Accent + '21'],
	[/^EMBED_BACKGROUND$/, '#1c0916e6', '#f9eef5cc'],
	// Accent and brand.
	[/BACKGROUND_ACCENT|BACKGROUND_BRAND|ACCENT_BACKGROUND|INPUT_CONTROL_SELECTED|INPUT_CONTROL_ACTIVE|THREAD_CHANNEL_SPINE|BUTTON_OUTLINE_BRAND_BOARDER|CONTROL_EXPRESSIVE_BACKGROUND/, Accent, Accent],
	[/SEGMENTED_CONTROL_INDICATOR|CHATINPUT_BORDER_ACTIVE/, Accent, Accent],
	[/^MOBILE_ANDROID_BUTTON_BACKGROUND_RIPPLE$/, '#ffffff24', '#45173633'],
	// Danger.
	[/CRITICAL_SECONDARY_BORDER|BUTTON_OUTLINE_DANGER_BORDER/, '#f23f43', '#a12833'],
	[/CRITICAL_SECONDARY_BACKGROUND/, '#f23f4326', '#f23f4321'],
	// Buttons.
	[/BUTTON_SECONDARY_BACKGROUND/, '#451736', '#ffffff'],
	[/BUTTON_PRIMARY_PRESSED/, AccentHover, AccentHover],
	[/BUTTON_TERTIARY_PRESSED/, '#7d2a6126', '#7e205f14'],
	[/BUTTON_TERTIARY_BACKGROUND/, '#00000000', '#00000000'],
	// Borders and dividers, strong to subtle.
	[/BORDER_STRONG|APP_FRAME_BORDER/, '#65224e', '#dd99c6'],
	[/BORDER_NORMAL|CHAT_BORDER|HEADER_BORDER|STANDALONE_CHANNEL_HEADER_BORDER|COMMAND_BAR_DIVIDER|FLOATING_ACCESSORY_BORDER|COACHMARK_BORDER/, '#65224e', '#efcee4'],
	[/BORDER_SELECTED|CHECKBOX_BORDER_SELECTED|SWITCH_BORDER_SELECTED/, Accent, Accent],
	[/DIVIDER|SPINE|BORDER/, '#581d44', '#f4d9ea'],
	// Inputs, checkboxes, switches, reactions.
	[/^INPUT_BACKGROUND_DEFAULT$/, '#301025', '#ffffff'],
	[/CHECKBOX_BORDER_DEFAULT|RADIO_BORDER_DEFAULT|SWITCH_BORDER_DEFAULT|INPUT_BORDER_DEFAULT|INPUT_BORDER/, '#65224e', '#efcee4'],
	[/REACTION_BACKGROUND_DEFAULT/, '#581d4480', '#7e205f14'],
	[/REACTION_BORDER_DEFAULT/, '#65224e', '#efcee4'],
	// Remaining controls fall back to their category.
	[/CONTROL_ICON_ONLY_BACKGROUND_ACTIVE/, '#7d2a6126', '#f0cce4'],
	[/CONTROL_.*BACKGROUND_ACTIVE/, '#7d2a61', '#efcee4'],
	[/CONTROL_.*BACKGROUND_DEFAULT/, '#581d44', '#f9eef5'],
	[/CONTROL_.*BORDER/, '#65224e', '#efcee4'],
	// Progress and misc.
	[/PROGRESSBAR_TRACK_BACKGROUND/, '#451736', '#f0cce4'],
	[/BADGE_BACKGROUND_DEFAULT/, '#f23f43', '#f23f43'],
]

/** Fallbacks by broad category, so every token always gets a color. */
const Fallbacks = [
	[/^BACKGROUND/, '#451736', '#f0cce4'],
	[/^TEXT|^REDESIGN_CHANNEL_NAME/, '#f5f0f3', '#451736'],
	[/ICON/, '#dd99c6', '#83586f'],
	[/./, '#581d44', '#ffffff'],
]

function buildSemanticColors(tokenNames, base) {
	const idx = base === 'dark' ? 1 : 2
	const colors = {}
	for (const name of tokenNames) {
		let value
		for (const [re, dark, light] of [...Rules, ...Fallbacks]) {
			if (re.test(name)) {
				value = idx === 1 ? dark : light
				break
			}
		}
		if (typeof value !== 'string') throw new Error(`No color for token ${name}`)
		colors[name] = [value]
	}
	return colors
}

// ----- fonts (Discord+ UI font: Poppins) -----

const FontBase = 'https://github.com/google/fonts/raw/main/ofl/poppins'
const PoppinsFiles = {
	Normal: 'Regular', Medium: 'Medium', Semibold: 'SemiBold', Bold: 'Bold', ExtraBold: 'ExtraBold',
}
const Fonts = {}
for (const [style, file] of Object.entries(PoppinsFiles)) {
	Fonts[`ggsans-${style}`] = `${FontBase}/Poppins-${file}.ttf?raw=1`
	Fonts[`ggsans-${style}Italic`] = `${FontBase}/Poppins-${file}Italic.ttf?raw=1`
	Fonts[`NotoSans-${style}`] = `${FontBase}/Poppins-${file}.ttf?raw=1`
	if (style === 'Normal') Fonts['NotoSans-NormalItalic'] = `${FontBase}/Poppins-Italic.ttf?raw=1`
	if (style === 'ExtraBold') Fonts['ABCGintoNord-ExtraBold'] = `${FontBase}/Poppins-ExtraBold.ttf?raw=1`
}

// ----- sysColors: Material-style 13-step ramps around the Discord+ palette -----

function ramp(hue, satStart, satEnd, lStart, lEnd) {
	return Array.from({ length: 13 }, (_, i) => {
		const t = i / 12
		return hsl(hue, satStart + (satEnd - satStart) * t, lStart + (lEnd - lStart) * t)
	})
}

const SysColors = {
	accent1: ramp(Hue, 0.25, 0.62, 0.97, 0.16),
	accent2: ramp(Hue, 0.18, 0.55, 0.95, 0.24),
	accent3: ramp(197, 0.35, 0.7, 0.95, 0.24),
	neutral1: ramp(Hue, 0.05, 0.07, 0.99, 0.07),
	neutral2: ramp(Hue, 0.04, 0.06, 0.96, 0.13),
}

// ----- assembly -----

// The semantic token set observed in legacy themes of this spec.
const tokenNames = [
	'MOBILE_TEXT_HEADING_PRIMARY', 'TEXT_STRONG', 'TEXT_DEFAULT', 'TEXT_MUTED',
	'INTERACTIVE_TEXT_DEFAULT', 'INTERACTIVE_TEXT_ACTIVE', 'INTERACTIVE_MUTED',
	'BACKGROUND_BASE_LOW', 'BACKGROUND_BASE_LOWER', 'BACKGROUND_BASE_LOWEST',
	'REDESIGN_BUTTON_SECONDARY_BORDER', 'BACKGROUND_MOD_STRONG', 'BACKGROUND_ACCENT',
	'BACKGROUND_FLOATING', 'PANEL_BG', 'BACKGROUND_SCRIM', 'BACKGROUND_MESSAGE_HOVER',
	'BACKGROUND_MOD_MUTED', 'EMBED_BACKGROUND', 'MESSAGE_MENTIONED_BACKGROUND_DEFAULT',
	'BG_SURFACE_OVERLAY_TMP', 'REDESIGN_BUTTON_TERTIARY_BACKGROUND', 'BUTTON_OUTLINE_BRAND_BOARDER',
	'REDESIGN_BUTTON_SECONDARY_BACKGROUND', 'REDESIGN_CHAT_INPUT_BACKGROUND',
	'REDESIGN_BUTTON_PRIMARY_PRESSED_BACKGROUND', 'REDESIGN_INPUT_CONTROL_SELECTED',
	'MOBILE_ANDROID_BUTTON_BACKGROUND_RIPPLE', 'BACKGROUND_BRAND', 'TEXT_LINK',
	'TEXT_FEEDBACK_CRITICAL', 'CHANNEL_ICON', 'CARD_BACKGROUND_DEFAULT',
	'REDESIGN_CHANNEL_NAME_TEXT', 'CONTROL_EXPRESSIVE_BACKGROUND_DEFAULT',
	'CONTROL_EXPRESSIVE_BACKGROUND_ACTIVE', 'APP_FRAME_BORDER',
	'BACKGROUND_APP_LAUNCHER_CARD_DEFAULT', 'BACKGROUND_APP_LAUNCHER_ROW_DEFAULT',
	'BACKGROUND_MOD_NORMAL', 'BACKGROUND_MOD_SUBTLE', 'BADGE_BACKGROUND_DEFAULT',
	'BORDER_NORMAL', 'CARD_BORDER_DEFAULT', 'CARD_MUTED_BG', 'CARD_MUTED_PRESSED_BG',
	'CARD_SECONDARY_BACKGROUND_ACTIVE', 'CARD_SECONDARY_BACKGROUND_DEFAULT', 'CHAT_BORDER',
	'CHECKBOX_BORDER_DEFAULT', 'CHECKBOX_BORDER_SELECTED_DEFAULT',
	'CONTROL_CRITICAL_SECONDARY_BACKGROUND_ACTIVE', 'CONTROL_CRITICAL_SECONDARY_BACKGROUND_DEFAULT',
	'CONTROL_CRITICAL_SECONDARY_BORDER_ACTIVE', 'CONTROL_CRITICAL_SECONDARY_BORDER_DEFAULT',
	'CONTROL_ICON_ONLY_BACKGROUND_ACTIVE', 'CONTROL_OVERLAY_PRIMARY_BORDER_DEFAULT',
	'CONTROL_OVERLAY_SECONDARY_BORDER_DEFAULT', 'CONTROL_SECONDARY_BACKGROUND_ACTIVE',
	'CONTROL_SECONDARY_BACKGROUND_DEFAULT', 'CONTROL_SECONDARY_BORDER_ACTIVE',
	'CONTROL_SECONDARY_BORDER_DEFAULT', 'GUILD_FOLDER_BACKGROUND', 'INPUT_BORDER_DEFAULT',
	'INTERACTIVE_BACKGROUND_DEFAULT', 'INTERACTIVE_BACKGROUND_HOVER', 'INTERACTIVE_BACKGROUND_SELECTED',
	'KEYWORD_HIGHLIGHT_BACKGROUND', 'MESSAGE_BACKGROUND_HOVER',
	'MOBILE_CHANNEL_ITEM_BACKGROUND_SELECTED', 'MOBILE_CHATINPUT_BORDER_ACTIVE',
	'MOBILE_CHATINPUT_BORDER_DEFAULT', 'MOBILE_COACHMARK_BORDER_DEFAULT',
	'MOBILE_COMMAND_BAR_DIVIDER', 'MOBILE_EMOJI_BUTTON_BACKGROUND',
	'MOBILE_FLOATING_ACCESSORY_BORDER', 'MOBILE_GUILDBAR_ICON_BACKGROUND_DEFAULT',
	'MOBILE_HEADER_BORDER', 'MOBILE_SEGMENTED_CONTROL_BACKGROUND',
	'MOBILE_SEGMENTED_CONTROL_INDICATOR_BACKGROUND', 'PROGRESSBAR_TRACK_BACKGROUND',
	'RADIO_BORDER_DEFAULT', 'REACTION_BACKGROUND_DEFAULT', 'REACTION_BORDER_DEFAULT',
	'REDESIGN_BUTTON_TERTIARY_PRESSED_BACKGROUND', 'STAGE_CARD_PILL_BG',
	'STANDALONE_CHANNEL_HEADER_BORDER', 'SWITCH_BORDER_DEFAULT', 'SWITCH_BORDER_SELECTED_DEFAULT',
	'TABLEROW_BACKGROUND_DEFAULT', 'TABLEROW_BACKGROUND_PRESSED', 'USER_PROFILE_CONTAINER_BACKGROUND',
	'REDESIGN_CHANNEL_NAME_MUTED_TEXT', 'INTERACTIVE_ICON_ACTIVE', 'INTERACTIVE_ICON_DEFAULT',
	'INTERACTIVE_ICON_HOVER', 'MOBILE_HEADER_ICON_DEFAULT', 'MOBILE_HEADER_ICON_ACTIVE',
	'INTERACTIVE_ACCENT_BACKGROUND_DEFAULT', 'VOICE_CHANNEL_USER_LIMIT_ACCENT_BACKGROUND',
	'BACKGROUND_SURFACE_HIGH', 'BACKGROUND_MENTIONED', 'BACKGROUND_MENTIONED_HOVER',
	'BACKGROUND_MESSAGE_AUTOMOD', 'BACKGROUND_MESSAGE_AUTOMOD_HOVER',
	'BACKGROUND_MESSAGE_HIGHLIGHT', 'BACKGROUND_MESSAGE_HIGHLIGHT_HOVER', 'BG_SURFACE_RAISED',
	'CARD_SECONDARY_BG', 'THREAD_CHANNEL_SPINE', 'ANDROID_NAVIGATION_SCRIM_BACKGROUND',
	'MOBILE_EXPRESSION_PICKER_BACKGROUND_DEFAULT', 'INPUT_BACKGROUND_DEFAULT', 'TEXT_SUBTLE',
	'TEXT_STATUS_DND', 'TEXT_LOW_CONTRAST', 'INTERACTIVE_BACKGROUND_ACTIVE',
	'REDESIGN_INPUT_CONTROL_ACTIVE_BG', 'BUTTON_OUTLINE_DANGER_BORDER', 'BORDER_MUTED',
	'BORDER_SUBTLE', 'BORDER_STRONG', 'MESSAGE_MENTIONED_BACKGROUND_HOVER',
]

function theme(base) {
	return {
		name: base === 'dark' ? 'Discord+ Dark' : 'Discord+ Light',
		description:
			base === 'dark'
				? 'Discord+ 3.4.1 by PlusInsta, ported: plum surfaces and the Moonlit Dusk accent palette (hsl 320, 60%, 31%) for dark mode'
				: 'Discord+ 3.4.1 by PlusInsta, ported: rose surfaces and the Dawn accent palette (hsl 320, 60%, 31%) for light mode',
		version: '3.4.1',
		authors: [{ name: 'PlusInsta', id: '309931975102300160' }],
		plus: { version: 0, mentionLineColor: Accent },
		semanticColors: buildSemanticColors(tokenNames, base),
		rawColors: buildRawColors(),
		fonts: Fonts,
		spec: 2,
		sysColors: SysColors,
	}
}

const hex = /^#(?:[0-9a-f]{6}|[0-9a-f]{8})$/i
for (const base of ['dark', 'light']) {
	const data = theme(base)
	const name = `DiscordPlus-${base[0].toUpperCase()}${base.slice(1)}.json`
	// Validate before writing: every color well-formed, every value a single-element array.
	for (const [k, v] of Object.entries(data.semanticColors)) {
		if (!Array.isArray(v) || v.length !== 1 || !hex.test(v[0])) throw new Error(`Bad semantic ${k}: ${JSON.stringify(v)}`)
	}
	for (const [k, v] of Object.entries(data.rawColors)) if (!hex.test(v)) throw new Error(`Bad raw ${k}: ${v}`)
	for (const [k, v] of Object.entries(data.sysColors)) {
		if (!Array.isArray(v) || v.length !== 13 || v.some(c => !hex.test(c))) throw new Error(`Bad sysColor ${k}`)
	}
	fs.writeFileSync(path.join(__dirname, name), JSON.stringify(data, null, 2) + '\n')
	console.log(`✓ ${name}: ${Object.keys(data.semanticColors).length} semantic, ${Object.keys(data.rawColors).length} raw colors`)
}
