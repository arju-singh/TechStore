export default function Stars({
  rating,
  numReviews,
}: {
  rating: number;
  numReviews?: number;
}) {
  const pct = (Math.max(0, Math.min(5, rating)) / 5) * 100;

  return (
    <div className="flex items-center gap-1.5">
      {/* Gold star row with a clipped overlay for the exact rating */}
      <span className="relative inline-block leading-none" aria-hidden>
        <span className="flex text-amz-border">
          <StarRow />
        </span>
        <span
          className="absolute inset-0 flex overflow-hidden text-amz-star"
          style={{ width: `${pct}%` }}
        >
          <StarRow />
        </span>
      </span>
      {typeof numReviews === "number" && (
        <span className="text-xs font-medium text-amz-link">
          {numReviews.toLocaleString("en-IN")}
        </span>
      )}
      <span className="sr-only">{rating.toFixed(1)} out of 5 stars</span>
    </div>
  );
}

function StarRow() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.36 4.18a1 1 0 0 0 .95.69h4.4c.97 0 1.37 1.24.59 1.81l-3.56 2.59a1 1 0 0 0-.36 1.12l1.36 4.18c.3.92-.75 1.69-1.54 1.12l-3.56-2.59a1 1 0 0 0-1.18 0l-3.56 2.59c-.78.57-1.83-.2-1.54-1.12l1.36-4.18a1 1 0 0 0-.36-1.12L1.15 9.6c-.78-.57-.38-1.81.59-1.81h4.4a1 1 0 0 0 .95-.69L8.45 2.93Z" />
        </svg>
      ))}
    </>
  );
}
