const DOTS = [
  { x: 12, y: 18, d: 0 },
  { x: 58, y: 34, d: 1.4 },
  { x: 82, y: 12, d: 2.6 },
  { x: 30, y: 70, d: 0.8 },
  { x: 70, y: 76, d: 2.1 },
];

// Faint dot grid with a few lime pixels that pulse on their own timing.
export default function PulseGrid() {
  return (
    <div className="bd-pulsegrid">
      {DOTS.map((dot, index) => (
        <span
          key={index}
          className="bd-pulse-dot"
          style={{ left: `${dot.x}%`, top: `${dot.y}%`, animationDelay: `${dot.d}s` }}
        />
      ))}
    </div>
  );
}