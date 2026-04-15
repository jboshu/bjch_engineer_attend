// 权限管理工具类
const ADMIN_USERS = [
  { name: '葛昊天', password: '123456' },
  { name: '袁灿', password: '654321' }
];
const LOGIN_STATUS_KEY = 'admin_login_status';

class AuthManager {
  // 管理员登录
  static login(password) {
    const admin = ADMIN_USERS.find(user => user.password === password);
    if (admin) {
      wx.setStorageSync(LOGIN_STATUS_KEY, {
        isLoggedIn: true,
        loginTime: Date.now(),
        expireTime: Date.now() + 24 * 60 * 60 * 1000, // 24小时过期
        adminName: admin.name
      });
      return { success: true, message: '登录成功', adminName: admin.name };
    } else {
      return { success: false, message: '密码错误' };
    }
  }

  // 检查是否已登录
  static isLoggedIn() {
    const loginStatus = wx.getStorageSync(LOGIN_STATUS_KEY);
    if (!loginStatus || !loginStatus.isLoggedIn) {
      return false;
    }
    
    // 检查是否过期
    if (Date.now() > loginStatus.expireTime) {
      this.logout();
      return false;
    }
    
    return true;
  }

  // 管理员登出
  static logout() {
    wx.removeStorageSync(LOGIN_STATUS_KEY);
  }

  // 获取登录状态信息
  static getLoginInfo() {
    return wx.getStorageSync(LOGIN_STATUS_KEY);
  }

  // 获取当前登录的管理员姓名
  static getCurrentAdminName() {
    const loginStatus = this.getLoginInfo();
    return loginStatus && loginStatus.adminName ? loginStatus.adminName : null;
  }

  // 权限检查装饰器
  static requireAuth(pageCallback) {
    return function(options) {
      if (!AuthManager.isLoggedIn()) {
        wx.navigateTo({
          url: '/pages/login/login'
        });
        return;
      }
      // 如果已登录，执行原页面逻辑
      if (pageCallback) {
        pageCallback.call(this, options);
      }
    };
  }
}

module.exports = AuthManager;