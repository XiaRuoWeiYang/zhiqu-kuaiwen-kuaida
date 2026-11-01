const KEY = 'zhiqu-countdown-sound-v1';
const CLIPS = { tick: '/assets/audio/tick.wav', urgent: '/assets/audio/urgent.wav' };

class CountdownAudio {
  constructor(api = wx) {
    this.api = api;
    this.contexts = {};
    this.enabled = true;
    this.destroyed = false;
    try { this.enabled = api.getStorageSync(KEY) !== false; } catch (_) { /* 默认开启 */ }
  }
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.stop();
    try { this.api.setStorageSync(KEY, enabled); } catch (_) { /* 当前局仍生效 */ }
  }
  play(kind) {
    if (!this.enabled || this.destroyed || !CLIPS[kind] || !this.api.createInnerAudioContext) return;
    try {
      let audio = this.contexts[kind];
      if (!audio) {
        audio = this.api.createInnerAudioContext();
        audio.src = CLIPS[kind];
        audio.loop = false;
        audio.obeyMuteSwitch = true;
        audio.volume = kind === 'urgent' ? 0.35 : 0.22;
        audio.onError(() => { this.failed = true; });
        this.contexts[kind] = audio;
      }
      this.stop();
      audio.play();
    } catch (_) { this.failed = true; }
  }
  stop() {
    Object.values(this.contexts).forEach(audio => { try { audio.stop(); } catch (_) { /* 已释放 */ } });
  }
  destroy() {
    this.destroyed = true;
    this.stop();
    Object.values(this.contexts).forEach(audio => { try { audio.destroy(); } catch (_) { /* 已释放 */ } });
    this.contexts = {};
  }
}
module.exports = { CountdownAudio };
