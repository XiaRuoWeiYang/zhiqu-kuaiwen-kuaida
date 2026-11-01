const { evaluate } = require('../utils/difficulty');

// 仅使用经典台词短句作识别题，每个来源仅摘录一句；不包含游戏原声或英雄图片。
// 字段：ID、英雄、短句、熟悉度、核对来源。难度是本项目初评，不是外部玩家统计。
const entries = [
  ['garen', '盖伦', '人在塔在！', 1, 'https://gl.ali213.net/html/2024-12/1582141.html'],
  ['yasuo', '亚索', '死亡如风，常伴吾身。', 1, 'https://www.sohu.com/a/294376782_120081338'],
  ['teemo', '提莫', '体型并不能说明一切。', 1, 'https://www.3h3.com/lolm/11040.html'],
  ['masteryi', '易', '真正的大师永远都怀着一颗学徒的心。', 1, 'https://gl.ali213.net/html/2024-12/1583139.html'],
  ['annie', '安妮', '你看见过我的小熊吗？', 1, 'https://gl.ali213.net/html/2024-12/1583085.html'],
  ['riven', '锐雯', '断剑重铸之日，骑士归来之时。', 2, 'https://www.bilibili.com/opus/693536071829422112'],
  ['ahri', '阿狸', '我们心有灵犀，不是吗？', 2, 'https://gl.ali213.net/html/2024-12/1582389.html'],
  ['vayne', '薇恩', '让我们来猎杀那些陷入黑暗中的人吧。', 2, 'https://gl.ali213.net/html/2024-12/1582099.html'],
  ['jhin', '烬', '我于杀戮之中盛放，一如黎明中的花朵。', 2, 'https://weibo.com/ttarticle/p/show?id=2309351003194324001760543257'],
  ['alistar', '阿利斯塔', '俺很生气，后果很严重！', 2, 'https://gl.ali213.net/html/2024-12/1583283.html'],
  ['twistedfate', '崔斯特', '胜利女神在微笑。', 3, 'https://gl.ali213.net/html/2024-12/1584547.html'],
  ['missfortune', '厄运小姐', '好运不会眷顾傻瓜。', 3, 'https://gl.ali213.net/html/2024-12/1583103.html'],
  ['singed', '辛吉德', '是摇，还是不摇，这是一个问题。', 3, 'https://gl.ali213.net/html/2024-12/1584625.html'],
  ['zilean', '基兰', '就知道你会选我。', 3, 'https://gl.ali213.net/html/2024-12/1584633.html'],
  ['jax', '贾克斯', '你们知道最强的武器是什么？没错，就是补丁。', 3, 'https://gl.ali213.net/html/2024-12/1584605.html'],
  ['soraka', '索拉卡', '众星啊……我……回来……了……', 4, 'https://gl.ali213.net/html/2024-12/1584591.html'],
  ['sivir', '希维尔', '国王们来来去去，但留下的只有金币。', 4, 'https://gl.ali213.net/html/2024-12/1584573.html'],
  ['viktor', '维克托', '变量超出预期，必须重新计算结果。', 4, 'https://gl.ali213.net/html/2024-12/1582329.html'],
  ['ziggs', '吉格斯', '爆炸第一，疑问第二。', 4, 'https://gl.ali213.net/html/2024-12/1582345.html'],
  ['trundle', '特朗德尔', '我会让他见识一下寒霜之咬。', 4, 'https://gl.ali213.net/html/2024-12/1582195.html']
];

module.exports = entries.map(row => evaluate({ id: 'lol-' + row[0], category: 'league',
  prompt: '这句台词出自哪位英雄？', quote: row[2], verse: '', answer: row[1],
  distractors: entries.filter(other => other[1] !== row[1]).map(other => other[1]),
  explanation: '这句经典台词出自《英雄联盟》的英雄“' + row[1] + '”。',
  source: '英雄联盟 · 经典台词', sourceUrl: row[4]
}, { familiarity: row[3], reasoning: 0, confusion: 1,
  note: ['辨认传播较广的标志性台词', '辨认常见英雄的经典台词', '需要更熟悉角色语音与人物风格', '辨认较少被引用的动作或情境台词'][row[3] - 1]
    + '；干扰项均为其他英雄，台词不直接写出答案姓名' }));
