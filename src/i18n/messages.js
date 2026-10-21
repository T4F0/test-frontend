// Interface strings (French only). Kept behind t() so labels stay in one place.
// Clinical content (forms, decisions, patient data) is entered by users and is never translated.
export const LANGUAGES = [
  { code: 'fr', label: 'FR', name: 'Français', dir: 'ltr', locale: 'fr-FR' },
]

export const messages = {
  fr: {
    'nav.home': 'Accueil',
    'nav.forms': 'Formulaires',
    'nav.patients': 'Patients',
    'nav.myPatients': 'Mes Patients',
    'nav.meetings': 'Réunions',
    'nav.reports': 'Rapports',
    'nav.requests': 'Demandes',
    'nav.requestRcp': 'Demander une RCP',
    'nav.doctors': 'Medecins',
    'nav.users': 'Utilisateurs',
    'nav.stats': 'Statistiques',
    'nav.audit': 'Audit',
    'nav.settings': 'Paramètres',
    'nav.admin': 'Administration',
    'nav.search': 'Rechercher',
    'nav.logout': 'Déconnexion',
    'common.language': 'Langue',
    'dash.nextRcp': 'Prochaine RCP',
    'dash.liveRcp': 'RCP en cours',
    'dash.allMeetings': 'Toutes les réunions',
    'dash.myCases': 'Mes dossiers',
    'dash.myActions': 'Mes actions à suivre',
    'dash.upcoming': 'Réunions à venir',
    'dash.unread': 'Notifications non lues',
    'dash.join': 'Rejoindre',
    'dash.start': 'Démarrer',
    'dash.agenda': 'Ordre du jour',
    'dash.newCase': 'Nouveau dossier RCP',
    'dash.newPatient': 'Nouveau patient',
    'dash.newMeeting': 'Nouvelle réunion',
    'dash.upToDate': 'Vous êtes à jour.',
    'greeting.morning': 'Bonjour',
    'greeting.evening': 'Bonsoir',
  },
}

export function translate(lang, key) {
  return messages[lang]?.[key] ?? messages.fr[key] ?? key
}
