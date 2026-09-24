import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

const TOTAL_FRAMES = 300;
const FRAME_WIDTH = 1920;
const FRAME_HEIGHT = 1080;

const getFramePath = (index) => {
  const num = String(index + 1).padStart(3, '0');
  return `/frames/ezgif-frame-${num}.jpg`;
};

const PyramidCanvas = forwardRef(function PyramidCanvas(props, ref) {
  const canvasRef = useRef(null);
  const frameCache = useRef(new Array(TOTAL_FRAMES));
  const isLoadedRef = useRef(new Uint8Array(TOTAL_FRAMES));
  const loadingPromises = useRef(new Map());
  const currentFrameDrawnRef = useRef(-1);
  const renderRequestedRef = useRef(false);
  const targetFrameRef = useRef(0);
  const isCancelledRef = useRef(false);

  const getNearestLoadedIndex = (target) => {
    if (isLoadedRef.current[target] === 1 && frameCache.current[target]) {
      return target;
    }
    // Bidirectional search outward for the nearest available decoded frame
    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = target - offset;
      if (prev >= 0 && isLoadedRef.current[prev] === 1 && frameCache.current[prev]) {
        return prev;
      }
      const next = target + offset;
      if (next < TOTAL_FRAMES && isLoadedRef.current[next] === 1 && frameCache.current[next]) {
        return next;
      }
    }
    return -1;
  };

  const performDraw = () => {
    renderRequestedRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Highest quality image rendering on canvas
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const target = targetFrameRef.current;
    const bestIndex = getNearestLoadedIndex(target);
    if (bestIndex === -1) return;

    const img = frameCache.current[bestIndex];
    if (!img || !img.complete) return;

    currentFrameDrawnRef.current = bestIndex;

    const cw = canvas.width;
    const ch = canvas.height;
    if (!cw || !ch) return;

    const imgRatio = FRAME_WIDTH / FRAME_HEIGHT;
    const canvasRatio = cw / ch;

    let dw, dh, dx, dy;
    if (canvasRatio > imgRatio) {
      dw = cw;
      dh = cw / imgRatio;
      dx = 0;
      dy = (ch - dh) / 2;
    } else {
      dh = ch;
      dw = ch * imgRatio;
      dx = (cw - dw) / 2;
      dy = 0;
    }

    ctx.drawImage(img, dx, dy, dw, dh);
  };

  const requestDraw = () => {
    if (!renderRequestedRef.current) {
      renderRequestedRef.current = true;
      requestAnimationFrame(performDraw);
    }
  };

  const loadFrame = (index) => {
    if (index < 0 || index >= TOTAL_FRAMES) return Promise.resolve(null);
    if (isLoadedRef.current[index] === 1 && frameCache.current[index]) {
      return Promise.resolve(frameCache.current[index]);
    }
    if (loadingPromises.current.has(index)) {
      return loadingPromises.current.get(index);
    }

    const promise = new Promise((resolve) => {
      const img = new Image();
      img.src = getFramePath(index);
      img.onload = () => {
        if (isCancelledRef.current) return;
        frameCache.current[index] = img;
        isLoadedRef.current[index] = 1;
        loadingPromises.current.delete(index);

        // If loaded frame is at or close to current target, draw it immediately!
        if (Math.abs(index - targetFrameRef.current) <= 5 || index === 0) {
          requestDraw();
        }
        resolve(img);
      };
      img.onerror = () => {
        loadingPromises.current.delete(index);
        resolve(null);
      };
    });

    loadingPromises.current.set(index, promise);
    return promise;
  };

  // Expose imperative method to parent for zero-render 60fps scrubbing
  useImperativeHandle(ref, () => ({
    renderFrame: (index) => {
      const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(index)));
      targetFrameRef.current = clamped;

      // Ensure target frame and surrounding buffer frames are loaded immediately
      loadFrame(clamped);
      for (let offset = 1; offset <= 6; offset++) {
        if (clamped + offset < TOTAL_FRAMES) loadFrame(clamped + offset);
        if (clamped - offset >= 0) loadFrame(clamped - offset);
      }

      requestDraw();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isCancelledRef.current = false;

    // High-DPI crisp retina scaling
    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = rect.width > 0 ? rect.width : window.innerWidth;
      const h = rect.height > 0 ? rect.height : window.innerHeight;
      const newW = Math.round(w * dpr);
      const newH = Math.round(h * dpr);

      if (canvas.width !== newW || canvas.height !== newH) {
        canvas.width = newW;
        canvas.height = newH;
        performDraw();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas, { passive: true });

    // Parallel preloader: load frame 0, immediate buffer, and full timeline keyframes
    const runFastPreload = async () => {
      // 1. Critical Frame 0
      await loadFrame(0);

      // 2. Immediate 1 to 20 buffer
      for (let i = 1; i <= 20; i++) {
        loadFrame(i);
      }

      // 3. Keyframes every 4th frame across the entire timeline
      // Guarantees full-length scrub plays smoothly from the first second
      for (let i = 24; i < TOTAL_FRAMES; i += 4) {
        if (isCancelledRef.current) return;
        loadFrame(i);
      }

      // 4. Fill in all remaining intermediate frames smoothly
      for (let i = 1; i < TOTAL_FRAMES; i++) {
        if (isCancelledRef.current) return;
        if (isLoadedRef.current[i] !== 1) {
          loadFrame(i);
          if (i % 25 === 0) {
            await new Promise((r) => setTimeout(r, 30));
          }
        }
      }
    };

    runFastPreload();

    return () => {
      isCancelledRef.current = true;
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pyramid-seq-canvas"
      aria-label="Cinematic 3D Pyramid Canvas"
    />
  );
});

export default PyramidCanvas;
