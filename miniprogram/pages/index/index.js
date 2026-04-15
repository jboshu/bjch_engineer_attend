// index.js
const AuthManager = require('../../utils/auth.js');

Page({
  data: {
    isAdmin: false,
    todayLeaveStats: [],
    showTip: false,
    title: "",
    content: "",
    // 登录模态框数据
    showLoginModal: false,
    password: '',
    // 待审批提醒数据
    showPendingAlert: false,
    pendingApplicants: [],
    pendingCount: 0,
    functionList: [
      {
        title: "📝 请假申请",
        subtitle: "提交新的请假申请",
        icon: "📝",
        page: "/pages/leaveApply/leaveApply",
        color: "#667eea"
      },
      {
        title: "📋 我的申请",
        subtitle: "查看历史请假记录",
        icon: "📋",
        page: "/pages/history/history",
        color: "#ff6b6b"
      },
      {
        title: "📅 请假日历",
        subtitle: "查看月度请假安排",
        icon: "📅",
        page: "/pages/calendar/calendar",
        color: "#4ecdc4"
      },
      {
        title: "👥 人员管理",
        subtitle: "管理员工信息",
        icon: "👥",
        page: "/pages/staff/staff",
        color: "#9c27b0",
        adminOnly: true
      },
      {
        title: "✅ 审批管理",
        subtitle: "管理员审批请假申请",
        icon: "✅",
        page: "/pages/approval/approval",
        color: "#45b7d1",
        adminOnly: true
      }
    ],
    // 登录输入框聚焦状态
    isPasswordFocused: false
  },
  onLoad() {
    this.checkAdminStatus();
    this.loadTodayStats();
  },

  onShow() {
    this.checkAdminStatus();
    this.loadTodayStats();
    // 管理员登录后检查待审批申请
    if (this.data.isAdmin) {
      this.checkPendingApplications();
    }
  },

  // 检查管理员状态
  checkAdminStatus() {
    const isAdmin = AuthManager.isLoggedIn();
    this.setData({ isAdmin });
  },
  
  // 检查待审批申请
  checkPendingApplications() {
    // 检查云环境
    if (!wx.cloud) {
      console.warn('云开发未初始化');
      return;
    }
    
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getLeaveRecords',
        data: {
          status: 'pending',
          page: 1,
          limit: 100
        }
      }
    }).then(res => {
      if (res.result && res.result.success) {
        const pendingList = res.result.data || [];
        
        if (pendingList.length > 0) {
          // 提取申请人姓名
          const applicants = pendingList.map(item => item.name);
          const uniqueApplicants = [...new Set(applicants)]; // 去重
          
          this.setData({
            showPendingAlert: true,
            pendingApplicants: uniqueApplicants,
            pendingCount: pendingList.length
          });
        }
      }
    }).catch(err => {
      console.error('检查待审批申请失败:', err);
    });
  },

  // 加载今日请假统计
  loadTodayStats() {
    // 检查云环境是否初始化成功
    if (!wx.cloud) {
      console.warn('云开发未初始化');
      this.loadMockData(); // 使用模拟数据
      return;
    }
    
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getTodayLeaveStats'
      }
    }).then(res => {
      if (res.result && res.result.success) {
        this.setData({
          todayLeaveStats: res.result.data || []
        });
      } else {
        console.warn('获取统计数据失败:', res.result?.errMsg);
        this.loadMockData();
      }
    }).catch(err => {
      console.error('加载统计数据失败:', err);
      // 优雅降级：使用模拟数据
      this.loadMockData();
      
      // 如果是环境错误，给出友好提示
      if (err.errCode === -501000) {
        console.warn('云环境配置问题，请检查环境ID或重新部署云函数');
        wx.showToast({
          title: '云服务暂时不可用，显示演示数据',
          icon: 'none',
          duration: 3000
        });
      }
    });
  },

  // 加载模拟数据（用于测试和降级）
  loadMockData() {
    console.log('使用模拟数据进行演示');
    const mockData = [
      { _id: '1', name: '张三', period: 'morning', startDate: '2024-01-15' },
      { _id: '2', name: '李四', period: 'full', startDate: '2024-01-15' }
    ];
    this.setData({ todayLeaveStats: mockData });
  },

  // 功能项点击处理
  onFunctionClick(e) {
    const { index } = e.currentTarget.dataset;
    const functionItem = this.data.functionList[index];
    
    // 检查管理员权限
    if (functionItem.adminOnly && !this.data.isAdmin) {
      wx.showModal({
        title: '权限不足',
        content: '此功能需要管理员权限，请先登录',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }
        }
      });
      return;
    }
    
    // 跳转到对应页面
    wx.navigateTo({
      url: functionItem.page
    });
  },

  // 显示登录模态框
  showLoginModal() {
    this.setData({
      showLoginModal: true,
      password: ''
    });
  },

  // 隐藏登录模态框
  hideLoginModal() {
    this.setData({
      showLoginModal: false,
      password: '',
      isPasswordFocused: false
    });
  },

  // 密码输入处理
  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 密码输入框聚焦
  onPasswordFocus() {
    this.setData({
      isPasswordFocused: true
    });
  },

  // 密码输入框失焦
  onPasswordBlur() {
    this.setData({
      isPasswordFocused: false
    });
  },

  // 执行登录
  handleLogin() {
    const { password } = this.data;
    
    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({ title: '登录中...' });
    
    const result = AuthManager.login(password);
    
    wx.hideLoading();
    
    if (result.success) {
      this.setData({
        isAdmin: true,
        showLoginModal: false,
        password: ''
      });
      
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: result.message,
        icon: 'none'
      });
    }
  },

  // 管理员登出
  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出管理员登录吗？',
      success: (res) => {
        if (res.confirm) {
          AuthManager.logout();
          this.checkAdminStatus();
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  // 清理无效数据
  cleanInvalidData() {
    wx.showModal({
      title: '数据清理',
      content: '确定要清理无效的旧数据吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清理中...' });
          wx.cloud.callFunction({
            name: 'quickstartFunctions',
            data: {
              type: 'cleanInvalidData'
            }
          }).then(result => {
            wx.hideLoading();
            if (result.result.success) {
              wx.showToast({
                title: `已清理${result.result.deletedCount}条无效数据`,
                icon: 'success'
              });
            } else {
              wx.showToast({
                title: '清理失败',
                icon: 'none'
              });
            }
          }).catch(err => {
            wx.hideLoading();
            wx.showToast({
              title: '网络错误',
              icon: 'none'
            });
          });
        }
      }
    });
  },
  
  // 关闭待审批提醒弹窗
  closePendingAlert() {
    this.setData({
      showPendingAlert: false
    });
  },
  
  // 跳转到审批页面
  goToApproval() {
    this.setData({
      showPendingAlert: false
    });
    wx.navigateTo({
      url: '/pages/approval/approval'
    });
  }
});
