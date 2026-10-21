import { Star } from "lucide-react";

// Read-only stars. `value` may be a decimal (4.6).
export function StarRating({ value, count, size = 15, showEmpty = false }) {
  const n = Number(value);
  const has = Number.isFinite(n) && n > 0 && Number(count) > 0;

  if (!has) {
    return showEmpty ? <span className="mm-stars mm-stars--none">No ratings yet</span> : null;
  }

  return (
    <span className="mm-stars" title={`${n.toFixed(1)} out of 5 from ${count} ${count === 1 ? "rating" : "ratings"}`}>
      <Star size={size} fill="currentColor" aria-hidden="true" />
      <strong>{n.toFixed(1)}</strong>
      <small>({count})</small>
      <span className="sr-only">rated {n.toFixed(1)} out of 5 stars by {count} buyers</span>
    </span>
  );
}

// Tap-to-rate stars.
export function StarInput({ value, onChange, label, size = 30 }) {
  return (
    <div className="mm-starinput" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
          className={n <= value ? "is-on" : ""}
          onClick={() => onChange(n)}
        >
          <Star size={size} fill={n <= value ? "currentColor" : "none"} />
        </button>
      ))}
    </div>
  );
}