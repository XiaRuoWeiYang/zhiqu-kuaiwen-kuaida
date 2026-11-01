const { categories } = require('../../data/questions');
const records = require('../../utils/storage');
const { shareContent, timelineContent, enableShare } = require('../../utils/share');
Page({
  data: { categories: [], totalCorrect: 0, best: 0, invitedCategory: '', invitedName: '' },
  onLoad(query) {
    enableShare(wx, true);
    const invited = categories.find(item => item.id === (query && query.category));
    if (invited) this.setData({ invitedCategory: invited.id, invitedName: invited.name });
  },
  onShareAppMessage() { return shareContent(this.data.invitedCategory); },
  onShareTimeline() { return timelineContent(this.data.invitedCategory); },
  onShow() {
    const saved = records.read();
    this.setData({ categories: categories.map(c => Object.assign({}, c, { best: saved.best[c.id] })),
      totalCorrect: saved.totalCorrect, best: Math.max(...categories.map(c => saved.best[c.id])) });
  },
  start(event) {
    if (this.opening) return;
    const category = event.currentTarget.dataset.category;
    if (!categories.some(c => c.id === category)) return;
    this.opening = true;
    wx.navigateTo({ url: '/pages/quiz/quiz?category=' + category, complete: () => { this.opening = false; } });
  }
});
