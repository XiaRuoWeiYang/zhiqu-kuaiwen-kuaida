const { categories } = require('../../data/questions');
const storage = require('../../utils/storage');
const { CountdownAudio } = require('../../utils/countdown-audio');
const { shareContent, enableShare } = require('../../utils/share');
Page({
  data: { loggedIn: false, loggingIn: false, totalCorrect: 0, rounds: 0, best: 0, categories: [], soundEnabled: true },
  onLoad() { enableShare(wx); },
  onShow() {
    this.active = true;
    const saved = storage.read();
    const audio = new CountdownAudio();
    this.setData({ totalCorrect: saved.totalCorrect, rounds: saved.rounds,
      best: Math.max(...categories.map(c => saved.best[c.id])),
      categories: categories.map(c => ({ id: c.id, name: c.name, best: saved.best[c.id] })), soundEnabled: audio.enabled,
      loggedIn: getApp().auth.isLoggedIn(), loggingIn: false });
    audio.destroy();
    if (!this.data.loggedIn) this.restoreLogin();
  },
  onHide() { this.active = false; },
  onUnload() { this.active = false; },
  async restoreLogin() {
    this.setData({ loggingIn: true });
    try { await getApp().auth.restore(); } catch (_) { /* 静默恢复失败后可主动重试，仍可答题 */ }
    if (this.active) this.setData({ loggingIn: false, loggedIn: getApp().auth.isLoggedIn() });
  },
  async login() {
    if (this.data.loggingIn) return;
    this.setData({ loggingIn: true });
    try {
      await getApp().auth.login();
      if (this.active) { this.setData({ loggedIn: true }); wx.showToast({ title: '微信登录成功', icon: 'success' }); }
    } catch (error) {
      if (this.active && error.code !== 'CANCELLED') wx.showModal({ title: '暂时无法登录', content: error.message, showCancel: false });
    } finally { if (this.active) this.setData({ loggingIn: false }); }
  },
  logout() {
    wx.showModal({ title: '退出登录？', content: '本机答题记录会保留，仍可继续挑战。',
      success: result => {
        if (!result.confirm) return;
        getApp().auth.logout();
        if (this.active) this.setData({ loggedIn: false, loggingIn: false });
      } });
  },
  toggleSound(event) {
    const audio = new CountdownAudio();
    audio.setEnabled(!!event.detail.value);
    this.setData({ soundEnabled: audio.enabled });
    audio.destroy();
  },
  start(event) {
    const category = event.currentTarget.dataset.category;
    if (this.opening || !categories.some(c => c.id === category)) return;
    this.opening = true;
    wx.navigateTo({ url: '/pages/quiz/quiz?category=' + category, complete: () => { this.opening = false; } });
  },
  onShareAppMessage() { return shareContent(); }
});
