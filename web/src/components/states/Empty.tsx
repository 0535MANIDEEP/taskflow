interface EmptyProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function Empty({ title, description, action }: EmptyProps) {
  return (
    <div className="state-empty">
      <h2 className="state-empty__title">{title}</h2>
      <p className="state-empty__description">{description}</p>
      {action}
    </div>
  );
}
