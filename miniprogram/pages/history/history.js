// pages/history/history.js
Page({
  data: {
    recordList: [],
    isLoading: false
  },

  onLoad() {
    this.loadData();
  },

  // 格式化创建时间（年月日时分）
  formatCreateTime(createTime) {
    if (!createTime) return '未知时间';
    
    const date = new Date(createTime);
    if (isNaN(date.getTime())) return '无效时间';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  loadData() {
    this.setData({ isLoading: true });
    
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'getLeaveRecords',
        data: {
          page: 1,
          limit: 100
        }
      }
    }).then(res => {
      this.setData({ isLoading: false });
      
      if (res.result.success) {
        const formattedData = (res.result.data || []).map(item => ({
          ...item,
          formatDate: this.formatDateRange(item.startDate, item.endDate),
          formatPeriod: this.formatPeriod(item.period || 'full'),
          formatStatus: this.formatStatus(item.status || 'pending'),
          canceled: item.canceled || false,
          // 添加审批人姓名（如果存在）
          approverName: item.approverName || '',
          // 格式化创建时间为年月日时分
          formattedCreateTime: this.formatCreateTime(item.createTime)
        }));
        
        this.setData({
          recordList: formattedData
        });
      }
    }).catch(err => {
      this.setData({ isLoading: false });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  // 销假处理
  handleCancelLeave(e) {
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认销假',
      content: '确定要取消此请假申请吗？取消后将不再显示在今日和日历中。',
      confirmText: '确认销假',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.cancelLeave(id);
        }
      }
    });
  },
  
  cancelLeave(id) {
    this.setData({ isLoading: true });
    
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'cancelLeave',
        data: {
          id: id
        }
      }
    }).then(res => {
      this.setData({ isLoading: false });
      
      if (res.result.success) {
        wx.showToast({
          title: '销假成功',
          icon: 'success'
        });
        
        // 刷新数据
        this.loadData();
      } else {
        wx.showToast({
          title: res.result.errMsg || '销假失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({ isLoading: false });
      console.error('销假失败:', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none'
      });
    });
  },
  
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
  
  formatSimpleDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  formatPeriod(period) {
    const map = {
      'full': '全天',
      'morning': '上午',
      'afternoon': '下午'
    };
    return map[period] || period;
  },

  formatStatus(status) {
    const map = {
      'pending': { text: '待审批', color: '#ffa500' },
      'approved': { text: '已批准', color: '#52c41a' },
      'rejected': { text: '已拒绝', color: '#ff4d4f' }
    };
    return map[status] || { text: status, color: '#999' };
  }
});