---
name: Opsora
description: Operating system for PGs, hostels, co-living spaces, and student housing
colors:
  canvas: "#F7F6F3"
  surface: "#FFFFFF"
  surface-hover: "#FBFBFA"
  surface-active: "#F2F2F0"
  ink: "#111111"
  ink-secondary: "#787774"
  ink-muted: "#A0A0A0"
  border: "#EAEAEA"
  border-subtle: "#EAEAEA80"
  border-strong: "#DADAD8"
  accent: "#111111"
  accent-light: "#F7F6F3"
  accent-dark: "#2F3437"
  danger: "#9F2F2D"
  danger-light: "#FDEBEC"
  warning: "#956400"
  warning-light: "#FBF3DB"
  info: "#1F6C9F"
  info-light: "#E1F3FE"
  success: "#346538"
  success-light: "#EDF3EC"
typography:
  display:
    fontFamily: "Geist, Geist UI, SF Pro Display, system-ui, -apple-system, sans-serif"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist, Geist UI, SF Pro Display, system-ui, -apple-system, sans-serif"
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: "-0.011em"
  label:
    fontFamily: "Geist, Geist UI, SF Pro Display, system-ui, -apple-system, sans-serif"
    fontWeight: 600
  mono:
    fontFamily: "Geist Mono, SF Mono, Fira Code, monospace"
rounded:
  sm: "0.25rem"
  md: "0.375rem"
  lg: "0.5rem"
  xl: "0.75rem"
  full: "9999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  2xl: "3rem"
---

# Design System: Opsora

## 1. Overview

**Creative North Star: "The Modern Ledger"**

Opsora's design is a structured, data-first system that treats information density and visual clarity as inseparable goals. The aesthetic is precise and professional — every element earns its place through hierarchy, not decoration. The system explicitly rejects over-designed flash (gradients, glassmorphism, animated hero sections) and generic SaaS templates (bland card grids, cookie-cutter dashboards). It is not warm-and-fuzzy; it is not aggressive and loud. It sits in the professional middle: competent, trustworthy, quietly confident.

The palette is anchored by a single off-black accent (#111111) used sparingly for primary actions and emphasis, against a near-white canvas (#F7F6F3) and pure white surfaces (#FFFFFF). This is not a colorful system — it is a typographic and spatial system where weight, size, and spacing carry the hierarchy. Color appears only for functional status indicators (success, warning, danger, info) and never as decoration.

**Key Characteristics:**
- Off-black accent carries all primary action states; its rarity is the point
- Typography hierarchy through weight and size, never through color alone
- Spatial rhythm via consistent spacing scale and generous white space
- Functional color: status semantics only, no decorative palettes
- Layered depth through subtle shadows that respond to interaction
- Refined, restrained feedback on every interactive element

## 2. Colors

The palette is intentionally limited: one anchor accent, four functional status colors, and a tight neutral ramp. Color is functional, never decorative.

### Primary
- **Off-Black Accent** (#111111): Primary buttons, active navigation, focus rings, text emphasis. Used on ≤15% of any screen. Its darkness against the light canvas creates contrast without needing saturation.

### Neutral
- **Canvas** (#F7F6F3): Page background. A near-white with minimal warm tint — reads as clean, not cream.
- **Surface** (#FFFFFF): Card and panel backgrounds. Pure white lifts content above the canvas.
- **Surface Hover** (#FBFBFA): Subtle state change on interactive surfaces.
- **Surface Active** (#F2F2F0): Pressed/active state.
- **Ink** (#111111): Body text and headings. Matches the accent — the text IS the visual weight.
- **Ink Secondary** (#787774): Descriptions, supporting text, secondary labels.
- **Ink Muted** (#A0A0A0): Placeholders, disabled states, timestamps.
- **Border** (#EAEAEA): Card borders, dividers, input outlines.
- **Border Strong** (#DADAD8): Emphasis borders, active input borders.

### Status
- **Danger** (#9F2F2D): Errors, destructive actions, critical alerts.
- **Warning** (#956400): Pending states, attention needed.
- **Info** (#1F6C9F): Neutral notifications, informational badges.
- **Success** (#346538): Completed states, confirmations.

### Named Rules
**The One Accent Rule.** The off-black accent (#111111) is the only primary action color. Status colors appear in small functional badges and indicators only. Any screen where the accent occupies more than 15% of surface area is over-decorated.

**The Functional Color Rule.** Color communicates status, not mood. Each status color maps to one semantic meaning: danger = error/destructive, warning = pending/attention, info = neutral/informational, success = complete/confirmed. Never use status colors for decoration.

## 3. Typography

**Display Font:** Geist (with Geist UI, SF Pro Display, system-ui fallbacks)
**Body Font:** Geist (with Geist UI, SF Pro Display, system-ui fallbacks)
**Serif Font:** Newsreader (for editorial accents)
**Mono Font:** Geist Mono (with SF Mono, Fira Code fallbacks)

**Character:** Geist is a geometric grotesque with a technical, precise feel — like a well-set financial document. The serif (Newsreader) adds editorial warmth only where deliberately invoked. The pairing is deliberate contrast: modern precision meets traditional authority.

### Hierarchy
- **Display** (700, clamp(2.25rem, 5vw, 3.5rem), 1.15): Hero headlines and page titles. Tight letter-spacing (-0.025em) creates precision, not tension.
- **Headline** (700, 1.5rem–2rem, 1.15): Section headers and card titles.
- **Title** (600, 1.125rem, 1.3): Subsection headers, table headers, form labels.
- **Body** (400, 0.875rem–1rem, 1.65): Descriptions, paragraphs, long-form content. Max line length 65–75ch.
- **Label** (600, 0.75rem–0.875rem, -0.011em): Buttons, badges, navigation, input labels.

### Named Rules
**The Weight Rule.** Hierarchy is built through font-weight and size contrast, never through color alone. Ink (#111111) is the only text color for primary content; secondary and muted are weight-reduced, not color-shifted.

## 4. Elevation

The system uses a layered approach: surfaces stack through subtle, progressive shadows that appear at rest for key hierarchy levels and intensify on interaction. The palette is flat-by-default at the base (canvas and surface share minimal contrast), with shadows creating the depth hierarchy for elevated elements.

### Shadow Vocabulary
- **Ambient** (`0 1px 2px 0 rgba(0,0,0,0.03)`): Subtle resting state for cards and panels.
- **Card Hover** (`0 2px 8px rgba(0,0,0,0.04)`): Interactive lift on hover.
- **Modal** (`0 24px 48px -12px rgba(0,0,0,0.10)`): Dialogs and overlays.
- **Dropdown** (`0 4px 12px rgba(0,0,0,0.08)`): Floating menus and popovers.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only on interaction (hover, focus) or for genuinely floating elements (modals, dropdowns). Cards at rest use a 1px border, not a shadow. Shadows are structural, not decorative.

## 5. Components

### Buttons
- **Shape:** Rounded rectangle (6px radius, `--radius-md`)
- **Primary:** Off-black (#111111) background, white text, h-10, px-4. Transitions to #333333 on hover.
- **Secondary:** White background, ink text, 1px border (#EAEAEA). Transitions to canvas on hover.
- **Ghost:** Transparent, ink-secondary text. Ink + canvas on hover.
- **Danger:** Danger-light background, danger text. Danger-light darkens on hover.
- **Focus:** 2px ink outline with 2px offset. Consistent across all variants.
- **Feedback:** Active state scales to 0.98 — subtle, tactile confirmation.

### Cards
- **Corner Style:** 12px radius (`--radius-xl`)
- **Background:** White (#FFFFFF)
- **Shadow Strategy:** Flat at rest (1px border). Hover lifts with ambient shadow (card-hover). This is the layered approach — cards gain depth on interaction.
- **Border:** 1px solid #EAEAEA
- **Internal Padding:** 24px (`--spacing-lg`)

### Inputs
- **Style:** 1px border (#EAEAEA) on canvas background, 12px radius, h-12.
- **Focus:** Border shifts to accent (#111111) with 2px ring at 20% opacity.
- **Error:** Border shifts to danger (#9F2F2D) with danger-light background tint.
- **Placeholder:** Ink-muted (#A0A0A0) — must maintain 4.5:1 contrast against canvas.

### Navigation (Sidebar)
- **Style:** White surface, 1px right border. Fixed width 256px.
- **Typography:** 14px/500 weight, ink-secondary default, ink on active.
- **Active State:** Canvas background (#F7F6F3) with ink text. No accent color — weight and background carry the signal.
- **Mobile:** Full-width overlay with backdrop blur. Slide-in from left.

### Badges / Status Pills
- **Style:** Rounded-full, uppercase, tracking-wider, 10px–12px font size.
- **Color Mapping:** Each status color gets its own light background + dark text pairing.
- **Purpose:** Status indicators only — never used for navigation or decoration.

### Toast / Alerts
- **Style:** Rounded cards with status-colored left border (subtle 1px, not the banned side-stripe pattern — use a background tint instead).
- **Pattern:** Status-light background, status text color, icon leading.

## 6. Do's and Don'ts

### Do:
- **Do** use the off-black accent (#111111) as the single primary action color. Its rarity creates emphasis.
- **Do** maintain 7:1 contrast ratio for body text (WCAG AAA) and 4.5:1 for large text.
- **Do** build hierarchy through weight (400 → 600 → 700) and size, not through color shifts.
- **Do** keep cards flat at rest with a 1px border; add shadows only on hover or for floating elements.
- **Do** use the full spacing scale (xs through 2xl) to create rhythmic, intentional layouts.
- **Do** include `prefers-reduced-motion` alternatives for every animation.
- **Do** keep touch targets at minimum 44px for the mobile resident portal.

### Don't:
- **Don't** use gradients, glassmorphism, or decorative blur effects anywhere. Opsora is a tool, not a marketing page.
- **Don't** use generic SaaS admin templates — bland card grids with icon + heading + text repeated endlessly.
- **Don't** use warm cream/sand/beige as a body background. The canvas (#F7F6F3) is a neutral, not a "warm" tone.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent on cards, list items, or alerts.
- **Don't** use gradient text (`background-clip: text` + gradient). Use a single solid color.
- **Don't** use numbers as section markers (01 / 02 / 03) unless the sequence carries real information.
- **Don't** pair two similar fonts (two geometric sans-serifs). The Geist + Newsreader pairing works because of deliberate contrast.
- **Don't** exceed 6rem on display headings. Above that the page is shouting, not designing.
- **Don't** use `border-radius` greater than 16px on cards. Full-pill is for badges and buttons only.
- **Don't** animate CSS layout properties (height, width). Transform and opacity only.
