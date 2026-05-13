// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const usersCollection = db.collection('users')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const {
    userInfo,
    phoneNumber,
    avatarUrl,
    nickName,
    gender,
    isFirstLogin = false
  } = event
  
  try {
    // 查询用户是否存在
    const userResult = await usersCollection.where({
      _openid: openid
    }).get()
    
    // 准备更新的数据
    const updateData = {
      updateTime: db.serverDate(),
      lastLoginTime: db.serverDate()
    }
    
    // 更新用户信息
    if (userInfo) {
      updateData.userInfo = userInfo
    }
    
    // 更新手机号
    if (phoneNumber) {
      updateData['userInfo.phoneNumber'] = phoneNumber
    }
    
    // 更新头像
    if (avatarUrl) {
      updateData['userInfo.avatarUrl'] = avatarUrl
    }
    
    // 更新昵称
    if (nickName) {
      updateData['userInfo.nickName'] = nickName
    }
    
    // 更新性别
    if (gender !== undefined) {
      updateData['userInfo.gender'] = gender
    }
    
    // 如果用户不存在，创建新用户
    if (userResult.data.length === 0) {
      // 创建新用户
      const userData = {
        _openid: openid,
        userInfo: userInfo || {
          nickName: nickName || '微信用户',
          avatarUrl: avatarUrl || '',
          gender: gender || 0,
          phoneNumber: phoneNumber || ''
        },
        status: 'active',
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        lastLoginTime: db.serverDate()
      }
      
      const result = await usersCollection.add({
        data: userData
      })
      
      // 如果是首次登录，可以在这里处理一些初始化操作
      if (isFirstLogin) {
        // 例如：发放新用户优惠券
        await db.collection('coupons').add({
          data: {
            userId: openid,
            name: '新用户专享优惠券',
            value: 10,
            minAmount: 100,
            status: 'unused',
            type: 'discount',
            createTime: db.serverDate(),
            expiryDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30天有效期
            description: '新用户专享，订单满100元可使用'
          }
        })
      }
      
      return {
        success: true,
        isNewUser: true,
        userId: result._id
      }
    } else {
      // 更新现有用户
      const userId = userResult.data[0]._id
      
      await usersCollection.doc(userId).update({
        data: updateData
      })
      
      return {
        success: true,
        isNewUser: false,
        userId
      }
    }
  } catch (error) {
    console.error('更新用户信息失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}