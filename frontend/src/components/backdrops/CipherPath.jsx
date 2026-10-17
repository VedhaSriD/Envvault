import { useEffect, useRef } from "react";

// A pixel path draws itself left to right, and small ciphertext blocks travel along it.
export default function CipherPath() {
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
    let t = 0;
    let last = performance.now();
    const style = getComputedStyle(document.documentElement);
    const ink = style.getPropertyValue("--text").trim() || "#0d0e11";
    const lime = style.getPropertyValue("--accent").trim() || "#c8f560";
    const grey = style.getPropertyValue("--line").trim() || "#d6d9cf";

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function block(x, y, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x / PIX) * PIX, Math.round(y / PIX) * PIX, PIX * 2, PIX * 2);
    }

    function draw(progress, now) {
      ctx.clearRect(0, 0, width, height);
      const y = Math.round((height * 0.5) / PIX) * PIX;
      const startX = Math.round((width * 0.12) / PIX) * PIX;
      const endX = Math.round((width * 0.88) / PIX) * PIX;
      const drawn = startX + (endX - startX) * Math.min(1, progress);

      ctx.fillStyle = grey;
      for (let x = startX; x <= drawn; x += PIX * 2) {
        ctx.fillRect(x, y, PIX, PIX);
      }
      block(startX - PIX * 4, y - PIX * 2, ink);
      block(endX + PIX * 2, y - PIX * 2, ink);

      if (progress >= 1) {
        const travel = ((now / 1600) % 1);
        for (let i = 0; i < 3; i += 1) {
          const p = (travel + i / 3) % 1;
          block(startX + (endX - startX) * p, y - PIX * 2, lime);
        }
      }
    }

    function tick(now) {
      const dt = (now - last) / 1000;
      last = now;
      if (!reduce) t += dt;
      const progress = reduce ? 1 : Math.min(1, t / 3.5);
      draw(progress, now);
      frame = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener("resize", resize);
    if (reduce) {
      draw(1, 0);
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