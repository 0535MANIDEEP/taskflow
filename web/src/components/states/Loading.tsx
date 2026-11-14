export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="state-loading">
      <span className="state-loading__label">{label}</span>
      <div className="state-loading__rows" aria-hidden="true">
        {[0, 1, 2].map((row) => (
          <div key={row} className="state-loading__row" />
        ))}
      </div>
    </div>
  );
}
