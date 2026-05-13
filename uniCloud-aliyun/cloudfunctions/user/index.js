'use strict';

const db = uniCloud.database()
const userCollection = db.collection('user')
const $ = db.command.aggregate
const _ = db.command

exports.main = async (event, context) => {
  const { action, data = {} } = event
  const userId = context.OPENID || 'test-user-id' // 实际项目中应使用真实用户ID
  
  // 根据action执行不同操作
  switch (action) {
    case 'login':
      return await login(data)
    case 'register':
      return await register(data)
    case 'updateInfo':
      return await updateUserInfo(data, userId)
    case 'getInfo':
      return await getUserInfo(userId)
    case 'updatePhone':
      return await updatePhone(data, userId)
    default:
      return {
        code: 403,
        message: '未知操作'
      }
  }
}

// 用户登录
async function login(data) {
  try {
    // 在实际项目中，这里应该使用微信小程序的登录接口
    // 获取用户的openid和session_key
    // const { code } = data
    // const res = await uniCloud.httpclient.request(
    //   `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${secret}&js_code=${code}&grant_type=authorization_code`,
    //   { dataType: 'json' }
    // )
    
    // 为了演示，这里使用模拟数据
    const openid = 'test-user-id'
    
    // 查询用户是否存在
    const userInfo = await userCollection.where({
      openid: openid
    }).get()
    
    if (userInfo.data && userInfo.data.length > 0) {
      // 用户已存在，更新登录时间
      await userCollection.doc(userInfo.data[0]._id).update({
        last_login_date: new Date()
      })
      
      return {
        code: 0,
        message: '登录成功',
        data: {
          token: 'mock-token', // 实际项目中应该生成真实的token
          user_info: userInfo.data[0]
        }
      }
    } else {
      // 用户不存在，创建新用户
      const result = await userCollection.add({
        openid: openid,
        create_date: new Date(),
        last_login_date: new Date(),
        status: 1
      })
      
      const newUserInfo = await userCollection.doc(result.id).get()
      
      return {
        code: 0,
        message: '登录成功',
        data: {
          token: 'mock-token',
          user_info: newUserInfo.data[0]
        }
      }
    }
  } catch (e) {
    console.error('登录失败', e)
    return {
      code: 500,
      message: '登录失败'
    }
  }
}

// 用户注册
async function register(data) {
  try {
    // 检查必填字段
    if (!data.phone) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 验证手机号格式
    if (!/^1\d{10}$/.test(data.phone)) {
      return {
        code: 400,
        message: '手机号格式不正确'
      }
    }
    
    // 检查手机号是否已注册
    const existUser = await userCollection.where({
      phone: data.phone
    }).get()
    
    if (existUser.data && existUser.data.length > 0) {
      return {
        code: 400,
        message: '该手机号已注册'
      }
    }
    
    // 创建用户
    const result = await userCollection.add({
      phone: data.phone,
      nickname: data.nickname || '',
      avatar: data.avatar || '',
      gender: data.gender || 0,
      create_date: new Date(),
      last_login_date: new Date(),
      status: 1
    })
    
    const userInfo = await userCollection.doc(result.id).get()
    
    return {
      code: 0,
      message: '注册成功',
      data: {
        token: 'mock-token',
        user_info: userInfo.data[0]
      }
    }
  } catch (e) {
    console.error('注册失败', e)
    return {
      code: 500,
      message: '注册失败'
    }
  }
}

// 更新用户信息
async function updateUserInfo(data, userId) {
  try {
    // 检查用户是否存在
    const userInfo = await userCollection.doc(userId).get()
    if (!userInfo.data || userInfo.data.length === 0) {
      return {
        code: 404,
        message: '用户不存在'
      }
    }
    
    // 构建更新数据
    const updateData = {}
    
    if (data.nickname !== undefined) {
      updateData.nickname = data.nickname
    }
    
    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar
    }
    
    if (data.gender !== undefined) {
      updateData.gender = data.gender
    }
    
    if (Object.keys(updateData).length === 0) {
      return {
        code: 400,
        message: '没有需要更新的数据'
      }
    }
    
    // 更新用户信息
    await userCollection.doc(userId).update(updateData)
    
    return {
      code: 0,
      message: '更新成功'
    }
  } catch (e) {
    console.error('更新用户信息失败', e)
    return {
      code: 500,
      message: '更新用户信息失败'
    }
  }
}

// 获取用户信息
async function getUserInfo(userId) {
  try {
    // 查询用户信息
    const result = await userCollection.doc(userId).get()
    
    if (!result.data || result.data.length === 0) {
      return {
        code: 404,
        message: '用户不存在'
      }
    }
    
    return {
      code: 0,
      message: '获取成功',
      data: result.data[0]
    }
  } catch (e) {
    console.error('获取用户信息失败', e)
    return {
      code: 500,
      message: '获取用户信息失败'
    }
  }
}

// 更新手机号
async function updatePhone(data, userId) {
  try {
    // 检查必填字段
    if (!data.phone) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 验证手机号格式
    if (!/^1\d{10}$/.test(data.phone)) {
      return {
        code: 400,
        message: '手机号格式不正确'
      }
    }
    
    // 检查手机号是否已被其他用户使用
    const existUser = await userCollection.where({
      _id: _.neq(userId),
      phone: data.phone
    }).get()
    
    if (existUser.data && existUser.data.length > 0) {
      return {
        code: 400,
        message: '该手机号已被其他用户使用'
      }
    }
    
    // 更新手机号
    await userCollection.doc(userId).update({
      phone: data.phone
    })
    
    return {
      code: 0,
      message: '更新成功'
    }
  } catch (e) {
    console.error('更新手机号失败', e)
    return {
      code: 500,
      message: '更新手机号失败'
    }
  }
}