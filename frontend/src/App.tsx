import { type DragEvent, type FormEvent, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import UploadPage from './pages/UploadPage'
import ResultsPage from './pages/ResultsPage'
import { GloveIcon } from './icons'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

export type AnalysisStatus = 'pending' | 'processing' | 'done' | 'failed'

export type AnalysisJob = {
  id: string
  fighter_name: string | null
  status: AnalysisStatus
  summary: string | null
  duration_seconds: number | null
  width: number | null
  height: number | null
  fps: number | null
}

export type UploadResult = {
  file: File
  status: 'uploading' | 'done' | 'error'
  job?: AnalysisJob
  error?: string
}

export function fileKey(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function AppShell() {
  const navigate = useNavigate()
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

    navigate('/results')

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
        <Routes>
          <Route
            path="/"
            element={
              <UploadPage
                fighterName={fighterName}
                setFighterName={setFighterName}
                files={files}
                addFiles={addFiles}
                removeFile={removeFile}
                dragActive={dragActive}
                handleDrag={handleDrag}
                handleDrop={handleDrop}
                handleSubmit={handleSubmit}
                submitting={submitting}
                error={error}
                fileInputRef={fileInputRef}
                hasResults={results.length > 0}
              />
            }
          />
          <Route path="/results" element={<ResultsPage results={results} />} />
        </Routes>
      </main>

      <footer className="site-footer">
        Combat AI · byggs stegvis — fighter-analys, tränarassistent,
        teknikigenkänning
      </footer>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default App
