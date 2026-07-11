import { useState, useEffect } from "react"
import { getForms } from "../api/formsApi"
import { exportFormSubmissions } from "../api/submissionsApi"
import { formatDate } from "../lib/dateUtils"
import {
  X, FileSpreadsheet, Download, CheckCircle2, Loader2,
  ClipboardList, Check
} from "lucide-react"

export default function ExportFormsModal({ onClose }) {
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [phase, setPhase] = useState("select") // select | exporting | done
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0, currentName: "" })
  const [exportedFiles, setExportedFiles] = useState([])
  const [exportError, setExportError] = useState(null)

  useEffect(() => {
    loadForms()
    document.body.style.overflow = "hidden"
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = ""
    }
  }, [])

  const loadForms = async () => {
    try {
      const data = await getForms()
      const formsArray = Array.isArray(data) ? data : (data?.results || [])
      setForms(formsArray)
    } catch {
      setForms([])
    } finally {
      setLoading(false)
    }
  }

  const toggleForm = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === forms.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(forms.map((f) => f.id)))
    }
  }

  const handleExport = async () => {
    const selectedForms = forms.filter((f) => selectedIds.has(f.id))
    if (selectedForms.length === 0) return

    setPhase("exporting")
    setExportProgress({ current: 0, total: selectedForms.length, currentName: "" })
    setExportedFiles([])
    setExportError(null)

    for (let i = 0; i < selectedForms.length; i++) {
      const form = selectedForms[i]
      setExportProgress({ current: i + 1, total: selectedForms.length, currentName: form.name })
      try {
        await exportFormSubmissions(form.id, form.name)
        setExportedFiles((prev) => [...prev, form.name])
      } catch (err) {
        setExportError(`Échec de l'export pour "${form.name}"`)
        console.error(err)
      }
      // Small delay between downloads to let browser process each
      if (i < selectedForms.length - 1) {
        await new Promise((r) => setTimeout(r, 300))
      }
    }

    setPhase("done")
  }

  const isAllSelected = forms.length > 0 && selectedIds.size === forms.length

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.45)",
          zIndex: 1000,
          backdropFilter: "blur(3px)",
        }}
      />

      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "520px",
          maxWidth: "95vw",
          maxHeight: "85vh",
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.18)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e2e8f0",
            background: "#f8fafc",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2563eb",
              }}
            >
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "1.05rem" }}>
                {phase === "select" ? "Exporter les données" : phase === "exporting" ? "Exportation en cours\u2026" : "Export terminé"}
              </div>
              {phase === "select" && (
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Les fichiers Excel seront téléchargés automatiquement
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: 4,
              borderRadius: 6,
              display: "flex",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {phase === "select" && (
            <>
              {loading ? (
                <div style={{ textAlign: "center", padding: "2rem 0", color: "#94a3b8" }}>
                  <Loader2 size={28} style={{ animation: "spin 1s linear infinite", margin: "0 auto 0.75rem" }} />
                  Chargement des formulaires…
                </div>
              ) : forms.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem 0", color: "#94a3b8" }}>
                  <ClipboardList size={40} style={{ margin: "0 auto 0.75rem", opacity: 0.5 }} />
                  Aucun formulaire disponible pour l&apos;export.
                </div>
              ) : (
                <>
                  <p style={{ color: "#475569", fontSize: "0.88rem", margin: "0 0 0.75rem" }}>
                    Sélectionnez les formulaires à exporter&nbsp;:
                  </p>

                  <div
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      overflow: "hidden",
                      maxHeight: 320,
                      overflowY: "auto",
                    }}
                  >
                    {/* Select all */}
                    <button
                      onClick={toggleAll}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        padding: "0.65rem 1rem",
                        background: "#f8fafc",
                        border: "none",
                        borderBottom: "1px solid #e2e8f0",
                        cursor: "pointer",
                        fontSize: "0.85rem",
                        color: "#475569",
                        fontWeight: 600,
                        textAlign: "left",
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 5,
                          border: isAllSelected ? "none" : "2px solid #cbd5e1",
                          background: isAllSelected ? "#2563eb" : "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          transition: "all 0.15s",
                        }}
                      >
                        {isAllSelected && <Check size={12} color="white" />}
                      </div>
                      {isAllSelected ? "Tout désélectionner" : "Sélectionner tout"}
                    </button>

                    {forms.map((form) => {
                      const isSelected = selectedIds.has(form.id)
                      return (
                        <button
                          key={form.id}
                          onClick={() => toggleForm(form.id)}
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            padding: "0.7rem 1rem",
                            background: isSelected ? "#eff6ff" : "white",
                            border: "none",
                            borderBottom: "1px solid #f1f5f9",
                            cursor: "pointer",
                            textAlign: "left",
                            transition: "background 0.12s",
                          }}
                        >
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 5,
                              border: isSelected ? "none" : "2px solid #cbd5e1",
                              background: isSelected ? "#2563eb" : "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              transition: "all 0.15s",
                            }}
                          >
                            {isSelected && <Check size={12} color="white" />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, color: "#1e293b", fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {form.name}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.15rem" }}>
                              {(form.submission_count ?? 0)} soumission{(form.submission_count ?? 0) !== 1 ? "s" : ""} · Créé le {formatDate(form.created_at)}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {selectedIds.size > 0 && (
                    <div style={{ marginTop: "0.75rem", fontSize: "0.82rem", color: "#6366f1", fontWeight: 500, textAlign: "center" }}>
                      {selectedIds.size} formulaire{selectedIds.size > 1 ? "s" : ""} sélectionné{selectedIds.size > 1 ? "s" : ""}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {phase === "exporting" && (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <div style={{ marginBottom: "1.25rem" }}>
                <Loader2
                  size={44}
                  color="#6366f1"
                  style={{
                    animation: "spin 1s linear infinite",
                  }}
                />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>

              <p style={{ color: "#475569", fontSize: "0.9rem", margin: "0 0 0.25rem" }}>
                Téléchargement de <strong>{exportProgress.currentName}</strong>
              </p>
              <p style={{ color: "#94a3b8", fontSize: "0.82rem", margin: "0 0 1rem" }}>
                {exportProgress.current} sur {exportProgress.total}
              </p>

              {exportedFiles.length > 0 && (
                <div style={{ textAlign: "left", padding: "0 1rem" }}>
                  {exportedFiles.map((name, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.3rem 0",
                        fontSize: "0.82rem",
                        color: "#16a34a",
                      }}
                    >
                      <CheckCircle2 size={14} />
                      {name}
                    </div>
                  ))}
                </div>
              )}

              {exportError && (
                <div style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: "0.5rem" }}>
                  {exportError}
                </div>
              )}
            </div>
          )}

          {phase === "done" && (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#dcfce7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                }}
              >
                <CheckCircle2 size={32} color="#16a34a" />
              </div>

              <p style={{ color: "#1e293b", fontWeight: 600, fontSize: "1.05rem", margin: "0 0 0.25rem" }}>
                {exportedFiles.length} fichier{exportedFiles.length > 1 ? "s" : ""} Excel téléchargé{exportedFiles.length > 1 ? "s" : ""}
              </p>

              <div style={{ textAlign: "left", padding: "0.75rem 1.5rem 0", maxHeight: 180, overflowY: "auto" }}>
                {exportedFiles.map((name, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.35rem 0",
                      fontSize: "0.85rem",
                      color: "#334155",
                    }}
                  >
                    <Download size={14} style={{ color: "#6366f1", flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {name}.xlsx
                    </span>
                  </div>
                ))}
              </div>

              {exportError && (
                <div style={{ color: "#ef4444", fontSize: "0.82rem", marginTop: "0.5rem" }}>{exportError}</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            padding: "1rem 1.5rem",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
            flexShrink: 0,
          }}
        >
          {phase === "select" ? (
            <>
              <button
                onClick={onClose}
                className="btn-secondary"
                style={{ padding: "0.55rem 1.25rem" }}
              >
                Annuler
              </button>
              <button
                onClick={handleExport}
                disabled={selectedIds.size === 0}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.55rem 1.25rem",
                  background: selectedIds.size === 0 ? "#e2e8f0" : "#2563eb",
                  color: selectedIds.size === 0 ? "#94a3b8" : "white",
                  border: "none",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                <Download size={16} />
                Exporter ({selectedIds.size})
              </button>
            </>
          ) : phase === "done" ? (
            <button
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: "0.55rem 1.5rem" }}
            >
              Fermer
            </button>
          ) : null}
        </div>
      </div>
    </>
  )
}
