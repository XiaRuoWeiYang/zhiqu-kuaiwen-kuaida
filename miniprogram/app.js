const { CloudAuth } = require('./utils/auth');
const cloudConfig = require('./config/cloud');
App({
  onLaunch() {
    this.auth = new CloudAuth(wx, cloudConfig);
    this.auth.init();
  }
});
