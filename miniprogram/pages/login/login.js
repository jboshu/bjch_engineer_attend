// pages/login/login.js
const AuthManager = require('../../utils/auth.js');

Page({
  data: {
    password: '',
    showPassword: false,
    isLoading: false
  },

  onLoad(options) {
    // 如果已经登录，直接跳转到首页
    if (AuthManager.isLoggedIn()) {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }
  },

  // 输入密码
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 切换密码显示
  togglePassword() {
    this.setData({
      showPassword: !this.data.showPassword
    });
  },

  // 登录处理
  handleLogin() {
    const { password } = this.data;
    
    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return;
    }

    this.setData({ isLoading: true });

    // 调用登录方法
    const result = AuthManager.login(password);
    
    this.setData({ isLoading: false });

    if (result.success) {
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
      
      // 延迟跳转到首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index'
        });
      }, 1000);
    } else {
      wx.showToast({
        title: result.message,
        icon: 'none'
      });
    }
  },

  // 忘记密码提示
  showForgetPassword() {
    wx.showModal({
      title: '提示',
      content: '默认管理员密码为：123456',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});