// 规则初评，不代表基于玩家统计的实测难度。所有种子均需编辑审题后填写。
const LEVELS = [
  { id: 1, label: '容易', min: 0, quota: 5 },
  { id: 2, label: '简单', min: 25, quota: 5 },
  { id: 3, label: '普通', min: 50, quota: 5 },
  { id: 4, label: '困难', min: 75, quota: null }
];
const VERSION = 1;

function evaluate(question, profile) {
  if (!profile || !Number.isInteger(profile.familiarity) || profile.familiarity < 1 || profile.familiarity > 4
    || !Number.isInteger(profile.reasoning) || profile.reasoning < 0 || profile.reasoning > 2
    || !Number.isInteger(profile.confusion) || profile.confusion < 0 || profile.confusion > 2 || !profile.note) {
    throw new Error('题目缺少有效审题评估：' + question.id);
  }
  // 知识熟悉度为主；逆向回忆、跨知识点比较、相近选项与阅读量作为修正。
  const characters = question.prompt.length + (question.verse || '').length + (question.word || '').length + (question.quote || '').length
    + question.answer.length + question.distractors.slice(0, 3).join('').length;
  const reading = characters > 100 ? 6 : characters > 65 ? 3 : 0;
  const score = Math.min(100, (profile.familiarity - 1) * 25 + profile.reasoning * 8 + profile.confusion * 5 + reading);
  const level = LEVELS.slice().reverse().find(item => score >= item.min);
  return Object.assign({}, question, { difficulty: level.id, difficultyLabel: level.label,
    assessment: { version: VERSION, status: 'initial', score,
      familiarity: profile.familiarity, reasoning: profile.reasoning, confusion: profile.confusion,
      reading, note: profile.note } });
}
module.exports = { LEVELS, VERSION, evaluate };
