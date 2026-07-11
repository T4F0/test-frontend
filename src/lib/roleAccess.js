export const MEDECIN = "MEDECIN"
export const MEDECIN_EXPERT = "MEDECIN_EXPERT"
export const COORDINATEUR = "COORDINATEUR"
export const ADMIN = "ADMIN"

const ALL_MEDECINS = [MEDECIN, MEDECIN_EXPERT]
const ALL_STAFF = [COORDINATEUR, ADMIN]
const ALL = [MEDECIN, MEDECIN_EXPERT, COORDINATEUR, ADMIN]

const ROUTE_ACCESS = [
  { pattern: "/cases/new", roles: ALL_MEDECINS },
  { pattern: "/forms/new", roles: [...ALL_MEDECINS, ADMIN] },
  { pattern: "/forms/:id/edit", roles: [...ALL_MEDECINS, ADMIN] },
  { pattern: "/forms/:id/submit", roles: ALL_MEDECINS },
  { pattern: "/forms/:id/submissions/:submissionId/edit", roles: [...ALL_MEDECINS, ADMIN] },
  { pattern: "/forms/:formId/submissions/:submissionId", roles: [...ALL_MEDECINS, ADMIN] },
  { pattern: "/forms/:id/submissions", roles: [...ALL_MEDECINS, ADMIN] },
  { pattern: "/forms", roles: ALL },
  { pattern: "/patients/new", roles: [...ALL_MEDECINS, ADMIN] },
  { pattern: "/patients/:id/edit", roles: [...ALL_MEDECINS, ADMIN] },
  { pattern: "/patients/:id", roles: ALL },
  { pattern: "/patients", roles: ALL },
  { pattern: "/meetings/new", roles: ALL_STAFF },
  { pattern: "/meetings/:id/edit", roles: ALL_STAFF },
  { pattern: "/meetings/requests", roles: ALL_STAFF },
  { pattern: "/meetings/request", roles: [MEDECIN] },
  { pattern: "/meetings/:id", roles: ALL },
  { pattern: "/meetings", roles: ALL },
  { pattern: "/reports", roles: ALL },
  { pattern: "/attachments", roles: [...ALL_MEDECINS, ADMIN] },
  { pattern: "/users/new", roles: ALL_STAFF },
  { pattern: "/users/:id/edit", roles: ALL },
  { pattern: "/users/:id", roles: ALL },
  { pattern: "/users", roles: ALL_STAFF },
  { pattern: "/audit-logs", roles: [ADMIN] },
  { pattern: "/settings/services", roles: [] },
  { pattern: "/conference/:roomId", roles: ALL },
]

function matchRoutePattern(pathname, pattern) {
  const regexStr = "^" + pattern.replace(/:[^/]+/g, "[^/]+") + "$"
  return new RegExp(regexStr).test(pathname)
}

export function getRequiredRoles(pathname) {
  for (const entry of ROUTE_ACCESS) {
    if (matchRoutePattern(pathname, entry.pattern)) {
      return entry.roles
    }
  }
  return null
}

export function canAccess(role, isGlobalAdmin, pathname) {
  if (isGlobalAdmin) return true
  if (!role) return false

  const requiredRoles = getRequiredRoles(pathname)
  if (requiredRoles === null) return true
  return requiredRoles.includes(role)
}
