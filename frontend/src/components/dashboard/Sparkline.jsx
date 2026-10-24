// 7-column pixel bar sparkline. Values are scaled to the tallest bar.
export default function Sparkline({ values, color = "var(--accent)", label }) {
  const max = Math.max(1, ...values);
  const rows = 6;
  return (
    <svg
      className="sparkline"
      width={7 * 6}
      height={rows * 4}
      viewBox={`0 0 7 ${rows}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      <g style={{ fill: color }}>
        {values.map((value, x) => {
          const height = Math.max(value > 0 ? 1 : 0, Math.round((value / max) * rows));
          return height > 0 ? (
            <rect key={x} x={x} y={rows - height} width="1" height={height} />
          ) : null;
        })}
      </g>
    </svg>
  );
}