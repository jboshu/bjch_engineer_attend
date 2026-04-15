// pages/approval/approval.js
const AuthManager = require('../../utils/auth.js');

Page({
  data: {
    activeTab: 'pending', // pending, approved, rejected
    pendingList: [],
    approvedList: [],
    rejectedList: [],
    isLoading: false,
    tabs: [
      { key: 'pending', title: '待审批', count: 0 },
      { key: 'approved', title: '已批准', count: 0 },
      { key: 'rejected', title: '已拒绝', count: 0 }
    ]
  },

  onLoad() {
    // 检查权限
    if (!AuthManager.isLoggedIn()) {
      wx.redirectTo({
        url: '/pages/login/login'
      });
      return;
    }
    
    this.loadData();
  },

  onShow() {
    // 页面显示时刷新数据
    this.loadData();
  },

  // 切换标签页
  onTabChange(e) {
    const { tab } = e.currentTarget.dataset;
    this.setData({
      activeTab: tab
    });
  },

  // 加载数据
  loadData() {
    this.setData({ isLoading: true });
    
    // 并行获取三种状态的数据
    Promise.all([
      this.fetchLeaveRecords('pending'),
      this.fetchLeaveRecords('approved'),
      this.fetchLeaveRecords('rejected')
    ]).then(([pending, approved, rejected]) => {
      this.setData({
        pendingList: pending,
        approvedList: approved,
        rejectedList: rejected,
        isLoading: false,
        tabs: [
          { key: 'pending', title: '待审批', count: pending.length },
          { key: 'approved', title: '已批准', count: approved.length },
          { key: 'rejected', title: '已拒绝', count: rejected.length }
        ]
      });
    }).catch(err => {
      this.setData({ isLoading: false });
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
      console.error('加载数据失败:', err);
    });
  },

  // 获取请假记录
  fetchLeaveRecords(status) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getLeaveRecords',
          data: {
            status: status,
            page: 1,
            limit: 100
          }
        }
      }).then(res => {
        if (res.result.success) {
          // 格式化日期显示
          const formattedData = (res.result.data || []).map(item => ({
            ...item,
            formatDate: this.formatDateRange(item.startDate, item.endDate),
            formatPeriod: this.formatPeriod(item.period || 'full'),
            formatStatus: this.formatStatus(item.status || 'pending')
          }));
          resolve(formattedData);
        } else {
          reject(new Error(res.result.errMsg));
        }
      }).catch(reject);
    });
  },

  // 审批操作
  handleApproval(e) {
    const { id, status } = e.currentTarget.dataset;
    
    wx.showModal({
      title: status === 'approved' ? '确认批准' : '确认拒绝',
      content: status === 'approved' ? '确定要批准这条请假申请吗？' : '确定要拒绝这条请假申请吗？',
      success: (res) => {
        if (res.confirm) {
          this.submitApproval(id, status);
        }
      }
    });
  },

  // 提交审批结果
  submitApproval(id, status) {
    wx.showLoading({ title: '处理中...' });
    
    // 获取当前登录的管理员姓名
    const adminName = AuthManager.getCurrentAdminName();
    
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'approveLeave',
        data: {
          id: id,
          status: status,
          approverName: adminName // 传递审批人姓名
        }
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result.success) {
        wx.showToast({
          title: res.result.message,
          icon: 'success'
        });
        
        // 刷新数据
        this.loadData();
        
        // 通知首页更新待审批状态
        const pages = getCurrentPages();
        const indexPage = pages.find(page => page.route === 'pages/index/index');
        if (indexPage) {
          indexPage.checkPendingApplications();
        }
      } else {
        wx.showToast({
          title: res.result.errMsg || '操作失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
      console.error('审批失败:', err);
    });
  },

  // 格式化日期范围
  formatDateRange(startDate, endDate) {
    // 处理日期范围显示
    if (!startDate) return '无效日期';
    
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return '无效日期';
    
    const startStr = this.formatSimpleDate(start);
    
    // 如果有结束日期且不等于开始日期
    if (endDate && endDate !== startDate) {
      const end = new Date(endDate);
      if (!isNaN(end.getTime())) {
        const endStr = this.formatSimpleDate(end);
        return `${startStr} 至 ${endStr}`;
      }
    }
    
    return startStr;
  },
  
  // 格式化简单日期
  formatSimpleDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 格式化时段
  formatPeriod(period) {
    const periodMap = {
      'full': '全天',
      'morning': '上午',
      'afternoon': '下午'
    };
    return periodMap[period] || period;
  },

  // 格式化状态
  formatStatus(status) {
    const statusMap = {
      'pending': { text: '待审批', color: '#ffa500' },
      'approved': { text: '已批准', color: '#52c41a' },
      'rejected': { text: '已拒绝', color: '#ff4d4f' }
    };
    return statusMap[status] || { text: status, color: '#999' };
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});