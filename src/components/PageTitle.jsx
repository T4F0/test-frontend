/**
 * The single <h1> of a page: a consistent icon + title, replacing emoji-in-heading markup.
 * `icon` is a lucide component.
 */
export default function PageTitle({ icon: Icon, children, size = 28, as: Tag = 'h1', className = '' }) {
  return (
    <Tag className={`page-title ${className}`}>
      {Icon && <Icon className="page-title-icon" size={size} aria-hidden="true" />}
      <span>{children}</span>
    </Tag>
  )
}
