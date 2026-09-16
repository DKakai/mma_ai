import { type DragEvent, type FormEvent, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import UploadPage from './pages/UploadPage'
import ResultsPage from './pages/ResultsPage'
import { GloveIcon } from './icons'

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

export type AnalysisStatus = 'pending' | 'processing' | 'done' | 'failed'

export type PersonMovement = {
  frames_detected: number
  activity_level: number | null
}

export type AnalysisJob = {
  id: string
  fighter_name: string | null
  status: AnalysisStatus
  summary: string | null
  duration_seconds: number | null
  width: number | null
  height: number | null
  fps: number | null
  frames_sampled: number | null
  max_people_in_frame: number | null
  people: PersonMovement[]
  annotated_frames: string[]
}

export type PendingItem =
  | { kind: 'file'; file: File }
  | { kind: 'url'; url: string }

export type UploadResult = {
  item: PendingItem
  status: 'uploading' | 'done' | 'error'
  job?: AnalysisJob
  error?: string
}

export function itemKey(item: PendingItem) {
  return item.kind === 'file'
    ? `file-${item.file.name}-${item.file.size}-${item.file.lastModified}`
    : `url-${item.url}`
}

export function itemLabel(item: PendingItem) {
  return item.kind === 'file' ? item.file.name : item.url
}

function AppShell() {
  const navigate = useNavigate()
  const [fighterName, setFighterName] = useState('')
  const [items, setItems] = useState<PendingItem[]>([])
  const [results, setResults] = useState<UploadResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addFiles(incoming: FileList | File[]) {
    const incomingItems: PendingItem[] = Array.from(incoming).map((file) => ({
      kind: 'file',
      file,
    }))
    setItems((current) => {
      const existingKeys = new Set(current.map(itemKey))
      const newOnes = incomingItems.filter((it) => !existingKeys.has(itemKey(it)))
      return [...current, ...newOnes]
    })
  }

  function addUrl(url: string) {
    const item: PendingItem = { kind: 'url', url }
    setItems((current) => {
      if (current.some((it) => itemKey(it) === itemKey(item))) return current
      return [...current, item]
    })
  }

  function removeItem(key: string) {
    setItems((current) => current.filter((it) => itemKey(it) !== key))
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

  async function uploadOne(item: PendingItem): Promise<AnalysisJob> {
    if (item.kind === 'file') {
      const formData = new FormData()
      formData.append('file', item.file)
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

    const response = await fetch(`${API_BASE}/api/analysis/from-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: item.url, fighter_name: fighterName || null }),
    })
    if (!response.ok) {
      throw new Error(`Analys misslyckades (${response.status})`)
    }
    return response.json()
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (items.length === 0) {
      setError('Välj minst ett videoklipp eller klistra in en länk först.')
      return
    }
    setError(null)
    setSubmitting(true)

    const batch = items
    setItems([])
    setResults((current) => [
      ...current,
      ...batch.map((item) => ({ item, status: 'uploading' as const })),
    ])

    navigate('/results')

    for (const item of batch) {
      try {
        const job = await uploadOne(item)
        setResults((current) =>
          current.map((r) =>
            r.item === item ? { ...r, status: 'done', job } : r,
          ),
        )
      } catch (err) {
        setResults((current) =>
          current.map((r) =>
            r.item === item
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
                items={items}
                addFiles={addFiles}
                addUrl={addUrl}
                removeItem={removeItem}
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
