import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getForm, createForm, updateForm } from '../api/formsApi'
import { getSections, createSection } from '../api/sectionsApi'
import SectionBuilder from '../components/SectionBuilder'

export default function FormBuilder() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState({
    name: '',
    description: ''
  })
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isEdit) {
      loadForm()
    }
  }, [id])

  const loadForm = async () => {
    try {
      const formData = await getForm(id)
      setForm(formData)
      const sectionsData = await getSections({ form: id })
      setSections(sectionsData)
    } catch (err) {
      setError('Échec du chargement du formulaire')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveForm = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      let savedForm
      if (isEdit) {
        savedForm = await updateForm(id, form)
      } else {
        savedForm = await createForm(form)
      }
      setForm(savedForm)
      if (!isEdit) {
        navigate(`/forms/${savedForm.id}/edit`)
      } else {
        alert('Formulaire mis à jour avec succès')
      }
    } catch (err) {
      setError('Échec de l\'enregistrement du formulaire')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleAddSection = async (parentId = null) => {
    if (!form.id) {
      alert('Veuillez d\'abord enregistrer le formulaire')
      return
    }
    try {
      const order = sections.filter(s => s.parent === parentId).length
      const newSection = await createSection({
        form: form.id,
        parent: parentId,
        name: parentId ? 'Nouvelle sous-section' : 'Nouvelle section',
        order: order
      })
      setSections([...sections, newSection])
    } catch (err) {
      setError('Échec de la création de la section')
    }
  }

  if (loading) return <div className="loading">Chargement du formulaire...</div>
  if (error) return <div className="error">{error}</div>

  return (
    <div className="form-builder">
      <h2>{isEdit ? 'Modifier le formulaire' : 'Créer un nouveau formulaire'}</h2>

      <form onSubmit={handleSaveForm} className="form-details">
        <div className="form-group">
          <label>Nom du formulaire *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows="3"
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? 'Enregistrement...' : isEdit ? 'Mettre à jour' : 'Créer le formulaire'}
        </button>
      </form>

      {form.id && (
        <div className="sections-container">
          <div className="sections-header">
            <h3>Sections</h3>
            <button onClick={() => handleAddSection()} className="btn-secondary">+ Ajouter une section</button>
          </div>

          {sections.length === 0 ? (
            <p className="empty">Aucune section. Ajoutez-en une pour commencer.</p>
          ) : (
            <div className="sections-list">
              {sections.filter(s => !s.parent).sort((a,b) => a.order - b.order).map(section => (
                <SectionBuilder
                  key={section.id}
                  section={section}
                  allSections={sections}
                  onUpdate={(updated) => {
                    setSections(sections.map(s => s.id === updated.id ? updated : s))
                  }}
                  onDelete={() => loadForm()} // Reload to handle recursive deletion cleanly
                  onAddSection={(newSection) => {
                    setSections([...sections, newSection])
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
