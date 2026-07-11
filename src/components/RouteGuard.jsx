import { Outlet, Link } from "react-router-dom"
import { useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { canAccess } from "../lib/roleAccess"
import { ShieldOff, ArrowLeft } from "lucide-react"

const ROLE_LABELS = {
  MEDECIN: "Médecin",
  MEDECIN_EXPERT: "Médecin Expert",
  COORDINATEUR: "Coordinateur",
  ADMIN: "Administrateur",
}

export default function RouteGuard() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user || canAccess(user.role, user.is_global_admin, location.pathname)) {
    return <Outlet />
  }

  return (
    <div className="list-container" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
      <div
        style={{
          padding: "3rem 2rem",
          background: "#f8fafc",
          borderRadius: 16,
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}
        >
          <ShieldOff size={36} style={{ color: "#ef4444" }} />
        </div>

        <h2 style={{ color: "#1e293b", fontSize: "1.35rem", margin: "0 0 0.5rem", fontWeight: 700 }}>
          Accès refusé
        </h2>

        <p style={{ color: "#64748b", fontSize: "0.95rem", margin: "0 0 0.25rem", lineHeight: 1.5 }}>
          Cette page n&apos;est pas accessible avec votre profil.
        </p>

        <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "0 0 1.5rem" }}>
          Rôle actuel&nbsp;: <strong style={{ color: "#475569" }}>{ROLE_LABELS[user.role] || user.role}</strong>
        </p>

        <Link
          to="/"
          className="btn-secondary btn-with-icon"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.6rem 1.25rem",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={16} />
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
