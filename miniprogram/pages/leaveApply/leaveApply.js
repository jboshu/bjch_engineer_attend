// pages/leaveApply/leaveApply.js
const StaffManager = require('../../utils/staff.js');

Page({
  data: {
    name: '',
    startDate: '',
    endDate: '',
    period: 'full', // full, morning, afternoon
    periodLabel: '全天',
    reason: '',
    isDateRange: false, // 是否选择日期范围
    nameOptions: [],
    periodOptions: [
      { value: 'full', label: '全天' },
      { value: 'morning', label: '上午' },
      { value: 'afternoon', label: '下午' }
    ],
    isLoading: false,
    isNarrowScreen: false
  },

  onLoad(options) {
    // 设置默认日期为今天
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    
    this.setData({
      startDate: dateString,
      endDate: dateString
    });
    
    // 异步加载人员数据
    this.loadStaffData();

    // 计算屏幕比例，判断是否为窄长屏（如部分折叠屏外屏）
    const info = wx.getSystemInfoSync();
    const { windowWidth, windowHeight } = info;
    const ratio = windowHeight / windowWidth;
    const isNarrow = windowWidth < 360 || ratio > 2.1;

    this.setData({
      isNarrowScreen: isNarrow
    });
  },

  onResize(res) {
    const { windowWidth, windowHeight } = res.size;
    const ratio = windowHeight / windowWidth;
    const isNarrow = windowWidth < 360 || ratio > 2.1;

    this.setData({
      isNarrowScreen: isNarrow
    });
  },
  
  // 加载人员数据
  loadStaffData() {
    StaffManager.getAllStaff()
      .then(staffList => {
        const nameOptions = StaffManager.getNameOptions(staffList);
        this.setData({
          nameOptions: nameOptions
        });
      })
      .catch(error => {
        console.error('加载人员数据失败:', error);
        // 使用默认选项
        this.setData({
          nameOptions: [
            { id: '0', name: '尹朝晖' },
            { id: '1', name: '葛昊天' },
            { id: '2', name: '袁灿' },
            { id: '3', name: '车志轩' },
            { id: '4', name: '崔跃' },
            { id: '5', name: '高铸成' },
            { id: '6', name: '龚元昆' },
            { id: '7', name: '胡少坤' },
            { id: '8', name: '贾墨' },
            { id: '9', name: '刘彬' },
            { id: '10', name: '刘相源' },
            { id: '11', name: '刘心雨' },
            { id: '12', name: '吕子瑾' },
            { id: '13', name: '栾钰力' },
            { id: '14', name: '马志军' },
            { id: '15', name: '王晶' },
            { id: '16', name: '王云鹏' },
            { id: '17', name: '闫昕彤' },
            { id: '18', name: '张弛' },
            { id: '19', name: '赵健光' }
          ]
        });
      });
  },

  // 选择姓名
  onNameChange(e) {
    const selectedIndex = e.detail.value;
    const selectedName = this.data.nameOptions[selectedIndex].name;
    this.setData({
      name: selectedName
    });
  },

  // 开始日期选择
  onStartDateChange(e) {
    const startDate = e.detail.value;
    this.setData({
      startDate: startDate
    });
    
    // 如果结束日期早于开始日期，则同步结束日期
    if (this.data.endDate && startDate > this.data.endDate) {
      this.setData({
        endDate: startDate
      });
    }
  },
  
  // 结束日期选择
  onEndDateChange(e) {
    this.setData({
      endDate: e.detail.value
    });
  },
  
  // 切换日期范围模式
  onDateRangeToggle(e) {
    const isDateRange = e.detail.value;
    this.setData({
      isDateRange: isDateRange
    });
    
    // 如果关闭日期范围，重置结束日期为开始日期
    if (!isDateRange) {
      this.setData({
        endDate: this.data.startDate
      });
    }
  },

  // 时段选择
  onPeriodChange(e) {
    const selectedIndex = e.detail.value;
    const selectedPeriod = this.data.periodOptions[selectedIndex];
    this.setData({
      period: selectedPeriod.value,
      periodLabel: selectedPeriod.label
    });
  },

  // 原因输入
  onReasonInput(e) {
    this.setData({
      reason: e.detail.value
    });
  },

  // 表单验证
  validateForm() {
    const { name, startDate, endDate, reason, isDateRange } = this.data;
    
    if (!name.trim()) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      });
      return false;
    }
    
    if (!startDate) {
      wx.showToast({
        title: '请选择开始日期',
        icon: 'none'
      });
      return false;
    }
    
    if (isDateRange && !endDate) {
      wx.showToast({
        title: '请选择结束日期',
        icon: 'none'
      });
      return false;
    }
    
    // 验证日期逻辑
    if (isDateRange && startDate > endDate) {
      wx.showToast({
        title: '结束日期不能早于开始日期',
        icon: 'none'
      });
      return false;
    }
    
    if (!reason.trim()) {
      wx.showToast({
        title: '请输入请假原因',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  // 提交申请
  handleSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.setData({ isLoading: true });

    const { name, startDate, endDate, period, reason, isDateRange } = this.data;

    // 准备提交数据
    const submitData = {
      name: name.trim(),
      startDate: startDate,
      period: period,
      reason: reason.trim()
    };
    
    // 如果是日期范围，添加结束日期
    if (isDateRange) {
      submitData.endDate = endDate;
    }

    // 调用云函数提交申请
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      data: {
        type: 'submitLeaveApplication',
        data: submitData
      }
    }).then(res => {
      this.setData({ isLoading: false });
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: '提交成功',
          icon: 'success'
        });
        
        // 清空表单
        const today = new Date().toISOString().split('T')[0];
        this.setData({
          name: '',
          reason: '',
          startDate: today,
          endDate: today,
          period: 'full',
          periodLabel: '全天',
          isDateRange: false
        });
        
        // 返回首页
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }, 1500);
      } else {
        wx.showToast({
          title: res.result?.errMsg || '提交失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({ isLoading: false });
      console.error('云函数调用失败:', err);
      
      // 根据错误类型给出不同提示
      if (err.errCode === -501000) {
        // 云环境错误，提供测试模式
        wx.showModal({
          title: '云服务暂时不可用',
          content: '您可以选择：\n1. 继续使用演示模式\n2. 检查云环境配置',
          confirmText: '演示模式',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              this.handleDemoSubmit(name, date, period, reason);
            }
          }
        });
      } else {
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        });
      }
    });
  },

  // 重置表单
  handleReset() {
    this.setData({
      name: '',
      reason: ''
    });
  },

  // 演示模式提交
  handleDemoSubmit(name, startDate, endDate, period, reason, isDateRange) {
    wx.showToast({
      title: '演示模式：提交成功',
      icon: 'success'
    });
    
    // 清空表单
    const today = new Date().toISOString().split('T')[0];
    this.setData({
      name: '',
      reason: '',
      startDate: today,
      endDate: today,
      period: 'full',
      periodLabel: '全天',
      isDateRange: false
    });
    
    // 3秒后返回首页
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/index/index'
      });
    }, 3000);
  }
});