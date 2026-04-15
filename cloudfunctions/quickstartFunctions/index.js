const cloud = require("wx-server-sdk");
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();
// 获取openid
const getOpenId = async () => {
  // 获取基础信息
  const wxContext = cloud.getWXContext();
  return {
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
  };
};

// 获取小程序二维码
const getMiniProgramCode = async () => {
  // 获取小程序二维码的buffer
  const resp = await cloud.openapi.wxacode.get({
    path: "pages/index/index",
  });
  const { buffer } = resp;
  // 将图片上传云存储空间
  const upload = await cloud.uploadFile({
    cloudPath: "code.png",
    fileContent: buffer,
  });
  return upload.fileID;
};

// 创建集合
const createCollection = async () => {
  try {
    // 创建集合
    await db.createCollection("sales");
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "上海",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华东",
        city: "南京",
        sales: 11,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "广州",
        sales: 22,
      },
    });
    await db.collection("sales").add({
      // data 字段表示需新增的 JSON 数据
      data: {
        region: "华南",
        city: "深圳",
        sales: 22,
      },
    });
    return {
      success: true,
    };
  } catch (e) {
    // 这里catch到的是该collection已经存在，从业务逻辑上来说是运行成功的，所以catch返回success给前端，避免工具在前端抛出异常
    return {
      success: true,
      data: "create collection success",
    };
  }
};

// 查询数据
const selectRecord = async () => {
  // 返回数据库查询结果
  return await db.collection("sales").get();
};

// 更新数据
const updateRecord = async (event) => {
  try {
    // 遍历修改数据库信息
    for (let i = 0; i < event.data.length; i++) {
      await db
        .collection("sales")
        .where({
          _id: event.data[i]._id,
        })
        .update({
          data: {
            sales: event.data[i].sales,
          },
        });
    }
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 新增数据
const insertRecord = async (event) => {
  try {
    const insertRecord = event.data;
    // 插入数据
    await db.collection("sales").add({
      data: {
        region: insertRecord.region,
        city: insertRecord.city,
        sales: Number(insertRecord.sales),
      },
    });
    return {
      success: true,
      data: event.data,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 删除数据
const deleteRecord = async (event) => {
  try {
    await db
      .collection("sales")
      .where({
        _id: event.data._id,
      })
      .remove();
    return {
      success: true,
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e,
    };
  }
};

// 取消请假申请
const cancelLeave = async (event) => {
  try {
    const { id } = event.data;
    
    if (!id) {
      return {
        success: false,
        errMsg: '参数不完整'
      };
    }
    
    // 确保集合存在
    try {
      await db.createCollection('leave_records');
    } catch (e) {
      console.log('集合已存在');
    }
    
    // 检查记录是否存在（不再限制状态，允许取消任何状态的申请）
    const record = await db.collection('leave_records')
      .doc(id)
      .get();
    
    if (!record.data) {
      return {
        success: false,
        errMsg: '记录不存在'
      };
    }
    
    // 更新记录为已取消
    const result = await db.collection('leave_records')
      .doc(id)
      .update({
        data: {
          canceled: true,
          updateTime: db.serverDate()
        }
      });
    
    return {
      success: true,
      data: result.stats.updated,
      message: '已取消请假'
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message || '取消失败'
    };
  }
};

// ==================== 统计相关函数 ====================

// 创建请假相关集合
const createLeaveCollections = async () => {
  try {
    // 创建请假记录集合
    await db.createCollection('leave_records');
    
    // 创建管理员会话集合
    await db.createCollection('admin_sessions');
    
    // 创建系统配置集合
    await db.createCollection('system_config');
    
    return {
      success: true,
      message: '所有集合创建成功'
    };
  } catch (e) {
    // 集合可能已存在
    return {
      success: true,
      message: '集合已存在或创建完成'
    };
  }
};

// 提交请假申请
const submitLeaveApplication = async (event) => {
  try {
    const { name, startDate, endDate, period, reason } = event.data;
    
    // 数据验证
    if (!name || !startDate || !period || !reason) {
      return {
        success: false,
        errMsg: '请填写完整的请假信息'
      };
    }
    
    // 验证日期范围逻辑
    if (endDate && startDate > endDate) {
      return {
        success: false,
        errMsg: '结束日期不能早于开始日期'
      };
    }
    
    // 确保集合存在
    try {
      await db.createCollection('leave_records');
    } catch (e) {
      // 集合可能已存在，忽略错误
      console.log('集合已存在或创建中');
    }
    
    // 准备请假记录数据
    const leaveData = {
      name: name,
      startDate: startDate,
      period: period, // 'full', 'morning', 'afternoon'
      reason: reason,
      status: 'pending', // pending, approved, rejected
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    };
    
    // 如果有结束日期，添加到数据中
    if (endDate) {
      leaveData.endDate = endDate;
      // 计算请假天数
      const start = new Date(startDate);
      const end = new Date(endDate);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      leaveData.days = days;
    } else {
      // 单日请假
      leaveData.date = startDate;
      leaveData.days = 1;
    }
    
    // 创建请假记录
    const result = await db.collection('leave_records').add({
      data: leaveData
    });
    
    return {
      success: true,
      data: result._id,
      message: '请假申请提交成功'
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message || '提交失败'
    };
  }
};

// 获取请假记录列表
const getLeaveRecords = async (event) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 20 } = event.data || {};
    
    // 确保集合存在
    try {
      await db.createCollection('leave_records');
    } catch (e) {
      console.log('集合已存在');
    }
    
    let query = db.collection('leave_records');
    
    // 状态筛选（排除已销假的记录）
    if (status) {
      query = query.where({ 
        status: status,
        canceled: db.command.neq(true)
      });
    }
    
    // 日期范围筛选（支持多天请假）
    if (startDate && endDate) {
      // 对于日期范围查询，需要查询在该范围内的所有请假记录
      // 包括单日请假和多天请假
      query = query.where({
        status: 'approved',
        $or: [
          // 单日请假在范围内
          {
            date: db.command.gte(startDate).and(db.command.lte(endDate))
          },
          // 多天请假与查询范围有交集
          {
            startDate: db.command.lte(endDate),
            endDate: db.command.gte(startDate)
          }
        ]
      });
    }
    
    // 分页查询
    const result = await query
      .orderBy('createTime', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();
    
    // 获取总数
    const countResult = await query.count();
    
    return {
      success: true,
      data: result.data,
      total: countResult.total,
      page: page,
      limit: limit
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message || '查询失败'
    };
  }
};

// 审批请假申请
const approveLeave = async (event) => {
  try {
    const { id, status, remark, approverName } = event.data;
    
    if (!id || !status) {
      return {
        success: false,
        errMsg: '参数不完整'
      };
    }
    
    // 确保集合存在
    try {
      await db.createCollection('leave_records');
    } catch (e) {
      console.log('集合已存在');
    }
    
    const updateData = {
      status: status,
      updateTime: db.serverDate()
    };
    
    // 添加审批人信息
    if (approverName) {
      updateData.approverName = approverName;
    }
    
    if (remark) {
      updateData.remark = remark;
    }
    
    const result = await db.collection('leave_records')
      .doc(id)
      .update({
        data: updateData
      });
    
    return {
      success: true,
      data: result.stats.updated,
      message: status === 'approved' ? '已批准' : '已拒绝'
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message || '审批失败'
    };
  }
};

// 获取当日请假统计
// 获取月度请假统计数据
// 人员管理相关函数

// 获取所有人员
const getAllStaff = async () => {
  try {
    // 确保集合存在
    try {
      await db.createCollection('staff_members');
    } catch (e) {
      console.log('人员集合已存在');
    }
    
    const result = await db.collection('staff_members').get();
    
    // 如果没有数据，初始化默认人员
    if (result.data.length === 0) {
      const defaultStaff = [
        { name: '尹朝晖', department: '工程科' },
        { name: '葛昊天', department: '工程科' },
        { name: '袁灿', department: '工程科' },
        { name: '车志轩', department: '工程科' },
        { name: '崔跃', department: '工程科' },
        { name: '高铸成', department: '工程科' },
        { name: '龚元昆', department: '工程科' },
        { name: '胡少坤', department: '工程科' },
        { name: '贾墨', department: '工程科' },
        { name: '刘彬', department: '工程科' },
        { name: '刘相源', department: '工程科' },
        { name: '刘心雨', department: '工程科' },
        { name: '吕子瑾', department: '工程科' },
        { name: '栾钰力', department: '工程科' },
        { name: '马志军', department: '工程科' },
        { name: '王晶', department: '工程科' },
        { name: '王云鹏', department: '工程科' },
        { name: '闫昕彤', department: '工程科' },
        { name: '张弛', department: '工程科' },
        { name: '赵健光', department: '工程科' }
      ];
      
      // 批量插入默认数据
      await db.collection('staff_members').add({
        data: defaultStaff
      });
      
      // 重新查询
      const newResult = await db.collection('staff_members').get();
      return {
        success: true,
        data: newResult.data
      };
    }
    
    return {
      success: true,
      data: result.data
    };
  } catch (e) {
    console.error('获取人员列表失败:', e);
    return {
      success: false,
      errMsg: e.message || '获取人员列表失败'
    };
  }
};

// 添加人员
const addStaff = async (event) => {
  try {
    const { name, department } = event.data;
    
    if (!name || !department) {
      return {
        success: false,
        errMsg: '请填写完整的人员信息'
      };
    }
    
    // 确保集合存在
    try {
      await db.createCollection('staff_members');
    } catch (e) {
      console.log('人员集合已存在');
    }
    
    // 检查是否已存在同名人员
    const existing = await db.collection('staff_members')
      .where({ name: name })
      .get();
    
    if (existing.data.length > 0) {
      return {
        success: false,
        errMsg: '该人员已存在'
      };
    }
    
    const result = await db.collection('staff_members').add({
      data: {
        name: name,
        department: department,
        createTime: db.serverDate()
      }
    });
    
    // 查询刚添加的记录
    const newRecord = await db.collection('staff_members').doc(result._id).get();
    
    return {
      success: true,
      data: newRecord.data
    };
  } catch (e) {
    console.error('添加人员失败:', e);
    return {
      success: false,
      errMsg: e.message || '添加人员失败'
    };
  }
};

// 删除人员
const deleteStaff = async (event) => {
  try {
    const { id } = event.data;
    
    if (!id) {
      return {
        success: false,
        errMsg: '人员ID不能为空'
      };
    }
    
    // 确保集合存在
    try {
      await db.createCollection('staff_members');
    } catch (e) {
      console.log('人员集合已存在');
    }
    
    const result = await db.collection('staff_members').doc(id).remove();
    
    return {
      success: true,
      data: result.stats.removed
    };
  } catch (e) {
    console.error('删除人员失败:', e);
    return {
      success: false,
      errMsg: e.message || '删除人员失败'
    };
  }
};

const getMonthlyLeaveStats = async (event) => {
  try {
    const { year, month } = event.data || {};
    
    // 如果没有传入年月参数，则使用当前月份
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetMonth = month !== undefined ? month : now.getMonth() + 1;
    
    // 计算月初和月末日期
    const monthStart = new Date(targetYear, targetMonth - 1, 1);
    const monthEnd = new Date(targetYear, targetMonth, 0);
    
    console.log(`查询 ${targetYear}年${targetMonth}月 的请假数据`);
    console.log('日期范围:', monthStart.toISOString(), '至', monthEnd.toISOString());
    
    // 确保集合存在
    try {
      await db.createCollection('leave_records');
    } catch (e) {
      console.log('集合已存在');
    }
    
    // 查询所有已批准且未取消的请假记录
    const result = await db.collection('leave_records')
      .where({
        status: 'approved',
        canceled: db.command.neq(true)
      })
      .orderBy('createTime', 'asc')
      .get();
    
    console.log(`找到 ${result.data.length} 条请假记录`);
    
    // 按日期分组统计（支持多天请假）
    const dailyStats = {};
    const personStats = {};
    
    result.data.forEach(record => {
      // 处理请假记录 - 单日请假和多天请假互斥处理
      // 判断是单日请假还是多天请假
      const isSingleDay = record.date && !record.endDate;
      const isMultiDay = record.startDate && record.endDate;
      
      if (isSingleDay) {
        // 单日请假：只使用 date 字段
        const recordDate = new Date(record.date);
        // 检查是否在目标月份内
        if (recordDate >= monthStart && recordDate <= monthEnd) {
          const dateStr = record.date;
          if (!dailyStats[dateStr]) {
            dailyStats[dateStr] = [];
          }
          dailyStats[dateStr].push({
            name: record.name,
            period: record.period,
            reason: record.reason
          });
          
          // 按人员统计
          if (!personStats[record.name]) {
            personStats[record.name] = 0;
          }
          personStats[record.name]++;
        }
      } else if (isMultiDay) {
        // 多天请假：使用 startDate 和 endDate
        const startDate = new Date(record.startDate);
        const endDate = new Date(record.endDate);
        
        // 遍历请假期间的每一天
        const currentDate = new Date(Math.max(startDate, monthStart));
        const limitDate = new Date(Math.min(endDate, monthEnd));
        
        while (currentDate <= limitDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          if (!dailyStats[dateStr]) {
            dailyStats[dateStr] = [];
          }
          dailyStats[dateStr].push({
            name: record.name,
            period: record.period,
            reason: record.reason
          });
          
          // 按人员统计（每人每天只统计一次）
          if (!personStats[record.name]) {
            personStats[record.name] = 0;
          }
          personStats[record.name]++;
          
          // 移动到下一天
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        // 兼容旧数据：只有 startDate 但没有 endDate 的情况（单日请假）
        // 这种情况应该只处理一次
        const startDate = new Date(record.startDate);
        // 检查是否在目标月份内
        if (startDate >= monthStart && startDate <= monthEnd) {
          const dateStr = record.startDate;
          if (!dailyStats[dateStr]) {
            dailyStats[dateStr] = [];
          }
          dailyStats[dateStr].push({
            name: record.name,
            period: record.period,
            reason: record.reason
          });
          
          // 按人员统计
          if (!personStats[record.name]) {
            personStats[record.name] = 0;
          }
          personStats[record.name]++;
        }
      }
    });
    
    // 计算每日请假人数
    const dailyCounts = {};
    Object.keys(dailyStats).forEach(date => {
      dailyCounts[date] = dailyStats[date].length;
    });
    
    console.log('每日统计:', dailyCounts);
    console.log('人员统计:', personStats);
    
    return {
      success: true,
      data: {
        dailyStats: dailyStats,
        dailyCounts: dailyCounts,
        personStats: personStats,
        totalRecords: result.data.length,
        year: targetYear,
        month: targetMonth
      }
    };
  } catch (e) {
    console.error('获取月度统计失败:', e);
    return {
      success: false,
      errMsg: e.message || '获取月度统计失败'
    };
  }
};

const getTodayLeaveStats = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // 确保集合存在
    try {
      await db.createCollection('leave_records');
    } catch (e) {
      console.log('集合已存在');
    }
    
    // 查询所有已批准且未取消的请假记录
    const result = await db.collection('leave_records')
      .where({
        status: 'approved',
        canceled: db.command.neq(true)
      })
      .get();
    
    // 过滤出今天请假的人员（包括多天请假）
    const todayLeaveRecords = result.data.filter(record => {
      // 判断是单日请假还是多天请假
      const isSingleDay = record.date && !record.endDate;
      const isMultiDay = record.startDate && record.endDate;
      
      if (isSingleDay) {
        // 单日请假：只使用 date 字段
        return record.date === todayStr;
      } else if (isMultiDay) {
        // 多天请假：使用 startDate 和 endDate
        const startDate = new Date(record.startDate);
        const endDate = new Date(record.endDate);
        const todayDate = new Date(todayStr);
        
        // 检查今天是否在请假范围内
        return startDate <= todayDate && todayDate <= endDate;
      } else {
        // 兼容旧数据：只有 startDate 但没有 endDate 的情况（单日请假）
        const startDate = new Date(record.startDate);
        const todayDate = new Date(todayStr);
        
        // 检查今天是否是请假日期
        return startDate.toISOString().split('T')[0] === todayStr;
      }
    });
    
    console.log(`今日(${todayStr})请假人员:`, todayLeaveRecords.map(r => r.name));
    
    return {
      success: true,
      data: todayLeaveRecords
    };
  } catch (e) {
    console.error('获取今日统计失败:', e);
    return {
      success: false,
      errMsg: e.message || '获取统计失败'
    };
  }
};

// 清理无效数据
const cleanInvalidData = async () => {
  try {
    // 确保集合存在
    try {
      await db.createCollection('leave_records');
    } catch (e) {
      console.log('集合已存在');
    }
    
    // 删除没有姓名或ID的记录
    const result = await db.collection('leave_records')
      .where({
        $or: [
          { name: db.command.exists(false) },
          { name: '' },
          { name: null }
        ]
      })
      .remove();
    
    return {
      success: true,
      deletedCount: result.stats.removed
    };
  } catch (e) {
    return {
      success: false,
      errMsg: e.message || '清理失败'
    };
  }
};

// 云函数入口函数
exports.main = async (event, context) => {
  switch (event.type) {
    case "getOpenId":
      return await getOpenId();
    case "getMiniProgramCode":
      return await getMiniProgramCode();
    case "createCollection":
      return await createCollection();
    case "selectRecord":
      return await selectRecord();
    case "updateRecord":
      return await updateRecord(event);
    case "insertRecord":
      return await insertRecord(event);
    case "deleteRecord":
      return await deleteRecord(event);
    // 请假系统相关接口
    case "submitLeaveApplication":
      return await submitLeaveApplication(event);
    case "getLeaveRecords":
      return await getLeaveRecords(event);
    case "approveLeave":
      return await approveLeave(event);
    case "getTodayLeaveStats":
      return await getTodayLeaveStats();
    case "getMonthlyLeaveStats":
      return await getMonthlyLeaveStats(event);
    case "cancelLeave":
      return await cancelLeave(event);
    // 人员管理相关接口
    case "getAllStaff":
      return await getAllStaff();
    case "addStaff":
      return await addStaff(event);
    case "deleteStaff":
      return await deleteStaff(event);
    case "cleanInvalidData":
      return await cleanInvalidData();
    case "createLeaveCollections":
      return await createLeaveCollections();
  }
};
