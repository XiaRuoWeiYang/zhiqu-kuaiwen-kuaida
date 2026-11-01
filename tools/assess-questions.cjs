// 题库内部审阅报告，直接复用运行时规则，防止报告评级与实际出题不一致。
const fs = require('fs');
const path = require('path');
const { banks, categories } = require('../miniprogram/data/questions');
const { LEVELS } = require('../miniprogram/utils/difficulty');
const report = {
  version: '0.8.0', status: '规则初评，尚无玩家统计校准',
  rule: '熟悉度基分0/25/50/75 + 推理量×8 + 混淆度×5 + 阅读量0/3/6，封顶100；按0/25/50/75分为四档',
  progression: '前5题容易、6～10题简单、11～15题普通、16题起困难；每档随机且本局不重复，同组诗句只取一个方向',
  categories: categories.map(c => ({ id: c.id, name: c.name, total: c.count,
    levels: LEVELS.map(level => ({ label: level.label,
      questions: banks[c.id].filter(q => q.difficulty === level.id).length,
      groups: new Set(banks[c.id].filter(q => q.difficulty === level.id).map(q => q.groupId || q.id)).size })) })),
  questions: Object.values(banks).flat().map(q => ({ id: q.id, category: q.category,
    question: q.quote ? q.prompt + ' · ' + q.id : q.verse ? q.verse + ' · ' + q.prompt : q.word ? q.word + ' · ' + q.partOfSpeech + ' · ' + q.prompt : q.prompt,
    level: q.difficultyLabel, assessment: q.assessment }))
};
const output = path.resolve(__dirname, '../docs/question-assessment.json');
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
report.categories.forEach(category => console.log(category.name + '：' + category.levels.map(l => l.label + ' ' + l.questions + '题/' + l.groups + '组').join('，')));
console.log('已生成 docs/question-assessment.json（每题评估分与依据）。');
