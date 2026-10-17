import { useEffect, useState } from "react";

// Types the text once. Reduced-motion users get the full text immediately.
export default function Typewriter({ text, speed = 36, className = "" }) {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [count, setCount] = useState(reduce ? text.length : 0);

  useEffect(() => {
    if (reduce) return undefined;
    setCount(0);
    let index = 0;
    const id = setInterval(() => {
      index += 1;
      setCount(index);
      if (index >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed, reduce]);

  const done = count >= text.length;

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, count)}</span>
      <span className={`caret ${done ? "caret-done" : ""}`.trim()} aria-hidden="true">
        ▌
      </span>
    </span>
  );
}