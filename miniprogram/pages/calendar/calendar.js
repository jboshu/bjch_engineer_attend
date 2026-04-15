// pages/calendar/calendar.js
Page({
  data: {
    currentDate: '',
    currentMonth: '',
    nextMonthDate: '',
    nextMonthDisplay: '',
    calendarDays: [],
    leaveData: {},
    dailyCounts: {}, // 每日请假人数统计
    weekHeaders: ['日', '一', '二', '三', '四', '五', '六'],
    isLoading: false,
    // 弹窗相关数据
    showModal: false,
    selectedDate: '',
    selectedDateInfo: [],
    selectedDateStr: '',
    // 触摸滚动相关
    scrollTop: 0
  },

  onLoad() {
    this.initCalendar();
    this.loadLeaveData();
  },

  initCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const nextMonth = month + 1;
    const nextYear = nextMonth > 11 ? year + 1 : year;
    const nextMonthNum = nextMonth > 11 ? 1 : nextMonth + 1;
    
    this.setData({
      currentDate: `${year}-${String(month + 1).padStart(2, '0')}`,
      currentMonth: `${year}年${month + 1}月`,
      nextMonthDate: `${nextYear}-${String(nextMonthNum).padStart(2, '0')}`,
      nextMonthDisplay: `${nextYear}年${nextMonthNum}月(前15天)`
    });
    
    this.generateExtendedCalendar(year, month, nextYear, nextMonthNum);
  },

  generateExtendedCalendar(currentYear, currentMonth, nextYear, nextMonth) {
    const calendarDays = [];
    
    // 生成本月的所有日期
    const currentFirstDay = new Date(currentYear, currentMonth, 1);
    const currentLastDay = new Date(currentYear, currentMonth + 1, 0);
    const currentDaysInMonth = currentLastDay.getDate();
    const currentStartDay = currentFirstDay.getDay();
    
    // 添加上个月末尾的日期（如果需要）
    for (let i = currentStartDay - 1; i >= 0; i--) {
      const prevDate = new Date(currentYear, currentMonth, -i);
      calendarDays.push({
        date: prevDate.getDate(),
        isCurrentMonth: false,
        isNextMonth: false,
        dateString: `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`,
        monthLabel: '上月'
      });
    }
    
    // 添加本月的所有日期
    for (let i = 1; i <= currentDaysInMonth; i++) {
      calendarDays.push({
        date: i,
        isCurrentMonth: true,
        isNextMonth: false,
        dateString: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        monthLabel: '本月'
      });
    }
    
    // 添加下个月的前15天
    for (let i = 1; i <= 15; i++) {
      const nextDate = new Date(nextYear, nextMonth - 1, i);
      calendarDays.push({
        date: nextDate.getDate(),
        isCurrentMonth: false,
        isNextMonth: true,
        dateString: `${nextDate.getFullYear()}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        monthLabel: '下月'
      });
    }
    
    this.setData({ calendarDays });
  },

  loadLeaveData() {
    this.setData({ isLoading: true });
    
    // 安全检查数据
    if (!this.data.currentDate || !this.data.nextMonthDate) {
      console.warn('缺少必要的日期数据');
      this.loadExtendedMockData();
      this.setData({ isLoading: false });
      return;
    }
    
    // 检查云环境是否可用
    if (!wx.cloud) {
      console.warn('云开发未初始化，使用模拟数据');
      this.loadExtendedMockData();
      this.setData({ isLoading: false });
      return;
    }
    
    // 获取两个月的数据：本月和下月
    const currentDateParts = this.data.currentDate.split('-').map(Number);
    const nextMonthDateParts = this.data.nextMonthDate.split('-').map(Number);
    
    // 验证解析结果
    if (currentDateParts.length !== 2 || nextMonthDateParts.length !== 2) {
      console.warn('日期格式解析失败');
      this.loadExtendedMockData();
      this.setData({ isLoading: false });
      return;
    }
    
    const [currentYear, currentMonth] = currentDateParts;
    const [nextYear, nextMonth] = nextMonthDateParts;
    
    // 并行获取两个月的数据
    Promise.all([
      this.getMonthlyData(currentYear, currentMonth),
      this.getMonthlyData(nextYear, nextMonth)
    ]).then(([currentMonthData, nextMonthData]) => {
      // 检查页面是否已卸载
      if (this._isPageDestroyed) {
        return;
      }
      
      this.setData({ isLoading: false });
      
      // 合并两个月的数据
      const mergedDailyStats = { ...currentMonthData.dailyStats, ...nextMonthData.dailyStats };
      const mergedDailyCounts = { ...currentMonthData.dailyCounts, ...nextMonthData.dailyCounts };
      
      console.log('合并后的请假数据:', {
        dailyStatsCount: Object.keys(mergedDailyStats).length,
        dailyCountsCount: Object.keys(mergedDailyCounts).length
      });
      
      // 检查页面是否已卸载
      if (this._isPageDestroyed) {
        return;
      }
      
      this.setData({
        leaveData: mergedDailyStats,
        dailyCounts: mergedDailyCounts
      });
    }).catch(err => {
      // 检查页面是否已卸载
      if (this._isPageDestroyed) {
        return;
      }
      
      this.setData({ isLoading: false });
      
      console.error('加载月度请假数据失败:', err);
      
      // 优雅降级到模拟数据
      this.loadExtendedMockData();
      
      // 如果是环境错误，给出提示
      if (err.errCode === -501000) {
        wx.showToast({
          title: '云服务暂时不可用，显示演示数据',
          icon: 'none',
          duration: 3000
        });
      }
    });
  },
  
  // 获取指定月份的数据
  getMonthlyData(year, month) {
    return new Promise((resolve, reject) => {
      // 添加安全检查
      if (!year || !month) {
        console.warn('无效的年月参数:', { year, month });
        resolve({ dailyStats: {}, dailyCounts: {} });
        return;
      }
      
      // 检查云环境
      if (!wx.cloud) {
        console.warn('云开发未初始化');
        resolve({ dailyStats: {}, dailyCounts: {} });
        return;
      }
      
      wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getMonthlyLeaveStats',
          data: {
            year: year,
            month: month
          }
        }
      }).then(res => {
        // 检查页面是否已卸载
        if (this._isPageDestroyed) {
          resolve({ dailyStats: {}, dailyCounts: {} });
          return;
        }
        
        if (res.result && res.result.success) {
          // 确保返回数据结构完整
          const data = res.result.data || {};
          resolve({
            dailyStats: data.dailyStats || {},
            dailyCounts: data.dailyCounts || {}
          });
        } else {
          console.warn('获取月度数据失败:', res.result?.errMsg);
          resolve({ dailyStats: {}, dailyCounts: {} });
        }
      }).catch(err => {
        console.error('调用云函数失败:', err);
        // 检查页面是否已卸载
        if (this._isPageDestroyed) {
          resolve({ dailyStats: {}, dailyCounts: {} });
          return;
        }
        resolve({ dailyStats: {}, dailyCounts: {} });
      });
    });
  },
  
  // 加载扩展的模拟数据（两个月）
  loadExtendedMockData() {
    console.log('使用扩展模拟数据进行演示');
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const nextMonth = currentMonth + 1;
    const nextYear = nextMonth > 12 ? currentYear + 1 : currentYear;
    const nextMonthNum = nextMonth > 12 ? 1 : nextMonth;
    
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const nextMonthStr = `${nextYear}-${String(nextMonthNum).padStart(2, '0')}`;
    
    // 本月模拟数据
    const currentMonthStats = {
      [`${currentMonthStr}-15`]: [
        { name: '尹朝晖', period: 'full', reason: '身体不适' },
        { name: '葛昊天', period: 'morning', reason: '医院复查' }
      ],
      [`${currentMonthStr}-20`]: [
        { name: '袁灿', period: 'afternoon', reason: '家庭事务' }
      ],
      [`${currentMonthStr}-25`]: [
        { name: '车志轩', period: 'full', reason: '外出办事' }
      ]
    };
    
    // 下月模拟数据（前15天）
    const nextMonthStats = {
      [`${nextMonthStr}-05`]: [
        { name: '崔跃', period: 'morning', reason: '体检' }
      ],
      [`${nextMonthStr}-10`]: [
        { name: '高铸成', period: 'full', reason: '年假' },
        { name: '龚元昆', period: 'afternoon', reason: '培训' }
      ],
      [`${nextMonthStr}-12`]: [
        { name: '胡少坤', period: 'full', reason: '出差' }
      ]
    };
    
    // 合并数据
    const mockDailyStats = { ...currentMonthStats, ...nextMonthStats };
    
    const mockDailyCounts = {};
    Object.keys(mockDailyStats).forEach(date => {
      mockDailyCounts[date] = mockDailyStats[date].length;
    });
    
    this.setData({
      leaveData: mockDailyStats,
      dailyCounts: mockDailyCounts
    });
    
    console.log(`加载了 ${Object.keys(mockDailyStats).length} 天的模拟数据`);
  },

  formatDate(date) {
    return date.toLocaleDateString('zh-CN');
  },
  
  // 点击日期查看详情
  onDateClick(e) {
    const { dateString, date } = e.currentTarget.dataset;
    
    // 获取该日期的请假信息
    const leaveInfo = this.data.leaveData[dateString] || [];
    
    // 格式化日期显示
    const dateObj = new Date(dateString);
    const formattedDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
    
    this.setData({
      showModal: true,
      selectedDate: dateString,
      selectedDateInfo: leaveInfo,
      selectedDateStr: formattedDate,
      scrollTop: 0 // 重置滚动位置
    });
  },
  
  // 关闭弹窗
  closeModal() {
    this.setData({
      showModal: false,
      selectedDate: '',
      selectedDateInfo: [],
      selectedDateStr: '',
      scrollTop: 0
    });
  },
  
  // 页面卸载时清理资源
  onUnload() {
    // 清理可能存在的定时器
    if (this.data.timerId) {
      clearTimeout(this.data.timerId);
      this.setData({ timerId: null });
    }
    
    // 清理其他可能的异步操作引用
    this._isPageDestroyed = true;
  },
  
  // 处理滚动事件
  onPageScroll(e) {
    // 页面滚动事件处理
  },
  
  // 阻止背景滚动
  preventBackgroundScroll() {
    // 空函数，用于阻止背景页面滚动
  },
  
  // 处理scroll-view触摸事件
  handleScrollViewTouch(e) {
    // 阻止触摸事件冒泡到背景
    e.stopPropagation();
    return false;
  },
  
  // 滚动到顶部事件
  onScrollToUpper() {
    // 可以在这里处理滚动到顶部的逻辑
  },
  
  // 滚动到底部事件
  onScrollToLower() {
    // 可以在这里处理滚动到底部的逻辑
  }
});