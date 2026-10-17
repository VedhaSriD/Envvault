import { useEffect, useRef, useState } from "react";

const COUNT = 6;

// Padlocks light up one by one while the section is in view.
export default function LockRow() {
  const ref = useRef(null);
  const [lit, setLit] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setLit(COUNT);
      return undefined;
    }
    let timer = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let step = 0;
          timer = setInterval(() => {
            step += 1;
            setLit(step);
            if (step >= COUNT) clearInterval(timer);
          }, 420);
        } else {
          clearInterval(timer);
          setLit(0);
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      clearInterval(timer);
    };
  }, []);

  return (
    <div ref={ref} className="bd-lockrow">
      {Array.from({ length: COUNT }, (_, index) => (
        <svg
          key={index}
          className={`bd-lock ${index < lit ? "is-lit" : ""}`.trim()}
          width="28"
          height="34"
          viewBox="0 0 7 9"
          shapeRendering="crispEdges"
        >
          <rect x="2" y="0" width="3" height="1" />
          <rect x="1" y="1" width="1" height="2" />
          <rect x="5" y="1" width="1" height="2" />
          <rect x="0" y="3" width="7" height="6" />
        </svg>
      ))}
    </div>
  );
}