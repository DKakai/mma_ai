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

const STATUS_LABEL: Record<AnalysisStatus, string> = {
  pending: 'Väntar',
  processing: 'Bearbetas',
  done: 'Klar',
  failed: 'Misslyckades',
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
  const [file, setFile] = useState<File | null>(null)
  const [job, setJob] = useState<AnalysisJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleDrag(event: DragEvent, active: boolean) {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(active)
  }

  function handleDrop(event: DragEvent) {
    handleDrag(event, false)
    const dropped = event.dataTransfer.files?.[0]
    if (dropped) setFile(dropped)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!file) {
      setError('Välj ett matchklipp först.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
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
      const data: AnalysisJob = await response.json()
      setJob(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="page__glow" aria-hidden="true" />

      <header className="site-header">
        <div className="brand">
          <GloveIcon />
          <span>MMA AI</span>
        </div>
        <span className="site-header__tag">Virtuell tränare</span>
      </header>

      <main className="content">
        <section className="hero">
          <p className="hero__eyebrow">Fighter-analys · Fas 1</p>
          <h1>Känn din motståndare innan du kliver in i buren.</h1>
          <p className="hero__lead">
            Ladda upp ett matchklipp så bygger vi en analys av stil, tendenser
            och matchup-möjligheter. Pose-estimation och LLM-analys kopplas
            in i nästa steg — det här är grundflödet för uppladdning.
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
              className={`dropzone${dragActive ? ' dropzone--active' : ''}${file ? ' dropzone--filled' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => handleDrag(e, true)}
              onDragEnter={(e) => handleDrag(e, true)}
              onDragLeave={(e) => handleDrag(e, false)}
              onDrop={handleDrop}
            >
              <UploadIcon />
              {file ? (
                <span className="dropzone__filename">{file.name}</span>
              ) : (
                <>
                  <span className="dropzone__title">Släpp matchklippet här</span>
                  <span className="dropzone__hint">
                    eller klicka för att bläddra — MP4, MOV
                  </span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="dropzone__input"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </button>

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Laddar upp…' : 'Starta analys'}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          {job && (
            <section className="job-card">
              <div className="job-card__header">
                <h2>Analys-jobb skapat</h2>
                <StatusBadge status={job.status} />
              </div>
              <dl className="job-card__meta">
                <div>
                  <dt>Fighter</dt>
                  <dd>{job.fighter_name ?? '–'}</dd>
                </div>
                <div>
                  <dt>Jobb-ID</dt>
                  <dd className="job-card__id">{job.id}</dd>
                </div>
              </dl>
            </section>
          )}
        </section>
      </main>

      <footer className="site-footer">
        MMA AI · byggs stegvis — fighter-analys, tränarassistent, teknikigenkänning
      </footer>
    </div>
  )
}

export default App
