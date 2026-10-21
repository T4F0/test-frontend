import { createContext, useContext, useMemo } from 'react'
import { translate } from './messages'

const value = { lang: 'fr', dir: 'ltr', locale: 'fr-FR', t: (key) => translate('fr', key) }
const LanguageContext = createContext(value)

export function LanguageProvider({ children }) {
  const memo = useMemo(() => value, [])
  return <LanguageContext.Provider value={memo}>{children}</LanguageContext.Provider>
}

export const useI18n = () => useContext(LanguageContext)
