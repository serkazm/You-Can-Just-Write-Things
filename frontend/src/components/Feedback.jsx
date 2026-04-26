import { useState } from 'react'

function ratingColor(rating) {
  if (rating >= 80) return '#10b981'
  if (rating >= 65) return '#f59e0b'
  if (rating >= 50) return '#3b82f6'
  return '#ef4444'
}

function RatingBadge({ rating }) {
  return (
    <div className="rating-badge" style={{ color: ratingColor(rating) }}>
      <span className="rating-number">{rating}</span>
      <span className="rating-max">/100</span>
    </div>
  )
}

function RequiredWordCheckItem({ item, userId }) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          russian: item.word,
          english: item.translation || '',
          example_ru: item.example_ru || '',
          example_en: item.example_en || '',
          userId,
        }),
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`required-check-item${item.used ? ' used' : ' missed'}`}>
      <span className="required-check-icon">{item.used ? '✓' : '✗'}</span>
      <span className="required-check-word">{item.word}</span>
      {item.translation && <span className="required-check-translation">({item.translation})</span>}
      <span className="required-check-status">{item.used ? 'Used' : 'Not used'}</span>
      <button
        className={`btn-save-vocab${saved ? ' saved' : ''}`}
        onClick={handleSave}
        disabled={saved || saving}
        style={{ marginLeft: 'auto' }}
      >
        {saved ? 'Saved ✓' : saving ? '...' : '+ Save to Vocab'}
      </button>
    </div>
  )
}

function VocabCard({ v, userId }) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          russian: v.suggested,
          english: v.translation || v.note,
          example_ru: v.example_ru || '',
          example_en: v.example_en || '',
          userId,
        }),
      })
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="correction-card">
      <div className="correction-row">
        <span className="text-neutral">{v.original}</span>
        <span className="correction-arrow">→</span>
        <span className="text-right">{v.suggested}</span>
        {v.translation && <span className="vocab-translation">({v.translation})</span>}
        <button
          className={`btn-save-vocab${saved ? ' saved' : ''}`}
          onClick={handleSave}
          disabled={saved || saving}
        >
          {saved ? 'Saved ✓' : saving ? '...' : '+ Save to Vocab'}
        </button>
      </div>
      <p className="correction-explanation">{v.note}</p>
      {v.example_ru && (
        <p className="vocab-example">
          <span className="example-ru">{v.example_ru}</span>
          {v.example_en && <span className="example-en"> — {v.example_en}</span>}
        </p>
      )}
    </div>
  )
}

export default function Feedback({ session, feedback, text, iteration, onEdit, onNewExercise, onViewProgress, onViewVocabulary, userId }) {
  return (
    <div className="feedback">
      <div className="feedback-header card">
        <div>
          <div className="exercise-meta">
            <span className="badge badge-level">{session.level}</span>
            <span className="badge badge-format">{session.format}</span>
            {iteration > 1 && <span className="badge badge-revision">Revision #{iteration}</span>}
          </div>
          <h2>Feedback</h2>
        </div>
        <RatingBadge rating={feedback.rating} />
      </div>

      <section className="card feedback-section">
        <h3>Overall Assessment</h3>
        <p>{feedback.summary}</p>
        {feedback.word_count_note && (
          <p className="word-count-note">{feedback.word_count_note}</p>
        )}
      </section>

      {feedback.strengths?.length > 0 && (
        <section className="card feedback-section section-strengths">
          <h3>Strengths</h3>
          <ul>
            {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </section>
      )}

      {feedback.grammar_errors?.length > 0 && (
        <section className="card feedback-section section-errors">
          <h3>Grammar Corrections</h3>
          {feedback.grammar_errors.map((err, i) => (
            <div key={i} className="correction-card">
              <div className="correction-row">
                <span className="text-wrong">{err.original}</span>
                <span className="correction-arrow">→</span>
                <span className="text-right">{err.corrected}</span>
              </div>
              <p className="correction-explanation">{err.explanation}</p>
            </div>
          ))}
        </section>
      )}

      {feedback.vocabulary_suggestions?.length > 0 && (
        <section className="card feedback-section section-vocab">
          <h3>Vocabulary Suggestions</h3>
          {feedback.vocabulary_suggestions.map((v, i) => (
            <VocabCard key={i} v={v} userId={userId} />
          ))}
        </section>
      )}

      {feedback.required_words_check?.length > 0 && (
        <section className="card feedback-section section-required">
          <h3>Required Words</h3>
          <div className="required-words-check">
            {feedback.required_words_check.map((item, i) => (
              <RequiredWordCheckItem key={i} item={item} userId={userId} />
            ))}
          </div>
        </section>
      )}

      {feedback.structure_feedback && (
        <section className="card feedback-section section-structure">
          <h3>Structure &amp; Format</h3>
          <p>{feedback.structure_feedback}</p>
        </section>
      )}

      <div className="feedback-actions">
        <button className="btn-secondary" onClick={onEdit}>Edit &amp; Resubmit</button>
        <button className="btn-secondary" onClick={onViewProgress}>View Progress</button>
        <button className="btn-secondary" onClick={onViewVocabulary}>My Vocabulary</button>
        <button className="btn-primary" onClick={onNewExercise}>New Exercise →</button>
      </div>

      <details className="card submission-details">
        <summary>Your submitted text</summary>
        <pre className="submission-text">{text}</pre>
      </details>
    </div>
  )
}
