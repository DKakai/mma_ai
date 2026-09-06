import { Link } from 'react-router-dom'
import type { AnalysisStatus, UploadResult } from '../App'
import { fileKey } from '../App'
import { ArrowLeftIcon } from '../icons'

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

type Props = {
  results: UploadResult[]
}

export default function ResultsPage({ results }: Props) {
  return (
    <>
      <section className="hero">
        <p className="hero__eyebrow">Fighter-identifiering</p>
        <h1>Analysresultat</h1>
        <p className="hero__lead">
          Fighter-namnet nedan är det du skrev in för hand — automatisk
          visuell identifiering av vem som syns i klippet är inte byggd än.
          Det som visas per klipp just nu är grunddata vi faktiskt kunnat
          läsa ur videofilen.
        </p>
      </section>

      <section className="panel">
        <Link to="/" className="back-link">
          <ArrowLeftIcon />
          Ladda upp fler klipp
        </Link>

        {results.length === 0 ? (
          <p className="empty-state">
            Inga klipp uppladdade än.{' '}
            <Link to="/">Gå till uppladdning →</Link>
          </p>
        ) : (
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
                  <>
                    <dl className="job-card__meta">
                      <div>
                        <dt>Fighter (angivet)</dt>
                        <dd>{result.job.fighter_name ?? '–'}</dd>
                      </div>
                      <div>
                        <dt>Jobb-ID</dt>
                        <dd className="job-card__id">{result.job.id}</dd>
                      </div>
                      {result.job.status === 'done' && (
                        <>
                          <div>
                            <dt>Längd</dt>
                            <dd>{result.job.duration_seconds}s</dd>
                          </div>
                          <div>
                            <dt>Upplösning</dt>
                            <dd>
                              {result.job.width}×{result.job.height}
                            </dd>
                          </div>
                          <div>
                            <dt>Bildfrekvens</dt>
                            <dd>{result.job.fps} fps</dd>
                          </div>
                        </>
                      )}
                    </dl>
                    {result.job.status === 'failed' && result.job.summary && (
                      <p className="job-card__error">{result.job.summary}</p>
                    )}
                  </>
                )}

                {result.status === 'error' && (
                  <p className="job-card__error">{result.error}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
