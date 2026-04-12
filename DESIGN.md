# Design System — iskrib

## Product Context
- **What this is:** A writing + social mobile app where writers share journals, stories, and opinions
- **Who it's for:** Writers who want writing to feel intimate and alive — not utilitarian
- **Space/industry:** Writing/social (peers: Medium, Substack, Wattpad, Day One, Bear)
- **Project type:** React Native mobile app (bare CLI, iOS + Android)

## Aesthetic Direction
- **Direction:** Luxury/Refined meets Organic/Natural — warm literary salon
- **Decoration level:** Intentional — subtle warmth through cream background and gold accents; typography does the heavy lifting
- **Mood:** Independent bookshop meets calligraphy studio. Warm, intimate, literary. Not clinical like Medium, not youthful like Wattpad. A place where your words breathe.
- **Reference sites:** Medium (typographic sophistication), Bear (brand personality + custom type), iA Writer (radical focus), Day One (premium feel)

## Typography
- **Brand/Logo:** Playfair Display SemiBold (Italic) — literary authority, the bookshop sign
- **Headings:** Lexend Deca (SemiBold, Bold) — modern clarity, optimized for readability
- **Body/Reading:** Lora (Regular, Italic, Bold) — warm serif, feels like a physical book
- **UI/Labels:** Outfit (Regular, Medium, SemiBold, Bold) — geometric sans, clean controls
- **Code:** Not currently used; if needed, use JetBrains Mono
- **Loading:** Fonts bundled with the app (not CDN)
- **Scale:**
  - hero: 32px (Playfair Display, brand logo)
  - h1: 24px (Lexend Deca Bold, page headings)
  - h2: 20px (Lexend Deca SemiBold)
  - h3: 17px (Lexend Deca SemiBold)
  - cardTitle: 15px (Lexend Deca Bold, post titles)
  - body: 16px / 26px line-height (Lora, reading content)
  - bodySmall: 14px / 22px (Lora)
  - ui: 15px / 22px (Outfit, standard UI text)
  - caption: 12px / 16px (Outfit)
  - label: 11px / 14px (Outfit SemiBold, uppercase, 1px letter-spacing)
  - button: 15px / 20px (Outfit SemiBold, 0.3px letter-spacing)
  - buttonSmall: 13px / 18px (Outfit Medium)
  - tabLabel: 11px / 14px (Outfit SemiBold)

### Font Usage Rules
- **Playfair Display:** Brand name ONLY. Never for headings, body, or UI. Always SemiBold weight. Italic for the logo in-app, regular for marketing.
- **Lexend Deca:** Headings and post titles. Optimized for readability at a glance. Use SemiBold for section headers, Bold for page titles and card titles.
- **Lora:** Body text, reading content, taglines, pull quotes. The "reading font." Regular for body, Italic for taglines and emphasis, Bold for in-text emphasis.
- **Outfit:** Everything else — buttons, labels, captions, navigation, status text, form inputs. The "UI font." Regular for body UI, Medium for secondary emphasis, SemiBold for buttons and labels, Bold sparingly.

## Color

- **Approach:** Restrained — 1 accent (gold) + 1 secondary accent (sage) + warm neutrals
- **Signature choice:** Cream (#FAF9F6) background instead of white. This is Iskrib's visual identity — no competitor in the writing/social space uses it. Reduces eye strain, creates warmth.

### Light Mode
| Token | Hex | Usage |
|-------|-----|-------|
| bgPrimary | #FAF9F6 | Page background (warm cream) |
| bgSecondary | #F3F1ED | Section backgrounds, subtle containers |
| bgElevated | #FFFFFF | Cards, modals, elevated surfaces |
| bgCard | #FEFEFE | Feed cards, content containers |
| textPrimary | #1A1612 | Body text, primary content |
| textHeading | #12100D | Headings, titles |
| textSecondary | #6B6560 | Secondary text, descriptions |
| textMuted | #A8A29E | Captions, timestamps, placeholders |
| textFaint | #C0BBB5 | Hints, disabled text |
| accentGold | #C4943E | Primary accent — CTAs, links, focus rings |
| accentAmber | #D4A853 | Active states, highlights, tab indicators |
| accentSage | #8A9E7A | Success/positive states, save indicator |
| danger | #DC2626 | Errors, destructive actions |
| success | #16A34A | Semantic success states |

### Dark Mode
| Token | Hex | Usage |
|-------|-----|-------|
| bgPrimary | #0C0C0C | Warm near-black (not pure #000) |
| bgSecondary | #141414 | Section backgrounds |
| bgElevated | #1A1A18 | Cards, modals |
| textPrimary | #F0EBE3 | Warm off-white body text |
| textHeading | #F5F0E8 | Headings |
| accentGold | #D4A853 | Slightly brighter gold for dark backgrounds |
| accentAmber | #E0BA6A | Brighter amber for visibility |
| accentSage | #9AB08A | Brighter sage for visibility |

### Story Status Colors
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| statusOngoing | #7A9E6A | #8AB07A | Sage-family green — "growing" |
| statusOngoingBg | rgba(122,158,106,0.10) | rgba(138,176,122,0.12) | Badge fill |
| statusCompleted | #B8943E | #C8A44E | Gold — "earned its gold" |
| statusCompletedBg | rgba(184,148,62,0.10) | rgba(200,164,78,0.12) | Badge fill |
| statusHiatus | #B87A4A | #C88A5A | Warm terracotta — "paused" |
| statusHiatusBg | rgba(184,122,74,0.10) | rgba(200,138,90,0.12) | Badge fill |

### Analytics Stat Colors
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| statReactions | #C47A6A | #D48A7A | Warm rose |
| statComments | #7A8A9E | #8A9AB0 | Muted slate blue |
| statBookmarks | (accentSage) | (accentSage) | Reuse for consistency |
| statEngagement | #A08060 | #B09070 | Warm clay/leather |

### Contrast Text
| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| textOnAccent | #1A1612 | #1A1612 | Dark text on gold/amber surfaces |

### Color Design Decisions
- Gold accent (#C4943E) evokes luxury and warmth — rare in the writing app space where orange (Substack), green (Medium), and blue (Day One) dominate
- Dark mode uses warm near-black (#0C0C0C) not pure black to maintain the warm identity
- All semantic colors (danger, success) reduce saturation ~10-20% in dark mode for comfort
- Story status colors use warm literary palette (sage, gold, terracotta) instead of Material Design primaries
- Analytics stat colors use muted warm tones (rose, slate, clay) instead of bright Tailwind dashboard colors
- Profile customization palette is curated to 8 brand-aligned colors with literary gradient presets

## Spacing
- **Base unit:** 8px (with 2px and 4px for micro-adjustments)
- **Density:** Comfortable — generous whitespace, the content breathes
- **Scale:** xxs(2) xs(4) sm(8) md(12) lg(16) xl(20) xxl(24) xxxl(32) xxxxl(40)
- **Horizontal page padding:** 16px (spacing.lg) on mobile
- **Reading line width:** ~65 characters per line (constrainted by mobile viewport)

## Layout
- **Approach:** Grid-disciplined — consistent alignment, predictable spacing
- **Grid:** Single-column on mobile; potential 2-column on tablet (not yet implemented)
- **Max content width:** 100% on mobile (padding-constrained)
- **Border radius scale:**
  - xs: 4px (inputs, small elements)
  - sm: 6px (chips, small cards)
  - md: 8px (standard cards, buttons)
  - lg: 10px (editor containers)
  - xl: 12px (larger cards)
  - hero: 20px (prominent cards, modals)
  - pill: 999px (tags, badges, rounded buttons)

## Motion
- **Approach:** Expressive — Benji Taylor / Honk philosophy applied to a writing context
- **Engine:** react-native-reanimated (native thread worklets)
- **Spring presets:**
  - gentle: damping 20, stiffness 150 — page transitions, fade-ins, smooth movement
  - bouncy: damping 12, stiffness 200 — reactions, celebrations, entry animations
  - snappy: damping 30, stiffness 300 — toggles, toolbar show/hide, micro-interactions
- **Animation differentiation** (each element has a unique motion signature):
  - FAB: gentle breathing (scale 1.0 ↔ 1.02) — sole continuously-animated element
  - Save indicator: opacity pulse (color shift, no scale) — functional, not decorative
  - Presence avatars: staggered spring entry (200ms per avatar) — then static
  - Notification dot: single spring pulse on arrival — then static
  - Card press: spring scale (0.98 → 1.0 on release)
  - Double-tap heart: spring bounce (0 → 1.2 → 1.0) + fade out
- **Haptic patterns:**
  - tap: light impact (button presses, navigation)
  - success: notification success (save, publish, auth)
  - milestone: heavy impact (100/250/500/1000 words)
  - writingPulse: medium impact (periodic writing encouragement)
  - selection: selection feedback (toggles, text selection)
  - softTap: light impact (paragraph completion)
  - error: notification error (validation, network failures)
- **Sound design:** 5 warm, organic MP3 files (max 50KB each): open, save, publish, reaction, milestone
- **Accessibility:** All motion respects `useReducedMotion()`. When reduce-motion is on, spring animations become immediate values. Haptics still fire (haptics are not motion). Double-tap gestures fall back to visible buttons when VoiceOver is active.

## Interaction Principles (Benji Taylor / Honk Philosophy)
1. **Every tap has feedback** — haptic + visual response on every interactive element
2. **Living indicators over static labels** — save dots pulse, presence avatars enter sequentially
3. **Subtraction by default** — editor hides toolbar until needed; presence bar collapses when empty
4. **Presence as a feature** — "writing now" bar shows the community is alive
5. **Delight in the details** — double-tap hearts at tap coordinates, first-write celebrations, milestone haptics
6. **Physical > digital** — spring physics and haptics make the UI feel tangible, not flat

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-26 | Initial design system created | Created by /design-consultation based on competitive research + existing codebase |
| 2026-03-26 | Cream background (#FAF9F6) confirmed | Distinctive in the writing app space — no competitor uses it |
| 2026-03-26 | Gold accent (#C4943E) confirmed | Evokes luxury/warmth, differentiates from Substack orange / Medium green |
| 2026-03-26 | Benji Taylor motion language added | Spring physics + haptics + sound as core interaction layer |
| 2026-03-26 | Animation differentiation decided | Only FAB breathes continuously; all other elements have unique motion |
| 2026-03-26 | Auth screens unified | Both LoginScreen and SignUpScreen use same visual structure (Playfair brand + amber underline + Lora tagline) |
| 2026-03-27 | Story status tokens added | Sage/gold/terracotta replace Material Design green/blue/orange across StoryCard, StoryListItem, StoryDetailScreen, ProfileStoryCard |
| 2026-03-27 | Analytics colors warmed | Bright Tailwind dashboard colors (#EF4444, #3B82F6, etc.) replaced with muted warm tones (rose, slate, sage, clay) |
| 2026-03-27 | Profile customization constrained | Neon color picker (14 Tailwind + hue wheel) replaced with curated 8-color brand palette + 5 literary gradient presets |
| 2026-03-27 | Hardcoded values eliminated | ~40 files cleaned: fontWeight strings → fontFamily tokens, #f59e0b/#1A1612 → theme tokens |
| 2026-03-27 | textOnAccent token added | #1A1612 on amber/gold surfaces now uses semantic token instead of hardcoded hex |
| 2026-03-27 | Benji Taylor guardrails codified | Anti-patterns documented: no neon gradients, no dashboard colors, no over-animation, only FAB breathes |
