const { buildDeck, categoryInfo, remaining, scoreForAnswer, QUESTION_MS, POINTS } = require('../../utils/game');
const storage = require('../../utils/storage');
const { CountdownAudio } = require('../../utils/countdown-audio');
const { shareContent, enableShare } = require('../../utils/share');

Page({
  data: { category: '', categoryName: '', number: 1, total: 0, score: 0, correct: 0,
    skipUsed: false, question: null, options: [], seconds: 10, progress: 1,
    urgent: false, locked: true, feedback: '', feedbackType: '', ready: false, soundEnabled: true },
  onShareAppMessage() { return shareContent(this.category); },
  onLoad(query) {
    enableShare(wx);
    const info = categoryInfo(query.category);
    if (!info) { wx.reLaunch({ url: '/pages/home/home' }); return; }
    this.category = info.id;
    this.deck = buildDeck(info.id);
    this.index = -1;
    this.correct = 0;
    this.score = 0;
    this.speedBonus = 0;
    this.audio = new CountdownAudio();
    this.skipUsed = false;
    this.ended = false;
    this.destroyed = false;
    this.phase = 'loading';
    this.sessionId = Date.now() + '-' + Math.random().toString(36).slice(2);
    wx.setNavigationBarTitle({ title: info.name });
    this.setData({ category: info.id, categoryName: info.name, total: this.deck.length, soundEnabled: this.audio.enabled });
    this.nextQuestion();
  },
  onShow() {
    if (this.ended || !this.deck) return;
    if (this.phase === 'question') this.startClock();
    else if (this.phase === 'feedback') this.scheduleNext();
  },
  onHide() { this.stopClock(); this.stopTransition(); },
  onUnload() { this.destroyed = true; this.stopClock(); this.stopTransition(); if (this.audio) this.audio.destroy(); },
  stopClock() { clearInterval(this.clock); this.clock = null; if (this.audio) this.audio.stop(); },
  stopTransition() { clearTimeout(this.transition); this.transition = null; },
  nextQuestion() {
    if (this.ended || this.destroyed) return;
    this.stopClock();
    this.stopTransition();
    this.index += 1;
    if (this.index >= this.deck.length) { this.finish('completed'); return; }
    const question = this.deck[this.index];
    this.phase = 'question';
    this.lastSecond = 10;
    this.deadline = Date.now() + QUESTION_MS;
    this.setData({ number: this.index + 1, question,
      options: question.options.map((label, index) => ({ label, index, letter: 'ABCD'[index], state: '' })),
      seconds: 10, progress: 1, urgent: false, locked: false, ready: true, feedback: '', feedbackType: '' });
    this.startClock();
  },
  startClock() {
    this.stopClock();
    this.tick();
    if (!this.ended && this.phase === 'question') this.clock = setInterval(() => this.tick(), 100);
  },
  tick() {
    if (this.ended || this.destroyed || this.phase !== 'question') return;
    const ms = remaining(this.deadline);
    const seconds = Math.ceil(ms / 1000);
    if (seconds !== this.lastSecond) {
      this.lastSecond = seconds;
      if (seconds > 0) this.audio.play(seconds <= 3 ? 'urgent' : 'tick');
    }
    this.setData({ seconds, progress: ms / QUESTION_MS, urgent: ms <= 3000 });
    if (ms === 0) this.finish('timeout');
  },
  choose(event) {
    if (this.ended || this.destroyed || this.phase !== 'question') return;
    // 用实际截止时间校验，避免界面刷新间隔内的超时点击被算作有效。
    const ms = remaining(this.deadline);
    if (ms === 0) { this.finish('timeout'); return; }
    const choice = Number(event.currentTarget.dataset.index);
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) return;
    const q = this.deck[this.index];
    this.stopClock();
    if (choice !== q.answerIndex) { this.finish('wrong', choice); return; }
    this.phase = 'feedback';
    this.correct += 1;
    const earned = scoreForAnswer(ms);
    this.score += earned.total;
    this.speedBonus += earned.bonus;
    this.feedbackDeadline = Date.now() + 650;
    this.setData({ correct: this.correct, score: this.score, locked: true,
      feedback: '答对！ +' + earned.total + ' 分' + (earned.bonus ? '（速度 +' + earned.bonus + '）' : ''), feedbackType: 'success',
      options: this.data.options.map(o => Object.assign({}, o, { state: o.index === choice ? 'correct' : 'dim' })) });
    this.scheduleNext();
  },
  scheduleNext() {
    this.stopTransition();
    this.transition = setTimeout(() => this.nextQuestion(), Math.max(0, this.feedbackDeadline - Date.now()));
  },
  skip() {
    if (this.ended || this.destroyed || this.phase !== 'question' || this.skipUsed) return;
    if (remaining(this.deadline) === 0) { this.finish('timeout'); return; }
    this.skipUsed = true;
    this.setData({ skipUsed: true });
    this.nextQuestion();
  },
  toggleSound() {
    if (!this.audio || this.destroyed) return;
    this.audio.setEnabled(!this.audio.enabled);
    this.setData({ soundEnabled: this.audio.enabled });
    if (this.audio.enabled && this.phase === 'question') this.audio.play('tick');
  },
  finish(reason, selectedIndex) {
    if (this.ended || this.destroyed) return;
    this.ended = true;
    this.phase = 'finished';
    this.stopClock();
    this.stopTransition();
    this.setData({ locked: true });
    const question = reason === 'completed' ? null : this.deck[this.index];
    storage.settle({ sessionId: this.sessionId, category: this.category, reason,
      correct: this.correct, score: this.score, baseScore: this.correct * POINTS,
      speedBonus: this.speedBonus, scoringVersion: 2, skipUsed: this.skipUsed,
      attempted: reason === 'completed' ? this.deck.length : this.index + 1,
      total: this.deck.length, question,
      selectedAnswer: question && Number.isInteger(selectedIndex) ? question.options[selectedIndex] : '' });
    this.goToResult();
  },
  goToResult() {
    wx.redirectTo({ url: '/pages/result/result', fail: () => {
      this.setData({ feedback: '本局已结算，点击查看成绩', feedbackType: 'notice' });
    } });
  }
});
