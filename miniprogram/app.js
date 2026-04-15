// app.js
App({
  onLaunch: function () {
    this.globalData = {
      // env 参数说明：
      // env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会请求到哪个云环境的资源
      // 此处请填入环境 ID, 环境 ID 可在微信开发者工具右上顶部工具栏点击云开发按钮打开获取
      env: "cloud1-9gkr22kn1fd5cef8",
    };
    
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      try {
        wx.cloud.init({
          env: this.globalData.env,
          traceUser: true,
        });
        console.log('云开发初始化成功，环境ID:', this.globalData.env);
      } catch (error) {
        console.error('云开发初始化失败:', error);
        // 如果指定环境失败，尝试使用默认环境
        try {
          wx.cloud.init({
            env: wx.cloud.DYNAMIC_CURRENT_ENV,
            traceUser: true,
          });
          console.log('使用默认环境初始化成功');
        } catch (defaultError) {
          console.error('默认环境初始化也失败:', defaultError);
        }
      }
    }
  },
});
