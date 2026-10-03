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
  const activeDownloads = useRef(0);
  const downloadQueue = useRef([]);
  const currentFrameDrawnRef = useRef(-1);
  const renderRequestedRef = useRef(false);
  const targetFrameRef = useRef(0);
  const isCancelledRef = useRef(false);

  const getNearestLoadedIndex = (target) => {
    if (isLoadedRef.current[target] === 1 && frameCache.current[target]) {
      return target;
    }
    // Search outward for the nearest loaded frame
    for (let offset = 1; offset < 40; offset++) {
      const prev = target - offset;
      if (prev >= 0 && isLoadedRef.current[prev] === 1 && frameCache.current[prev]) {
        return prev;
      }
      const next = target + offset;
      if (next < TOTAL_FRAMES && isLoadedRef.current[next] === 1 && frameCache.current[next]) {
        return next;
      }
    }
    // Fallback to frame 0 if available
    return isLoadedRef.current[0] === 1 ? 0 : -1;
  };

  const performDraw = () => {
    renderRequestedRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';

    const target = targetFrameRef.current;
    const bestIndex = getNearestLoadedIndex(target);
    if (bestIndex === -1 || bestIndex === currentFrameDrawnRef.current) return;

    const img = frameCache.current[bestIndex];
    if (!img) return;

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
      dy = (ch - dh) * 0.5;
    } else {
      dh = ch;
      dw = ch * imgRatio;
      dx = (cw - dw) * 0.5;
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

  // Concurrency-limited loader (max 4 concurrent downloads to prevent main-thread/network saturation)
  const processQueue = () => {
    if (isCancelledRef.current) return;
    while (activeDownloads.current < 4 && downloadQueue.current.length > 0) {
      const index = downloadQueue.current.shift();
      if (isLoadedRef.current[index] === 1 || isLoadedRef.current[index] === 2) continue;

      isLoadedRef.current[index] = 2; // In flight
      activeDownloads.current++;

      const img = new Image();
      img.src = getFramePath(index);
      
      const onDone = async () => {
        if (isCancelledRef.current) return;
        try {
          // Offload JPEG decoding from main thread
          if (img.decode) {
            await img.decode();
          }
        } catch {
          // Fallback if decode rejects
        }
        frameCache.current[index] = img;
        isLoadedRef.current[index] = 1;
        activeDownloads.current--;

        if (Math.abs(index - targetFrameRef.current) <= 2 || index === 0) {
          requestDraw();
        }
        processQueue();
      };

      img.onload = onDone;
      img.onerror = () => {
        isLoadedRef.current[index] = 0;
        activeDownloads.current--;
        processQueue();
      };
    }
  };

  const enqueueFrame = (index, prioritize = false) => {
    if (index < 0 || index >= TOTAL_FRAMES) return;
    if (isLoadedRef.current[index] !== 0) return;

    if (prioritize) {
      downloadQueue.current.unshift(index);
    } else {
      downloadQueue.current.push(index);
    }
    processQueue();
  };

  // Expose imperative method to parent for 60fps scrubbing
  const lastRequestedFrameRef = useRef(-1);
  useImperativeHandle(ref, () => ({
    renderFrame: (index) => {
      const clamped = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(index)));
      if (clamped === lastRequestedFrameRef.current) return;
      lastRequestedFrameRef.current = clamped;
      targetFrameRef.current = clamped;

      // Prioritize target frame and immediate 3-frame neighbors
      enqueueFrame(clamped, true);
      enqueueFrame(clamped + 1, true);
      enqueueFrame(clamped - 1, true);
      enqueueFrame(clamped + 2, true);
      enqueueFrame(clamped - 2, true);

      requestDraw();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isCancelledRef.current = false;

    // Optimized DPR scaling: clamp to 1 on mobile, 1.25 max on desktop
    const resizeCanvas = () => {
      const isMobile = window.innerWidth < 768;
      const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.25);
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

    // Step 1: Immediately fetch Frame 0 for instant initial paint
    enqueueFrame(0, true);

    // Step 2: Preload initial buffer (frames 1 to 15)
    for (let i = 1; i <= 15; i++) {
      enqueueFrame(i);
    }

    // Step 3: Progressive idle keyframe loader (every 6th frame)
    let idleTimer = setTimeout(() => {
      if (isCancelledRef.current) return;
      for (let i = 18; i < TOTAL_FRAMES; i += 6) {
        enqueueFrame(i);
      }
      
      // Step 4: Fill remaining intermediate frames gradually in background
      idleTimer = setTimeout(() => {
        if (isCancelledRef.current) return;
        for (let i = 1; i < TOTAL_FRAMES; i++) {
          enqueueFrame(i);
        }
      }, 800);
    }, 200);

    return () => {
      isCancelledRef.current = true;
      clearTimeout(idleTimer);
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
