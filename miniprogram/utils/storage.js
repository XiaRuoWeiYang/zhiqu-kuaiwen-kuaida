const KEY = 'zhiqu-records-v1';
const RESULT_KEY = 'zhiqu-last-result-v1';
const { categories } = require('../data/questions');
function empty() {
  const best = {};
  categories.forEach(category => { best[category.id] = 0; });
  return { best, totalCorrect: 0, rounds: 0, lastSession: '' };
}
function read() {
  try {
    const raw = wx.getStorageSync(KEY);
    if (!raw || typeof raw !== 'object') return empty();
    const number = n => Number.isFinite(n) && n >= 0 ? n : 0;
    const best = {};
    categories.forEach(category => { best[category.id] = number(raw.best && raw.best[category.id]); });
    return { best,
      totalCorrect: number(raw.totalCorrect), rounds: number(raw.rounds), lastSession: raw.lastSession || '' };
  } catch (_) { return empty(); }
}
function settle(result) {
  const records = read();
  const previousBest = records.best[result.category] || 0;
  const final = Object.assign({}, result, { previousBest, newBest: result.score > previousBest });
  if (records.lastSession !== result.sessionId) {
    records.best[result.category] = Math.max(previousBest, result.score);
    records.totalCorrect += result.correct;
    records.rounds += 1;
    records.lastSession = result.sessionId;
  }
  let saved = true;
  try { wx.setStorageSync(KEY, records); } catch (_) { saved = false; }
  // 内存是结算页面的主要数据来源，存储失败也能正常显示本局结果。
  getApp().lastResult = Object.assign(final, { saved });
  try { wx.setStorageSync(RESULT_KEY, getApp().lastResult); } catch (_) { /* 允许本局继续 */ }
  return getApp().lastResult;
}
function lastResult() {
  if (getApp().lastResult) return getApp().lastResult;
  try { return wx.getStorageSync(RESULT_KEY) || null; } catch (_) { return null; }
}
module.exports = { read, settle, lastResult };
