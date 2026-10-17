import { useEffect, useRef } from "react";

// Left column holds dark plaintext blocks that never move across.
// Grey ciphertext blocks drift from left to right through the divider.
export default function DualColumn() {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d");
    const PIX = 4;
    let width = 0;
    let height = 0;
    let frame = 0;
    let last = performance.now();
    let items = [];
    const style = getComputedStyle(document.documentElement);
    const ink = style.getPropertyValue("--text").trim() || "#0d0e11";
    const muted = style.getPropertyValue("--muted").trim() || "#5e646e";

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      items = Array.from({ length: 8 }, (_, i) => ({
        y: Math.round((height * (i + 1)) / 9 / PIX) * PIX,
        x: Math.round((width * (0.1 + Math.random() * 0.25)) / PIX) * PIX,
        speed: 14 + Math.random() * 10,
        cipher: i % 2 === 1,
      }));
    }

    function drawBlock(x, y, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x / PIX) * PIX, Math.round(y / PIX) * PIX, PIX * 3, PIX * 2);
    }

    function tick(now) {
      const dt = (now - last) / 1000;
      last = now;
      ctx.clearRect(0, 0, width, height);
      const divider = Math.round((width * 0.5) / PIX) * PIX;

      ctx.fillStyle = muted;
      ctx.globalAlpha = 0.35;
      for (let y = 0; y < height; y += PIX * 4) {
        ctx.fillRect(divider, y, PIX, PIX * 2);
      }
      ctx.globalAlpha = 1;

      items.forEach((it) => {
        if (!reduce) {
          it.x += it.speed * dt;
          if (it.x > width) it.x = Math.round((width * 0.08) / PIX) * PIX;
        }
        if (it.cipher) {
          drawBlock(it.x, it.y, muted);
        } else {
          drawBlock(Math.min(it.x, divider - PIX * 6), it.y, ink);
        }
      });
      frame = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    if (reduce) {
      tick(performance.now());
      cancelAnimationFrame(frame);
    } else {
      frame = requestAnimationFrame(tick);
    }
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="bd-canvas" />;
}