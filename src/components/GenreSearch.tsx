import { useEffect, useMemo, useRef, useState } from 'react'
import type { Genre } from '../types'
import { useI18n } from '../i18n'

type Props = {
  genres: Genre[]
  onSelect: (genreId: string) => void
}

export function GenreSearch({ genres, onSelect }: Props) {
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 1) return []
    return genres
      .filter((g) => g.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [genres, query])

  useEffect(() => {
    function onDocPointer(e: MouseEvent | TouchEvent) {
      const el = rootRef.current
      if (!el || !(e.target instanceof Node) || el.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocPointer)
    document.addEventListener('touchstart', onDocPointer)
    return () => {
      document.removeEventListener('mousedown', onDocPointer)
      document.removeEventListener('touchstart', onDocPointer)
    }
  }, [])

  function pick(id: string) {
    onSelect(id)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="genre-search" ref={rootRef}>
      <input
        type="search"
        className="genre-search-input"
        placeholder={t('searchPlaceholder')}
        value={query}
        aria-label={t('searchAria')}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false)
            ;(e.target as HTMLInputElement).blur()
          }
          if (e.key === 'Enter' && matches[0]) {
            e.preventDefault()
            pick(matches[0].id)
          }
        }}
      />
      {open && query.trim() && (
        <ul className="genre-search-results" role="listbox">
          {matches.length === 0 ? (
            <li className="genre-search-empty">{t('searchEmpty')}</li>
          ) : (
            matches.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  className="genre-search-item"
                  role="option"
                  onClick={() => pick(g.id)}
                >
                  {g.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
