import { useState, useEffect } from 'react'

const LEVELS = [
  { id: 'A1', desc: 'Beginner' },
  { id: 'A2', desc: 'Elementary' },
  { id: 'B1', desc: 'Intermediate' },
  { id: 'B2', desc: 'Upper Intermediate' },
  { id: 'C1', desc: 'Advanced' },
  { id: 'C2', desc: 'Mastery' },
]

const FORMATS = [
  { id: 'postcard',        name: 'Postcard',            russian: 'Открытка',               icon: '🗺️' },
  { id: 'email',           name: 'Informal Email',       russian: 'Электронное письмо',      icon: '📧' },
  { id: 'personal_letter', name: 'Personal Letter',      russian: 'Личное письмо',           icon: '✉️' },
  { id: 'short_story',     name: 'Short Story',          russian: 'Рассказ',                 icon: '📖' },
  { id: 'forum_post',      name: 'Forum Post',           russian: 'Пост / Комментарий',      icon: '💬' },
  { id: 'essay',           name: 'Essay / Composition',  russian: 'Сочинение',               icon: '📝' },
  { id: 'formal_letter',   name: 'Formal Letter',        russian: 'Официальное письмо',      icon: '📄' },
  { id: 'opinion_essay',   name: 'Opinion Essay',        russian: 'Эссе',                    icon: '💭' },
]

const LEVEL_FORMATS = {
  A1: ['postcard', 'email'],
  A2: ['postcard', 'email', 'personal_letter'],
  B1: ['personal_letter', 'email', 'short_story', 'forum_post', 'essay'],
  B2: ['personal_letter', 'email', 'formal_letter', 'short_story', 'forum_post', 'essay', 'opinion_essay'],
  C1: ['personal_letter', 'email', 'formal_letter', 'short_story', 'forum_post', 'essay', 'opinion_essay'],
  C2: ['personal_letter', 'email', 'formal_letter', 'short_story', 'forum_post', 'essay', 'opinion_essay'],
}

export default function Setup({ onGenerate, userId }) {
  const [level, setLevel] = useState('')
  const [format, setFormat] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const allowedFormats = level ? LEVEL_FORMATS[level] : null

  useEffect(() => {
    if (format && allowedFormats && !allowedFormats.includes(format)) {
      setFormat('')
    }
  }, [level])

  async function handleGenerate() {
    if (!level || !format) return
    setLoading(true)
    setError('')
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level, format, userId }),
        })
        let data
        try {
          data = await res.json()
        } catch {
          if (attempt === 0) continue
          throw new Error('Server returned an invalid response. Please try again.')
        }
        if (!res.ok) throw new Error(data.error || 'Failed to generate exercise')
        setLoading(false)
        onGenerate(data)
        return
      } catch (err) {
        if (attempt === 1) {
          setError(err.message)
          setLoading(false)
        }
      }
    }
  }

  return (
    <div className="setup">
      <section className="setup-section">
        <h2>Your Russian Level</h2>
        <div className="level-grid">
          {LEVELS.map(l => (
            <button
              key={l.id}
              className={`level-btn${level === l.id ? ' selected' : ''}`}
              onClick={() => setLevel(l.id)}
            >
              <span className="level-code">{l.id}</span>
              <span className="level-desc">{l.desc}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="setup-section">
        <h2>Writing Format</h2>
        {!level && <p className="setup-hint">Select a level first to see available formats.</p>}
        <div className="format-grid">
          {FORMATS.map(f => {
            const disabled = allowedFormats && !allowedFormats.includes(f.id)
            return (
              <button
                key={f.id}
                className={`format-btn${format === f.id ? ' selected' : ''}${disabled ? ' disabled' : ''}`}
                onClick={() => !disabled && setFormat(f.id)}
                disabled={disabled}
                title={disabled ? `Not available at ${level} level` : ''}
              >
                <span className="format-icon">{f.icon}</span>
                <span className="format-name">{f.name}</span>
                <span className="format-russian">{f.russian}</span>
              </button>
            )
          })}
        </div>
      </section>

      {error && <p className="error-msg">{error}</p>}

      {loading && (
        <div className="loading-overlay">
          <div className="loading-card card">
            <div className="spinner spinner-dark" />
            <p>Generating your exercise…</p>
            <p className="loading-sub">Just a moment.</p>
          </div>
        </div>
      )}

      <button
        className="btn-primary btn-large"
        onClick={handleGenerate}
        disabled={!level || !format || loading}
      >
        {loading
          ? <><span className="spinner" /> Generating…</>
          : 'Generate Exercise →'}
      </button>
    </div>
  )
}
