const { banks, categories } = require('../data/questions');
const { LEVELS } = require('./difficulty');
const QUESTION_MS = 10000;
const POINTS = 10;

function shuffle(values, random = Math.random) {
  const copy = values.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function buildDeck(category, random = Math.random) {
  if (!banks[category]) throw new Error('未知题目分类');
  // 同一上下句只选一个方向，避免本局前一题暴露后一题答案。
  const groups = new Map();
  banks[category].forEach(q => {
    const key = q.groupId || q.id;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(q);
  });
  const candidates = Array.from(groups.values()).map(questions => shuffle(questions, random)[0]);
  const selected = [];
  LEVELS.forEach(level => {
    const pool = candidates.filter(q => q.difficulty === level.id);
    if (pool.length < (level.quota || 1)) throw new Error(category + ' 的' + level.label + '题库不足');
    const drawn = shuffle(pool, random);
    selected.push(...(level.quota === null ? drawn : drawn.slice(0, level.quota)));
  });
  return selected.map(q => {
    const wrong = shuffle(q.distractors, random).slice(0, 3);
    const options = shuffle([q.answer].concat(wrong), random);
    return Object.assign({}, q, { options, answerIndex: options.indexOf(q.answer) });
  });
}
function remaining(deadline, now = Date.now()) {
  return Math.max(0, Math.min(QUESTION_MS, deadline - now));
}
function scoreForAnswer(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return { base: 0, bonus: 0, total: 0 };
  const bonus = Math.round(Math.min(QUESTION_MS, ms) / 1000);
  return { base: POINTS, bonus, total: POINTS + bonus };
}
function categoryInfo(id) { return categories.find(c => c.id === id); }
module.exports = { QUESTION_MS, POINTS, shuffle, buildDeck, remaining, scoreForAnswer, categoryInfo };
