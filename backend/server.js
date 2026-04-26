require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const db = require('./db');

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FORMATS = [
  { id: 'personal_letter', name: 'Personal Letter', russian: 'Личное письмо' },
  { id: 'formal_letter', name: 'Formal Letter', russian: 'Официальное письмо' },
  { id: 'email', name: 'Informal Email', russian: 'Электронное письмо' },
  { id: 'essay', name: 'Essay / Composition', russian: 'Сочинение' },
  { id: 'opinion_essay', name: 'Opinion Essay', russian: 'Эссе' },
  { id: 'postcard', name: 'Postcard', russian: 'Открытка' },
  { id: 'short_story', name: 'Short Story', russian: 'Рассказ' },
  { id: 'forum_post', name: 'Forum Post', russian: 'Пост / Комментарий' },
];

const WORD_RANGES = {
  A1: { min: 20, max: 40 },
  A2: { min: 40, max: 70 },
  B1: { min: 80, max: 130 },
  B2: { min: 130, max: 200 },
  C1: { min: 200, max: 280 },
  C2: { min: 280, max: 380 },
};

app.get('/api/formats', (_req, res) => res.json(FORMATS));

app.get('/api/users', (_req, res) => {
  try { res.json(db.getAllUsers()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });
    const user = db.insertUser(name.trim());
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/generate', async (req, res) => {
  try {
    const { level, format, userId } = req.body;
    const range = WORD_RANGES[level];
    const formatInfo = FORMATS.find(f => f.id === format);

    if (!range || !formatInfo) {
      return res.status(400).json({ error: 'Invalid level or format' });
    }

    const previousPrompts = db.getPreviousPrompts(level, format, userId);
    const avoidBlock = previousPrompts.length > 0
      ? `\nAVOID REPETITION — the student has already done these exercises at this level and format, so generate something clearly different (different topic, setting, people, purpose):\n${previousPrompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}\n`
      : '';

    const requiredWordCount = { A1: 1, A2: 1, B1: 2, B2: 2, C1: 3, C2: 3 }[level] || 2;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Generate a Russian writing exercise for a ${level} level learner.
Format: ${formatInfo.name} (${formatInfo.russian})
Word count target: ${range.min}–${range.max} words
${avoidBlock}
Create a specific, realistic scenario appropriate for this level.
Return ONLY a valid JSON object (no markdown, no code blocks) with:
- "prompt": exercise instruction in English (be specific with names, situations, concrete details)
- "hint": one short English tip about structure or a key language feature for this format at ${level} level
- "required_words": array of exactly ${requiredWordCount} objects, each with: "word" (Russian word/phrase the student must use), "translation" (English translation), "example_ru" (a natural Russian sentence using the word in context), "example_en" (English translation of that sentence). Choose words/phrases appropriate for ${level} level that fit naturally into this task. Prefer invariable forms (adverbs, set phrases, connectors). Examples: A1 might use "пожалуйста", B1 might use "во-первых" or "надеюсь", C1 might use "тем не менее" or "следует отметить".

Make it natural and culturally relevant.`,
      }],
    });

    const raw = message.content[0].text.trim();
    const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const exercise = JSON.parse(jsonText);
    const requiredWords = Array.isArray(exercise.required_words) ? exercise.required_words : [];

    const session = db.insertSession({
      level,
      format,
      format_name: formatInfo.name,
      exercise_prompt: exercise.prompt,
      min_words: range.min,
      max_words: range.max,
      required_words_json: JSON.stringify(requiredWords),
      ...(userId ? { user_id: Number(userId) } : {}),
    });

    res.json({
      sessionId: session.id,
      prompt: exercise.prompt,
      hint: exercise.hint,
      requiredWords,
      minWords: range.min,
      maxWords: range.max,
      format: formatInfo.name,
      formatRussian: formatInfo.russian,
      level,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/submit', async (req, res) => {
  try {
    const { sessionId, text, iteration, previousFeedback = [] } = req.body;
    const session = db.getSession(sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

    const prevVocab = previousFeedback.flatMap(f => f.vocabulary_suggestions || []);
    const prevGrammar = previousFeedback.flatMap(f => f.grammar_errors || []);
    const rawRequired = JSON.parse(session.required_words_json || '[]');
    // support both old string[] and new object[] format
    const requiredWords = rawRequired.map(w => typeof w === 'string' ? { word: w } : w);
    const requiredWordsBlock = requiredWords.length > 0
      ? `\nREQUIRED WORDS — the student was asked to use these in their text: ${requiredWords.map(w => `"${w.word}"`).join(', ')}. Include a "required_words_check" array: [{ "word": string, "used": boolean }] for each. If a word was not used, mention it briefly in the summary.`
      : '';

    const consistencyBlock = prevVocab.length > 0 || prevGrammar.length > 0 ? `
CONSISTENCY — this student has already received feedback on this exercise:
${prevVocab.length > 0 ? `• Vocabulary you previously suggested (do NOT flag these as errors or inadequate; if the student used them, list it as a strength):
${prevVocab.map(v => `  - "${v.suggested}" (${v.translation || v.note})`).join('\n')}` : ''}
${prevGrammar.length > 0 ? `• Grammar you previously corrected (if now fixed, acknowledge it positively in summary):
${prevGrammar.map(g => `  - "${g.original}" → "${g.corrected}"`).join('\n')}` : ''}
` : '';

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `You are a Russian language teacher evaluating a student's writing.

Level: ${session.level}
Format: ${session.format_name}
Exercise: ${session.exercise_prompt}
Target word count: ${session.min_words}–${session.max_words}
Actual word count: ${wordCount}${iteration > 1 ? `\nThis is revision #${iteration}.` : ''}
${consistencyBlock}
IMPORTANT: The exercise may ask the student to write as a fictional character or sign with a specific name. Do not address the student by that character's name in your feedback — always refer to them neutrally as "you" or "the student".

VOCABULARY POLICY: Never penalise a student for using vocabulary that is more advanced than their stated level — if they use it correctly, treat it as a strength and mention it in "strengths". Only suggest vocabulary changes when a word is genuinely wrong or there is a clearly better fit that has not been suggested before.

Student's text:
---
${text}
---

Return ONLY a valid JSON object (no markdown) with:
- "rating": integer 1–100. CRITICAL: grade strictly relative to ${session.level} CEFR expectations, NOT against native-speaker or advanced standards. A student who fully meets the typical exam criteria for ${session.level} should receive 88–95. Use this scale:
  • 100: Perfect for the level — task addressed completely and creatively, zero errors in structures expected at ${session.level}, all required words used naturally, word count on target, format conventions followed perfectly. 100 is achievable and should be awarded when genuinely deserved.
  • 90–99: Meets all ${session.level} criteria excellently — task fully addressed, language appropriate and accurate for this level, good use of level-appropriate structures, at most one very minor slip
  • 80–89: Meets most ${session.level} criteria well — minor errors that don't impede communication
  • 65–79: Meets basic ${session.level} criteria — some noticeable errors or partially addressed task
  • 50–64: Partially meets ${session.level} criteria — significant gaps or errors
  • below 50: Does not meet ${session.level} criteria
  CONSISTENCY RULE: If grammar_errors is empty AND vocabulary_suggestions is empty AND there are no structural or word-count issues, the rating MUST be 100. Conversely, if the rating is below 100, at least one of grammar_errors, vocabulary_suggestions, structure_feedback, or word_count_note MUST contain a concrete, specific reason — never give a sub-100 score with only positive or vague feedback.
  Level benchmarks for what counts as "correct" at ${session.level}:
  ${session.level === 'A1' ? '— correct use of basic present-tense forms of common verbs (быть, иметь, жить, работать etc.), basic gender agreement, simple sentence structure, a few set phrases. Simple vocabulary is expected and correct. Do NOT penalise for lack of cases or complex grammar.' : ''}${session.level === 'A2' ? '— correct simple sentences, basic case usage (accusative, prepositional at minimum), present and past tense, common phrases. Expect limited vocabulary and simple connectors (и, но, потому что).' : ''}${session.level === 'B1' ? '— mostly correct case endings, present/past/future tense, imperfective/perfective distinction in simple contexts, topic-appropriate vocabulary, basic connectors and discourse markers.' : ''}${session.level === 'B2' ? '— accurate grammar with occasional errors, good range of vocabulary, correct verb aspects, subordinate clauses, formal/informal register distinction, cohesive text structure.' : ''}${session.level === 'C1' ? '— high grammatical accuracy, wide vocabulary range, nuanced register, complex sentence structures, sophisticated connectors, stylistically appropriate text.' : ''}${session.level === 'C2' ? '— near-native accuracy, rich idiomatic vocabulary, full stylistic control, complex syntax used naturally and correctly.' : ''}
- "summary": 2–3 sentence overall assessment in English
- "grammar_errors": array of ALL genuine grammar, spelling, and punctuation errors found — do not skip or summarise any, list every single one. Each object: { "original": string (the exact phrase as written), "corrected": string, "explanation": string }. CRITICAL: only include an item if the original is actually wrong and the corrected form is genuinely different. Never include an item where "original" and "corrected" are identical, and never include a phrase that is already correct just to note that it is correct — if it is correct, omit it entirely.
- "vocabulary_suggestions": array of up to 3 objects { "original": string, "suggested": string, "note": string, "translation": string (English translation of the suggested word/phrase), "example_ru": string (a natural Russian example sentence using the suggested word), "example_en": string (English translation of that example sentence) }
- "structure_feedback": 1–2 sentence string about structure and format adherence
- "strengths": array of 2–3 strings
- "word_count_note": short string about whether word count is on target
${requiredWordsBlock}

Use [] for empty grammar_errors or vocabulary_suggestions.`,
      }],
    });

    const raw = message.content[0].text.trim();
    const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const feedback = JSON.parse(jsonText);

    // enrich required_words_check with translation/example from session data
    if (requiredWords.length > 0 && Array.isArray(feedback.required_words_check)) {
      feedback.required_words_check = feedback.required_words_check.map(check => {
        const meta = requiredWords.find(w => w.word === check.word) || {};
        return { ...check, translation: meta.translation || '', example_ru: meta.example_ru || '', example_en: meta.example_en || '' };
      });
    }

    db.insertSubmission({
      session_id: Number(sessionId),
      text,
      feedback_json: JSON.stringify(feedback),
      rating: feedback.rating,
      iteration,
    });

    res.json(feedback);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sessions', (req, res) => {
  try {
    res.json(db.getAllSessionsSummary(req.query.userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/session/:id', (req, res) => {
  try {
    const session = db.getSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Not found' });

    const submissions = db.getSubmissionsForSession(req.params.id)
      .map(s => ({ ...s, feedback: JSON.parse(s.feedback_json) }));

    res.json({ ...session, submissions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vocabulary', (req, res) => {
  try {
    res.json(db.getAllVocab(req.query.userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/vocabulary', (req, res) => {
  try {
    const { russian, english, example_ru, example_en, userId } = req.body;
    if (!russian || !english) return res.status(400).json({ error: 'Missing fields' });
    const item = db.insertVocabItem({ russian, english, example_ru: example_ru || '', example_en: example_en || '', ...(userId ? { user_id: Number(userId) } : {}) });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/vocabulary/:id', (req, res) => {
  try {
    db.deleteVocabItem(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
