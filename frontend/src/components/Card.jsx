export default function Card({ className = "", children, onMouseMove, ...rest }) {
  // Tracks the pointer so the spotlight gradient follows it across the card.
  function handleMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
    if (onMouseMove) onMouseMove(event);
  }

  return (
    <div className={`card ${className}`.trim()} onMouseMove={handleMove} {...rest}>
      {children}
    </div>
  );
}