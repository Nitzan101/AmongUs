import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { isRtl } from '../i18n'
import { LanguageSwitcher } from './LanguageSwitcher'
import { LeaveGuardProvider } from './LeaveGuard'
import { useLeaveGuard } from '../game/leaveGuardContext'

export function Layout() {
  return (
    <LeaveGuardProvider>
      <LayoutShell />
    </LeaveGuardProvider>
  )
}

function LayoutShell() {
  const { i18n, t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const ctx = useLeaveGuard()
  const language = i18n.resolvedLanguage ?? 'en'

  // A page holding unsaved edits can intercept this and confirm first.
  function goBack() {
    const proceed = () => navigate(-1)
    if (ctx?.guard.current?.(proceed)) return
    proceed()
  }

  // Keep the document's direction and language in sync with the chosen language.
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = isRtl(language) ? 'rtl' : 'ltr'
  }, [language])

  const isHome = location.pathname === '/'

  return (
    <div className="flex min-h-full justify-center bg-surface">
      <div className="flex min-h-full w-full max-w-md flex-col px-5 pb-8">
        <header className="flex items-center justify-between py-4">
          {isHome ? (
            <span className="text-lg font-black text-brand-600">
              🕵️ {t('common.appName')}
            </span>
          ) : (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-content-muted hover:text-content"
            >
              <span aria-hidden className="rtl:-scale-x-100">
                ←
              </span>
              {t('common.back')}
            </button>
          )}
          <LanguageSwitcher />
        </header>

        <main className="flex flex-1 flex-col">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
