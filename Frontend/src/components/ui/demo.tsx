"use client"

import OnyxGlyphPreloader from "@/components/ui/onyx-glyph-preloader"

// Your own glyphs, mark and metal: a warmer gunmetal with a heavier glitter.
const glyphs = [
  { d: "M50 18 L82 50 L50 82 L18 50 Z M50 36 L64 50 L50 64 L36 50 Z", label: "Facet" },
  { d: "M28 30 H72 M28 50 H72 M28 70 H56", stroke: 10, label: "Notes" },
  { d: "M50 16 A34 34 0 1 0 50.1 16 Z M50 34 A16 16 0 1 1 49.9 34 Z", label: "Ring" },
  { d: "M30 70 L50 30 L70 70", stroke: 11, label: "Peak" },
]

export default function Demo() {
  return (
    <OnyxGlyphPreloader
      loop
      glyphs={glyphs}
      mark={{ d: "M30 30 L70 70 M70 30 L30 70", stroke: 13, label: "Cross" }}
      word="Foundry"
      caption="Four tools, one cast"
      glitter={1.6}
      depth={0.12}
      palette={{ metal: "#3a3633", shade: "#0d0c0b", rim: "#8a7d70", glitter: "#ffe9cf", ink: "#f3e9dd" }}
    />
  )
}
