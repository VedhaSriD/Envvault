// Pixel heartbeat line. Pulses while the server is online, stays flat when offline.
export default function Heartbeat({ online }) {
  const state = online === true ? "is-live" : online === false ? "is-down" : "";
  return (
    <svg
      className={`heartbeat ${state}`.trim()}
      width="64"
      height="16"
      viewBox="0 0 16 4"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path d="M0 2h4l1-2 1 4 1-2h8" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}