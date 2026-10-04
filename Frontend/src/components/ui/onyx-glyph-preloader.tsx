"use client"

// Onyx Glyph Preloader — Cinematic 3D Loading Gate for SAMYAK 2026
// Five sandblasted titanium slabs orbit in 3D space, representing the festival's
// 5 arenas: Robotics, Hackathons, Management, Pro Shows, and Gaming.
// As progress climbs, each tile ignites with glowing SAMYAK crimson energy.
// At 100%, the tiles converge to the centre, the hero slab turns over in 3D
// revealing the official SAMYAK emblem, the wordmark racks into focus,
// and the camera flies through the gate into the experience.

import * as React from "react"

export interface OnyxGlyph {
  /** SVG path data, drawn in a 100 × 100 box. */
  d: string
  /** Stroke width in that box. If set, path is stroked; if omitted, path is filled. */
  stroke?: number
  /** Name read out as the tile lights. */
  label?: string
}

export interface OnyxPalette {
  /** Stage background. */
  stage: string
  /** Face colour where the key light lands. */
  metal: string
  /** Face colour on the far side. */
  shade: string
  /** Edge highlight down the tile's thickness. */
  rim: string
  /** Glitter specks and ambient spark. */
  glitter: string
  /** HUD and wordmark. */
  ink: string
}

export interface OnyxGlyphPreloaderProps {
  /** Content revealed once the gate lifts. Ignored while `loop` is set. */
  children?: React.ReactNode
  /** Run forever as a showcase: children are never revealed, onComplete never fires. */
  loop?: boolean
  /** Real loading progress, 0–100. */
  progress?: number
  /** Length of the simulated load in ms. Defaults to 1900ms. */
  durationMs?: number
  /** Forge / convergence phase duration in ms. Defaults to 800ms. */
  forgeDurationMs?: number
  /** Hold / reveal phase duration in ms. Defaults to 700ms. */
  holdDurationMs?: number
  /** Lift gate / camera flythrough phase duration in ms. Defaults to 500ms. */
  liftDurationMs?: number
  /** The orbiting tiles, one per glyph. */
  glyphs?: OnyxGlyph[]
  /** The hero tile's mark. */
  mark?: OnyxGlyph
  /** Optional logo image URL rendered on the hero tile. */
  logoSrc?: string
  /** "cut" punches the mark through the tile; "deboss" presses it in like the rest. */
  markStyle?: "cut" | "deboss"
  /** Wordmark set under the hero tile. */
  word?: string
  /** Line under the wordmark. */
  caption?: string
  /** Colour overrides, merged over the defaults. */
  palette?: Partial<OnyxPalette>
  /** Glitter density multiplier. */
  glitter?: number
  /** Tile thickness as a fraction of its width. Defaults to 0.12. */
  depth?: number
  /** Seconds per orbit. Defaults to 38. */
  spin?: number
  /** Letterbox bars with the status read-out and progress track. Defaults to true. */
  hud?: boolean
  /** Face for the wordmark and HUD. */
  fontFamily?: string
  /** Root height. A definite length. */
  height?: string
  /** Fired once, after the gate has lifted. */
  onComplete?: () => void
  /** Extra root class names. */
  className?: string
}

// SAMYAK Signature Theme Palette: Sandblasted titanium slate with warm ruby undertones
export const DEFAULT_PALETTE: OnyxPalette = {
  stage: "#030303",
  metal: "#3d3034",
  shade: "#1a1215",
  rim: "#DF2531",
  glitter: "#ff707b",
  ink: "#ffffff",
}

// 5 Flagship Pillars of SAMYAK: Robotics, Hackathons, Management, Pro Shows, Gaming
export const DEFAULT_GLYPHS: OnyxGlyph[] = [
  // Robotics / Circuit AI Hexagon Core
  {
    d: "M50 15 L80 32 V68 L50 85 L20 68 V32 Z M50 32 L68 42 V58 L50 68 L32 58 V42 Z M50 44 A6 6 0 1 1 49.9 44",
    stroke: 5,
    label: "Robotics",
  },
  // Hackathons / Code Terminal Brackets & Slash
  {
    d: "M34 28 L16 50 L34 72 M66 28 L84 50 L66 72 M58 20 L42 80",
    stroke: 7,
    label: "Hackathons",
  },
  // Management / Executive Apex Crown
  {
    d: "M18 72 L26 32 L50 52 L74 32 L82 72 Z M18 78 H82",
    stroke: 6,
    label: "Management",
  },
  // Pro Shows / Cosmic Energy Flame
  {
    d: "M50 12 C56 34 74 44 74 64 C74 78 63 88 50 88 C37 88 26 78 26 64 C26 44 44 34 50 12 Z M50 46 C53 54 60 58 60 66 C60 72 55 76 50 76 C45 76 40 72 40 66 C40 58 47 54 50 46 Z",
    label: "Pro Shows",
  },
  // Gaming / Cyber Console Controller
  {
    d: "M26 34 H74 C82 34 90 44 86 64 L80 76 C76 82 68 80 64 72 L58 60 H42 L36 72 C32 80 24 82 20 76 L14 64 C10 44 18 34 26 34 Z M32 47 H42 M37 42 V52 M66 45 A2.5 2.5 0 1 1 65.9 45 M72 52 A2.5 2.5 0 1 1 71.9 52",
    stroke: 5.5,
    label: "Gaming",
  },
]

// Stylized SAMYAK Insignia Hero Mark
export const DEFAULT_MARK: OnyxGlyph = {
  d: "M50 10 L82 24 V48 C82 70 68 84 50 90 C32 84 18 70 18 48 V24 Z M34 50 L46 62 L70 38",
  stroke: 7.5,
  label: "SAMYAK",
}

const DISPLAY_STACK = '"Barlow Condensed", "Inter Tight", "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif'
const MONO_STACK = '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace'

// Per-tile resting 3D tilt [rotateX, rotateY, rotateZ]
const TILTS = [
  [18, -24, -12],
  [-12, 28, 9],
  [22, 16, -4],
  [-20, -18, 14],
  [12, 24, -16],
]

// Ambient spotlight dust particles: [left %, top %, size px, duration s, delay s]
const DUST = [
  [22, 64, 2, 11, -2],
  [31, 38, 1.5, 14, -8],
  [44, 72, 2.5, 13, -3],
  [52, 30, 1.5, 16, -10],
  [61, 58, 2, 12, -6],
  [70, 42, 1.5, 15, -1],
  [77, 68, 2, 16, -12],
  [38, 52, 1, 10, -4],
  [57, 80, 1.5, 17, -9],
  [66, 24, 1, 13, -2],
  [27, 28, 1, 18, -14],
  [48, 46, 1, 11, -7],
]

const clamp01 = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x)

// Continuous cubic ease-in-out curve for buttery smooth progression
export function ogpSimulated(t: number) {
  const c = clamp01(t)
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2
}

// How far tile i of n has ignited at progress p
export function ogpLit(p: number, i: number, n: number) {
  return clamp01(clamp01(p) * n - i)
}

// Tiles fully lit at progress p
export function ogpCount(p: number, n: number) {
  return Math.min(n, Math.floor(clamp01(p) * n + 1e-9))
}

// Unit-circle slot position (clockwise, starting 12 o'clock)
export function ogpSlot(i: number, n: number) {
  const a = ((-90 + (360 / n) * i) * Math.PI) / 180
  return { x: Math.round(Math.cos(a) * 1e4) / 1e4, y: Math.round(Math.sin(a) * 1e4) / 1e4 }
}

// Fast procedural noise generator for lightweight metallic shimmer
function makeNoiseDataUrl() {
  if (typeof document === "undefined") return "none"
  try {
    const c = document.createElement("canvas")
    c.width = 64
    c.height = 64
    const g = c.getContext("2d")
    if (!g) return "none"
    const img = g.createImageData(64, 64)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255)
      img.data[i] = v
      img.data[i + 1] = v
      img.data[i + 2] = v
      img.data[i + 3] = 22
    }
    g.putImageData(img, 0, 0)
    return `url("${c.toDataURL("image/png")}")`
  } catch {
    return "none"
  }
}

// ---- styles -------------------------------------------------------------------

const OGP_CSS = `
.ogp-root {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: var(--ogp-stage);
  color: var(--ogp-ink);
  font-family: var(--ogp-display);
  --ogp-t: calc(var(--ogp-u) * 0.21);
  --ogp-r: calc(var(--ogp-u) * 0.26);
  --ogp-h: calc(var(--ogp-u) * 0.36);
  --ogp-bar: max(40px, calc(var(--ogp-u) * 0.088));
  -webkit-tap-highlight-color: transparent;
}
.ogp-gate *, .ogp-gate *::before, .ogp-gate *::after { box-sizing: border-box; }
.ogp-dest {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.8s ease 0.2s;
}
.ogp-dest[data-active="true"] { opacity: 1; pointer-events: auto; }

.ogp-gate {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: var(--ogp-stage);
  cursor: pointer;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
  transition: opacity 0.65s cubic-bezier(0.7, 0, 0.3, 1) 0.1s;
}
.ogp-root[data-phase="lift"] .ogp-gate { opacity: 0; pointer-events: none; }

/* ---- Ambient Lighting & Cyber Cones ---- */
.ogp-spot {
  position: absolute;
  inset: -20%;
  pointer-events: none;
  background: radial-gradient(
    closest-side at calc(50% + var(--ogp-mx) * 5%) calc(46% + var(--ogp-my) * 5%),
    rgba(223, 37, 49, 0.22),
    rgba(255, 255, 255, 0.04) 50%,
    transparent 100%
  );
  opacity: 0;
  animation: ogp-fade-in 1.4s ease 0.1s forwards;
}
.ogp-cone {
  position: absolute;
  left: 50%;
  top: -10%;
  width: calc(var(--ogp-u) * 1.15);
  height: 75%;
  transform: translateX(-50%);
  pointer-events: none;
  background: conic-gradient(from 180deg at 50% 0%, transparent 162deg, rgba(223, 37, 49, 0.14) 180deg, transparent 198deg);
  filter: blur(16px);
  opacity: 0;
  transition: opacity 1s ease;
}
.ogp-root[data-phase="forge"] .ogp-cone, .ogp-root[data-phase="reveal"] .ogp-cone { opacity: 1; }
.ogp-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at 50% 46%, transparent 35%, rgba(0, 0, 0, 0.92) 100%);
}
.ogp-grain {
  position: absolute;
  inset: -50%;
  pointer-events: none;
  opacity: 0.3;
  mix-blend-mode: overlay;
  background-image: var(--ogp-grain);
  background-size: 64px 64px;
}
.ogp-dust { position: absolute; inset: 0; pointer-events: none; }
.ogp-mote {
  position: absolute;
  border-radius: 50%;
  background: var(--ogp-glitter);
  box-shadow: 0 0 6px rgba(223, 37, 49, 0.9);
  opacity: 0;
  animation: ogp-drift linear infinite;
}

/* ---- 3D Camera Rig ---- */
.ogp-cam {
  position: absolute;
  inset: 0;
  perspective: calc(var(--ogp-u) * 2.2);
  perspective-origin: 50% 48%;
}
.ogp-rig {
  position: absolute;
  left: 50%;
  top: 48%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  transform: rotateX(calc(var(--ogp-my) * -11deg)) rotateY(calc(var(--ogp-mx) * 14deg));
}
.ogp-ring {
  position: absolute;
  transform-style: preserve-3d;
  animation: ogp-spin var(--ogp-spin) linear infinite;
}
.ogp-slot {
  position: absolute;
  left: calc(var(--ogp-t) * -0.5);
  top: calc(var(--ogp-t) * -0.5);
  width: var(--ogp-t);
  height: var(--ogp-t);
  transform-style: preserve-3d;
  transform: translate3d(calc(var(--x) * var(--ogp-r)), calc(var(--y) * var(--ogp-r)), 0);
  transition: transform 0.85s cubic-bezier(0.65, 0, 0.25, 1);
  transition-delay: calc(var(--i) * 45ms);
}
.ogp-root[data-phase="forge"] .ogp-slot,
.ogp-root[data-phase="reveal"] .ogp-slot,
.ogp-root[data-phase="lift"] .ogp-slot {
  transform: translate3d(0, 0, calc(var(--ogp-u) * -0.12)) rotateZ(180deg) scale(0.55);
}
.ogp-counter, .ogp-bob, .ogp-tile, .ogp-hero, .ogp-hero-turn, .ogp-hero-bob {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}
.ogp-counter { animation: ogp-spin var(--ogp-spin) linear infinite reverse; }
.ogp-bob { animation: ogp-bob 5.5s ease-in-out infinite alternate; }
.ogp-tile {
  --ogp-hz: 0;
  transform: translateZ(calc(var(--ogp-hz) * var(--ogp-t) * 0.28))
    rotateX(calc(var(--rx) * (1 - var(--ogp-hz) * 0.7)))
    rotateY(calc(var(--ry) * (1 - var(--ogp-hz) * 0.7)))
    rotateZ(var(--rz));
  transition: transform 0.5s cubic-bezier(0.2, 0.9, 0.25, 1.15);
}
.ogp-tile:hover { --ogp-hz: 1; }

/* ---- 3D Slab Slices & High-Tech Metallic Finish ---- */
.ogp-layer, .ogp-face {
  position: absolute;
  inset: 0;
  border-radius: 22%;
}
.ogp-layer {
  transform: translateZ(calc(var(--ogp-t) * var(--ogp-depth) * var(--k) * -1));
  background: linear-gradient(215deg, #4f252c 0%, #1e0c10 40%, #301017 65%, var(--ogp-rim) 100%);
  box-shadow: 0 0 12px rgba(223, 37, 49, 0.25);
}
.ogp-hero .ogp-layer {
  transform: translateZ(calc(var(--ogp-h) * var(--ogp-depth) * var(--k) * -1));
  background: linear-gradient(215deg, #6b222d 0%, #200a0e 40%, #421019 65%, #ff2a3b 100%);
}
.ogp-face {
  overflow: hidden;
  background-color: #24171a;
  background-image: linear-gradient(135deg, #4a383d 0%, #2b1c20 45%, #180e11 100%);
  border: 1px solid rgba(223, 37, 49, calc(0.35 + var(--ogp-lit) * 0.65));
  box-shadow:
    inset 0 1px 2px rgba(255, 255, 255, 0.3),
    inset 0 -2px 6px rgba(0, 0, 0, 0.8),
    0 0 25px rgba(223, 37, 49, calc(0.15 + var(--ogp-lit) * 0.5));
  filter: brightness(calc(0.95 + var(--ogp-lit) * 0.35));
}
.ogp-sheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: screen;
  background: radial-gradient(
    circle at calc(30% - var(--ogp-mx) * 28%) calc(24% - var(--ogp-my) * 28%),
    rgba(255, 255, 255, 0.35),
    rgba(223, 37, 49, 0.15) 40%,
    transparent 65%
  );
  opacity: calc(0.4 + var(--ogp-lit) * 0.55);
}
.ogp-sweep {
  position: absolute;
  inset: -40%;
  pointer-events: none;
  mix-blend-mode: screen;
  background: linear-gradient(115deg, transparent 40%, rgba(255, 255, 255, 0.4) 50%, transparent 60%);
  transform: translateX(-70%);
  opacity: 0;
}
.ogp-tile[data-lit="1"] .ogp-sweep { animation: ogp-sweep 0.9s cubic-bezier(0.3, 0, 0.2, 1) forwards; }
.ogp-tile:hover .ogp-sweep { animation: ogp-sweep 0.8s cubic-bezier(0.3, 0, 0.2, 1) forwards; }

/* ---- Vector Debossed Glyphs (Crisp, High-DPI, Illuminated) ---- */
.ogp-glyph-wrap {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.ogp-glyph-svg {
  width: 58%;
  height: 58%;
  color: #e5a7ad;
  filter: drop-shadow(0 -1px 1px rgba(0, 0, 0, 0.95)) drop-shadow(0 1px 2px rgba(223, 37, 49, 0.8));
  transition: color 0.35s ease, filter 0.35s ease, transform 0.35s ease;
}
.ogp-tile[data-lit="1"] .ogp-glyph-svg {
  color: #ffffff;
  filter: drop-shadow(0 0 10px #DF2531) drop-shadow(0 0 20px #DF2531);
  transform: scale(1.04);
}

.ogp-leaf { animation: ogp-rack 1s cubic-bezier(0.2, 0.7, 0.2, 1) backwards; animation-delay: calc(0.08s + var(--i) * 0.07s); }
.ogp-slot .ogp-leaf { transition: opacity 0.5s ease; }
.ogp-root[data-phase="forge"] .ogp-slot .ogp-leaf,
.ogp-root[data-phase="reveal"] .ogp-slot .ogp-leaf,
.ogp-root[data-phase="lift"] .ogp-slot .ogp-leaf {
  opacity: 0;
  transition-delay: calc(0.45s + var(--i) * 40ms);
}

/* ---- Central Hero Tile & Turnover ---- */
.ogp-hero {
  left: calc(var(--ogp-h) * -0.5);
  top: calc(var(--ogp-h) * -0.5);
  right: auto;
  bottom: auto;
  width: var(--ogp-h);
  height: var(--ogp-h);
  transform: translateZ(calc(var(--ogp-u) * -0.5)) scale(0.4);
  transition: transform 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.35s;
  pointer-events: none;
}
.ogp-hero .ogp-leaf { animation: none; opacity: 0; transition: opacity 0.5s ease 0.4s; }
.ogp-hero-turn {
  transform: rotateY(-180deg) rotateZ(-30deg);
  transition: transform 1.4s cubic-bezier(0.22, 1, 0.36, 1) 0.4s;
}
.ogp-hero-bob { animation: ogp-bob 6s ease-in-out infinite alternate; }
.ogp-root[data-phase="reveal"] .ogp-hero, .ogp-root[data-phase="forge"] .ogp-hero {
  transform: translateZ(0) scale(1);
  pointer-events: auto;
}
.ogp-root[data-phase="reveal"] .ogp-hero-turn, .ogp-root[data-phase="forge"] .ogp-hero-turn { transform: rotateX(14deg) rotateY(-20deg) rotateZ(-4deg); }
.ogp-root[data-phase="reveal"] .ogp-hero .ogp-leaf,
.ogp-root[data-phase="forge"] .ogp-hero .ogp-leaf,
.ogp-root[data-phase="lift"] .ogp-hero .ogp-leaf { opacity: 1; }
.ogp-root[data-phase="lift"] .ogp-hero {
  transform: translateZ(calc(var(--ogp-u) * 1.6)) scale(1.3);
  transition: transform 0.8s cubic-bezier(0.7, 0, 0.84, 0);
}
.ogp-root[data-phase="lift"] .ogp-hero-turn { transform: rotateX(14deg) rotateY(-20deg) rotateZ(-4deg); transition: none; }
.ogp-face-front { transform: translateZ(0.5px); backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.ogp-face-back {
  transform: translateZ(calc(var(--ogp-h) * var(--ogp-depth) * -1 - 0.5px)) rotateY(180deg);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background-image: linear-gradient(135deg, #3d2b2f 0%, #1f1114 100%);
}
.ogp-root[data-phase="reveal"] .ogp-hero .ogp-sweep { animation: ogp-sweep 1.2s cubic-bezier(0.3, 0, 0.2, 1) 0.2s forwards; }
.ogp-hero .ogp-tile:hover .ogp-sweep { animation: ogp-sweep 0.9s cubic-bezier(0.3, 0, 0.2, 1) forwards; }
.ogp-hero .ogp-tile { --ogp-lit: 1; transform: none; }
.ogp-hero .ogp-tile:hover { transform: translateZ(calc(var(--ogp-h) * 0.12)); }

.ogp-flash {
  position: absolute;
  left: 50%;
  top: 48%;
  width: calc(var(--ogp-u) * 0.9);
  height: calc(var(--ogp-u) * 0.9);
  margin: calc(var(--ogp-u) * -0.45) 0 0 calc(var(--ogp-u) * -0.45);
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(closest-side, rgba(223, 37, 49, 0.5), rgba(255, 255, 255, 0.1) 45%, transparent);
  opacity: 0;
  transform: scale(0.3);
}
.ogp-root[data-phase="forge"] .ogp-flash { animation: ogp-flash 1.2s cubic-bezier(0.2, 0.7, 0.2, 1) 0.5s both; }

/* ---- SAMYAK Wordmark & Headline Typography ---- */
.ogp-title {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(48% + var(--ogp-h) * 0.5 + var(--ogp-u) * 0.075);
  text-align: center;
  pointer-events: none;
}
.ogp-word {
  display: inline-block;
  margin: 0;
  font-size: max(26px, calc(var(--ogp-u) * 0.072));
  font-weight: 900;
  letter-spacing: 0.42em;
  text-indent: 0.42em;
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}
.ogp-letter {
  display: inline-block;
  color: transparent;
  background: linear-gradient(180deg, #ffffff 10%, #fca5a5 50%, #DF2531 100%);
  -webkit-background-clip: text;
  background-clip: text;
  opacity: 0;
  filter: blur(10px);
  transform: translateY(0.25em);
}
.ogp-root[data-phase="reveal"] .ogp-letter, .ogp-root[data-phase="lift"] .ogp-letter {
  animation: ogp-letter 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}
.ogp-caption {
  margin: calc(var(--ogp-u) * 0.024) 0 0;
  font-family: var(--ogp-mono);
  font-size: max(10px, calc(var(--ogp-u) * 0.016));
  letter-spacing: 0.32em;
  text-transform: uppercase;
  color: #ff6b75;
  opacity: 0;
  transition: opacity 0.8s ease 0.5s, letter-spacing 1.2s cubic-bezier(0.2, 0.7, 0.2, 1) 0.5s;
}
.ogp-root[data-phase="reveal"] .ogp-caption { opacity: 1; letter-spacing: 0.44em; }

/* ---- HUD Letterbox Bars & Progress Tracker ---- */
.ogp-bar {
  position: absolute;
  left: 0;
  right: 0;
  height: var(--ogp-bar);
  z-index: 52;
  background: #000000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 clamp(16px, 4vw, 44px);
  font-family: var(--ogp-mono);
  font-size: max(9px, calc(var(--ogp-u) * 0.0145));
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: #8c8c94;
  white-space: nowrap;
  transition: transform 0.8s cubic-bezier(0.7, 0, 0.3, 1);
}
.ogp-bar-top { top: 0; transform: translateY(-100%); animation: ogp-bar-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards; border-bottom: 1px solid rgba(223, 37, 49, 0.28); }
.ogp-bar-bot { bottom: 0; transform: translateY(100%); animation: ogp-bar-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards; border-top: 1px solid rgba(223, 37, 49, 0.28); }
.ogp-root[data-phase="lift"] .ogp-bar-top { animation: none; transform: translateY(-100%); }
.ogp-root[data-phase="lift"] .ogp-bar-bot { animation: none; transform: translateY(100%); }
.ogp-bar b { font-weight: 600; color: #ffffff; }
.ogp-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 10px;
  border-radius: 50%;
  background: #DF2531;
  box-shadow: 0 0 8px #DF2531;
  vertical-align: 1px;
  animation: ogp-blink 1.2s steps(2) infinite;
}
.ogp-root[data-phase="reveal"] .ogp-dot { animation: none; background: #DF2531; box-shadow: 0 0 12px #DF2531; }
.ogp-track {
  position: relative;
  flex: 1;
  max-width: 420px;
  height: 3px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 3px;
}
.ogp-fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #991b1b, #DF2531, #fca5a5);
  transform-origin: 0 50%;
  transform: scaleX(var(--ogp-p));
  box-shadow: 0 0 12px rgba(223, 37, 49, 0.9);
  border-radius: 3px;
}
.ogp-ticks { position: absolute; inset: -3px 0; display: flex; justify-content: space-between; }
.ogp-ticks i { width: 1px; height: 9px; background: rgba(223, 37, 49, 0.45); }
.ogp-pct { min-width: 4.6em; text-align: right; font-variant-numeric: tabular-nums; }
.ogp-pct b { font-size: 1.5em; letter-spacing: 0.08em; color: #ff4d5a; text-shadow: 0 0 10px rgba(223, 37, 49, 0.6); }
.ogp-hide-sm { display: inline; }
.ogp-hint { animation: ogp-blink 1.4s ease-in-out infinite; color: #ff6b75; font-weight: 600; }
.ogp-frame { position: absolute; inset: 0; pointer-events: none; }
.ogp-veil {
  position: absolute;
  inset: 0;
  z-index: 55;
  background: var(--ogp-stage);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s ease;
}
.ogp-veil[data-on="true"] { opacity: 1; }
.ogp-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@keyframes ogp-spin { to { transform: rotateZ(360deg); } }
@keyframes ogp-bob {
  from { transform: translate3d(0, calc(var(--ogp-u) * -0.008), calc(var(--ogp-u) * -0.012)); }
  to { transform: translate3d(0, calc(var(--ogp-u) * 0.008), calc(var(--ogp-u) * 0.02)); }
}
@keyframes ogp-rack {
  from { opacity: 0; filter: blur(14px) brightness(0.2); }
}
@keyframes ogp-sweep {
  0% { transform: translateX(-70%); opacity: 1; }
  100% { transform: translateX(70%); opacity: 1; }
}
@keyframes ogp-flash {
  0% { opacity: 0; transform: scale(0.3); }
  35% { opacity: 1; }
  100% { opacity: 0; transform: scale(1.4); }
}
@keyframes ogp-letter { to { opacity: 1; filter: blur(0); transform: none; } }
@keyframes ogp-bar-in { to { transform: none; } }
@keyframes ogp-blink { 50% { opacity: 0.35; } }
@keyframes ogp-fade-in { to { opacity: 1; } }
@keyframes ogp-drift {
  0% { opacity: 0; transform: translate3d(0, 0, 0); }
  20% { opacity: 0.8; }
  80% { opacity: 0.5; }
  100% { opacity: 0; transform: translate3d(calc(var(--ogp-u) * 0.05), calc(var(--ogp-u) * -0.22), 0); }
}

.ogp-root svg, .ogp-root canvas, .ogp-root img { max-width: none; }

@media (max-width: 520px) {
  .ogp-hide-sm { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .ogp-ring, .ogp-counter, .ogp-bob, .ogp-hero-bob { animation: none; }
  .ogp-dust { display: none; }
  .ogp-leaf { animation: none; }
  .ogp-sweep { display: none; }
  .ogp-flash { display: none; }
  .ogp-slot { transition: none; }
  .ogp-hero, .ogp-hero-turn { transition: opacity 0.4s ease; }
  .ogp-hero-turn { transform: none; }
  .ogp-root[data-phase="lift"] .ogp-hero { transform: translateZ(0) scale(1); transition: none; }
  .ogp-letter { filter: none; transform: none; }
  .ogp-root[data-phase="reveal"] .ogp-letter, .ogp-root[data-phase="lift"] .ogp-letter { animation: none; opacity: 1; }
  .ogp-tile { transition: none; }
}
`

// ---- component ----------------------------------------------------------------

type Phase = "load" | "forge" | "reveal" | "lift" | "done"

const REWIND_MS = 600
const LAYERS = 9
const HERO_LAYERS = 14

function Slab({
  layers,
  back,
  children,
}: {
  layers: number
  back?: boolean
  children?: React.ReactNode
}) {
  return (
    <>
      {Array.from({ length: layers }, (_, k) => (
        <span
          key={k}
          className="ogp-layer ogp-leaf"
          style={{ "--k": ((k + 1) / layers).toFixed(3) } as React.CSSProperties}
        />
      ))}
      {back ? <span className="ogp-face ogp-face-back ogp-leaf" /> : null}
      <span className={"ogp-face ogp-leaf" + (back ? " ogp-face-front" : "")}>
        <div className="ogp-sheen" />
        <div className="ogp-sweep" />
        {children}
      </span>
    </>
  )
}

export default function OnyxGlyphPreloader({
  children,
  loop = false,
  progress,
  durationMs = 1900,
  forgeDurationMs = 800,
  holdDurationMs = 700,
  liftDurationMs = 500,
  glyphs = DEFAULT_GLYPHS,
  mark = DEFAULT_MARK,
  logoSrc = "/samyak-logo.png",
  word = "SAMYAK",
  caption = "KL DEEMED TO BE UNIVERSITY • 2026",
  palette,
  depth = 0.14,
  spin = 38,
  hud = true,
  fontFamily = DISPLAY_STACK,
  height = "100svh",
  onComplete,
  className = "",
}: OnyxGlyphPreloaderProps) {
  const [phase, setPhase] = React.useState<Phase>("load")
  const [pct, setPct] = React.useState(0)
  const [litCount, setLitCount] = React.useState(0)
  const [cycle, setCycle] = React.useState(0)
  const [veil, setVeil] = React.useState(false)
  const [unit, setUnit] = React.useState(640)
  const [noiseUrl, setNoiseUrl] = React.useState("none")

  const rootRef = React.useRef<HTMLDivElement>(null)
  const pctElRef = React.useRef<HTMLElement>(null)
  const tileRefs = React.useRef<(HTMLDivElement | null)[]>([])
  const pointerRef = React.useRef<{ x: number; y: number } | null>(null)
  const rushRef = React.useRef(false)
  const progressRef = React.useRef(progress)
  const onCompleteRef = React.useRef(onComplete)

  React.useEffect(() => {
    progressRef.current = progress
    onCompleteRef.current = onComplete
  }, [progress, onComplete])

  const colors = { ...DEFAULT_PALETTE, ...palette }
  const n = Math.max(1, glyphs.length)
  const current = glyphs[Math.min(n - 1, litCount)]

  // Fast background grain (generated once)
  React.useEffect(() => {
    setNoiseUrl(makeNoiseDataUrl())
  }, [])

  // Dynamic viewport unit calculation
  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const measure = () => {
      const r = root.getBoundingClientRect()
      const u = Math.min(r.width, r.height)
      if (u > 0) setUnit(Math.round(u))
    }
    measure()
    if (typeof ResizeObserver === "undefined") return
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    return () => ro.disconnect()
  }, [])

  // Ambient fluid spotlight wander
  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const still = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    let x = 0
    let y = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const ptr = pointerRef.current
      let tx = 0
      let ty = 0
      if (ptr) {
        tx = ptr.x
        ty = ptr.y
      } else if (!still) {
        const s = (now - t0) / 1000
        tx = Math.sin(s * 0.45) * 0.5
        ty = Math.sin(s * 0.31 + 1.2) * 0.32
      }
      x += (tx - x) * 0.08
      y += (ty - y) * 0.08
      root.style.setProperty("--ogp-mx", x.toFixed(4))
      root.style.setProperty("--ogp-my", y.toFixed(4))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Buttery 60–120 FPS frame-by-frame progress loop
  React.useEffect(() => {
    if (phase !== "load") return
    const root = rootRef.current
    let raf = 0
    const start = performance.now()
    let lastPct = -1
    let lastLit = -1
    rushRef.current = false

    const paint = (p: number) => {
      root?.style.setProperty("--ogp-p", p.toFixed(4))
      tileRefs.current.forEach((el, i) => {
        if (!el) return
        const v = ogpLit(p, i, n)
        el.style.setProperty("--ogp-lit", (1 - Math.pow(1 - v, 2)).toFixed(3))
        el.dataset.lit = v >= 1 ? "1" : "0"
      })
      const next = Math.min(100, Math.round(p * 100))
      if (pctElRef.current) {
        pctElRef.current.textContent = String(next).padStart(3, "0")
      }
      const curLit = ogpCount(p, n)
      if (curLit !== lastLit) {
        lastLit = curLit
        setLitCount(curLit)
      }
      if (next !== lastPct) {
        lastPct = next
        setPct(next)
      }
    }

    const tick = (now: number) => {
      const external = progressRef.current
      let pVal = 0
      if (rushRef.current) {
        pVal = 1
      } else if (external !== undefined) {
        pVal = clamp01(external / 100)
      } else {
        const rawTime = (now - start) / Math.max(300, durationMs)
        pVal = ogpSimulated(rawTime)
      }

      paint(pVal)
      if (pVal >= 1) {
        setPhase("forge")
        return
      }
      raf = requestAnimationFrame(tick)
    }
    paint(0)
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, cycle, durationMs, n])

  // Sequence timings (calibrated for exactly ~3.8–4.0s total)
  React.useEffect(() => {
    if (phase === "forge") {
      const t = setTimeout(() => setPhase("reveal"), forgeDurationMs)
      return () => clearTimeout(t)
    }
    if (phase === "reveal") {
      const t = setTimeout(() => {
        if (loop) setVeil(true)
        else setPhase("lift")
      }, holdDurationMs)
      return () => clearTimeout(t)
    }
    if (phase === "lift") {
      const t = setTimeout(() => {
        setPhase("done")
        onCompleteRef.current?.()
      }, liftDurationMs)
      return () => clearTimeout(t)
    }
  }, [phase, loop, forgeDurationMs, holdDurationMs, liftDurationMs])

  // Veil loop reset
  React.useEffect(() => {
    if (!veil) return
    const t = setTimeout(() => {
      setPct(0)
      setLitCount(0)
      setPhase("load")
      setCycle((c) => c + 1)
      setVeil(false)
    }, REWIND_MS)
    return () => clearTimeout(t)
  }, [veil])

  const onActivate = () => {
    if (veil) return
    if (phase === "load") rushRef.current = true
    else if (phase === "forge") setPhase("reveal")
    else if (phase === "reveal") {
      if (loop) setVeil(true)
      else setPhase("lift")
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const root = rootRef.current
    if (!root || e.pointerType === "touch") return
    const r = root.getBoundingClientRect()
    pointerRef.current = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 }
  }
  const onPointerLeave = () => {
    pointerRef.current = null
  }

  const loading = phase === "load"
  const status = loading ? "Assembling Arenas" : phase === "forge" ? "Forging Hero" : "Security Verified"
  const hint = loop ? "Click to replay" : "Click to enter"

  return (
    <div
      ref={rootRef}
      className={"ogp-root " + className}
      data-phase={phase}
      style={
        {
          height,
          "--ogp-u": unit + "px",
          "--ogp-mx": 0,
          "--ogp-my": 0,
          "--ogp-p": 0,
          "--ogp-lit": 0,
          "--ogp-spin": Math.max(4, spin) + "s",
          "--ogp-depth": Math.max(0, depth),
          "--ogp-stage": colors.stage,
          "--ogp-metal": colors.metal,
          "--ogp-shade": colors.shade,
          "--ogp-rim": colors.rim,
          "--ogp-glitter": colors.glitter,
          "--ogp-ink": colors.ink,
          "--ogp-display": fontFamily,
          "--ogp-mono": MONO_STACK,
          "--ogp-grain": noiseUrl,
        } as React.CSSProperties
      }
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <style>{OGP_CSS}</style>

      {!loop && children ? (
        <div className="ogp-dest" data-active={phase === "done"} aria-hidden={phase !== "done"}>
          {children}
        </div>
      ) : null}

      {phase !== "done" ? (
        <div
          className="ogp-gate"
          role="progressbar"
          aria-label={word + " is loading"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={loading ? pct + "%" : "Loaded. Press Enter to continue."}
          tabIndex={0}
          onClick={onActivate}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onActivate()
            }
          }}
        >
          <div className="ogp-spot" />
          <div className="ogp-cone" />
          <div className="ogp-dust" aria-hidden="true">
            {DUST.map(([left, top, size, dur, delay], i) => (
              <span
                key={i}
                className="ogp-mote"
                style={{ left: left + "%", top: top + "%", width: size, height: size, animationDuration: dur + "s", animationDelay: delay + "s" }}
              />
            ))}
          </div>
          <div className="ogp-flash" />

          <div className="ogp-cam" key={cycle} aria-hidden="true">
            <div className="ogp-rig">
              {/* Orbiting Slabs */}
              <div className="ogp-ring">
                {glyphs.map((g, i) => {
                  const { x, y } = ogpSlot(i, n)
                  const [rx, ry, rz] = TILTS[i % TILTS.length]
                  return (
                    <div key={i} className="ogp-slot" style={{ "--x": x, "--y": y, "--i": i } as React.CSSProperties}>
                      <div className="ogp-counter">
                        <div className="ogp-bob" style={{ animationDelay: -i * 1.3 + "s", animationDuration: 4.6 + (i % 3) * 0.9 + "s" }}>
                          <div
                            ref={(el) => {
                              tileRefs.current[i] = el
                            }}
                            className="ogp-tile"
                            title={g.label}
                            style={
                              {
                                "--rx": rx + "deg",
                                "--ry": ry + "deg",
                                "--rz": rz + "deg",
                              } as React.CSSProperties
                            }
                          >
                            <Slab layers={LAYERS}>
                              <div className="ogp-glyph-wrap">
                                <svg viewBox="0 0 100 100" className="ogp-glyph-svg">
                                  <path
                                    d={g.d}
                                    fill={g.stroke ? "none" : "currentColor"}
                                    stroke={g.stroke ? "currentColor" : "none"}
                                    strokeWidth={g.stroke || 0}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              </div>
                            </Slab>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Central Hero Tile */}
              <div className="ogp-hero">
                <div className="ogp-hero-bob">
                  <div className="ogp-hero-turn">
                    <div className="ogp-tile">
                      <Slab layers={HERO_LAYERS} back={true}>
                        <div className="ogp-glyph-wrap">
                          {logoSrc ? (
                            <img
                              src={logoSrc}
                              alt={word}
                              style={{
                                width: "62%",
                                height: "62%",
                                objectFit: "contain",
                                filter:
                                  "drop-shadow(0 0 16px #DF2531) drop-shadow(0 0 32px rgba(223,37,49,0.8))",
                              }}
                            />
                          ) : (
                            <svg viewBox="0 0 100 100" className="ogp-glyph-svg" style={{ color: "#ffffff", filter: "drop-shadow(0 0 12px #DF2531)" }}>
                              <path
                                d={mark.d}
                                fill={mark.stroke ? "none" : "currentColor"}
                                stroke={mark.stroke ? "currentColor" : "none"}
                                strokeWidth={mark.stroke || 0}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                      </Slab>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SAMYAK Wordmark & Subtitle */}
          <div className="ogp-title" aria-hidden="true">
            <p className="ogp-word">
              {Array.from(word).map((ch, i) => (
                <span key={i + ch} className="ogp-letter" style={{ animationDelay: 0.05 + i * 0.04 + "s" }}>
                  {ch === " " ? " " : ch}
                </span>
              ))}
            </p>
            {caption ? <p className="ogp-caption">{caption}</p> : null}
          </div>

          <div className="ogp-vignette" />
          <div className="ogp-grain" />

          {/* Cybernetic HUD Letterbox Bars */}
          {hud ? (
            <>
              <div className="ogp-bar ogp-bar-top" aria-hidden="true">
                <span>
                  <span className="ogp-dot" />
                  <b>{word}</b>
                  <span className="ogp-hide-sm"> — {status}</span>
                </span>
                <span>
                  {loading ? (
                    <>
                      <span className="ogp-hide-sm">{current?.label ? current.label + " · " : ""}</span>
                      {String(litCount).padStart(2, "0")} / {String(n).padStart(2, "0")}
                    </>
                  ) : (
                    <span className={phase === "reveal" ? "ogp-hint" : ""}>{phase === "reveal" ? hint : status}</span>
                  )}
                </span>
              </div>
              <div className="ogp-bar ogp-bar-bot" aria-hidden="true">
                <span className="ogp-hide-sm">SAMYAK // FEST_OS_2026</span>
                <span className="ogp-track">
                  <span className="ogp-fill" />
                  <span className="ogp-ticks">
                    {glyphs.map((_, i) => (
                      <i key={i} />
                    ))}
                    <i />
                  </span>
                </span>
                <span className="ogp-pct">
                  <b ref={pctElRef}>{String(pct).padStart(3, "0")}</b> %
                </span>
              </div>
            </>
          ) : null}
          <div className="ogp-frame" />
          <div className="ogp-veil" data-on={veil} />
          <span className="ogp-sr" aria-live="polite">
            {loading ? (litCount > 0 ? glyphs[litCount - 1]?.label ?? "" : "") : word + " — " + caption}
          </span>
        </div>
      ) : null}
    </div>
  )
}
