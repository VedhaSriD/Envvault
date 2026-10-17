import { useEffect, useRef } from "react";

const PIX = 4; // one pixel block, in CSS px
const DOC_W = 10; // document size, in blocks
const DOC_H = 12;
const SPAWN_EVERY = 1.8; // was 0.9: fewer new documents
const MAX_ITEMS = 6; // was 14: fewer on screen at once
const LOCK_TIME = 1.4; // seconds a document spends locked before it dissolves
const VAULT_RATIO = 0.8; // vault line at 80% of the hero's height

function cssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

// Deterministic pseudo-random value, so each document dissolves the same way every time.
function rand(seed) {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

export default function PixelField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const host = canvas.parentElement;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const colors = {
      bg: cssVar("--bg", "#f3f4ef"),
      ink: cssVar("--text", "#0d0e11"),
      paper: cssVar("--surface", "#ffffff"),
      line: cssVar("--line", "#d6d9cf"),
      accent: cssVar("--accent", "#c8f560"),
    };

    let width = 0;
    let height = 0;
    let vaultY = 0;
    let items = [];
    let spawnTimer = 0;
    let last = performance.now();
    let frameId = 0;

    function resize() {
      const rect = host.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      width = Math.max(1, Math.floor(rect.width));
      height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      vaultY = Math.round((height * VAULT_RATIO) / PIX) * PIX;
    }

    function spawn(startY) {
      const cols = Math.max(1, Math.floor((width - DOC_W * PIX) / PIX));
      items.push({
        x: Math.floor(Math.random() * cols) * PIX,
        y: startY,
        speed: 26 + Math.random() * 30,
        phase: "fall",
        t: 0,
        seed: Math.random() * 1000,
      });
    }

    function drawVault() {
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = colors.ink;
      for (let x = 0; x < width; x += PIX * 4) {
        ctx.fillRect(x, vaultY, PIX * 2, PIX);
      }
      ctx.globalAlpha = 1;
    }

    function drawDocument(x, y, fill, alpha) {
      const top = Math.round(y / PIX) * PIX;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colors.ink;
      ctx.fillRect(x, top, DOC_W * PIX, DOC_H * PIX);
      ctx.fillStyle = fill;
      ctx.fillRect(x + PIX, top + PIX, (DOC_W - 2) * PIX, (DOC_H - 2) * PIX);
      ctx.fillStyle = colors.line;
      for (let row = 0; row < 4; row += 1) {
        const lineWidth = (row === 2 ? 4 : 6) * PIX;
        ctx.fillRect(x + 2 * PIX, top + (3 + row * 2) * PIX, lineWidth, PIX);
      }
      ctx.globalAlpha = 1;
    }

    function drawPadlock(x, y, alpha) {
      const top = Math.round(y / PIX) * PIX;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = colors.ink;
      ctx.fillRect(x + 3 * PIX, top + 2 * PIX, 4 * PIX, PIX);
      ctx.fillRect(x + 3 * PIX, top + 3 * PIX, PIX, 2 * PIX);
      ctx.fillRect(x + 6 * PIX, top + 3 * PIX, PIX, 2 * PIX);
      ctx.fillRect(x + 2 * PIX, top + 5 * PIX, 6 * PIX, 4 * PIX);
      ctx.globalAlpha = 1;
    }

    function drawLocked(it) {
      const progress = Math.min(1, it.t / LOCK_TIME);
      const fade = progress > 0.6 ? Math.max(0, 1 - (progress - 0.6) / 0.4) : 1;

      drawDocument(it.x, it.y, colors.accent, fade);
      drawPadlock(it.x, it.y, fade);

      if (progress > 0.5) {
        const cells = Math.floor(((progress - 0.5) / 0.5) * DOC_W * DOC_H);
        const top = Math.round(it.y / PIX) * PIX;
        ctx.fillStyle = colors.bg;
        for (let i = 0; i < cells; i += 1) {
          const col = Math.floor(rand(it.seed + i * 7.31) * DOC_W);
          const row = Math.floor(rand(it.seed + i * 3.17) * DOC_H);
          ctx.fillRect(it.x + col * PIX, top + row * PIX, PIX, PIX);
        }
      }
    }

    function step(dt) {
      spawnTimer += dt;
      if (spawnTimer >= SPAWN_EVERY) {
        spawnTimer = 0;
        if (items.length < MAX_ITEMS) spawn(-DOC_H * PIX);
      }

      ctx.clearRect(0, 0, width, height);
      drawVault();

      items = items.filter((it) => {
        if (it.phase === "fall") {
          it.y += it.speed * dt;
          if (it.y + DOC_H * PIX >= vaultY) {
            it.phase = "lock";
            it.t = 0;
            it.y = vaultY - DOC_H * PIX;
          }
          drawDocument(it.x, it.y, colors.paper, 1);
          return true;
        }
        it.t += dt;
        drawLocked(it);
        return it.t < LOCK_TIME;
      });
    }

    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt);
      frameId = requestAnimationFrame(loop);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    if (reduce) {
      // One still frame with a few documents, no motion.
          for (let i = 0; i < 2; i += 1) spawn(Math.random() * (vaultY - DOC_H * PIX));
      step(0);
      return () => observer.disconnect();
    }

    // Start with some documents already on screen so the field is never empty.
    for (let i = 0; i < 5; i += 1) spawn(Math.random() * (vaultY - DOC_H * PIX));
    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="pixel-field" aria-hidden="true" />;
}