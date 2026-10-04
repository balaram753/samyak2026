import { useState } from 'react';
import OnyxGlyphPreloader, { DEFAULT_GLYPHS, DEFAULT_MARK, DEFAULT_PALETTE } from '../ui/onyx-glyph-preloader';

export default function LoadingScreen({ onComplete, loop = false }) {
  const [isFading, setIsFading] = useState(false);

  const handleComplete = () => {
    setIsFading(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 500);
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black select-none overflow-hidden transition-opacity duration-700 ease-out ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <OnyxGlyphPreloader
        loop={loop}
        durationMs={2000}
        forgeDurationMs={800}
        holdDurationMs={700}
        liftDurationMs={500}
        word="SAMYAK"
        caption="KL DEEMED TO BE UNIVERSITY • 2026"
        logoSrc="/samyak-logo.png"
        mark={DEFAULT_MARK}
        glyphs={DEFAULT_GLYPHS}
        palette={DEFAULT_PALETTE}
        glitter={1.4}
        depth={0.14}
        spin={40}
        hud={true}
        height="100svh"
        onComplete={handleComplete}
      />
    </div>
  );
}
