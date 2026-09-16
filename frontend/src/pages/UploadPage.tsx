import { type DragEvent, type FormEvent, type RefObject, useState } from 'react'
import { Link } from 'react-router-dom'
import { itemKey, itemLabel, type PendingItem } from '../App'
import { CloseIcon, FilmIcon, LinkIcon, UploadIcon } from '../icons'

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com']

function isYoutubeUrl(url: string): boolean {
  try {
    return YOUTUBE_HOSTS.includes(new URL(url).hostname.toLowerCase())
  } catch {
    return false
  }
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Props = {
  fighterName: string
  setFighterName: (value: string) => void
  items: PendingItem[]
  addFiles: (files: FileList | File[]) => void
  addUrl: (url: string) => void
  removeItem: (key: string) => void
  dragActive: boolean
  handleDrag: (event: DragEvent, active: boolean) => void
  handleDrop: (event: DragEvent) => void
  handleSubmit: (event: FormEvent) => void
  submitting: boolean
  error: string | null
  fileInputRef: RefObject<HTMLInputElement | null>
  hasResults: boolean
}

export default function UploadPage({
  fighterName,
  setFighterName,
  items,
  addFiles,
  addUrl,
  removeItem,
  dragActive,
  handleDrag,
  handleDrop,
  handleSubmit,
  submitting,
  error,
  fileInputRef,
  hasResults,
}: Props) {
  const [urlInput, setUrlInput] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)

  function handleAddUrl() {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    if (!isYoutubeUrl(trimmed)) {
      setUrlError('Bara YouTube-länkar stöds just nu.')
      return
    }
    addUrl(trimmed)
    setUrlInput('')
    setUrlError(null)
  }

  return (
    <>
      <section className="hero">
        <p className="hero__eyebrow">Fighter-analys</p>
        <h1>Ladda upp matchklipp, få en analys av fightern</h1>
        <p className="hero__lead">
          Ett eller flera klipp av samma fighter räcker — filer eller
          YouTube-länkar går bra. Vi läser grunddata ur klippet och kör
          pose-estimation för att se hur många personer som syns och hur
          mycket de rör sig. Teknik- och stilidentifiering kopplas in i en
          senare fas.
        </p>
      </section>

      <section className="panel">
        <form onSubmit={handleSubmit} className="upload-form">
          <label className="field">
            <span className="field__label">Fighter (valfritt)</span>
            <input
              type="text"
              value={fighterName}
              onChange={(e) => setFighterName(e.target.value)}
              placeholder="T.ex. Alex Pereira"
            />
          </label>

          <button
            type="button"
            className={`dropzone${dragActive ? ' dropzone--active' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => handleDrag(e, true)}
            onDragEnter={(e) => handleDrag(e, true)}
            onDragLeave={(e) => handleDrag(e, false)}
            onDrop={handleDrop}
          >
            <UploadIcon />
            <span className="dropzone__title">
              Släpp klipp här, eller klicka för att bläddra
            </span>
            <span className="dropzone__hint">
              MP4, MOV — flera filer går bra
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              multiple
              className="dropzone__input"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </button>

          <div className="url-field">
            <span className="field__label">Eller klistra in en YouTube-länk</span>
            <div className="url-field__row">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value)
                  setUrlError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddUrl()
                  }
                }}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <button type="button" className="url-field__add" onClick={handleAddUrl}>
                Lägg till
              </button>
            </div>
            {urlError && <p className="url-field__error">{urlError}</p>}
          </div>

          {items.length > 0 && (
            <ul className="file-list">
              {items.map((item) => (
                <li key={itemKey(item)} className="file-list__item">
                  {item.kind === 'file' ? <FilmIcon /> : <LinkIcon />}
                  <span className="file-list__name">{itemLabel(item)}</span>
                  {item.kind === 'file' && (
                    <span className="file-list__size">
                      {formatBytes(item.file.size)}
                    </span>
                  )}
                  <button
                    type="button"
                    className="file-list__remove"
                    aria-label={`Ta bort ${itemLabel(item)}`}
                    onClick={() => removeItem(itemKey(item))}
                  >
                    <CloseIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button type="submit" className="submit-btn" disabled={submitting}>
            {submitting
              ? 'Laddar upp…'
              : items.length > 1
                ? `Starta analys (${items.length} klipp)`
                : 'Starta analys'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        {hasResults && (
          <p className="upload-page__link">
            <Link to="/results">Se tidigare uppladdade klipp →</Link>
          </p>
        )}
      </section>
    </>
  )
}
