import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Eye } from 'lucide-react'

function Row({ index, sub, editable, onView }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: String(sub.id),
    disabled: !editable,
  })
  return (
    <li
      ref={setNodeRef}
      className={`agenda-row${isDragging ? ' is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {editable && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          className="agenda-handle"
          aria-label={`Déplacer le dossier ${index + 1}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
      )}
      <span className="agenda-rank">{index + 1}</span>
      <div className="agenda-main">
        <strong>{sub.patient_name || 'Patient non renseigné'}</strong>
        <span className="agenda-meta">
          {sub.form_name} · {sub.submitted_by_name}
        </span>
      </div>
      <button type="button" className="agenda-view" onClick={() => onView(sub)} aria-label={`Voir le dossier de ${sub.patient_name || 'ce patient'}`}>
        <Eye size={15} aria-hidden="true" /> Voir
      </button>
    </li>
  )
}

export default function AgendaOrderList({ submissions, editable, saving, onReorder, onView }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = submissions.map((s) => String(s.id))

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    onReorder(arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id)))
  }

  return (
    <div className="agenda" aria-busy={saving}>
      {editable && (
        <p className="agenda-hint">Glissez les dossiers (ou utilisez le clavier : espace, flèches, espace) pour fixer l’ordre de passage.</p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="agenda-list">
            {submissions.map((sub, i) => (
              <Row key={sub.id} index={i} sub={sub} editable={editable} onView={onView} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  )
}
