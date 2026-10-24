// 8x8 pixel sprites. "#" = filled pixel, "." = empty.
const SPRITES = {
  shield: [
    "..####..",
    ".######.",
    "########",
    "##.##.##",
    "##.##.##",
    "########",
    ".######.",
    "...##...",
  ],
  lock: [
    "..####..",
    ".##..##.",
    ".##..##.",
    "########",
    "###..###",
    "###..###",
    "########",
    "........",
  ],
  key: [
    "..####..",
    ".#....#.",
    ".#....#.",
    "..####..",
    "...##...",
    "...##...",
    "...###..",
    "...##...",
  ],
  users: [
    "..##....",
    ".####...",
    "..##....",
    "########",
    "..##..##",
    ".####.##",
    "..##..##",
    "........",
  ],
  pulse: [
    "........",
    "...##...",
    "..####..",
    ".######.",
    ".######.",
    "..####..",
    "...##...",
    "........",
  ],
};

// Renders a named sprite as crisp SVG rectangles.
// `color` takes any CSS color, including var(--accent) and var(--danger).
export default function PixelSprite({ name, size = 4, color = "var(--accent)", className = "" }) {
  const rows = SPRITES[name];
  if (!rows) return null;
  const width = rows[0].length;
  const height = rows.length;

  return (
    <svg
      className={`pixel-sprite ${className}`.trim()}
      width={width * size}
      height={height * size}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <g style={{ fill: color }}>
        {rows.flatMap((row, y) =>
          [...row].map((cell, x) =>
            cell === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" /> : null
          )
        )}
      </g>
    </svg>
  );
}