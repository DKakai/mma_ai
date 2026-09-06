import { type DragEvent, type FormEvent, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { fileKey } from '../App'
import { CloseIcon, FilmIcon, UploadIcon } from '../icons'

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Props = {
  fighterName: string
  setFighterName: (value: string) => void
  files: File[]
  addFiles: (files: FileList | File[]) => void
  removeFile: (key: string) => void
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
  files,
  addFiles,
  removeFile,
  dragActive,
  handleDrag,
  handleDrop,
  handleSubmit,
  submitting,
  error,
  fileInputRef,
  hasResults,
}: Props) {
  return (
    <>
      <section className="hero">
        <p className="hero__eyebrow">Fighter-analys</p>
        <h1>Ladda upp matchklipp, få en analys av fightern</h1>
        <p className="hero__lead">
          Ett eller flera klipp av samma fighter räcker. Just nu läser vi
          grunddata ur varje klipp (längd, upplösning, fps) — automatisk
          identifiering av teknik och stil kopplas in i en senare fas.
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

          {files.length > 0 && (
            <ul className="file-list">
              {files.map((file) => (
                <li key={fileKey(file)} className="file-list__item">
                  <FilmIcon />
                  <span className="file-list__name">{file.name}</span>
                  <span className="file-list__size">
                    {formatBytes(file.size)}
                  </span>
                  <button
                    type="button"
                    className="file-list__remove"
                    aria-label={`Ta bort ${file.name}`}
                    onClick={() => removeFile(fileKey(file))}
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
              : files.length > 1
                ? `Starta analys (${files.length} klipp)`
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
