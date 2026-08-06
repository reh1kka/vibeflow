import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Genre } from '../types'
import {
  areArtistsFollowed,
  areTracksSaved,
  fetchArtistBundle,
  followArtist,
  saveTrack,
  type SpotifyArtist,
  type SpotifyTrack,
  type SpotifyWriteResult,
  type UserAuth,
} from '../lib/spotify'
import { enrichSpotifyTrackPreviews } from '../lib/artistDemo'
import { useI18n } from '../i18n'
import { openInSpotify } from '../lib/spotifyOpen'
import {
  bumpPreviewGeneration,
  getPreviewAudio,
  previewGeneration,
  stopPreviewAudio,
} from '../lib/previewAudio'

/** Hide until Spotify Extended / allowlist works for everyone */
const SHOW_FOLLOW_AND_LIKE = false

type Props = {
  artistId: string
  artistName?: string
  catalog: Genre[]
  connected: UserAuth | null
  onBack: () => void
  onOpenArtist: (id: string, name: string) => void
  onOpenGenre: (genreId: string) => void
  onConnect: () => void
}

function formatListeners(
  n: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (n >= 1_000_000) return t('listenersM', { n: (n / 1_000_000).toFixed(1) })
  if (n >= 1_000) return t('listenersK', { n: Math.round(n / 1_000) })
  return String(n)
}

export function ArtistView({
  artistId,
  artistName,
  catalog,
  connected,
  onBack,
  onOpenArtist,
  onOpenGenre,
  onConnect,
}: Props) {
  const { t, locale } = useI18n()
  const [loading, setLoading] = useState(true)
  const [artist, setArtist] = useState<SpotifyArtist | null>(null)
  const [tracks, setTracks] = useState<SpotifyTrack[]>([])
  const [related, setRelated] = useState<SpotifyArtist[]>([])
  const [about, setAbout] = useState('')
  const [listeners, setListeners] = useState(0)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [followed, setFollowed] = useState(false)
  const [savedTracks, setSavedTracks] = useState<Record<string, boolean>>({})
  const [followedRelated, setFollowedRelated] = useState<
    Record<string, boolean>
  >({})
  const [relatedCount, setRelatedCount] = useState(4)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setPlayingId(null)
    setFollowed(false)
    setSavedTracks({})
    setFollowedRelated({})
    setRelatedCount(4)
    stopPreviewAudio()

    void fetchArtistBundle(artistId, { name: artistName, catalog }).then(
      async (data) => {
        if (cancelled) return
        setArtist(data.artist)
        let top = (data.topTracks ?? []).slice(0, 5)
        const artistLabel = data.artist?.name || artistName || ''
        // Replace placeholder demo tracks with Deezer tops when possible
        if (
          artistLabel &&
          (!top.length || top.every((tr) => tr.id.startsWith('demo-')))
        ) {
          try {
            const { fetchRealTopTracks } = await import('../lib/artistDemo')
            const real = await fetchRealTopTracks(artistId, artistLabel)
            if (real?.length) top = real.slice(0, 5)
          } catch {
            /* keep top */
          }
        }
        setTracks(top)
        void enrichSpotifyTrackPreviews(top, artistLabel).then((enriched) => {
          if (!cancelled) setTracks(enriched)
        })
        let rel = (data.relatedArtists ?? []).slice(0, 8)
        setRelated(rel)
        setAbout(
          data.about ||
            (data.artist
              ? `${data.artist.name} — ${t('aboutArtist')}.`
              : ''),
        )
        setListeners(
          data.listeners || data.artist?.followers?.total || 0,
        )
        setLoading(false)

        // Fill missing avatars via Spotify oEmbed
        const needCovers = rel.filter((a) => !a.images?.[0]?.url)
        if (needCovers.length) {
          const filled = await Promise.all(
            rel.map(async (a) => {
              if (a.images?.[0]?.url) return a
              try {
                const r = await fetch(
                  `https://open.spotify.com/oembed?url=${encodeURIComponent(`spotify:artist:${a.id}`)}`,
                )
                if (!r.ok) return a
                const j = (await r.json()) as { thumbnail_url?: string }
                return j.thumbnail_url
                  ? { ...a, images: [{ url: j.thumbnail_url }] }
                  : a
              } catch {
                return a
              }
            }),
          )
          if (!cancelled) setRelated(filled)
          rel = filled
        }

        if (connected) {
          const realTrackIds = top.filter(
            (tr) => !tr.id.startsWith('demo-') && !tr.id.startsWith('dz-'),
          )
          const [f, saved, relF] = await Promise.all([
            areArtistsFollowed([artistId]),
            realTrackIds.length
              ? areTracksSaved(realTrackIds.map((t) => t.id))
              : areTracksSaved(top.map((t) => t.id)),
            areArtistsFollowed(rel.map((a) => a.id)),
          ])
          if (cancelled) return
          if (f) setFollowed(Boolean(f[0]))
          if (saved) {
            const map: Record<string, boolean> = {}
            const ids = realTrackIds.length ? realTrackIds : top
            ids.forEach((t, i) => {
              map[t.id] = Boolean(saved[i])
            })
            setSavedTracks(map)
          }
          if (relF) {
            const map: Record<string, boolean> = {}
            rel.forEach((a, i) => {
              map[a.id] = Boolean(relF[i])
            })
            setFollowedRelated(map)
          }
        }
      },
    )

    return () => {
      cancelled = true
      stopPreviewAudio()
      setPlayingId(null)
    }
  }, [artistId, artistName, catalog, connected, locale, t])

  function flash(msg: string) {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1800)
  }

  function flashWrite(result: SpotifyWriteResult, okKey: string, failKey: string) {
    if (result.ok) {
      flash(t(okKey))
      return
    }
    if (result.needsAllowlist) {
      flash(t('spotifyAllowlist'))
      return
    }
    if (result.needsRelogin) {
      flash(t('spotifyRelogin'))
      onConnect()
      return
    }
    flash(t(failKey))
  }

  function togglePreview(track: SpotifyTrack) {
    if (!track.preview_url) {
      openInSpotify(
        track.external_urls?.spotify ??
          `https://open.spotify.com/track/${track.id}`,
      )
      return
    }
    const a = getPreviewAudio()
    if (playingId === track.id && !a.paused) {
      stopPreviewAudio()
      setPlayingId(null)
      return
    }
    const gen = bumpPreviewGeneration()
    a.onended = () => {
      if (previewGeneration() === gen) setPlayingId(null)
    }
    a.onpause = null
    a.src = track.preview_url
    void a
      .play()
      .then(() => {
        if (previewGeneration() !== gen) {
          stopPreviewAudio()
          return
        }
        setPlayingId(track.id)
      })
      .catch(() => {
        if (previewGeneration() === gen) setPlayingId(null)
        openInSpotify(
          track.external_urls?.spotify ??
            `https://open.spotify.com/track/${track.id}`,
        )
      })
  }

  async function onSave(trackId: string) {
    if (!connected) {
      onConnect()
      return
    }
    const result = await saveTrack(trackId)
    if (result.ok) setSavedTracks((s) => ({ ...s, [trackId]: true }))
    flashWrite(result, 'trackSaved', 'trackSaveFail')
  }

  async function onFollow() {
    if (!connected) {
      onConnect()
      return
    }
    const result = await followArtist(artistId)
    if (result.ok) setFollowed(true)
    flashWrite(result, 'followOk', 'followFail')
  }

  // Only Molchat Doma (and similar) keep a custom override avatar
  const catalogImage = catalog
    .flatMap((g) => g.artists ?? [])
    .find((a) => a.id === artistId && a.image)?.image

  const cover =
    catalogImage ||
    artist?.images?.[0]?.url ||
    tracks[0]?.album?.images?.[0]?.url ||
    null
  const title = artist?.name || artistName || t('artistFallback')
  const genres = artist?.genres ?? []

  return (
    <motion.div
      className="artist-view"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
    >
      <div className="artist-topbar">
        <button type="button" className="text-btn" onClick={onBack}>
          {t('back')}
        </button>
        {connected ? (
          <span className="muted">
            {connected.displayName || 'Spotify'}
          </span>
        ) : (
          <button type="button" className="text-btn" onClick={onConnect}>
            {t('loginSpotify')}
          </button>
        )}
      </div>

      <div className="artist-hero">
        {cover ? (
          <img src={cover} alt="" className="artist-cover" />
        ) : (
          <div className="artist-cover placeholder" />
        )}
        <div className="artist-hero-copy">
          <p className="eyebrow">{t('artistEyebrow')}</p>
          <h1>{title}</h1>
          {listeners > 0 && (
            <p className="listeners">
              {t('monthlyListeners', {
                count: formatListeners(listeners, t),
              })}
            </p>
          )}
          {SHOW_FOLLOW_AND_LIKE && followed && (
            <div className="library-badge">{t('inLibrary')}</div>
          )}
          <div className="artist-actions">
            {SHOW_FOLLOW_AND_LIKE && (
              <button
                type="button"
                className="chip"
                onClick={() => void onFollow()}
                disabled={followed}
              >
                {followed ? t('following') : t('follow')}
              </button>
            )}
            {artist?.external_urls?.spotify && (
              <a
                className="chip"
                href={artist.external_urls.spotify}
                target="_blank"
                rel="noreferrer"
                onClick={(e) =>
                  openInSpotify(artist.external_urls!.spotify, e)
                }
              >
                {t('openInSpotify')}
              </a>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="muted pad">{t('loadingCard')}</p>
      ) : (
        <div className="pad">
          <h3>{t('aboutArtist')}</h3>
          <p className="sheet-desc">{about}</p>

          {genres.length > 0 && (
            <>
              <h3>{t('genres')}</h3>
              <div className="similar-row">
                {genres.map((g) => {
                  const match = catalog.find(
                    (x) => x.name.toLowerCase() === g.toLowerCase(),
                  )
                  return (
                    <button
                      key={g}
                      type="button"
                      className={`similar-chip ${match ? 'clickable' : ''}`}
                      style={{ color: match?.color ?? '#1db954' }}
                      disabled={!match}
                      onClick={() => {
                        if (match) onOpenGenre(match.id)
                      }}
                    >
                      {g}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          <h3>{t('topTracks')}</h3>
          <ul className="track-list">
            {tracks.map((tTrack, i) => (
              <li key={tTrack.id}>
                <button
                  type="button"
                  className="track-main"
                  onClick={() => togglePreview(tTrack)}
                >
                  <span
                    className={`track-media-ico ${
                      playingId === tTrack.id ? 'pause' : 'play'
                    }`}
                    aria-hidden
                  />
                  <span className="track-num">{i + 1}</span>
                  <span className="track-meta">
                    <strong>{tTrack.name}</strong>
                    <span className="muted">
                      {SHOW_FOLLOW_AND_LIKE && savedTracks[tTrack.id]
                        ? t('alreadyInLib')
                        : tTrack.preview_url
                          ? playingId === tTrack.id
                            ? t('pausePreview')
                            : t('play30')
                          : t('openSpotifyShort')}
                    </span>
                  </span>
                </button>
                {SHOW_FOLLOW_AND_LIKE && (
                  <button
                    type="button"
                    className={`track-like ${savedTracks[tTrack.id] ? 'on' : ''}`}
                    aria-label={t('like')}
                    disabled={savedTracks[tTrack.id]}
                    onClick={() => void onSave(tTrack.id)}
                  >
                    <span className="heart-icon" aria-hidden />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {related.length > 0 && (
            <>
              <h3>{t('similarArtists')}</h3>
              <div className="related-artists">
                {related.slice(0, relatedCount).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className="related-artist"
                    onClick={() => onOpenArtist(a.id, a.name)}
                  >
                    {a.images?.[0]?.url ? (
                      <img src={a.images[0].url} alt="" />
                    ) : (
                      <span className="related-ph" />
                    )}
                    <span>
                      {a.name}
                      {SHOW_FOLLOW_AND_LIKE && followedRelated[a.id] ? (
                        <em className="lib-mini">{t('inLibMini')}</em>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
              {relatedCount < related.length && (
                <button
                  type="button"
                  className="more-btn"
                  onClick={() =>
                    setRelatedCount((n) => Math.min(n + 4, related.length))
                  }
                >
                  {t('more')}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </motion.div>
  )
}
