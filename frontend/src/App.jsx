import { useState } from 'react'
import Setup from './components/Setup'
import Writing from './components/Writing'
import Feedback from './components/Feedback'
import Progress from './components/Progress'
import Vocabulary from './components/Vocabulary'
import UserSelect from './components/UserSelect'

function loadUser() {
  try {
    const raw = localStorage.getItem('russian_tool_user')
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export default function App() {
  const [user, setUser] = useState(loadUser)
  const [view, setView] = useState('setup')
  const [session, setSession] = useState(null)
  const [text, setText] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [feedbackHistory, setFeedbackHistory] = useState([])
  const [iteration, setIteration] = useState(1)

  function handleSelectUser(u) {
    localStorage.setItem('russian_tool_user', JSON.stringify(u))
    setUser(u)
  }

  function handleSwitchUser() {
    localStorage.removeItem('russian_tool_user')
    setUser(null)
    setSession(null)
    setText('')
    setFeedback(null)
    setFeedbackHistory([])
    setIteration(1)
    setView('setup')
  }

  function handleGenerate(newSession) {
    setSession(newSession)
    setText('')
    setIteration(1)
    setFeedbackHistory([])
    setView('writing')
  }

  function handleSubmit(newFeedback) {
    setFeedbackHistory(prev => [...prev, newFeedback])
    setFeedback(newFeedback)
    setView('feedback')
  }

  function handleEdit() {
    setIteration(prev => prev + 1)
    setView('writing')
  }

  function handleNewExercise() {
    setSession(null)
    setText('')
    setFeedback(null)
    setFeedbackHistory([])
    setIteration(1)
    setView('setup')
  }

  if (!user) return <UserSelect onSelect={handleSelectUser} />

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
        <h1>You can just write things</h1>
        <nav>
          <button
            className={`nav-btn${view === 'vocabulary' ? ' active' : ''}`}
            onClick={() => setView('vocabulary')}
          >
            My Vocabulary
          </button>
          <button
            className={`nav-btn${view === 'progress' ? ' active' : ''}`}
            onClick={() => setView('progress')}
          >
            My Progress
          </button>
          <button
            className={`nav-btn${view === 'setup' ? ' active' : ''}`}
            onClick={handleNewExercise}
          >
            New Exercise
          </button>
          <button className="nav-btn nav-btn-user" onClick={handleSwitchUser} title="Switch user">
            {user.name}
          </button>
        </nav>
        </div>
      </header>

      <main className="app-main">
        {view === 'setup' && <Setup onGenerate={handleGenerate} userId={user.id} />}
        {view === 'writing' && (
          <Writing
            session={session}
            text={text}
            setText={setText}
            iteration={iteration}
            feedbackHistory={feedbackHistory}
            onSubmit={handleSubmit}
            onBack={handleNewExercise}
          />
        )}
        {view === 'feedback' && (
          <Feedback
            session={session}
            feedback={feedback}
            text={text}
            iteration={iteration}
            onEdit={handleEdit}
            onNewExercise={handleNewExercise}
            onViewProgress={() => setView('progress')}
            onViewVocabulary={() => setView('vocabulary')}
            userId={user.id}
          />
        )}
        {view === 'progress' && (
          <Progress onBack={() => setView(session ? 'feedback' : 'setup')} userId={user.id} />
        )}
        {view === 'vocabulary' && <Vocabulary userId={user.id} />}
      </main>
    </div>
  )
}
