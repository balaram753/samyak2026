"use client"

// Onyx Glyph Preloader — a cinematic loading gate in sandblasted black metal.
// Five thick, glitter-flecked tiles orbit a dark stage, each with its glyph
// pressed into the face. They ignite one by one as the load climbs, then
// converge on the centre, where a single hero tile turns over in the
// spotlight with its mark cut clean through, the wordmark racks into focus
// beneath it, and the whole thing flies through the camera.
//
// One file, React only. The metal, the glitter and the debossed glyphs are
// painted procedurally onto canvas once on mount; the thickness is a stack
// of CSS 3D layers; the light follows the pointer. Scoped .ogp- styling.

import * as React from "react"

export interface OnyxGlyph {
  /** SVG path data, drawn in a 100 × 100 box. */
  d: string
  /** Stroke width in that box. Leave it out to fill the path. */
  stroke?: number
  /** Name read out as the tile lights. */
  label?: string
}

export interface OnyxPalette {
  /** Stage background, and what shows through the hero mark's cut. */
  stage: string
  /** Face colour where the key light lands. */
  metal: string
  /** Face colour on the far side. */
  shade: string
  /** Edge highlight down the tile's thickness. */
  rim: string
  /** Glitter specks. */
  glitter: string
  /** HUD and wordmark. */
  ink: string
}

export interface OnyxGlyphPreloaderProps {
  /** Content revealed once the gate lifts. Ignored while `loop` is set. */
  children?: React.ReactNode
  /** Run forever as a showcase: children are never revealed, onComplete never fires. */
  loop?: boolean
  /**
   * Real loading progress, 0–100. Leave undefined to run the built-in
   * simulated load over `durationMs`. The orbit holds until this hits 100.
   */
  progress?: number
  /** Length of the simulated load in ms. Defaults to 2000ms. */
  durationMs?: number
  /** Forge / convergence phase duration in ms. Defaults to 800ms. */
  forgeDurationMs?: number
  /** Hold / reveal phase duration in ms. Defaults to 700ms. */
  holdDurationMs?: number
  /** Lift gate / camera flythrough phase duration in ms. Defaults to 500ms. */
  liftDurationMs?: number
  /** The orbiting tiles, one per glyph. Three to eight read best. */
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
  /** Glitter density multiplier. 0 is plain sandblasted metal, 2 is disco. */
  glitter?: number
  /** Tile thickness as a fraction of its width. Defaults to 0.12. */
  depth?: number
  /** Seconds per orbit. Defaults to 40. */
  spin?: number
  /** Letterbox bars with the status read-out and progress track. Defaults to true. */
  hud?: boolean
  /** Face for the wordmark and HUD. */
  fontFamily?: string
  /** Root height. A definite length, never a percentage. */
  height?: string
  /** Fired once, after the gate has lifted. */
  onComplete?: () => void
  /** Extra root class names. */
  className?: string
}

// SAMYAK Theme Palette: Sandblasted titanium dark slate with warm crimson undertones,
// glowing SAMYAK red rims, and crisp white typography.
export const DEFAULT_PALETTE: OnyxPalette = {
  stage: "#030303",
  metal: "#3c3034",
  shade: "#181013",
  rim: "#DF2531",
  glitter: "#ff707b",
  ink: "#ffffff",
}

// 5 Flagship Pillars of SAMYAK: Robotics, Hackathons, Management, Pro Shows, Gaming
export const DEFAULT_GLYPHS: OnyxGlyph[] = [
  // Robotics / Circuit Hexagon
  {
    d: "M50 18 L82 36 V64 L50 82 L18 64 V36 Z M50 34 L68 44 V56 L50 66 L32 56 V44 Z",
    stroke: 6,
    label: "Robotics",
  },
  // Hackathons / Code Terminal Brackets
  {
    d: "M36 30 L18 50 L36 70 M64 30 L82 50 L64 70 M56 22 L44 78",
    stroke: 8,
    label: "Hackathons",
  },
  // Management / Leadership Crown
  {
    d: "M20 70 L26 34 L50 54 L74 34 L80 70 Z M20 76 H80",
    stroke: 7,
    label: "Management",
  },
  // Pro Shows / Cosmic Flame
  {
    d: "M50 14 C54 36 72 46 72 64 C72 78 62 86 50 86 C38 86 28 78 28 64 C28 46 46 36 50 14 Z",
    stroke: 7,
    label: "Pro Shows",
  },
  // Gaming / Cyber Spark
  {
    d: "M50 12 C53 40 60 47 88 50 C60 53 53 60 50 88 C47 60 40 53 12 50 C40 47 47 40 50 12 Z",
    label: "Gaming",
  },
]

// Stylized SAMYAK Insignia Hero Mark
export const DEFAULT_MARK: OnyxGlyph = {
  d: "M50 12 L78 24 V48 C78 68 64 82 50 88 C36 82 22 68 22 48 V24 Z M35 50 L45 60 L68 37",
  stroke: 9,
  label: "SAMYAK",
}

const DISPLAY_STACK = '"Barlow Condensed", "Inter Tight", "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif'
const MONO_STACK = '"JetBrains Mono", "SF Mono", ui-monospace, Menlo, Consolas, monospace'

// Per-tile resting tilt [rotateX, rotateY, rotateZ]
const TILTS = [
  [18, -24, -12],
  [-12, 28, 9],
  [22, 16, -4],
  [-20, -18, 14],
  [12, 24, -16],
  [-10, -14, 7],
  [16, 12, -9],
  [-16, 20, 5],
]

// Dust drifting through the spotlight: [left %, top %, size px, duration s, delay s].
const DUST = [
  [22, 64, 2, 13, -2],
  [31, 38, 1.5, 17, -9],
  [44, 72, 2.5, 15, -4],
  [52, 30, 1.5, 19, -12],
  [61, 58, 2, 14, -7],
  [70, 42, 1.5, 16, -1],
  [77, 68, 2, 18, -14],
  [38, 52, 1, 12, -5],
  [57, 80, 1.5, 20, -10],
  [66, 24, 1, 15, -3],
  [27, 28, 1, 21, -16],
  [48, 46, 1, 13, -8],
]

// #region timeline
const clamp01 = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x)

// Smooth, fluid cubic ease-in-out curve for seamless loading
export function ogpSimulated(t: number) {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// How far tile i of n has ignited at progress p
export function ogpLit(p: number, i: number, n: number) {
  return clamp01(clamp01(p) * n - i)
}

// Tiles fully lit at progress p
export function ogpCount(p: number, n: number) {
  return Math.min(n, Math.floor(clamp01(p) * n + 1e-9))
}

// Unit-circle position of slot i of n, starting at twelve o'clock, clockwise.
export function ogpSlot(i: number, n: number) {
  const a = ((-90 + (360 / n) * i) * Math.PI) / 180
  return { x: Math.round(Math.cos(a) * 1e4) / 1e4, y: Math.round(Math.sin(a) * 1e4) / 1e4 }
}

// Seeded RNG so every mount paints the same glitter
export function ogpRng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
// #endregion

// ---- procedural textures ------------------------------------------------------

const FACE = 512

interface OgpTextures {
  faces: string[]
  hero: string
  back: string
  glitA: string
  glitB: string
  grain: string
}

function canvas(n: number) {
  const c = document.createElement("canvas")
  c.width = n
  c.height = n
  return c
}

function ctx(c: HTMLCanvasElement) {
  const g = c.getContext("2d")
  if (!g) throw new Error("no 2d context")
  return g
}

function roundRect(g: CanvasRenderingContext2D, n: number, r: number) {
  g.beginPath()
  g.moveTo(r, 0)
  g.arcTo(n, 0, n, n, r)
  g.arcTo(n, n, 0, n, r)
  g.arcTo(0, n, 0, 0, r)
  g.arcTo(0, 0, n, 0, r)
  g.closePath()
}

// Sandblast plus glitter
function sprinkle(g: CanvasRenderingContext2D, rnd: () => number, n: number, count: number, color: string, alpha: number) {
  g.fillStyle = color
  for (let k = 0; k < count; k++) {
    const x = rnd() * n
    const y = rnd() * n
    const b = rnd()
    const lit = 0.4 + 0.6 * (1 - (x + y) / (2 * n))
    g.globalAlpha = alpha * lit * (b * b * 0.9 + 0.04)
    const s = b > 0.99 ? 2.4 : b > 0.92 ? 1.6 : 1
    g.fillRect(x, y, s, s)
  }
  g.globalAlpha = 1
}

function glyphMask(glyph: OnyxGlyph) {
  const c = canvas(FACE)
  const g = ctx(c)
  const k = (FACE * 0.66) / 100
  g.setTransform(k, 0, 0, k, FACE * 0.17, FACE * 0.17)
  if (glyph.d) {
    const path = new Path2D(glyph.d)
    g.fillStyle = "#fff"
    g.strokeStyle = "#fff"
    if (glyph.stroke) {
      g.lineWidth = glyph.stroke
      g.lineCap = "round"
      g.lineJoin = "round"
      g.stroke(path)
    } else {
      g.fill(path, "evenodd")
    }
  }
  return c
}

function paintFace(glyph: OnyxGlyph | null, mode: "cut" | "deboss", pal: OnyxPalette, density: number, seed: number) {
  const rnd = ogpRng(seed)
  const n = FACE
  const c = canvas(n)
  const g = ctx(c)
  roundRect(g, n, n * 0.2)
  g.clip()

  const base = g.createLinearGradient(0, 0, n, n)
  base.addColorStop(0, pal.metal)
  base.addColorStop(0.55, "#2a1c20")
  base.addColorStop(1, pal.shade)
  g.fillStyle = base
  g.fillRect(0, 0, n, n)
  const bloom = g.createRadialGradient(n * 0.26, n * 0.2, 0, n * 0.26, n * 0.2, n * 0.85)
  bloom.addColorStop(0, "rgba(223,37,49,0.32)")
  bloom.addColorStop(0.5, "rgba(255,255,255,0.12)")
  bloom.addColorStop(1, "rgba(255,255,255,0)")
  g.fillStyle = bloom
  g.fillRect(0, 0, n, n)

  sprinkle(g, rnd, n, 14000, "#000", 0.4)
  sprinkle(g, rnd, n, Math.round(16000 * density), pal.glitter, 0.95)

  if (glyph) {
    const mask = glyphMask(glyph)
    const inv = canvas(n)
    const ig = ctx(inv)
    ig.fillStyle = "#fff"
    ig.fillRect(0, 0, n, n)
    ig.globalCompositeOperation = "destination-out"
    ig.drawImage(mask, 0, 0)

    const well = canvas(n)
    const w = ctx(well)
    w.drawImage(mask, 0, 0)
    w.globalCompositeOperation = "source-in"
    if (mode === "cut") {
      w.fillStyle = pal.stage
      w.fillRect(0, 0, n, n)
    } else {
      const floor = w.createLinearGradient(0, 0, n, n)
      floor.addColorStop(0, "#16090c")
      floor.addColorStop(1, "#2c0e15")
      w.fillStyle = floor
      w.fillRect(0, 0, n, n)
      w.globalCompositeOperation = "source-atop"
      sprinkle(w, rnd, n, Math.round(2400 * density), pal.glitter, 0.6)
    }
    w.globalCompositeOperation = "source-atop"
    const shade = (color: string, blur: number, dx: number, dy: number) => {
      w.shadowColor = color
      w.shadowBlur = blur
      w.shadowOffsetX = dx + n * 3
      w.shadowOffsetY = dy
      w.drawImage(inv, -n * 3, 0)
    }
    if (mode === "cut") {
      shade("rgba(0,0,0,1)", 6, 0, 7)
      shade("rgba(223,37,49,0.6)", 5, -3, -9)
      shade("rgba(255,255,255,0.4)", 1, -1, -2)
    } else {
      shade("rgba(0,0,0,0.95)", 9, 7, 10)
      shade("rgba(0,0,0,0.8)", 2, 2, 3)
      shade("rgba(223,37,49,0.45)", 2, -2, -3)
    }
    w.shadowColor = "transparent"
    g.drawImage(well, 0, 0)

    const lip = canvas(n)
    const l = ctx(lip)
    l.shadowColor = "rgba(255,120,130,0.6)"
    l.shadowBlur = 3
    l.shadowOffsetX = n * 3 + 1.5
    l.shadowOffsetY = 2
    l.drawImage(mask, -n * 3, 0)
    l.globalCompositeOperation = "destination-out"
    l.shadowColor = "transparent"
    l.drawImage(mask, 0, 0)
    g.drawImage(lip, 0, 0)
  }

  const bevel = g.createLinearGradient(0, 0, n, n)
  bevel.addColorStop(0, "rgba(255,255,255,0.6)")
  bevel.addColorStop(0.45, "rgba(223,37,49,0.35)")
  bevel.addColorStop(1, "rgba(223,37,49,0.6)")
  g.lineWidth = n * 0.03
  g.strokeStyle = bevel
  roundRect(g, n, n * 0.2)
  g.stroke()
  return c
}

function paintSparkle(seed: number, count: number) {
  const n = 256
  const c = canvas(n)
  const g = ctx(c)
  const rnd = ogpRng(seed)
  for (let k = 0; k < count; k++) {
    const x = rnd() * n
    const y = rnd() * n
    const b = rnd()
    const r = 0.35 + b * 0.75
    const dot = g.createRadialGradient(x, y, 0, x, y, r * 2)
    dot.addColorStop(0, "rgba(255,255,255," + (0.55 + b * 0.45).toFixed(2) + ")")
    dot.addColorStop(1, "rgba(255,255,255,0)")
    g.fillStyle = dot
    g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6)
    if (b > 0.94) {
      g.fillStyle = "rgba(255,100,110,0.65)"
      g.fillRect(x - r * 5, y - 0.3, r * 10, 0.6)
      g.fillRect(x - 0.3, y - r * 5, 0.6, r * 10)
    }
  }
  return c
}

function paintGrain() {
  const n = 160
  const c = canvas(n)
  const g = ctx(c)
  const img = g.createImageData(n, n)
  const rnd = ogpRng(7)
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.round(rnd() * 255)
    img.data[i] = v
    img.data[i + 1] = v
    img.data[i + 2] = v
    img.data[i + 3] = 34
  }
  g.putImageData(img, 0, 0)
  return c
}

const toUrl = (c: HTMLCanvasElement) => {
  try {
    return 'url("' + c.toDataURL("image/webp", 0.92) + '")'
  } catch {
    return 'url("' + c.toDataURL() + '")'
  }
}

function paintAll(glyphs: OnyxGlyph[], mark: OnyxGlyph, markStyle: "cut" | "deboss", pal: OnyxPalette, density: number): OgpTextures {
  return {
    faces: glyphs.map((gl, i) => toUrl(paintFace(gl, "deboss", pal, density, 101 + i * 17))),
    hero: toUrl(paintFace(mark, markStyle, pal, density, 977)),
    back: toUrl(paintFace(null, "deboss", pal, density, 1301)),
    glitA: toUrl(paintSparkle(11, Math.round(110 * Math.max(0.2, density)))),
    glitB: toUrl(paintSparkle(29, Math.round(110 * Math.max(0.2, density)))),
    grain: toUrl(paintGrain()),
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
  --ogp-t: calc(var(--ogp-u) * 0.20);
  --ogp-r: calc(var(--ogp-u) * 0.26);
  --ogp-h: calc(var(--ogp-u) * 0.35);
  --ogp-bar: max(38px, calc(var(--ogp-u) * 0.085));
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
  transition: opacity 0.7s cubic-bezier(0.7, 0, 0.3, 1) 0.1s;
}
.ogp-gate:focus-visible .ogp-frame { box-shadow: inset 0 0 0 1px var(--ogp-rim); }
.ogp-root[data-phase="lift"] .ogp-gate { opacity: 0; pointer-events: none; }

/* ---- light ---- */
.ogp-spot {
  position: absolute;
  inset: -20%;
  pointer-events: none;
  background: radial-gradient(
    closest-side at calc(50% + var(--ogp-mx) * 4%) calc(46% + var(--ogp-my) * 4%),
    rgba(223, 37, 49, 0.22),
    rgba(255, 255, 255, 0.04) 55%,
    transparent 100%
  );
  opacity: 0;
  animation: ogp-fade-in 1.5s ease 0.1s forwards;
}
.ogp-cone {
  position: absolute;
  left: 50%;
  top: -10%;
  width: calc(var(--ogp-u) * 1.1);
  height: 75%;
  transform: translateX(-50%);
  pointer-events: none;
  background: conic-gradient(from 180deg at 50% 0%, transparent 162deg, rgba(223, 37, 49, 0.12) 180deg, transparent 198deg);
  filter: blur(18px);
  opacity: 0;
  transition: opacity 1.1s ease;
}
.ogp-root[data-phase="forge"] .ogp-cone, .ogp-root[data-phase="reveal"] .ogp-cone { opacity: 1; }
.ogp-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse at 50% 46%, transparent 35%, rgba(0, 0, 0, 0.9) 100%);
}
.ogp-grain {
  position: absolute;
  inset: -50%;
  pointer-events: none;
  opacity: 0.35;
  mix-blend-mode: overlay;
  background-image: var(--ogp-grain);
  background-size: 160px 160px;
  animation: ogp-grain 0.9s steps(6) infinite;
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

/* ---- camera ---- */
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
  transition: transform 0.9s cubic-bezier(0.65, 0, 0.25, 1);
  transition-delay: calc(var(--i) * 50ms);
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

/* 3D Slab Thickness Layers */
.ogp-layer, .ogp-face {
  position: absolute;
  inset: 0;
  border-radius: 20%;
}
.ogp-layer {
  transform: translateZ(calc(var(--ogp-t) * var(--ogp-depth) * var(--k) * -1));
  background: linear-gradient(215deg, #4d232a 0%, #1c0a0e 42%, #321017 66%, var(--ogp-rim) 100%);
  box-shadow: 0 0 12px rgba(223, 37, 49, 0.25);
}
.ogp-hero .ogp-layer {
  transform: translateZ(calc(var(--ogp-h) * var(--ogp-depth) * var(--k) * -1));
  background: linear-gradient(215deg, #5c202a 0%, #1f0b0f 42%, #3d1018 66%, #ff2a3b 100%);
}
.ogp-face {
  overflow: hidden;
  background-color: var(--ogp-shade);
  background-image: linear-gradient(135deg, var(--ogp-metal) 0%, #2a1a1e 50%, var(--ogp-shade) 100%);
  background-size: 100% 100%;
  filter: blur(0px) brightness(calc(0.9 + var(--ogp-lit) * 0.35));
  box-shadow: inset 0 0 0 1.5px rgba(223, 37, 49, calc(0.35 + var(--ogp-lit) * 0.65)), 0 0 25px rgba(223, 37, 49, calc(0.18 + var(--ogp-lit) * 0.5));
}
.ogp-glit {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: screen;
  background-size: 55% 55%;
  background-repeat: repeat;
}
.ogp-glit-a {
  background-image: var(--ogp-glit-a);
  opacity: calc(0.12 + (0.5 + var(--ogp-mx) * 0.5) * (0.35 + var(--ogp-lit) * 0.55));
  background-position: calc(var(--ox) + var(--ogp-mx) * 6px) calc(var(--oy) + var(--ogp-my) * 6px);
}
.ogp-glit-b {
  background-image: var(--ogp-glit-b);
  opacity: calc(0.12 + (0.5 - var(--ogp-mx) * 0.5) * (0.35 + var(--ogp-lit) * 0.55));
  background-position: calc(var(--oy) - var(--ogp-mx) * 6px) calc(var(--ox) - var(--ogp-my) * 6px);
}
.ogp-sheen {
  position: absolute;
  inset: 0;
  pointer-events: none;
  mix-blend-mode: screen;
  background: radial-gradient(
    circle at calc(30% - var(--ogp-mx) * 28%) calc(24% - var(--ogp-my) * 28%),
    rgba(255, 255, 255, 0.3),
    rgba(223, 37, 49, 0.12) 38%,
    transparent 62%
  );
  opacity: calc(0.4 + var(--ogp-lit) * 0.55);
  transition: opacity 0.4s ease;
}
.ogp-tile:hover .ogp-sheen { opacity: 1; }
.ogp-sweep {
  position: absolute;
  inset: -40%;
  pointer-events: none;
  mix-blend-mode: screen;
  background: linear-gradient(115deg, transparent 42%, rgba(255, 255, 255, 0.35) 50%, transparent 58%);
  transform: translateX(-70%);
  opacity: 0;
}
.ogp-tile[data-lit="1"] .ogp-sweep { animation: ogp-sweep 0.9s cubic-bezier(0.3, 0, 0.2, 1) forwards; }
.ogp-tile:hover .ogp-sweep { animation: ogp-sweep 0.8s cubic-bezier(0.3, 0, 0.2, 1) forwards; }

/* The orbit racks in from soft focus, and dissolves into the hero */
.ogp-leaf { animation: ogp-rack 1.1s cubic-bezier(0.2, 0.7, 0.2, 1) backwards; animation-delay: calc(0.1s + var(--i) * 0.08s); }
.ogp-slot .ogp-leaf { transition: opacity 0.5s ease; }
.ogp-root[data-phase="forge"] .ogp-slot .ogp-leaf,
.ogp-root[data-phase="reveal"] .ogp-slot .ogp-leaf,
.ogp-root[data-phase="lift"] .ogp-slot .ogp-leaf {
  opacity: 0;
  transition-delay: calc(0.45s + var(--i) * 40ms);
}

/* ---- the hero tile ---- */
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

/* ---- wordmark ---- */
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
  font-size: max(24px, calc(var(--ogp-u) * 0.068));
  font-weight: 800;
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

/* ---- letterbox + HUD ---- */
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
.ogp-bar-top { top: 0; transform: translateY(-100%); animation: ogp-bar-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards; border-bottom: 1px solid rgba(223, 37, 49, 0.25); }
.ogp-bar-bot { bottom: 0; transform: translateY(100%); animation: ogp-bar-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.05s forwards; border-top: 1px solid rgba(223, 37, 49, 0.25); }
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
  height: 2px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 2px;
}
.ogp-fill {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #991b1b, #DF2531, #fca5a5);
  transform-origin: 0 50%;
  transform: scaleX(var(--ogp-p));
  box-shadow: 0 0 10px rgba(223, 37, 49, 0.8);
  border-radius: 2px;
}
.ogp-ticks { position: absolute; inset: -3px 0; display: flex; justify-content: space-between; }
.ogp-ticks i { width: 1px; height: 8px; background: rgba(223, 37, 49, 0.4); }
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
@keyframes ogp-grain {
  0% { transform: translate(0, 0); }
  20% { transform: translate(-7%, 4%); }
  40% { transform: translate(5%, -6%); }
  60% { transform: translate(-3%, -9%); }
  80% { transform: translate(8%, 3%); }
  100% { transform: translate(-5%, 7%); }
}
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
  .ogp-grain { animation: none; }
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

function Slab({ layers, faceStyle, back, children }: { layers: number; faceStyle: React.CSSProperties; back?: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <>
      {Array.from({ length: layers }, (_, k) => (
        <span key={k} className="ogp-layer ogp-leaf" style={{ "--k": ((k + 1) / layers).toFixed(3) } as React.CSSProperties} />
      ))}
      {back ? <span className="ogp-face ogp-face-back ogp-leaf" style={back} /> : null}
      <span className={"ogp-face ogp-leaf" + (back ? " ogp-face-front" : "")} style={faceStyle}>
        {children}
      </span>
    </>
  )
}

export default function OnyxGlyphPreloader({
  children,
  loop = false,
  progress,
  durationMs = 2000,
  forgeDurationMs = 800,
  holdDurationMs = 700,
  liftDurationMs = 500,
  glyphs = DEFAULT_GLYPHS,
  mark = DEFAULT_MARK,
  logoSrc = "/samyak-logo.png",
  markStyle = "cut",
  word = "SAMYAK",
  caption = "KL DEEMED TO BE UNIVERSITY • 2026",
  palette,
  glitter = 1.4,
  depth = 0.14,
  spin = 40,
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
  const [tex, setTex] = React.useState<OgpTextures | null>(null)
  const [unit, setUnit] = React.useState(640)

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

  // ---- paint the metal once per look ---------------------------------------------
  const look = JSON.stringify([glyphs, mark, markStyle, colors, glitter])
  React.useEffect(() => {
    try {
      setTex(paintAll(glyphs, mark, markStyle, colors, Math.max(0, glitter)))
    } catch {
      /* fallback */
    }
  }, [look, glyphs, mark, markStyle, colors, glitter])

  // ---- size everything off the shorter side ---------------------------------------
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

  // ---- the light: follows the pointer, wanders smoothly ---------------------------
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

  // ---- load: 60-120 FPS fluid ignition driven frame-by-frame -----------------------
  React.useEffect(() => {
    if (phase !== "load") return
    const root = rootRef.current
    let raf = 0
    let last = performance.now()
    const start = last
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

  // ---- holds between phases (calibrated for 3.5 to 4 seconds total) ------------------
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

  // the veil comes down, the stage resets beneath it, the veil goes up
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
  const bg = (url: string | undefined): React.CSSProperties => (url ? { backgroundImage: url } : {})

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
          "--ogp-glit-a": tex?.glitA ?? "none",
          "--ogp-glit-b": tex?.glitB ?? "none",
          "--ogp-grain": tex?.grain ?? "none",
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
                                "--ox": (i * 37) % 100 + "px",
                                "--oy": (i * 61) % 100 + "px",
                              } as React.CSSProperties
                            }
                          >
                            <Slab layers={LAYERS} faceStyle={bg(tex?.faces[i])}>
                              <i className="ogp-glit ogp-glit-a" />
                              <i className="ogp-glit ogp-glit-b" />
                              <i className="ogp-sheen" />
                              <i className="ogp-sweep" />
                            </Slab>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="ogp-hero">
                <div className="ogp-hero-bob">
                  <div className="ogp-hero-turn">
                    <div className="ogp-tile" style={{ "--ox": "13px", "--oy": "29px" } as React.CSSProperties}>
                      <Slab layers={HERO_LAYERS} faceStyle={bg(tex?.hero)} back={bg(tex?.back)}>
                        <i className="ogp-glit ogp-glit-a" />
                        <i className="ogp-glit ogp-glit-b" />
                        <i className="ogp-sheen" />
                        <i className="ogp-sweep" />
                        {logoSrc ? (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              pointerEvents: "none",
                              zIndex: 6,
                            }}
                          >
                            <img
                              src={logoSrc}
                              alt={word}
                              style={{
                                width: "60%",
                                height: "60%",
                                objectFit: "contain",
                                filter:
                                  "drop-shadow(0 0 18px rgba(223,37,49,1)) drop-shadow(0 0 35px rgba(223,37,49,0.7))",
                              }}
                            />
                          </div>
                        ) : null}
                      </Slab>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="ogp-title" aria-hidden="true">
            <p className="ogp-word">
              {Array.from(word).map((ch, i) => (
                <span key={i + ch} className="ogp-letter" style={{ animationDelay: 0.06 + i * 0.05 + "s" }}>
                  {ch === " " ? " " : ch}
                </span>
              ))}
            </p>
            {caption ? <p className="ogp-caption">{caption}</p> : null}
          </div>

          <div className="ogp-vignette" />
          <div className="ogp-grain" />

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
                <span className="ogp-hide-sm">SAMYAK // 2026</span>
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
