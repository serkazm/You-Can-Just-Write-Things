import { useState } from 'react'

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function wordUsed(text, word) {
  return text.toLowerCase().includes(word.toLowerCase())
}

export default function Writing({ session, text, setText, iteration, feedbackHistory, onSubmit }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const wordCount = countWords(text)
  const { minWords, maxWords } = session
  // support both string[] (old) and object[] (new) format
  const requiredWords = (session.requiredWords || []).map(w => typeof w === 'string' ? { word: w } : w)
  const inRange = wordCount >= minWords && wordCount <= maxWords
  const tooMany = wordCount > maxWords
  const tooFew = wordCount > 0 && wordCount < minWords

  const counterClass = `word-counter${inRange ? ' in-range' : tooMany ? ' too-many' : tooFew ? ' too-few' : ''}`

  async function handleSubmit() {
    if (!inRange) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          text,
          iteration,
          previousFeedback: feedbackHistory,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to get feedback')
      }
      onSubmit(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-card card">
          <div className="spinner spinner-dark" />
          <p>Analysing your text…</p>
          <p className="loading-sub">This usually takes a few seconds.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="writing">
      <div className="exercise-card">
        <div className="exercise-meta">
          <span className="badge badge-level">{session.level}</span>
          <span className="badge badge-format">{session.format}</span>
          {iteration > 1 && <span className="badge badge-revision">Revision #{iteration}</span>}
        </div>
        <h2>Your Task</h2>
        <p className="exercise-prompt">{session.prompt}</p>
        {session.hint && (
          <p className="exercise-hint">Tip: {session.hint}</p>
        )}
        <div className="exercise-footer">
          <p className="word-target">Target: {minWords}–{maxWords} words</p>
          {requiredWords.length > 0 && (
            <div className="required-words">
              <span className="required-words-label">Must use:</span>
              {requiredWords.map(w => (
                <span
                  key={w.word}
                  className={`required-word-chip${wordUsed(text, w.word) ? ' used' : ''}`}
                >
                  {wordUsed(text, w.word) ? '✓' : '○'} {w.word}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="writing-area">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write your answer in Russian here..."
          className="text-input"
        />
        <div className="writing-footer">
          <span className={counterClass}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
            {inRange && ' ✓'}
            {tooFew && ` — need ${minWords - wordCount} more`}
            {tooMany && ` — ${wordCount - maxWords} over limit`}
          </span>
          <div className="writing-footer-right">
            {error && <span className="error-msg">{error}</span>}
            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={!inRange}
              title={!inRange ? `Write between ${minWords} and ${maxWords} words to submit` : ''}
            >
              Submit for Feedback →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
