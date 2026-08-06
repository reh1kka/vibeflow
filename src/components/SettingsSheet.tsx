import { useState } from 'react'
import type { AppSettings, TasteMode } from '../lib/storage'
import type { UserAuth } from '../lib/spotify'
import { useI18n } from '../i18n'

type Props = {
  open: boolean
  onClose: () => void
  settings: AppSettings
  onChangeSettings: (next: AppSettings) => void
  auth: UserAuth | null
  onConnect: () => void
  onLogout: () => void
  tasteReady: boolean
  tasteCount: number
  onRefreshTaste: () => void
  banCount: number
  onResetBan: () => void
  historyIds: string[]
  historyLabels: string[]
  onOpenHistoryGenre: (genreId: string) => void
}

export function SettingsSheet({
  open,
  onClose,
  settings,
  onChangeSettings,
  auth,
  onConnect,
  onLogout,
  tasteReady,
  tasteCount,
  onRefreshTaste,
  banCount,
  onResetBan,
  historyIds,
  historyLabels,
  onOpenHistoryGenre,
}: Props) {
  const { t, locales, locale, setLocale } = useI18n()
  const [langOpen, setLangOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  if (!open) return null

  const modes: Array<{ id: TasteMode; title: string; desc: string }> = [
    { id: 'off', title: t('modeOff'), desc: t('modeOffDesc') },
    { id: 'taste', title: t('modeTaste'), desc: t('modeTasteDesc') },
    { id: 'anti', title: t('modeAnti'), desc: t('modeAntiDesc') },
  ]

  const currentLang = locales.find((l) => l.id === locale) ?? locales[0]

  return (
    <div className="settings-overlay" role="dialog" aria-label={t('settings')}>
      <button type="button" className="settings-backdrop" onClick={onClose} />
      <div className="settings-sheet">
        <div className="sheet-handle" />
        <div className="settings-head">
          <h2>{t('settings')}</h2>
          <button type="button" className="sheet-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <section className="settings-block">
          <h3>{t('spotify')}</h3>
          <p className="muted tiny">{t('spotifyHint')}</p>
          {auth ? (
            <div className="settings-row">
              <span>
                {t('loggedInAs', {
                  name: auth.displayName || 'Spotify',
                })}
              </span>
              <button type="button" className="text-btn" onClick={onLogout}>
                {t('logout')}
              </button>
            </div>
          ) : (
            <button type="button" className="playlist-btn" onClick={onConnect}>
              {t('loginSpotify')}
            </button>
          )}
        </section>

        <section className="settings-block">
          <h3>{t('matchMode')}</h3>
          <div className="mode-list">
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`mode-card ${settings.tasteMode === m.id ? 'active' : ''}`}
                onClick={() =>
                  onChangeSettings({ ...settings, tasteMode: m.id })
                }
              >
                <strong>{m.title}</strong>
                <span>{m.desc}</span>
              </button>
            ))}
          </div>
          {settings.tasteMode !== 'off' && (
            <div className="settings-row wrap">
              <span className="muted tiny">
                {tasteReady
                  ? t('tasteLoaded', { count: tasteCount })
                  : t('tasteLoading')}
              </span>
              <button
                type="button"
                className="text-btn"
                onClick={onRefreshTaste}
              >
                {t('refreshTaste')}
              </button>
            </div>
          )}
        </section>

        <section className="settings-block">
          <h3>{t('history')}</h3>
          <div className="lang-accordion">
            <button
              type="button"
              className={`lang-summary ${historyOpen ? 'open' : ''}`}
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen((v) => !v)}
            >
              <span className="lang-native">
                {historyIds.length ? t('historySummary') : t('historyEmpty')}
              </span>
              <span className="lang-caret" aria-hidden>
                {historyOpen ? '▴' : '▾'}
              </span>
            </button>
            {historyOpen && (
              <ul className="lang-list history-list">
                {historyIds.length === 0 ? (
                  <li className="history-empty muted tiny">{t('historyEmptyHint')}</li>
                ) : (
                  historyIds.map((id, i) => (
                    <li key={id}>
                      <button
                        type="button"
                        className="lang-row"
                        onClick={() => onOpenHistoryGenre(id)}
                      >
                        <span className="lang-native">
                          {historyLabels[i] ?? id}
                        </span>
                        <span className="muted tiny">{t('cardArrow')}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </section>

        <section className="settings-block">
          <h3>{t('bans')}</h3>
          <p className="muted tiny">{t('bansHint')}</p>
          <p className="ban-count">
            {banCount > 0
              ? t('bannedCount', { count: banCount })
              : t('banEmpty')}
          </p>
          <button
            type="button"
            className="ban-reset-btn"
            disabled={banCount === 0}
            onClick={onResetBan}
          >
            {t('resetBan')}
          </button>
        </section>

        <section className="settings-block">
          <h3>{t('language')}</h3>
          <div className="lang-accordion">
            <button
              type="button"
              className={`lang-summary ${langOpen ? 'open' : ''}`}
              aria-expanded={langOpen}
              onClick={() => setLangOpen((v) => !v)}
            >
              <span className="lang-native">{currentLang.native}</span>
              <span className="muted tiny">{currentLang.label}</span>
              <span className="lang-caret" aria-hidden>
                {langOpen ? '▴' : '▾'}
              </span>
            </button>
            {langOpen && (
              <ul className="lang-list">
                {locales.map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      className={`lang-row ${locale === l.id ? 'active' : ''}`}
                      onClick={() => {
                        setLocale(l.id)
                        onChangeSettings({ ...settings, locale: l.id })
                        setLangOpen(false)
                      }}
                    >
                      <span className="lang-native">{l.native}</span>
                      <span className="muted tiny">{l.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <a
          className="settings-creator-link"
          href="https://open.spotify.com/user/31c3v5g5lffwmflw2rulxblu2dhu?si=8970ac2229754b8e"
          target="_blank"
          rel="noreferrer"
        >
          {t('creatorSpotify')}
        </a>

        <p className="settings-data-source muted tiny">
          {t('dataSourceBefore')}
          <a
            href="https://everynoise.com/"
            target="_blank"
            rel="noreferrer"
          >
            Every Noise at Once
          </a>
          {t('dataSourceAfter')}
        </p>
      </div>
    </div>
  )
}
