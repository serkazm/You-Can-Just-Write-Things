import { useState, useEffect } from 'react'

export default function UserSelect({ onSelect }) {
  const [users, setUsers] = useState(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(setUsers)
      .catch(() => setUsers([]))
  }, [])

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    setError('')
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to create user'); return }
    onSelect(data)
  }

  if (users === null) {
    return (
      <div className="user-select">
        <div className="user-select-card card">
          <div className="spinner spinner-dark" />
        </div>
      </div>
    )
  }

  return (
    <div className="user-select">
      <div className="user-select-card card">
        <h1 className="user-select-title">You can just write things</h1>
        <p className="user-select-subtitle">A Russian writing practice tool</p>

        {users.length === 0 || adding ? (
          <>
            <h2 className="user-select-heading">
              {users.length === 0 ? "Welcome! What's your name?" : 'Add a new user'}
            </h2>
            <input
              className="user-name-input"
              type="text"
              placeholder="Your name"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            {error && <p className="error-msg">{error}</p>}
            <div className="user-select-actions">
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={!newName.trim()}
              >
                Start →
              </button>
              {adding && (
                <button className="btn-secondary" onClick={() => { setAdding(false); setNewName(''); setError('') }}>
                  Cancel
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <h2 className="user-select-heading">Who's practising today?</h2>
            <div className="user-list">
              {users.map(u => (
                <button key={u.id} className="user-btn" onClick={() => onSelect(u)}>
                  {u.name}
                </button>
              ))}
            </div>
            <button className="btn-secondary user-add-btn" onClick={() => setAdding(true)}>
              + New user
            </button>
          </>
        )}
      </div>
    </div>
  )
}
