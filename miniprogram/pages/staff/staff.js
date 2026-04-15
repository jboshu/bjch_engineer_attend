// pages/staff/staff.js
const StaffManager = require('../../utils/staff.js');

Page({
  data: {
    staffList: [],
    isLoading: false,
    newStaffName: '',
    newStaffDept: '',
    showAddModal: false,
    editingId: null
  },

  onLoad() {
    this.loadStaffData();
  },
  
  onShow() {
    // 页面显示时刷新数据
    this.loadStaffData();
  },

  // 加载人员数据
  loadStaffData() {
    this.setData({ isLoading: true });
    
    StaffManager.getAllStaff()
      .then(staffList => {
        this.setData({ 
          staffList: staffList,
          isLoading: false
        });
        console.log('加载人员数据完成，共', staffList.length, '人');
      })
      .catch(error => {
        this.setData({ isLoading: false });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
        console.error('加载人员数据失败:', error);
      });
  },

  // 显示添加人员模态框
  showAddStaffModal() {
    this.setData({
      showAddModal: true,
      newStaffName: '',
      newStaffDept: '',
      editingId: null
    });
  },

  // 隐藏模态框
  hideModal() {
    this.setData({
      showAddModal: false,
      newStaffName: '',
      newStaffDept: '',
      editingId: null
    });
  },

  // 输入姓名
  onNameInput(e) {
    this.setData({
      newStaffName: e.detail.value
    });
  },

  // 输入部门
  onDeptInput(e) {
    this.setData({
      newStaffDept: e.detail.value
    });
  },

  // 添加人员
  addStaff() {
    const { newStaffName, newStaffDept, staffList } = this.data;
    
    if (!newStaffName.trim()) {
      wx.showToast({
        title: '请输入姓名',
        icon: 'none'
      });
      return;
    }
    
    if (!newStaffDept.trim()) {
      wx.showToast({
        title: '请输入部门',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否已存在
    if (StaffManager.exists(newStaffName.trim(), staffList)) {
      wx.showToast({
        title: '该人员已存在',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({ title: '添加中...' });
    
    StaffManager.addStaff({
      name: newStaffName.trim(),
      department: newStaffDept.trim()
    }).then(result => {
      wx.hideLoading();
      
      if (result.success) {
        this.setData({
          showAddModal: false,
          newStaffName: '',
          newStaffDept: ''
        });
        
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
        
        // 重新加载数据
        this.loadStaffData();
      } else {
        wx.showToast({
          title: result.error || '添加失败',
          icon: 'none'
        });
      }
    }).catch(error => {
      wx.hideLoading();
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
      console.error('添加人员失败:', error);
    });
  },

  // 删除人员
  deleteStaff(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这名员工吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          
          StaffManager.deleteStaff(id)
            .then(result => {
              wx.hideLoading();
              
              if (result.success) {
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                });
                
                // 重新加载数据
                this.loadStaffData();
              } else {
                wx.showToast({
                  title: result.error || '删除失败',
                  icon: 'none'
                });
              }
            })
            .catch(error => {
              wx.hideLoading();
              wx.showToast({
                title: '网络错误',
                icon: 'none'
              });
              console.error('删除人员失败:', error);
            });
        }
      }
    });
  },

  // 保存人员数据
  saveStaffData() {
    // 数据已通过StaffManager自动保存到云数据库
    console.log('人员数据已保存到云端');
  },

  // 返回首页
  goBack() {
    wx.navigateBack();
  }
});