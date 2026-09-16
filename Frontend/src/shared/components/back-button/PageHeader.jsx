import BackButton from "./BackButton.jsx";

export default function PageHeader({
  action,
  className = "",
  fallback,
  preferFallback,
  title,
}) {
  return (
    <header className={`page-header ${className}`.trim()}>
      <BackButton
        className="page-header__back"
        fallback={fallback}
        preferFallback={preferFallback}
      />
      <h1 className="page-header__title">{title}</h1>
      {action && <div className="page-header__action">{action}</div>}
    </header>
  );
}
