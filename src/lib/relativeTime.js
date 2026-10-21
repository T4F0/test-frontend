// French relative dates for the dashboard ("Demain à 09:00", "Dans 3 jours"). Pure: `now` is injectable for tests.

const pad = (n) => String(n).padStart(2, '0')
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Whole calendar days from `now` to `date` (negative = past). */
export function dayDiff(date, now = new Date()) {
  const ms = startOfDay(new Date(date)) - startOfDay(now)
  return Math.round(ms / 86400000)
}

export function describeWhen(date, now = new Date()) {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  const diff = dayDiff(d, now)
  if (diff === 0) return `Aujourd’hui à ${hhmm(d)}`
  if (diff === 1) return `Demain à ${hhmm(d)}`
  if (diff === -1) return `Hier à ${hhmm(d)}`
  if (diff > 1 && diff < 7) return `Dans ${diff} jours · ${hhmm(d)}`
  if (diff < -1 && diff > -7) return `Il y a ${-diff} jours`
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} à ${hhmm(d)}`
}

export function greeting(now = new Date()) {
  const h = now.getHours()
  if (h < 5) return 'Bonsoir'
  if (h < 18) return 'Bonjour'
  return 'Bonsoir'
}

export function longDate(now = new Date(), locale = 'fr-FR') {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
}
