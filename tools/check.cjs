const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'miniprogram');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
const files = walk(source);
files.filter(f => f.endsWith('.js')).forEach(file => cp.execFileSync(process.execPath, ['--check', file]));
files.filter(f => f.endsWith('.json')).concat(path.join(root, 'project.config.json'))
  .forEach(file => JSON.parse(fs.readFileSync(file, 'utf8')));
const app = JSON.parse(fs.readFileSync(path.join(source, 'app.json'), 'utf8'));
app.pages.forEach(page => ['js', 'json', 'wxml', 'wxss'].forEach(ext => assert(fs.existsSync(path.join(source, page + '.' + ext)), page + '.' + ext)));
const { categories, banks } = require('../miniprogram/data/questions');
const { buildDeck, remaining, scoreForAnswer } = require('../miniprogram/utils/game');
const { LEVELS } = require('../miniprogram/utils/difficulty');
const ids = new Set();
['riddles', 'journey', 'anime'].forEach(id => {
  assert.strictEqual(banks[id].length, 40, id + '应为40题');
  assert.strictEqual(new Set(banks[id].map(q => q.prompt)).size, 40, id + '题干重复');
  LEVELS.forEach(level => assert.strictEqual(banks[id].filter(q => q.difficulty === level.id).length, 10, id + '每档应为10题'));
});
categories.forEach(category => {
  assert.strictEqual(category.count, banks[category.id].length);
  banks[category.id].forEach(q => {
    assert(!ids.has(q.id), '题目 ID 重复：' + q.id); ids.add(q.id);
    assert(q.prompt && q.answer && q.explanation && q.source, '缺少题目字段：' + q.id);
    assert(new Set(q.distractors).size >= 3, '错误选项不足：' + q.id);
    assert(!q.distractors.includes(q.answer), '错误选项包含正确答案：' + q.id);
    assert(LEVELS.some(level => level.id === q.difficulty), '缺少有效难度：' + q.id);
    assert(q.assessment && q.assessment.note && q.assessment.status === 'initial', '缺少初评依据：' + q.id);
    if (q.category === 'poetry') {
      assert(q.verse && ['接出上一句', '接出下一句'].includes(q.prompt), '诗词必须有已知句和接句方向提示');
    }
    if (q.category === 'english') {
      assert(q.word && q.partOfSpeech, '英语题缺少单词或词性');
      assert(q.phonetic && !q.phonetic.includes('/') && q.phoneticAccent === '英式', '英语题缺少有效英式音标：' + q.id);
    }
    if (['driving', 'geography', 'journey', 'anime'].includes(q.category)) {
      assert(q.sourceUrl && q.sourceUrl.startsWith('https://') && q.reviewedAt, '题目缺少核对来源或日期');
    }
    if (q.category === 'league') {
      assert(q.quote && q.sourceUrl && q.sourceUrl.startsWith('https://'), '联盟题缺少台词或核对来源');
      assert(!q.quote.includes(q.answer), '台词不能直接包含英雄答案：' + q.id);
    }
  });
  // 固定随机输入检查选项组装，不运行界面或玩法模拟。
  [0, 0.25, 0.75, 0.999].forEach(value => {
    const deck = buildDeck(category.id, () => value);
    const hardGroups = new Set(banks[category.id].filter(q => q.difficulty === 4).map(q => q.groupId || q.id));
    assert.strictEqual(deck.length, 15 + hardGroups.size);
    assert.strictEqual(new Set(deck.map(q => q.groupId || q.id)).size, deck.length, '同局存在正反重复题');
    deck.forEach((q, index) => {
      assert.strictEqual(q.difficulty, Math.min(4, Math.floor(index / 5) + 1), '阶段难度不匹配');
      assert.strictEqual(q.options.length, 4);
      assert.strictEqual(new Set(q.options).size, 4);
      assert.strictEqual(q.options[q.answerIndex], q.answer);
    });
  });
  const first = buildDeck(category.id, () => 0);
  const another = buildDeck(category.id, () => 0.75);
  assert.notDeepStrictEqual(first.map(q => q.id), another.map(q => q.id), '同档题目未随机');
  console.log(category.name + '：' + category.count + ' 题，四档评估/阶段顺序/同档随机/选项/不重复检查通过');
});
assert.strictEqual(remaining(10000, 0), 10000);
assert.strictEqual(remaining(10000, 9999), 1);
assert.strictEqual(remaining(10000, 10000), 0);
assert.strictEqual(remaining(10000, 15000), 0);
assert.deepStrictEqual(scoreForAnswer(10000), { base: 10, bonus: 10, total: 20 });
assert.deepStrictEqual(scoreForAnswer(8000), { base: 10, bonus: 8, total: 18 });
assert.deepStrictEqual(scoreForAnswer(3000), { base: 10, bonus: 3, total: 13 });
assert.deepStrictEqual(scoreForAnswer(1), { base: 10, bonus: 0, total: 10 });
assert.deepStrictEqual(scoreForAnswer(0), { base: 0, bonus: 0, total: 0 });
assert.deepStrictEqual(scoreForAnswer(-1), { base: 0, bonus: 0, total: 0 });
assert.strictEqual(scoreForAnswer(20000).total, 20, '加分不得超过上限');
assert.strictEqual(scoreForAnswer(NaN).total, 0);
assert.strictEqual(new Set(banks.league.map(q => q.quote)).size, banks.league.length);
const previousLine = banks.poetry.find(q => q.id === 'p0-1');
assert.strictEqual(previousLine.prompt, '接出上一句');
assert.strictEqual(previousLine.verse, '疑是地上霜');
assert.strictEqual(previousLine.answer, '床前明月光');
const nextLine = banks.poetry.find(q => q.id === 'p0-0');
assert.strictEqual(nextLine.prompt, '接出下一句');
assert.strictEqual(nextLine.verse, '床前明月光');
assert.strictEqual(nextLine.answer, '疑是地上霜');
assert.strictEqual(new Set(banks.english.map(q => q.word)).size, banks.english.length);
// 存档迁移使用内存替身，不接触真实玩家数据。
const storage = require('../miniprogram/utils/storage');
const oldWx = global.wx;
const oldApp = global.getApp;
const memory = { 'zhiqu-records-v1': { best: { poetry: 120, history: 80 }, totalCorrect: 20, rounds: 3, lastSession: 'old' } };
const appInstance = {};
try {
  global.wx = { getStorageSync: key => memory[key], setStorageSync: (key, value) => { memory[key] = JSON.parse(JSON.stringify(value)); } };
  global.getApp = () => appInstance;
  assert.deepStrictEqual(storage.read().best, { poetry: 120, history: 80, english: 0, league: 0, driving: 0, geography: 0, riddles: 0, journey: 0, anime: 0 });
  const result = { sessionId: 'english-test', category: 'english', score: 20, correct: 2 };
  storage.settle(result);
  assert.deepStrictEqual(storage.read().best, { poetry: 120, history: 80, english: 20, league: 0, driving: 0, geography: 0, riddles: 0, journey: 0, anime: 0 });
  assert.strictEqual(storage.read().totalCorrect, 22);
  storage.settle(result);
  assert.strictEqual(storage.read().totalCorrect, 22, '重复结算不得重复累计');
  storage.settle({ sessionId: 'league-test', category: 'league', score: 38, correct: 2, speedBonus: 18, baseScore: 20, scoringVersion: 2 });
  assert.deepStrictEqual(storage.read().best, { poetry: 120, history: 80, english: 20, league: 38, driving: 0, geography: 0, riddles: 0, journey: 0, anime: 0 });
  assert.strictEqual(storage.lastResult().score, 38, '结算必须保存实际累计积分');
  storage.settle({ sessionId: 'driving-test', category: 'driving', score: 19, correct: 1 });
  assert.deepStrictEqual(storage.read().best, { poetry: 120, history: 80, english: 20, league: 38, driving: 19, geography: 0, riddles: 0, journey: 0, anime: 0 });
  assert.strictEqual(storage.read().totalCorrect, 25);
  assert.strictEqual(storage.lastResult().category, 'driving');
  storage.settle({ sessionId: 'geography-test', category: 'geography', score: 37, correct: 2 });
  assert.deepStrictEqual(storage.read().best, { poetry: 120, history: 80, english: 20, league: 38, driving: 19, geography: 37, riddles: 0, journey: 0, anime: 0 });
  assert.strictEqual(storage.read().totalCorrect, 27);
  assert.strictEqual(storage.lastResult().category, 'geography');
  storage.settle({ sessionId: 'geography-test', category: 'geography', score: 37, correct: 2 });
  assert.strictEqual(storage.read().totalCorrect, 27, '地理重复结算不得重复累计');
  storage.settle({ sessionId: 'riddles-test', category: 'riddles', score: 36, correct: 2 });
  assert.deepStrictEqual(storage.read().best, { poetry: 120, history: 80, english: 20, league: 38, driving: 19, geography: 37, riddles: 36, journey: 0, anime: 0 });
  assert.strictEqual(storage.read().totalCorrect, 29, '脑筋急转弯累计答对未保存');
  assert.strictEqual(storage.lastResult().category, 'riddles');
  storage.settle({ sessionId: 'riddles-test', category: 'riddles', score: 36, correct: 2 });
  assert.strictEqual(storage.read().totalCorrect, 29, '脑筋急转弯重复结算不得重复累计');
  ['journey', 'anime'].forEach((category, index) => {
    const before = storage.read();
    const score = 39 - index;
    const result = { sessionId: category + '-test', category, score, correct: 2 };
    storage.settle(result);
    assert.deepStrictEqual(storage.read().best, Object.assign({}, before.best, { [category]: score }), category + '必须独立保存且保留其他成绩');
    assert.strictEqual(storage.read().totalCorrect, before.totalCorrect + 2);
    assert.strictEqual(storage.read().rounds, before.rounds + 1);
    assert.strictEqual(storage.lastResult().category, category);
    storage.settle(result);
    assert.strictEqual(storage.read().totalCorrect, before.totalCorrect + 2, category + '重复结算不得重复累计');
    assert.strictEqual(storage.read().rounds, before.rounds + 1, category + '重复结算不得重复计局');
  });
} finally { global.wx = oldWx; global.getApp = oldApp; }
const { CountdownAudio } = require('../miniprogram/utils/countdown-audio');
const contexts = [];
let soundPreference;
const audio = new CountdownAudio({ getStorageSync: () => undefined,
  setStorageSync: (_, value) => { soundPreference = value; },
  createInnerAudioContext: () => {
    const context = { played: 0, stopped: 0, destroyed: 0, onError() {},
      play() { this.played++; }, stop() { this.stopped++; }, destroy() { this.destroyed++; } };
    contexts.push(context); return context;
  } });
audio.play('tick'); audio.play('urgent');
assert.strictEqual(contexts.length, 2);
assert(contexts.every(c => c.played === 1 && c.obeyMuteSwitch), '提示音播放调用或静音开关配置不正确');
audio.setEnabled(false);
audio.play('tick');
assert.strictEqual(contexts[0].played, 1, '关闭后不应继续播放');
assert.strictEqual(soundPreference, false);
audio.destroy();
assert(contexts.every(c => c.stopped > 0 && c.destroyed === 1), '音频资源必须停止并释放');
audio.play('tick');
assert.strictEqual(contexts[0].played, 1, '销毁后不得播放');
['tick', 'urgent'].forEach(name => {
  const wav = fs.readFileSync(path.join(source, 'assets/audio/' + name + '.wav'));
  assert.strictEqual(wav.toString('ascii', 0, 4), 'RIFF');
  assert.strictEqual(wav.toString('ascii', 8, 12), 'WAVE');
  assert.strictEqual(wav.readUInt32LE(40), wav.length - 44, '音频数据区损坏');
});
console.log('通过：速度积分边界、联盟题来源/存档、音频开关/释放及 WAV 文件完整性。');
console.log('通过：诗词双向接句、40 个单词音标及旧成绩迁移/英语成绩保存检查。');
console.log('通过：JavaScript 语法、JSON、页面文件、题库与截止时间边界检查。');

cp.execFileSync(process.execPath, [path.join(root, 'tools/check-wechat.cjs')], { stdio: 'inherit' });
