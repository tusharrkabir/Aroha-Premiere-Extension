# Aroha — UI Build Prompt Plan for Antigravity AI

Paste the prompt in the section below into Antigravity as-is. Everything above "THE PROMPT" is context for you, not for the AI.

---

## What you're actually asking Antigravity to build

Just the **front-end panel UI** (HTML/CSS/JS) — two visual states of one panel, matching your two screenshots. This does NOT include the yt-dlp/ffmpeg logic or the Premiere DOM insert calls we discussed earlier — that's separate, wire it in after the UI shell is done. Don't let Antigravity try to build the whole extension in one shot; scope it to UI only or you'll get a worse result on both halves.

## One fact that affects how this gets built

This will run inside **Adobe UXP**, not a browser. UXP does not support the full HTML/CSS spec — no arbitrary web APIs, and some effects (heavy `backdrop-filter`, certain gradients/animations) are unreliable or unsupported. `box-shadow`, `linear-gradient`, `clip-path`, and CSS variables are generally fine and are what you'll need for this look. Tell Antigravity to build it as **plain HTML/CSS/JS with no external CDN/font imports** (UXP plugins are offline — Google Fonts `@import` will silently fail). Bundle any font files locally instead.

---

## THE PROMPT (paste below into Antigravity)

```
Build a UI panel called "Aroha" — a dark, sci-fi/HUD-styled control panel for
downloading video/audio, meant to run inside Adobe UXP (a restricted,
offline HTML/CSS/JS environment, not a full browser — no external font or
CDN imports, no experimental CSS, keep effects to box-shadow, linear-gradient,
clip-path, and CSS custom properties only).

Build it as plain HTML + CSS + vanilla JS (index.html, styles.css, main.js).
No frameworks, no build step, no external network calls.

## Visual style
- Near-black background (#070a10), fixed panel size roughly 420px wide,
  auto height, rounded/chamfered (cut) corners on the outer frame using
  clip-path polygon — corners are angle-cut ~14px, not rounded.
- Accent color 1 (cyan): #33d6ff — used for the logo, section labels,
  input border, icon strokes, secondary elements.
- Accent color 2 (purple/violet gradient): linear-gradient(135deg, #7c3aed,
  #2563eb) with a faint magenta glow at the corners — used on the active
  "Video" toggle tab and the primary action button(s).
- Body text: #e5e7eb. Placeholder/dim text: #6b7280.
- Section labels ("QUALITY", "DOWNLOAD LOCATION") are small, uppercase,
  letter-spaced, cyan, followed by a short row of dots fading into a thin
  horizontal line.
- All bordered elements (input, tabs, dropdown, buttons) have the same
  chamfered-corner style as the outer panel, thin 1px cyan or gradient
  border, with a subtle outer glow (box-shadow with the border color at
  low opacity, ~8-12px blur).
- Font: a technical/geordi monospace-adjacent sans (system fallback stack:
  'Rajdhani', 'Chakra Petch', ui-sans-serif — bundle a local font file if
  available, do not use @import).

## Layout — Screen 1 (default state)
Top bar: "Aroha" logo top-left in cyan with a soft glow. Top-right: a
gear/settings icon and an X close icon, both cyan outline, separated by a
thin vertical divider.

Below that, a URL input row: full-width, chamfered border, a link/chain
icon on the left inside the field, placeholder text "Paste URL here or
search...", and two icons on the right inside the field — a "cut/scissors"
icon and a "paste/clipboard" icon (both trigger actions, no need to wire
real logic — just clickable elements with a data attribute like
data-action="scissors" / data-action="paste").

Below that, a two-tab toggle row, chamfered, full width, split evenly:
"Video" (camera icon) and "Audio" (music note icon). Whichever tab is
active gets the purple gradient fill and a small forward-leaning
parallelogram-style clipped edge on its right side, cutting slightly into
the inactive tab. Inactive tab is transparent with a thin cyan border.
Clicking a tab toggles the active state (JS class toggle).

Below that: label row "QUALITY" (with the dotted/line treatment described
above), then a dropdown-styled row below it: a small crosshair/target icon
on the left, text "Best available", and a chevron-down icon on the right.
Clicking it should toggle a simple open/closed state (visual only for now
— add 2-3 placeholder options like "Best available", "1080p", "720p",
"Audio only" that appear in a dropdown list styled consistently with the
panel when open).

Below that: label row "DOWNLOAD LOCATION", then a row with a folder icon,
text "Downloads", and a folder-with-icon button on the right edge to
"browse" (visual only, no real file picker needed unless you want to stub
window.showDirectoryPicker behind a try/catch).

Bottom: one large primary button spanning the full width, chamfered
corners, purple-to-blue gradient fill with a stronger corner glow than
other elements, a circular target/reticle icon with a down-arrow inside it
on the left, and the label "DOWNLOAD NOW" in bold, uppercase, wide
letter-spacing, white text.

## Layout — Screen 2 (post-download state)
Identical panel — same top bar, URL input, Video/Audio tabs, Quality row,
Download Location row. The ONLY difference: the single "DOWNLOAD NOW"
button at the bottom is replaced by TWO side-by-side buttons of equal
width, same chamfered style:
- Left button: "ADD TO TIMELINE" — purple gradient fill (this one is the
  visually "primary" of the two), icon above/beside the text is a small
  list/queue icon with a plus badge.
- Right button: "ADD TO PROJECT" — darker/transparent fill with cyan
  border only (secondary styling), icon is a folder with a plus badge.

## Interactivity to implement in main.js
- A single JS state variable (e.g. `appState = 'idle' | 'downloaded'`)
  that toggles which bottom section renders — Screen 1's single button vs
  Screen 2's two buttons. Wire the "DOWNLOAD NOW" button's click to flip
  this state (simulate — no real download logic needed here, this file is
  UI-only). Include a comment marking where real download-start logic and
  real "add to timeline / add to project" logic will be wired in later.
- Tab switching (Video/Audio) toggles active styling.
- Quality dropdown opens/closes on click, updates the displayed selected
  value on option click.
- Hover states on all buttons/icons: slightly brighter glow on hover,
  pressed/active state slightly dims the fill.
- Keep all interactive elements keyboard-accessible (real <button>
  elements, not divs with onclick, where possible).

## Deliverables
- index.html
- styles.css (use CSS custom properties at :root for all colors so theme
  is easy to retune later)
- main.js
- Inline SVG icons (not icon fonts, not external icon CDNs) for: link,
  scissors, clipboard, gear, close/X, video camera, music note, crosshair,
  chevron-down, folder, folder-plus, download-arrow-in-circle, list-plus

Do not add any UXP manifest.json or Premiere API code — this is a UI-only
build. Do not use any external CDN, Google Fonts, or network-fetched
assets.
```

---

## After Antigravity builds this

Two real gaps you'll need to close by hand (Antigravity won't know these, they're specific to your earlier architecture decisions):

1. **Font bundling** — if you gave it a specific font (Rajdhani/Chakra Petch), download the actual `.woff2` files and reference them with local `@font-face` — check what it actually did here, AI tools often still default to a CDN link out of habit.
2. **Wiring real state** — the `appState` toggle in the prompt is a stub. The real trigger for switching to Screen 2 is your native addon reporting "download complete" (from the C++/subprocess side we discussed), not a button click. You'll replace that fake trigger with a real event/callback once the download pipeline exists.
