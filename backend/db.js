const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.json');

const EMPTY = { users: [], sessions: [], submissions: [], vocabulary: [], nextUserId: 1, nextSessionId: 1, nextSubmissionId: 1, nextVocabId: 1 };

function read() {
  if (!fs.existsSync(DB_PATH)) return JSON.parse(JSON.stringify(EMPTY));
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return JSON.parse(JSON.stringify(EMPTY));
  }
}

function write(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

const db = {
  insertUser(name) {
    const data = read();
    if (!data.users) data.users = [];
    if (!data.nextUserId) data.nextUserId = 1;
    const user = { id: data.nextUserId++, name: name.trim(), created_at: now() };
    data.users.push(user);
    write(data);
    return user;
  },

  getAllUsers() {
    const data = read();
    return (data.users || []).sort((a, b) => a.id - b.id);
  },

  getUser(id) {
    return (read().users || []).find(u => u.id === Number(id)) || null;
  },

  insertSession(fields) {
    const data = read();
    const session = { id: data.nextSessionId++, ...fields, created_at: now() };
    data.sessions.push(session);
    write(data);
    return session;
  },

  getSession(id) {
    return read().sessions.find(s => s.id === Number(id)) || null;
  },

  insertSubmission(fields) {
    const data = read();
    const sub = { id: data.nextSubmissionId++, ...fields, submitted_at: now() };
    data.submissions.push(sub);
    write(data);
    return sub;
  },

  getSubmissionsForSession(sessionId) {
    return read().submissions
      .filter(s => s.session_id === Number(sessionId))
      .sort((a, b) => a.iteration - b.iteration);
  },

  getPreviousPrompts(level, format, userId) {
    return read().sessions
      .filter(s => s.level === level && s.format === format && (!userId || !s.user_id || s.user_id === Number(userId)))
      .map(s => s.exercise_prompt)
      .slice(-8);
  },

  insertVocabItem(fields) {
    const data = read();
    if (!data.vocabulary) data.vocabulary = [];
    if (!data.nextVocabId) data.nextVocabId = 1;
    const item = { id: data.nextVocabId++, ...fields, added_at: now() };
    data.vocabulary.push(item);
    write(data);
    return item;
  },

  getAllVocab(userId) {
    const data = read();
    const uid = userId ? Number(userId) : null;
    return (data.vocabulary || [])
      .filter(v => !uid || !v.user_id || v.user_id === uid)
      .sort((a, b) => b.id - a.id);
  },

  deleteVocabItem(id) {
    const data = read();
    data.vocabulary = (data.vocabulary || []).filter(v => v.id !== Number(id));
    write(data);
  },

  getAllSessionsSummary(userId) {
    const data = read();
    const uid = userId ? Number(userId) : null;
    return data.sessions
      .filter(s => !uid || !s.user_id || s.user_id === uid)
      .map(s => {
        const subs = data.submissions.filter(sub => sub.session_id === s.id);
        return {
          ...s,
          submission_count: subs.length,
          best_rating: subs.length > 0 ? Math.max(...subs.map(sub => sub.rating)) : null,
        };
      })
      .sort((a, b) => b.id - a.id);
  },
};

module.exports = db;
