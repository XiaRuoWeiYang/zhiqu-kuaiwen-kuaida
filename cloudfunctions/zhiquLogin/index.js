const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 只作为当前小程序调用的云函数部署，不配置HTTP或其他公开触发器。
// 不接受客户端声称的openid，不返回session_key、AppSecret或其他用户身份。
exports.main = async () => {
  const { OPENID, APPID } = cloud.getWXContext();
  if (!OPENID || !APPID) return { ok: false, code: 'WECHAT_CONTEXT_REQUIRED' };
  return { ok: true, openid: OPENID, appid: APPID };
};
