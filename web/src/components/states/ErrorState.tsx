interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'That did not load',
  description,
  onRetry,
}: ErrorStateProps) {
  return (
    <div role="alert" className="state-error">
      <h2 className="state-error__title">{title}</h2>
      <p className="state-error__description">{description}</p>
      {onRetry ? (
        <button type="button" className="button button--ghost" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
