import { useState, useEffect } from 'react'

function VocabItem({ item, onDelete }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="vocab-item card">
      <div className="vocab-item-header" onClick={() => setExpanded(e => !e)}>
        <div className="vocab-item-main">
          <span className="vocab-russian">{item.russian}</span>
          <span className="vocab-sep">—</span>
          <span className="vocab-english">{item.english}</span>
        </div>
        <div className="vocab-item-controls">
          <span className="expand-icon">{expanded ? '▲' : '▼'}</span>
          <button
            className="btn-delete"
            onClick={e => { e.stopPropagation(); onDelete(item.id) }}
            title="Remove from vocabulary"
          >✕</button>
        </div>
      </div>

      {expanded && (item.example_ru || item.example_en) && (
        <div className="vocab-item-body">
          {item.example_ru && <p className="example-ru">{item.example_ru}</p>}
          {item.example_en && <p className="example-en">{item.example_en}</p>}
        </div>
      )}
    </div>
  )
}

export default function Vocabulary({ userId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch(`/api/vocabulary${userId ? `?userId=${userId}` : ''}`)
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleDelete(id) {
    await fetch(`/api/vocabulary/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(v => v.id !== id))
  }

  const filtered = search.trim()
    ? items.filter(v =>
        v.russian.toLowerCase().includes(search.toLowerCase()) ||
        v.english.toLowerCase().includes(search.toLowerCase())
      )
    : items

  if (loading) return <div className="vocab-page"><p className="loading-text">Loading...</p></div>

  return (
    <div className="vocab-page">
      <div className="card vocab-header">
        <div className="vocab-header-top">
          <h2>My Vocabulary</h2>
          <span className="vocab-count">{items.length} {items.length === 1 ? 'word' : 'words'}</span>
        </div>
        {items.length > 0 && (
          <input
            className="vocab-search"
            type="text"
            placeholder="Search words..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        )}
      </div>

      {items.length === 0 ? (
        <div className="vocab-empty">
          <p>No vocabulary saved yet.</p>
          <p>When you get feedback on an exercise, click <strong>"+ Save to Vocab"</strong> on any vocabulary suggestion to add it here.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="loading-text">No matches for "{search}".</p>
      ) : (
        <div className="vocab-list">
          {filtered.map(item => (
            <VocabItem key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
