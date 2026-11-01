const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const cp = require('child_process');
const root = path.resolve(__dirname, '..');
const app = require('../miniprogram/app.json');
const project = require('../project.config.json');
const { shareContent, timelineContent } = require('../miniprogram/utils/share');
const { categories } = require('../miniprogram/data/questions');
const { CloudAuth, REMEMBER_KEY } = require('../miniprogram/utils/auth');

function fakeApi() {
  const values = { 'zhiqu-records-v1': { best: { poetry: 120 }, totalCorrect: 8 } };
  const calls = [];
  const api = { calls, values, getStorageSync: key => values[key], setStorageSync: (key, value) => { values[key] = value; },
    removeStorageSync: key => { delete values[key]; }, getAccountInfoSync: () => ({ miniProgram: { appId: 'wx-current' } }),
    cloud: { init: () => {}, callFunction: options => calls.push(options) } };
  return api;
}
function success(call, extra = {}) { call.success({ result: Object.assign({ ok: true, openid: 'verified-user', appid: 'wx-current' }, extra) }); }
async function main() {
  assert(app.pages.includes('pages/mine/mine'));
  assert.deepStrictEqual(app.tabBar.list.map(tab => tab.pagePath), ['pages/home/home', 'pages/mine/mine']);
  assert.strictEqual(project.cloudfunctionRoot, 'cloudfunctions/');
  const functionDir = path.join(root, project.cloudfunctionRoot, 'zhiquLogin');
  cp.execFileSync(process.execPath, ['--check', path.join(functionDir, 'index.js')]);
  JSON.parse(fs.readFileSync(path.join(functionDir, 'package.json'), 'utf8'));

  // 分享到题库首页，接收方不依赖发送方的本机结算缓存。
  assert.deepStrictEqual(shareContent(), { title: '知趣快问快答，10秒一题，一起来挑战！', path: '/pages/home/home' });
  assert.strictEqual(shareContent('invalid').path, '/pages/home/home');
  categories.forEach(category => {
    const shared = shareContent(category.id, 123);
    assert(shared.title.includes(category.name) && shared.title.includes('123分'));
    assert.strictEqual(shared.path, '/pages/home/home?category=' + category.id);
    assert(!/openid|answer|session|score=/.test(shared.path));
    assert.strictEqual(timelineContent(category.id).query, 'category=' + category.id);
  });
  assert(!shareContent('journey', -1).title.includes('-1'));
  assert(!shareContent('anime', NaN).title.includes('NaN'));
  let home;
  vm.runInNewContext(fs.readFileSync(path.join(root, 'miniprogram/pages/home/home.js'), 'utf8'), {
    require: name => require(path.resolve(root, 'miniprogram/pages/home', name)), Page: definition => { home = definition; }, wx: {}
  });
  const homeData = {};
  home.onLoad.call({ setData: data => Object.assign(homeData, data) }, { category: 'anime' });
  assert.strictEqual(homeData.invitedName, '动漫快答');
  const invalidData = {};
  home.onLoad.call({ setData: data => Object.assign(invalidData, data) }, { category: 'not-a-bank' });
  assert.strictEqual(Object.keys(invalidData).length, 0);

  const api = fakeApi();
  const config = { env: 'test-env', loginFunction: 'zhiquLogin' };
  const missing = new CloudAuth(api, { env: '', loginFunction: 'zhiquLogin' });
  await assert.rejects(missing.login(), error => error.code === 'NOT_CONFIGURED');
  assert.strictEqual(missing.isLoggedIn(), false);
  assert.strictEqual(api.calls.length, 0);

  // 本地记忆不能充当身份；恢复必须再次经过云端。
  api.values[REMEMBER_KEY] = true;
  const auth = new CloudAuth(api, config);
  const restoring = auth.restore();
  assert.strictEqual(auth.isLoggedIn(), false);
  assert.strictEqual(auth.login(), restoring, '重复点击必须复用同一请求');
  assert.strictEqual(api.calls.length, 1);
  assert.strictEqual(api.calls[0].name, 'zhiquLogin');
  assert.deepStrictEqual(api.calls[0].data, {});
  success(api.calls[0]);
  await restoring;
  assert(auth.isLoggedIn());
  assert.strictEqual(api.values[REMEMBER_KEY], true);
  const savedRecords = JSON.stringify(api.values['zhiqu-records-v1']);
  auth.logout();
  assert.strictEqual(auth.isLoggedIn(), false);
  assert.strictEqual(JSON.stringify(api.values['zhiqu-records-v1']), savedRecords, '退出不能清空成绩');
  assert.strictEqual(await auth.restore(), null);

  const failed = auth.login();
  api.calls[1].fail({ errMsg: 'network error' });
  await assert.rejects(failed, /登录失败/);
  assert(!auth.isLoggedIn());
  const wrongApp = auth.login();
  success(api.calls[2], { appid: 'wx-another' });
  await assert.rejects(wrongApp, /身份确认失败/);
  assert(!auth.isLoggedIn());
  const invalid = auth.login();
  api.calls[3].success({ result: { ok: true, appid: 'wx-current' } });
  await assert.rejects(invalid, /身份确认失败/);
  assert(!auth.isLoggedIn());

  // 请求途中退出，旧请求完成也不能把状态重新写成已登录。
  const cancelled = auth.login();
  auth.logout();
  const fresh = auth.login();
  success(api.calls[4], { openid: 'stale-user' });
  await assert.rejects(cancelled, error => error.code === 'CANCELLED');
  assert(!auth.isLoggedIn());
  success(api.calls[5], { openid: 'fresh-user' });
  assert.strictEqual((await fresh).openid, 'fresh-user');

  // 虚拟计时器触发超时，不等待真实12秒；晚到的结果不得改变身份。
  let timeoutCallback;
  const moduleStub = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'miniprogram/utils/auth.js'), 'utf8'), {
    module: moduleStub, setTimeout: callback => { timeoutCallback = callback; return 1; }, clearTimeout: () => {}
  });
  const timeoutApi = fakeApi();
  const timeoutAuth = new moduleStub.exports.CloudAuth(timeoutApi, config);
  const timeoutRequest = timeoutAuth.login();
  timeoutCallback();
  await assert.rejects(timeoutRequest, /超时/);
  success(timeoutApi.calls[0]);
  assert.strictEqual(timeoutAuth.isLoggedIn(), false);

  // 云函数用微信上下文确认身份，不相信客户端传来的伪造openid。
  let context = { OPENID: 'real-user', APPID: 'wx-current' };
  const functionModule = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(functionDir, 'index.js'), 'utf8'), {
    require: name => { assert.strictEqual(name, 'wx-server-sdk'); return { init: () => {}, getWXContext: () => context, DYNAMIC_CURRENT_ENV: 'current' }; },
    exports: functionModule.exports, module: functionModule
  });
  const cloudResult = await functionModule.exports.main({ openid: 'forged-user' });
  assert.strictEqual(cloudResult.openid, 'real-user');
  assert(!('session_key' in cloudResult));
  context = {};
  assert.strictEqual((await functionModule.exports.main({ openid: 'forged-user' })).ok, false);
  console.log('通过：我的页面/底部导航/云函数语法及配置、九类分享与接收参数。');
  console.log('通过：缺配置不假登录、云端确认/恢复、重复请求、失败/超时/重试、退出竞态与成绩保留。');
  console.log('通过：云函数拒绝客户端伪造身份、不返回session_key；仅使用接口替身，未调用线上云服务。');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
