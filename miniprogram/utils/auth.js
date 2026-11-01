const REMEMBER_KEY = 'zhiqu-wechat-login-v1';

// 本地只记住是否愿意恢复登录；身份始终由云函数的微信上下文确认。
class CloudAuth {
  constructor(api, config) {
    this.api = api;
    this.config = config;
    this.user = null;
    this.pending = null;
    this.generation = 0;
    this.initialized = false;
  }
  init() {
    if (this.initialized) return true;
    if (!this.config.env || !this.api.cloud || !this.api.cloud.init) return false;
    try {
      this.api.cloud.init({ env: this.config.env, traceUser: false });
      this.initialized = true;
      return true;
    } catch (_) { return false; }
  }
  isLoggedIn() { return !!this.user; }
  restore() {
    if (this.user) return Promise.resolve(this.user);
    let remembered = false;
    try { remembered = this.api.getStorageSync(REMEMBER_KEY) === true; } catch (_) { /* 仍可手动登录 */ }
    return remembered ? this.login() : Promise.resolve(null);
  }
  login() {
    if (this.pending) return this.pending;
    if (!this.config.env) return Promise.reject(Object.assign(new Error('微信登录暂未开通，请先体验答题。'), { code: 'NOT_CONFIGURED' }));
    if (!this.init()) return Promise.reject(new Error('微信登录暂不可用，请稍后重试。'));
    const generation = this.generation;
    const request = new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const finish = (error, user) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (generation !== this.generation) { reject(Object.assign(new Error('登录已取消'), { code: 'CANCELLED' })); return; }
        if (error) { reject(error); return; }
        this.user = user;
        try { this.api.setStorageSync(REMEMBER_KEY, true); } catch (_) { /* 本次登录继续有效 */ }
        resolve(user);
      };
      timer = setTimeout(() => finish(new Error('微信登录超时，请重试。')), 12000);
      try {
        this.api.cloud.callFunction({ name: this.config.loginFunction, data: {},
          success: response => {
            const result = response && response.result;
            let expectedAppId = '';
            try { expectedAppId = this.api.getAccountInfoSync().miniProgram.appId; } catch (_) { /* 由微信云端确认身份 */ }
            if (!result || result.ok !== true || typeof result.openid !== 'string' || !result.openid
              || typeof result.appid !== 'string' || !result.appid || (expectedAppId && result.appid !== expectedAppId)) {
              finish(new Error('微信身份确认失败，请稍后重试。')); return;
            }
            finish(null, { openid: result.openid, appid: result.appid });
          },
          fail: () => finish(new Error('微信登录失败，请检查网络后重试。'))
        });
      } catch (_) { finish(new Error('微信登录暂不可用，请稍后重试。')); }
    });
    const pending = request.then(user => {
      if (this.pending === pending) this.pending = null;
      return user;
    }, error => {
      if (this.pending === pending) this.pending = null;
      throw error;
    });
    this.pending = pending;
    return pending;
  }
  logout() {
    this.generation += 1;
    this.pending = null;
    this.user = null;
    try { this.api.removeStorageSync(REMEMBER_KEY); } catch (_) {
      try { this.api.setStorageSync(REMEMBER_KEY, false); } catch (_) { /* 本次运行仍已退出 */ }
    }
  }
}
module.exports = { CloudAuth, REMEMBER_KEY };
