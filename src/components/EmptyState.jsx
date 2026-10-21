/** Friendly empty / no-result state with an optional call to action. */
export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="ui-empty" role="status">
      {Icon && (
        <span className="ui-empty-icon">
          <Icon size={28} aria-hidden="true" />
        </span>
      )}
      <strong>{title}</strong>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}
