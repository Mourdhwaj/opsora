---
name: Opsora Cinematic
description: "James Cameron-style cinematic product film for Opsora PG Management OS"
version: 1.0
aspect: "9:16"
resolution: "1080x1920"
fps: 30
duration: 240
---

# Opsora Cinematic — Design Specification

## Brand Identity

**Product:** Opsora — The Operating System for PG/Hostel/Co-living Management
**Tagline:** "Your PG, finally organized."
**Tone:** Cinematic, authoritative, emotional, technical precision

## Color Palette (Sacred — Do Not Deviate)

### Core Brand Colors
```css
:root {
  --opsora-teal: #0D9488;        /* Primary accent — trust, technology, calm authority */
  --opsora-teal-glow: #14B8A6;   /* Glow state — hover, active, success */
  --opsora-teal-deep: #0F766E;   /* Pressed, deep emphasis */
  --opsora-teal-light: #CCFBF1;  /* Subtle backgrounds, 10% opacity */

  --opsora-ink: #111111;         /* Primary text — never pure black */
  --opsora-ink-muted: #787774;   /* Secondary text */
  --opsora-ink-faint: #A0A0A0;   /* Placeholders, timestamps */

  --opsora-canvas: #F7F6F3;      /* Light mode background — warm paper */
  --opsora-surface: #FFFFFF;     /* Cards, modals */
  --opsora-surface-hover: #FBFBFA;
  --opsora-border: #EAEAEA;      /* Dividers, input borders */

  --opsora-danger: #9F2F2D;      /* Errors, overdue, critical */
  --opsora-danger-light: #FDEBEC;
  --opsora-warning: #956400;     /* Pending, attention */
  --opsora-warning-light: #FBF3DB;
  --opsora-success: #346538;     /* Paid, resolved, verified */
  --opsora-success-light: #EDF3EC;
  --opsora-info: #1F6C9F;        /* Neutral info */
  --opsora-info-light: #E1F3FE;
}
```

### Cinematic Adaptations (Video ≠ Web)
| Web UI | Video Frame |
|--------|-------------|
| `--opsora-border` (1px) | **2px solid** — visible under compression |
| `--opsora-teal` at 10% opacity | **25-40% opacity** — glows must pop |
| Text on `--opsora-canvas` | **Never** — use `--opsora-ink` on dark or `--opsora-surface` on light |
| Drop shadows | **Glow** instead — `box-shadow: 0 0 40px var(--opsora-teal-glow)` |

**Dark Cinematic Canvas (Primary for Acts I & II):**
```css
--cinematic-bg: #0A0F14;           /* Near-black, slightly blue */
--cinematic-bg-warm: #0D1418;      /* Slightly warmer variant */
--cinematic-surface: #111820;      /* Cards, panels */
--cinematic-border: #1E2A36;       /* Subtle edges */
--cinematic-text: #E8EBF0;         /* High contrast */
--cinematic-text-muted: #6B7A8A;   /* Secondary */
--cinematic-teal: #14B8A6;         /* Brighter for dark bg */
--cinematic-teal-glow: #22D3C0;    /* Strong glow */
```

## Typography

### Font Stack (System Fonts — No External Dependencies)
```css
--font-display: "SF Pro Display", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
--font-mono: "SF Mono", "Monaco", "Menlo", "Consolas", monospace;
--font-ui: "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
```

### Video Type Scale (Larger than Web)
| Role | Size | Weight | Line Height | Letter Spacing |
|------|------|--------|-------------|----------------|
| Hero / Logo Lockup | 96px | 700 | 1.0 | -0.03em |
| Section Title | 48px | 600 | 1.15 | -0.01em |
| Body Large | 32px | 400 | 1.4 | 0 |
| Body | 24px | 400 | 1.5 | 0 |
| Caption / Metadata | 18px | 500 | 1.3 | 0.02em |
| Micro / Timestamp | 14px | 400 | 1.2 | 0.05em |

**Rule:** Minimum settled read time = 0.3s per word. No text faster than 1.2s for a full sentence.

## Motion Principles

### Easing (Sacred)
```css
--ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);      /* Hero reveals */
--ease-out-cubic: cubic-bezier(0.215, 0.61, 0.355, 1); /* Standard */
--ease-out-back: cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Playful pops */
--ease-in-out-cubic: cubic-bezier(0.645, 0.045, 0.355, 1); /* Transitions */
--ease-spring: "custom" -- GSAP: { damping: 12, stiffness: 200 }; /* UI pops */
```

### Timing
| Element | Duration |
|---------|----------|
| Micro interaction (tap, hover) | 0.15-0.25s |
| Card/element entrance | 0.4-0.6s (staggered 0.08s) |
| Scene transition | 0.8-1.2s |
| Hero/logo reveal | 1.0-1.5s |
| Text type-out | 0.04s per character |

### Stagger Rules
- **Grid/List items:** 0.06-0.1s per item, max 0.8s total cascade
- **Sequential UI steps:** 0.15s between steps
- **Never stagger text lines** — reveal full block, then hold

## Scene Density (Video Composition)

### The 8-10 Element Rule
Every scene must have:
1. **Background** — Texture/gradient/glow (never flat)
2. **Midground** — Primary content (UI screen, data, text)
3. **Foreground** — 2-3 accents (dividers, labels, registration marks, monospace metadata)
4. **Atmosphere** — Subtle particle, lens flare, or glow
5. **UI Chrome** — Status bar, nav hint, or device frame

### Visual Hierarchy (Fixed Eye Focus)
**Center-frame horizontal band (40-60% vertical)** = **Eye Focus Zone**
- All critical text, primary UI action, hero metrics land here
- Never place critical content above 30% or below 70% vertical

## Audio Specification

### Music Stem (Single Across All Episodes)
- **Genre:** Cinematic hybrid — low synth pad + subtle orchestral + light percussion
- **Key:** D minor (relative to F major — hopeful but grounded)
- **Tempo:** 72 BPM (slow, deliberate, cinematic)
- **Structure:** 4-bar intro → 8-bar A → 8-bar B → 8-bar A' → 4-bar outro
- **Stems delivered:** Full mix + Drums only + Pads only + Melody only + Silence (for ducking)

### SFX Palette (Consistent Across Episodes)
| Event | Sound | Volume |
|-------|-------|--------|
| UI element appear (pop) | Soft "pluck" — 120Hz sine, 80ms | 0.4 |
| Card/screen slide | Airy "whoosh" — filtered noise, 200ms | 0.35 |
| Success/verify | Major chord chime (C-E-G), 400ms | 0.5 |
| Error/warning | Dissonant double-tap (tritone), 150ms | 0.45 |
| Typing (per char) | Ultra-light tick, randomized pitch ±10% | 0.15 |
| Scene transition | Deep sub hit (40Hz), 600ms decay | 0.6 |
| Data counter | Rapid ticks synced to numbers | 0.3 |

### Mix Levels
| Track | Level | Ducking |
|-------|-------|---------|
| Music (full) | -18 LUFS | -12dB under VO/text-heavy |
| Music (pads only) | -24 LUFS | None |
| SFX | -12 LUFS | None |
| Voiceover | -16 LUFS | Music ducks -12dB |

## Episode Structure Template

Each 20s episode follows:
```
0.0-0.5s  — Hard cut in / Scene establish (audio transition hit)
0.5-3.0s  — Hook (problem or feature name) — BIG TEXT
3.0-10.0s — Deep dive (UI flow, 2-3 beats)
10.0-17.0s — Payoff (result, metric, transformation)
17.0-19.5s — Brand lockup (Opsora logo + one-liner)
19.5-20.0s — Hard cut to black / transition to next
```

## Color Grading LUT (Master)

```c
// Applied in post to all renders
// Rec.709 → Custom Cineon log → Grade → Rec.709

// Shadows: +10% teal lift
// Midtones: -5% magenta (skin tones clean)
// Highlights: +5% warm (golden hour feel)
// Contrast: +15% (S-curve)
// Saturation: -10% (desaturated cinematic)
// Grain: 8% 35mm film grain overlay
// Vignette: -0.15 exposure at edges
```

## Asset Naming Convention

```
opsora-cinematic/
├── frame.md                          # THIS FILE
├── beat-grid.json                    # Master timing reference
├── music/
│   ├── master-stem.wav               # 48kHz/24bit, 4:00
│   ├── drums-only.wav
│   ├── pads-only.wav
│   ├── melody-only.wav
│   └── silence.wav
├── sfx/
│   ├── ui-pop.wav
│   ├── ui-slide.wav
│   ├── success-chime.wav
│   ├── error-dissonance.wav
│   ├── typing-tick.wav
│   ├── transition-hit.wav
│   └── counter-tick.wav
├── episodes/
│   ├── ep01-pain/
│   ├── ep02-rent/
│   ├── ep03-complaints/
│   ├── ep04-rooms/
│   ├── ep05-checkin/
│   ├── ep06-food/
│   ├── ep07-iot/
│   └── ep08-promise/
└── output/
    ├── opsora-cinematic-master.mp4   # 4K 16:9
    ├── opsora-cinematic-vertical.mp4 # 1080x1920
    ├── opsora-cinematic-square.mp4   # 1080x1080
    ├── opsora-cinematic-poster.jpg
    └── share-copy.txt
```

## Episode Color Themes

| Episode | Palette | Mood |
|---------|---------|------|
| Ep 1: Pain | Dark cinematic + danger red accents | Oppressive, urgent |
| Ep 2: Rent | Dark → Teal transition | Tension → Resolution |
| Ep 3: Complaints | Dark → Success green | Chaos → Order |
| Ep 4: Rooms | Clean light (canvas) | Clarity, space |
| Ep 5: Check-in | Light + teal | Flow, momentum |
| Ep 6: Food | Warm light + amber | Human, nourishing |
| Ep 7: IoT | Dark + electric teal/blue | Technical, live |
| Ep 8: Promise | Full spectrum → Logo teal | Triumph, unity |

---

**This spec is the single source of truth.** All compositions, color choices, type sizes, motion timings, and audio levels must derive from here. No freestyle.