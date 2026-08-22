import { useEffect, useRef } from "react";

export type SignalMode = "coherent" | "dispersed" | "beam" | "split" | "resolve";

type SignalParticle = {
  seed: number;
  lane: number;
  x: number;
  y: number;
  size: number;
};

const TAU = Math.PI * 2;

function random(seed: number) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function pointTarget(particle: SignalParticle, index: number, count: number, width: number, height: number, mode: SignalMode) {
  const progress = index / Math.max(1, count - 1);
  const angle = index * 2.399963229728653;
  const noiseA = random(particle.seed + 2);
  const noiseB = random(particle.seed + 7);

  if (mode === "dispersed") {
    return {
      x: width * (0.08 + noiseA * 0.84),
      y: height * (0.08 + noiseB * 0.84),
      human: particle.lane === 1,
    };
  }

  if (mode === "beam") {
    const y = height * (0.07 + progress * 0.86);
    return {
      x: width * 0.52 + Math.sin(index * 0.43) * (10 + noiseA * 24) + (particle.lane === 1 ? 18 : -8),
      y,
      human: particle.lane === 1 && index % 3 === 0,
    };
  }

  if (mode === "split") {
    const branch = particle.lane === 1 ? 1 : -1;
    const branchProgress = Math.pow(progress, 0.72);
    return {
      x: width * 0.5 + branch * (width * (0.08 + branchProgress * 0.34)) + Math.sin(index * 0.6) * 16,
      y: height * (0.48 + Math.sin(index * 0.31) * 0.25 + (noiseB - 0.5) * 0.22),
      human: particle.lane === 1,
    };
  }

  if (mode === "resolve") {
    const ring = index % 4;
    const radius = (ring + 1) * Math.min(width, height) * 0.054 + noiseA * 8;
    return {
      x: width * 0.5 + Math.cos(angle) * radius * 1.08,
      y: height * 0.5 + Math.sin(angle) * radius * 0.76,
      human: particle.lane === 1 && ring === 0,
    };
  }

  const radius = Math.sqrt(progress) * Math.min(width, height) * (0.16 + noiseA * 0.13);
  return {
    x: width * 0.5 + Math.cos(angle) * radius * 1.18,
    y: height * 0.5 + Math.sin(angle) * radius * 0.82,
    human: particle.lane === 1 && progress > 0.54,
  };
}

export function CinematicSignalField({ mode, className = "" }: { mode: SignalMode; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    const count = coarsePointer ? 112 : 440;
    const particles: SignalParticle[] = Array.from({ length: count }, (_, index) => ({
      seed: index + 1,
      lane: index % 9 === 0 || index % 17 === 0 ? 1 : 0,
      x: 0,
      y: 0,
      size: 0.55 + random(index + 30) * 1.35,
    }));
    const pointer = { x: -1000, y: -1000 };
    let dimensions = { width: 0, height: 0, pixelRatio: 1 };
    let animationFrame: number | null = null;
    let pageVisible = !document.hidden;
    let inViewport = true;

    const shouldAnimate = () => !reduceMotion && pageVisible && inViewport;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, coarsePointer ? 1.25 : 1.65);
      dimensions = { width: Math.max(1, bounds.width), height: Math.max(1, bounds.height), pixelRatio };
      canvas.width = Math.round(dimensions.width * pixelRatio);
      canvas.height = Math.round(dimensions.height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      particles.forEach((particle, index) => {
        const target = pointTarget(particle, index, particles.length, dimensions.width, dimensions.height, modeRef.current);
        particle.x = target.x;
        particle.y = target.y;
      });
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, dimensions.width, dimensions.height);
      context.globalCompositeOperation = "lighter";

      particles.forEach((particle, index) => {
        const target = pointTarget(particle, index, particles.length, dimensions.width, dimensions.height, modeRef.current);
        const drift = reduceMotion ? 0 : Math.sin(time * 0.00105 + particle.seed * 1.9) * 2.2;
        const dx = particle.x - pointer.x;
        const dy = particle.y - pointer.y;
        const distance = Math.hypot(dx, dy) || 1;
        const influence = !reduceMotion && distance < 116 ? ((116 - distance) / 116) ** 2 : 0;
        const repelX = influence * (dx / distance) * 32;
        const repelY = influence * (dy / distance) * 25;
        const interpolation = reduceMotion ? 1 : 0.052;

        particle.x += (target.x + repelX - particle.x) * interpolation;
        particle.y += (target.y + drift + repelY - particle.y) * interpolation;

        const isHuman = target.human;
        const alpha = modeRef.current === "dispersed" ? 0.38 + random(particle.seed + 19) * 0.25 : 0.54 + random(particle.seed + 19) * 0.35;
        context.beginPath();
        context.fillStyle = isHuman ? `rgba(255,138,92,${alpha})` : `rgba(60,217,168,${alpha})`;
        context.arc(particle.x, particle.y, particle.size + influence * 0.9, 0, TAU);
        context.fill();
      });

      context.globalCompositeOperation = "source-over";
      if (shouldAnimate()) animationFrame = window.requestAnimationFrame(draw);
      else animationFrame = null;
    };

    const onPointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = event.clientX - bounds.left;
      pointer.y = event.clientY - bounds.top;
    };
    const onPointerLeave = () => {
      pointer.x = -1000;
      pointer.y = -1000;
    };
    const onVisibilityChange = () => {
      pageVisible = !document.hidden;
      if (shouldAnimate() && animationFrame === null) animationFrame = window.requestAnimationFrame(draw);
    };
    const intersectionObserver = new IntersectionObserver(
      entries => {
        inViewport = entries.some(entry => entry.isIntersecting);
        if (!inViewport && animationFrame !== null) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }
        if (shouldAnimate() && animationFrame === null) animationFrame = window.requestAnimationFrame(draw);
      },
      { rootMargin: "180px 0px" },
    );

    resize();
    draw(0);
    intersectionObserver.observe(canvas);
    window.addEventListener("resize", resize);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      intersectionObserver.disconnect();
      if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return <canvas ref={canvasRef} className={`cinematic-signal-field cinematic-signal-field--${mode} ${className}`} aria-hidden="true" />;
}
