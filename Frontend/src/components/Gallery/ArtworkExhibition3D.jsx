import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, ZoomIn, Eye, Sparkles, 
  RotateCcw, Info, X, ExternalLink 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EVENTS_DATA } from '../../data/events';
import { useSiteContent } from '../../context/SiteContentContext';

// Procedural fallback texture generator on HTML5 Canvas so no artwork ever renders as a black box
function createFallbackTexture(title = 'SAMYAK ARTWORK', category = 'FEATURED') {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  // Dark cyber background with red gradients
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1350);
  bgGrad.addColorStop(0, '#1a0406');
  bgGrad.addColorStop(0.5, '#0a0a0a');
  bgGrad.addColorStop(1, '#050505');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1350);

  // Red glow circle
  const radial = ctx.createRadialGradient(540, 600, 50, 540, 600, 480);
  radial.addColorStop(0, 'rgba(223, 37, 49, 0.45)');
  radial.addColorStop(0.8, 'rgba(223, 37, 49, 0.05)');
  radial.addColorStop(1, 'transparent');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, 1080, 1350);

  // Decorative cyber borders
  ctx.strokeStyle = 'rgba(223, 37, 49, 0.6)';
  ctx.lineWidth = 8;
  ctx.strokeRect(60, 60, 960, 1230);

  // Category pill
  ctx.fillStyle = 'rgba(223, 37, 49, 0.85)';
  ctx.font = 'bold 36px "Barlow Condensed", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`// ${category.toUpperCase()} ARENA`, 540, 480);

  // Artwork Title
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 64px "Barlow Condensed", sans-serif';
  
  // Word wrap title
  const words = title.split(' ');
  let line = '';
  let y = 620;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > 840 && n > 0) {
      ctx.fillText(line.trim(), 540, y);
      line = words[n] + ' ';
      y += 80;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), 540, y);

  // Footer branding
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '32px "Barlow Condensed", sans-serif';
  ctx.fillText('SAMYAK 2026 • OFFICIAL EVENT ARTWORK', 540, 1180);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function ArtworkExhibition3D() {
  const containerRef = useRef(null);
  const { events: siteEvents } = useSiteContent();
  const navigate = useNavigate();

  // Combine live site events with poster events
  const artworks = useMemo(() => {
    const source = (siteEvents && siteEvents.length > 0) ? siteEvents : EVENTS_DATA;
    // Filter items with valid titles, taking up to 24 featured artworks
    return source.slice(0, 24).map((item, idx) => ({
      id: item.id || `art-${idx}`,
      title: item.title || 'Exhibition Artwork',
      category: item.category || 'Competitions',
      department: item.department || 'KL FEST',
      image: item.image || item.banner_url || '/hero-bg.png',
      prize: item.prize || null,
      venue: item.venue || 'KL Campus'
    }));
  }, [siteEvents]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxArtwork, setLightboxArtwork] = useState(null);
  const [isInteracting, setIsInteracting] = useState(false);

  // References for animation and interaction
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const artworkMeshesRef = useRef([]);
  const targetXRef = useRef(0);
  const currentXRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartCurrentXRef = useRef(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Spacing constants for 3D Gallery Track
  const SPACING = 5.6; // distance between artwork centers
  const ARTWORK_WIDTH = 4.2;
  const ARTWORK_HEIGHT = 5.25; // 4:5 proportion

  // Move gallery smoothly to specific index
  const scrollToIndex = useCallback((index) => {
    const clamped = Math.max(0, Math.min(artworks.length - 1, index));
    setActiveIndex(clamped);
    targetXRef.current = -clamped * SPACING;
  }, [artworks.length, SPACING]);

  const handleNext = () => scrollToIndex(activeIndex + 1);
  const handlePrev = () => scrollToIndex(activeIndex - 1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || artworks.length === 0) return;

    // 1. Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.035);

    // 2. Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    camera.position.set(0, 0, 9.8);
    cameraRef.current = camera;

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainLight.position.set(0, 8, 10);
    scene.add(mainLight);

    const redAccent = new THREE.PointLight(0xDF2531, 2.5, 30);
    redAccent.position.set(0, 3, 5);
    scene.add(redAccent);

    // Subtle background particles
    const particleCount = 120;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 80;
      particlePositions[i + 1] = (Math.random() - 0.5) * 20;
      particlePositions[i + 2] = (Math.random() - 0.5) * 40;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xDF2531,
      size: 0.12,
      transparent: true,
      opacity: 0.65
    });
    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // 5. Artwork Meshes Generation with Three.js TextureLoader
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');

    const geometry = new THREE.PlaneGeometry(ARTWORK_WIDTH, ARTWORK_HEIGHT, 1, 1);
    const meshes = [];

    artworks.forEach((art, index) => {
      // Group holds artwork plane + subtle backplate
      const group = new THREE.Group();
      group.position.x = index * SPACING;
      group.userData = { index, artwork: art };

      // Initial material with high-fidelity canvas fallback while texture loads
      const fallbackTex = createFallbackTexture(art.title, art.category);
      const material = new THREE.MeshBasicMaterial({
        map: fallbackTex,
        side: THREE.FrontSide
      });

      // Load actual artwork image
      if (art.image) {
        textureLoader.load(
          art.image,
          (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            material.map = texture;
            material.needsUpdate = true;
          },
          undefined,
          (err) => {
            // Log fallback during texture fetch error as requested
            console.warn('Gallery texture fallback used for:', art.title, art.image);
          }
        );
      }

      const plane = new THREE.Mesh(geometry, material);
      plane.userData = { index, artwork: art };
      group.add(plane);

      // Cyber Frame Backplate
      const frameGeo = new THREE.PlaneGeometry(ARTWORK_WIDTH + 0.18, ARTWORK_HEIGHT + 0.18);
      const frameMat = new THREE.MeshBasicMaterial({
        color: 0x111111,
        side: THREE.BackSide
      });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.position.z = -0.02;
      group.add(frameMesh);

      // Floor Reflection Shadow Plane
      const shadowGeo = new THREE.PlaneGeometry(ARTWORK_WIDTH, 1.2);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0xDF2531,
        transparent: true,
        opacity: 0.12
      });
      const shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.position.y = -ARTWORK_HEIGHT / 2 - 0.7;
      shadow.rotation.x = -Math.PI / 2.2;
      group.add(shadow);

      scene.add(group);
      meshes.push(group);
    });

    artworkMeshesRef.current = meshes;

    // 6. Interaction Handlers: Pointer drag, wheel & click
    const onPointerDown = (e) => {
      isDraggingRef.current = true;
      setIsInteracting(true);
      dragStartXRef.current = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      dragStartCurrentXRef.current = targetXRef.current;
    };

    const onPointerMove = (e) => {
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      // Update normalized mouse vector for raycasting
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      if (!isDraggingRef.current) return;
      const deltaX = clientX - dragStartXRef.current;
      targetXRef.current = dragStartCurrentXRef.current + (deltaX * 0.012);

      // Clamp boundary
      const maxScroll = 0;
      const minScroll = -(artworks.length - 1) * SPACING;
      targetXRef.current = Math.max(minScroll - 1.5, Math.min(maxScroll + 1.5, targetXRef.current));
    };

    const onPointerUp = (e) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsInteracting(false);

      // Snap to nearest artwork
      const nearestIndex = Math.round(-targetXRef.current / SPACING);
      const clamped = Math.max(0, Math.min(artworks.length - 1, nearestIndex));
      scrollToIndex(clamped);
    };

    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
      targetXRef.current -= delta * 0.006;
      const minScroll = -(artworks.length - 1) * SPACING;
      targetXRef.current = Math.max(minScroll, Math.min(0, targetXRef.current));

      const nearestIndex = Math.round(-targetXRef.current / SPACING);
      const clamped = Math.max(0, Math.min(artworks.length - 1, nearestIndex));
      setActiveIndex(clamped);
    };

    const onClick = (e) => {
      // Raycast to check clicked artwork
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera({ x, y }, camera);

      const intersects = raycasterRef.current.intersectObjects(
        meshes.map((m) => m.children[0]),
        false
      );

      if (intersects.length > 0) {
        const clickedMesh = intersects[0].object;
        const index = clickedMesh.userData.index;
        if (index === activeIndex) {
          // Open lightbox on center artwork click
          setLightboxArtwork(clickedMesh.userData.artwork);
        } else {
          // Scroll to clicked artwork
          scrollToIndex(index);
        }
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('click', onClick);

    // 7. Window resize handler
    const onResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', onResize);

    // 8. Animation Loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Smooth lerp to target scroll position
      currentXRef.current += (targetXRef.current - currentXRef.current) * 0.085;

      // Position each artwork group in parabolic 3D arc
      meshes.forEach((group, idx) => {
        const relativeX = group.position.x + currentXRef.current;
        const distanceFromCenter = Math.abs(relativeX);

        // Subtle curved gallery depth (parabolic Z curve)
        group.position.z = -Math.pow(distanceFromCenter * 0.38, 2);
        
        // Gentle Y position alignment and rotation facing viewer
        group.rotation.y = -relativeX * 0.045;
        
        // Scale center artwork slightly
        const scale = Math.max(0.85, 1.08 - distanceFromCenter * 0.045);
        group.scale.set(scale, scale, 1);
      });

      // Shift camera slightly based on mouse for parallax
      camera.position.x = currentXRef.current * -0.05 + mouseRef.current.x * 0.2;
      camera.position.y = mouseRef.current.y * 0.15;

      // Slowly rotate particle dust
      particleSystem.rotation.y += 0.0006;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationId);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);

      // Dispose geometries & materials
      geometry.dispose();
      meshes.forEach((g) => {
        g.children.forEach((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        });
        scene.remove(g);
      });
      renderer.dispose();
    };
  }, [artworks, SPACING, scrollToIndex]);

  const currentArt = artworks[activeIndex] || artworks[0];

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-[#050505] border border-neutral-800 shadow-2xl">
      
      {/* 3D WebGL Canvas Viewport */}
      <div 
        ref={containerRef} 
        className="w-full h-[72vh] min-h-[520px] sm:min-h-[620px] cursor-grab active:cursor-grabbing select-none"
        title="Drag left/right or scroll to browse artworks"
      />

      {/* Floating HUD: Header Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-red-500/30 text-xs font-mono text-white shadow-lg pointer-events-auto">
          <Sparkles className="w-3.5 h-3.5 text-red-500 animate-pulse" />
          <span>SAMYAK 3D ARTWORK EXHIBITION</span>
          <span className="text-red-400 font-bold ml-1">[{activeIndex + 1}/{artworks.length}]</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-neutral-800 text-[11px] font-mono text-neutral-400">
          <span>Drag or Scroll to Pan • Click artwork to inspect</span>
        </div>
      </div>

      {/* Navigation Arrows */}
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-20">
        <button
          type="button"
          onClick={handlePrev}
          disabled={activeIndex === 0}
          className="p-3 rounded-full bg-black/70 hover:bg-red-600 border border-neutral-700 hover:border-red-500 text-white transition-all pointer-events-auto cursor-pointer disabled:opacity-30 disabled:hover:bg-black/70 shadow-xl hover:scale-105"
          aria-label="Previous Artwork"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none z-20">
        <button
          type="button"
          onClick={handleNext}
          disabled={activeIndex === artworks.length - 1}
          className="p-3 rounded-full bg-black/70 hover:bg-red-600 border border-neutral-700 hover:border-red-500 text-white transition-all pointer-events-auto cursor-pointer disabled:opacity-30 disabled:hover:bg-black/70 shadow-xl hover:scale-105"
          aria-label="Next Artwork"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Floating Bottom Metadata Card */}
      {currentArt && (
        <div className="absolute bottom-5 left-4 right-4 sm:left-8 sm:right-auto sm:max-w-md p-4 sm:p-5 rounded-2xl bg-black/85 backdrop-blur-xl border border-red-500/40 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-20">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-red-950/80 border border-red-500/50 text-red-300">
              {currentArt.category}
            </span>
            <span className="text-[10px] font-mono text-neutral-400">
              {currentArt.department}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-black font-heading text-white line-clamp-1">
            {currentArt.title}
          </h3>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLightboxArtwork(currentArt)}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white text-xs font-heading font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Inspect Artwork</span>
            </button>

            <button
              type="button"
              onClick={() => navigate(`/events/${currentArt.id}`)}
              className="py-2 px-3.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-mono flex items-center justify-center gap-1.5 border border-neutral-700 hover:border-red-500 cursor-pointer transition-all"
              title="View full event arena details"
            >
              <ExternalLink className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">Event Arena</span>
            </button>
          </div>
        </div>
      )}

      {/* Full-Screen Exhibition Artwork Lightbox */}
      <AnimatePresence>
        {lightboxArtwork && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[250] bg-black/92 backdrop-blur-2xl flex items-center justify-center p-4"
            onClick={() => setLightboxArtwork(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full max-h-[92vh] flex flex-col items-center bg-[#0D0D0D] border border-red-500/50 rounded-3xl p-5 shadow-[0_0_80px_rgba(223,37,49,0.35)] overflow-hidden"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setLightboxArtwork(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-neutral-900 hover:bg-red-600 text-white border border-neutral-700 transition-colors cursor-pointer z-30"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Artwork Frame */}
              <div className="w-full max-h-[68vh] aspect-[4/5] max-w-[480px] rounded-2xl overflow-hidden bg-black border border-neutral-800 flex items-center justify-center shadow-2xl">
                <img
                  src={lightboxArtwork.image}
                  alt={lightboxArtwork.title}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/hero-bg.png';
                  }}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Artwork Details Bar */}
              <div className="w-full mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono uppercase text-red-400 font-bold">
                      {lightboxArtwork.category}
                    </span>
                    <span className="text-xs font-mono text-neutral-500">•</span>
                    <span className="text-xs font-mono text-neutral-400">
                      {lightboxArtwork.department}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black font-heading text-white">
                    {lightboxArtwork.title}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setLightboxArtwork(null);
                    navigate(`/events/${lightboxArtwork.id}`);
                  }}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 hover:brightness-110 text-white font-heading text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto shadow-lg"
                >
                  <span>Open Event Page</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
