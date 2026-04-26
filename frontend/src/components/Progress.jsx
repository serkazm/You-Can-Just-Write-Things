import { useState, useEffect } from 'react'

function ratingColor(rating) {
  if (rating >= 80) return '#10b981'
  if (rating >= 65) return '#f59e0b'
  if (rating >= 50) return '#3b82f6'
  return '#ef4444'
}

function RatingBar({ rating }) {
  return (
    <div className="rating-bar-wrap">
      <div className="rating-bar-track">
        <div
          className="rating-bar-fill"
          style={{ width: `${rating}%`, backgroundColor: ratingColor(rating) }}
        />
      </div>
      <span className="rating-bar-label" style={{ color: ratingColor(rating) }}>{rating}</span>
    </div>
  )
}

function formatDate(str) {
  return new Date(str).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Progress({ onBack, userId }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    fetch(`/api/sessions${userId ? `?userId=${userId}` : ''}`)
      .then(r => r.json())
      .then(data => { setSessions(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function toggleExpand(id) {
    if (expanded === id) {
      setExpanded(null)
      setDetail(null)
      return
    }
    setExpanded(id)
    const res = await fetch(`/api/session/${id}`)
    setDetail(await res.json())
  }

  if (loading) return <div className="progress"><p className="loading-text">Loading...</p></div>

  if (sessions.length === 0) {
    return (
      <div className="progress progress-empty">
        <p>No submissions yet. Complete your first exercise to see your progress!</p>
        <button className="btn-primary" onClick={onBack}>Start Writing →</button>
      </div>
    )
  }

  const ratingsWithValues = sessions.filter(s => s.best_rating)
  const avgRating = ratingsWithValues.length > 0
    ? Math.round(ratingsWithValues.reduce((a, s) => a + s.best_rating, 0) / ratingsWithValues.length)
    : null
  const totalSubmissions = sessions.reduce((a, s) => a + (s.submission_count || 0), 0)

  return (
    <div className="progress">
      <div className="card progress-header">
        <h2>Your Progress</h2>
        <div className="progress-stats">
          <div className="stat">
            <span className="stat-value">{sessions.length}</span>
            <span className="stat-label">Exercises</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totalSubmissions}</span>
            <span className="stat-label">Submissions</span>
          </div>
          {avgRating && (
            <div className="stat">
              <span className="stat-value" style={{ color: ratingColor(avgRating) }}>{avgRating}</span>
              <span className="stat-label">Avg. Best Score</span>
            </div>
          )}
        </div>
      </div>

      <div className="sessions-list">
        {sessions.map(session => (
          <div key={session.id} className="card session-card">
            <div className="session-header" onClick={() => toggleExpand(session.id)}>
              <div className="session-left">
                <div className="exercise-meta">
                  <span className="badge badge-level">{session.level}</span>
                  <span className="badge badge-format">{session.format_name}</span>
                </div>
                <span className="session-date">{formatDate(session.created_at)}</span>
              </div>
              <div className="session-right">
                {session.best_rating && <RatingBar rating={session.best_rating} />}
                <span className="expand-icon">{expanded === session.id ? '▲' : '▼'}</span>
              </div>
            </div>
            <p className="session-prompt">{session.exercise_prompt}</p>

            {expanded === session.id && detail?.id === session.id && (
              <div className="session-detail">
                {detail.submissions.map(sub => (
                  <div key={sub.id} className="submission-row">
                    <div className="submission-row-header">
                      <span className="submission-iter">Submission #{sub.iteration}</span>
                      <span className="session-date">{formatDate(sub.submitted_at)}</span>
                      <span className="submission-score" style={{ color: ratingColor(sub.rating) }}>
                        {sub.rating}/100
                      </span>
                    </div>
                    <p className="submission-summary">{sub.feedback.summary}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
