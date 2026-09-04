import { type FormEvent, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

type AnalysisJob = {
  id: string
  fighter_name: string | null
  status: string
  summary: string | null
}

function App() {
  const [fighterName, setFighterName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [job, setJob] = useState<AnalysisJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
    <main className="page">
      <h1>MMA AI — fighter-analys</h1>
      <p className="lead">
        Ladda upp ett matchklipp för att starta en analys. Pipeline för
        pose-estimation och LLM-analys är inte inkopplad än — det här är
        grundskelettet.
      </p>

      <form onSubmit={handleSubmit} className="upload-form">
        <label>
          Fighter (valfritt)
          <input
            type="text"
            value={fighterName}
            onChange={(e) => setFighterName(e.target.value)}
            placeholder="Namn på fighter"
          />
        </label>

        <label>
          Matchklipp
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Laddar upp...' : 'Ladda upp'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {job && (
        <section className="job">
          <h2>Analys-jobb skapat</h2>
          <dl>
            <dt>ID</dt>
            <dd>{job.id}</dd>
            <dt>Fighter</dt>
            <dd>{job.fighter_name ?? '–'}</dd>
            <dt>Status</dt>
            <dd>{job.status}</dd>
          </dl>
        </section>
      )}
    </main>
  )
}

export default App
