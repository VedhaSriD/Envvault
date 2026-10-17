export function Skeleton({ height = 16, width = "100%" }) {
  return <div className="skeleton" style={{ height, width }} aria-hidden="true" />;
}

export function SkeletonList({ rows = 3 }) {
  return (
    <div className="stack" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={68} />
      ))}
    </div>
  );
}