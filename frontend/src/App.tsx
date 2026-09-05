import { type DragEvent, type FormEvent, useRef, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

type AnalysisStatus = 'pending' | 'processing' | 'done' | 'failed'

type AnalysisJob = {
  id: string
  fighter_name: string | null
  status: AnalysisStatus
  summary: string | null
}

type UploadResult = {
  file: File
  status: 'uploading' | 'done' | 'error'
  job?: AnalysisJob
  error?: string
}

const STATUS_LABEL: Record<AnalysisStatus, string> = {
  pending: 'Väntar',
  processing: 'Bearbetas',
  done: 'Klar',
  failed: 'Misslyckades',
}

function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusBadge({ status }: { status: AnalysisStatus }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      <span className="status-badge__dot" />
      {STATUS_LABEL[status]}
    </span>
  )
}

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V4M12 4L7 9M12 4l5 5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function FilmIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M8 5v14M16 5v14" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9.5h5M3 14.5h5M16 9.5h5M16 14.5h5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

function GloveIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="brand__icon">
      <path
        d="M7 13V7.5a2.5 2.5 0 0 1 5 0V11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M12 11V6a2 2 0 1 1 4 0v5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M16 11.5V8a2 2 0 1 1 4 0v6c0 3.31-2.69 6-6 6h-2c-3.31 0-6-2.69-6-6v-3a2 2 0 1 1 4 0"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function App() {
  const [fighterName, setFighterName] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [results, setResults] = useState<UploadResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addFiles(incoming: FileList | File[]) {
    const incomingArray = Array.from(incoming)
    setFiles((current) => {
      const existingKeys = new Set(current.map(fileKey))
      const newOnes = incomingArray.filter((f) => !existingKeys.has(fileKey(f)))
      return [...current, ...newOnes]
    })
  }

  function removeFile(key: string) {
    setFiles((current) => current.filter((f) => fileKey(f) !== key))
  }

  function handleDrag(event: DragEvent, active: boolean) {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(active)
  }

  function handleDrop(event: DragEvent) {
    handleDrag(event, false)
    if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files)
  }

  async function uploadOne(file: File): Promise<AnalysisJob> {
    const formData = new FormData()
    formData.append('file', file)
    const query = fighterName
      ? `?fighter_name=${encodeURIComponent(fighterName)}`
      : ''
    const response = await fetch(`${API_BASE}/api/analysis/upload${query}`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) {
      throw new Error(`Uppladdning misslyckades (${response.status})`)
    }
    return response.json()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (files.length === 0) {
      setError('Välj minst ett videoklipp först.')
      return
    }
    setError(null)
    setSubmitting(true)

    const batch = files
    setFiles([])
    setResults((current) => [
      ...current,
      ...batch.map((file) => ({ file, status: 'uploading' as const })),
    ])

    for (const file of batch) {
      try {
        const job = await uploadOne(file)
        setResults((current) =>
          current.map((r) =>
            r.file === file ? { ...r, status: 'done', job } : r,
          ),
        )
      } catch (err) {
        setResults((current) =>
          current.map((r) =>
            r.file === file
              ? {
                  ...r,
                  status: 'error',
                  error: err instanceof Error ? err.message : 'Något gick fel',
                }
              : r,
          ),
        )
      }
    }

    setSubmitting(false)
  }

  return (
    <div className="page">
      <div className="page__glow" aria-hidden="true" />

      <header className="site-header">
        <div className="brand">
          <GloveIcon />
          <span>Combat AI</span>
        </div>
        <span className="site-header__tag">MMA · Boxning · Kickboxning</span>
      </header>

      <main className="content">
        <section className="hero">
          <p className="hero__eyebrow">Fighter-analys</p>
          <h1>Ladda upp matchklipp, få en analys av fightern</h1>
          <p className="hero__lead">
            Ett eller flera klipp av samma fighter räcker. Vi extraherar
            rörelsedata från varje klipp och bygger en samlad analys av stil
            och tendenser. Pose-estimation och LLM-analys kopplas in i nästa
            steg — det här är grundflödet för uppladdning.
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

          {results.length > 0 && (
            <ul className="results-list">
              {[...results].reverse().map((result) => (
                <li key={fileKey(result.file)} className="job-card">
                  <div className="job-card__header">
                    <h2>{result.file.name}</h2>
                    {result.status === 'uploading' && (
                      <span className="status-badge status-badge--pending">
                        <span className="status-badge__dot" />
                        Laddar upp
                      </span>
                    )}
                    {result.status === 'done' && result.job && (
                      <StatusBadge status={result.job.status} />
                    )}
                    {result.status === 'error' && (
                      <span className="status-badge status-badge--failed">
                        <span className="status-badge__dot" />
                        Fel
                      </span>
                    )}
                  </div>

                  {result.status === 'done' && result.job && (
                    <dl className="job-card__meta">
                      <div>
                        <dt>Fighter</dt>
                        <dd>{result.job.fighter_name ?? '–'}</dd>
                      </div>
                      <div>
                        <dt>Jobb-ID</dt>
                        <dd className="job-card__id">{result.job.id}</dd>
                      </div>
                    </dl>
                  )}

                  {result.status === 'error' && (
                    <p className="job-card__error">{result.error}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <footer className="site-footer">
        Combat AI · byggs stegvis — fighter-analys, tränarassistent,
        teknikigenkänning
      </footer>
    </div>
  )
}

export default App
