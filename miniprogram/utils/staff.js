// utils/staff.js
// 人员管理工具类（云数据库版本）

class StaffManager {
  static COLLECTION_NAME = 'staff_members';
  
  // 获取所有人员（从云数据库）
  static getAllStaff() {
    return new Promise((resolve, reject) => {
      // 确保云环境已初始化
      if (!wx.cloud) {
        console.warn('云开发未初始化，使用默认数据');
        resolve([
          { _id: '0', name: '尹朝晖', department: '工程科' },
          { _id: '1', name: '葛昊天', department: '工程科' },
          { _id: '2', name: '袁灿', department: '工程科' },
          { _id: '3', name: '车志轩', department: '工程科' },
          { _id: '4', name: '崔跃', department: '工程科' },
          { _id: '5', name: '高铸成', department: '工程科' },
          { _id: '6', name: '龚元昆', department: '工程科' },
          { _id: '7', name: '胡少坤', department: '工程科' },
          { _id: '8', name: '贾墨', department: '工程科' },
          { _id: '9', name: '刘彬', department: '工程科' },
          { _id: '10', name: '刘相源', department: '工程科' },
          { _id: '11', name: '刘心雨', department: '工程科' },
          { _id: '12', name: '吕子瑾', department: '工程科' },
          { _id: '13', name: '栾钰力', department: '工程科' },
          { _id: '14', name: '马志军', department: '工程科' },
          { _id: '15', name: '王晶', department: '工程科' },
          { _id: '16', name: '王云鹏', department: '工程科' },
          { _id: '17', name: '闫昕彤', department: '工程科' },
          { _id: '18', name: '张弛', department: '工程科' },
          { _id: '19', name: '赵健光', department: '工程科' }
        ]);
        return;
      }
      
      wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'getAllStaff'
        }
      }).then(res => {
        if (res.result && res.result.success) {
          resolve(res.result.data || []);
        } else {
          console.warn('获取人员列表失败，使用默认数据');
          resolve([
            { _id: '0', name: '尹朝晖', department: '工程科' },
            { _id: '1', name: '葛昊天', department: '工程科' },
            { _id: '2', name: '袁灿', department: '工程科' },
            { _id: '3', name: '车志轩', department: '工程科' },
            { _id: '4', name: '崔跃', department: '工程科' },
            { _id: '5', name: '高铸成', department: '工程科' },
            { _id: '6', name: '龚元昆', department: '工程科' },
            { _id: '7', name: '胡少坤', department: '工程科' },
            { _id: '8', name: '贾墨', department: '工程科' },
            { _id: '9', name: '刘彬', department: '工程科' },
            { _id: '10', name: '刘相源', department: '工程科' },
            { _id: '11', name: '刘心雨', department: '工程科' },
            { _id: '12', name: '吕子瑾', department: '工程科' },
            { _id: '13', name: '栾钰力', department: '工程科' },
            { _id: '14', name: '马志军', department: '工程科' },
            { _id: '15', name: '王晶', department: '工程科' },
            { _id: '16', name: '王云鹏', department: '工程科' },
            { _id: '17', name: '闫昕彤', department: '工程科' },
            { _id: '18', name: '张弛', department: '工程科' },
            { _id: '19', name: '赵健光', department: '工程科' }
          ]);
        }
      }).catch(err => {
        console.error('云函数调用失败:', err);
        // 降级到默认数据
        resolve([
          { _id: '0', name: '尹朝晖', department: '工程科' },
          { _id: '1', name: '葛昊天', department: '工程科' },
          { _id: '2', name: '袁灿', department: '工程科' },
          { _id: '3', name: '车志轩', department: '工程科' },
          { _id: '4', name: '崔跃', department: '工程科' },
          { _id: '5', name: '高铸成', department: '工程科' },
          { _id: '6', name: '龚元昆', department: '工程科' },
          { _id: '7', name: '胡少坤', department: '工程科' },
          { _id: '8', name: '贾墨', department: '工程科' },
          { _id: '9', name: '刘彬', department: '工程科' },
          { _id: '10', name: '刘相源', department: '工程科' },
          { _id: '11', name: '刘心雨', department: '工程科' },
          { _id: '12', name: '吕子瑾', department: '工程科' },
          { _id: '13', name: '栾钰力', department: '工程科' },
          { _id: '14', name: '马志军', department: '工程科' },
          { _id: '15', name: '王晶', department: '工程科' },
          { _id: '16', name: '王云鹏', department: '工程科' },
          { _id: '17', name: '闫昕彤', department: '工程科' },
          { _id: '18', name: '张弛', department: '工程科' },
          { _id: '19', name: '赵健光', department: '工程科' }
        ]);
      });
    });
  }
  
  // 添加人员（到云数据库）
  static addStaff(staff) {
    return new Promise((resolve, reject) => {
      if (!wx.cloud) {
        resolve({ success: false, error: '云开发未初始化' });
        return;
      }
      
      wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'addStaff',
          data: {
            name: staff.name,
            department: staff.department
          }
        }
      }).then(res => {
        if (res.result && res.result.success) {
          resolve({ success: true, data: res.result.data });
        } else {
          resolve({ success: false, error: res.result?.errMsg || '添加失败' });
        }
      }).catch(err => {
        console.error('添加人员失败:', err);
        resolve({ success: false, error: err.message });
      });
    });
  }
  
  // 删除人员（从云数据库）
  static deleteStaff(id) {
    return new Promise((resolve, reject) => {
      if (!wx.cloud) {
        resolve({ success: false, error: '云开发未初始化' });
        return;
      }
      
      wx.cloud.callFunction({
        name: 'quickstartFunctions',
        data: {
          type: 'deleteStaff',
          data: {
            id: id
          }
        }
      }).then(res => {
        if (res.result && res.result.success) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: res.result?.errMsg || '删除失败' });
        }
      }).catch(err => {
        console.error('删除人员失败:', err);
        resolve({ success: false, error: err.message });
      });
    });
  }
  
  // 获取人员选择选项（用于picker）
  static getNameOptions(staffList) {
    return staffList.map(staff => ({
      id: staff._id,
      name: staff.name
    }));
  }
  
  // 根据ID获取人员姓名
  static getNameById(id, staffList) {
    const staff = staffList.find(s => s._id === id);
    return staff ? staff.name : '';
  }
  
  // 检查人员是否存在
  static exists(name, staffList) {
    return staffList.some(staff => staff.name === name);
  }
}

module.exports = StaffManager;