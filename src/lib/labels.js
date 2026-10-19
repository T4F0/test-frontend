// One source of truth for how backend enums are shown to people.

export const SUBMISSION_STATUS_LABELS = {
  NOUVEAU: 'Nouveau',
  A_REDISCUTER: 'À rediscuter',
  CLOTURE: 'Clôturé',
}

export const SUBMISSION_STATUS_COLORS = {
  NOUVEAU: '#3b82f6',
  A_REDISCUTER: '#f97316',
  CLOTURE: '#6b7280',
}

export const SUBMISSION_STATUS_OPTIONS = Object.entries(SUBMISSION_STATUS_LABELS).map(([value, label]) => ({ value, label }))

export const MEETING_STATUS_LABELS = {
  PLANNED: 'Planifiée',
  LIVE: 'En cours',
  FINISHED: 'Terminée',
}

export const GENDER_LABELS = { M: 'Homme', F: 'Femme', O: 'Autre' }

export function statusLabel(map, value) {
  return map[value] || value || '—'
}

/** Browser-tab title for a route path, in French. Never includes patient names (tab titles end up in history). */
const ROUTE_TITLES = [
  [/^\/login/, 'Connexion'],
  [/^\/register/, 'Inscription'],
  [/^\/forgot-password/, 'Mot de passe oublié'],
  [/^\/reset-password/, 'Nouveau mot de passe'],
  [/^\/secure-account/, 'Sécuriser mon compte'],
  [/^\/remove-account/, 'Suppression de compte'],
  [/^\/cases\/new/, 'Nouveau dossier RCP'],
  [/^\/forms\/new/, 'Nouveau formulaire'],
  [/^\/forms\/[^/]+\/edit/, 'Modifier le formulaire'],
  [/^\/forms\/[^/]+\/submit/, 'Remplir un formulaire'],
  [/^\/forms\/[^/]+\/submissions\/[^/]+\/edit/, 'Modifier le dossier'],
  [/^\/forms\/[^/]+\/submissions\/[^/]+/, 'Dossier RCP'],
  [/^\/forms\/[^/]+\/submissions/, 'Soumissions'],
  [/^\/forms/, 'Formulaires'],
  [/^\/users\/new/, 'Nouvel utilisateur'],
  [/^\/users\/[^/]+\/edit/, 'Modifier l’utilisateur'],
  [/^\/users\/[^/]+/, 'Profil utilisateur'],
  [/^\/users/, 'Utilisateurs'],
  [/^\/patients\/new/, 'Nouveau patient'],
  [/^\/patients\/[^/]+\/edit/, 'Modifier le patient'],
  [/^\/patients\/[^/]+/, 'Dossier patient'],
  [/^\/patients/, 'Patients'],
  [/^\/meetings\/new/, 'Nouvelle réunion'],
  [/^\/meetings\/requests/, 'Demandes de RCP'],
  [/^\/meetings\/request/, 'Demander une RCP'],
  [/^\/meetings\/[^/]+\/edit/, 'Modifier la réunion'],
  [/^\/meetings\/[^/]+/, 'Réunion RCP'],
  [/^\/meetings/, 'Réunions'],
  [/^\/attachments/, 'Pièces jointes'],
  [/^\/reports/, 'Rapports'],
  [/^\/settings\/services/, 'Paramètres des services'],
  [/^\/audit-logs/, 'Historique des activités'],
  [/^\/conference/, 'Visioconférence'],
]

export const APP_NAME = 'e-RCP'

export function titleForPath(pathname) {
  const hit = ROUTE_TITLES.find(([pattern]) => pattern.test(pathname))
  return hit ? `${hit[1]} · ${APP_NAME}` : `${APP_NAME} Algérie`
}
