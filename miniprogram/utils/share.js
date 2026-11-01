const { categories } = require('../data/questions');
const HOME = '/pages/home/home';
function shareContent(category, score) {
  const info = categories.find(item => item.id === category);
  let title = '知趣快问快答，10秒一题，一起来挑战！';
  if (info) title = info.name + '，10秒一题，你能闯多远？';
  if (info && Number.isFinite(score) && score >= 0) title = '我在' + info.name + '拿到' + Math.floor(score) + '分，你也来试试！';
  // 只传题库标识；不传账号、答案、未完成局或本机结算数据。
  return { title, path: info ? HOME + '?category=' + encodeURIComponent(info.id) : HOME };
}
function timelineContent(category) {
  const info = categories.find(item => item.id === category);
  return { title: shareContent(category).title, query: info ? 'category=' + encodeURIComponent(info.id) : '' };
}
function enableShare(api, timeline = false) {
  if (!api.showShareMenu) return;
  try { api.showShareMenu({ menus: timeline ? ['shareAppMessage', 'shareTimeline'] : ['shareAppMessage'] }); } catch (_) { /* 不支持的客户端不额外添加分享入口 */ }
}
module.exports = { shareContent, timelineContent, enableShare };
