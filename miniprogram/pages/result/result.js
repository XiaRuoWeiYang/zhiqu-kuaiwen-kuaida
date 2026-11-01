const { categoryInfo } = require('../../utils/game');
const storage = require('../../utils/storage');
const { shareContent, enableShare } = require('../../utils/share');
Page({
  data: { result: null, categoryName: '', title: '', subtitle: '', best: 0 },
  onShareAppMessage() {
    const result = this.data.result;
    return shareContent(result && result.category, result && result.score);
  },
  onLoad() {
    enableShare(wx);
    const result = storage.lastResult();
    if (!result || !categoryInfo(result.category)) { this.home(); return; }
    const completed = result.reason === 'completed';
    this.setData({ result, categoryName: categoryInfo(result.category).name,
      title: completed ? '这一组，拿下！' : result.newBest ? '刷新你的纪录！' : '下次，再多闯一题！',
      subtitle: completed ? (result.skipUsed ? '本轮已完成，还有一题等你下次补上' : '本轮全部答对，知识储备很可以') : result.reason === 'timeout' ? '时间到！这题一起记住吧' : '差一点点，答案就在下面',
      best: Math.max(result.previousBest, result.score) });
  },
  again() {
    if (this.opening || !this.data.result) return;
    this.opening = true;
    wx.redirectTo({ url: '/pages/quiz/quiz?category=' + this.data.result.category,
      complete: () => { this.opening = false; } });
  },
  home() { wx.reLaunch({ url: '/pages/home/home' }); }
});
