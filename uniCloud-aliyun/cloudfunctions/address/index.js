'use strict';

const db = uniCloud.database()
const addressCollection = db.collection('address')
const $ = db.command.aggregate
const _ = db.command

exports.main = async (event, context) => {
  const { action, data = {} } = event
  const userId = context.OPENID || 'test-user-id' // 实际项目中应使用真实用户ID
  
  // 根据action执行不同操作
  switch (action) {
    case 'add':
      return await addAddress(data, userId)
    case 'update':
      return await updateAddress(data, userId)
    case 'remove':
      return await removeAddress(data, userId)
    case 'getList':
      return await getAddressList(userId)
    case 'getDetail':
      return await getAddressDetail(data, userId)
    case 'setDefault':
      return await setDefaultAddress(data, userId)
    default:
      return {
        code: 403,
        message: '未知操作'
      }
  }
}

// 添加地址
async function addAddress(data, userId) {
  try {
    // 检查必填字段
    if (!data.name || !data.phone || !data.province || !data.city || !data.district || !data.detail) {
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
    
    // 如果是默认地址，需要将其他地址设为非默认
    if (data.is_default) {
      await addressCollection.where({
        user_id: userId,
        is_default: true
      }).update({
        is_default: false
      })
    }
    
    // 如果是第一个地址，自动设为默认地址
    const addressCount = await addressCollection.where({
      user_id: userId
    }).count()
    
    if (addressCount.total === 0) {
      data.is_default = true
    }
    
    // 添加地址
    const result = await addressCollection.add({
      user_id: userId,
      name: data.name,
      phone: data.phone,
      province: data.province,
      city: data.city,
      district: data.district,
      detail: data.detail,
      postal_code: data.postal_code || '',
      is_default: data.is_default || false,
      create_date: new Date(),
      update_date: new Date()
    })
    
    return {
      code: 0,
      message: '添加成功',
      data: {
        id: result.id
      }
    }
  } catch (e) {
    console.error('添加地址失败', e)
    return {
      code: 500,
      message: '添加地址失败'
    }
  }
}

// 更新地址
async function updateAddress(data, userId) {
  try {
    // 检查必填字段
    if (!data.id || !data.name || !data.phone || !data.province || !data.city || !data.district || !data.detail) {
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
    
    // 检查地址是否存在
    const addressInfo = await addressCollection.doc(data.id).get()
    if (!addressInfo.data || addressInfo.data.length === 0) {
      return {
        code: 404,
        message: '地址不存在'
      }
    }
    
    // 检查是否是当前用户的地址
    if (addressInfo.data[0].user_id !== userId) {
      return {
        code: 403,
        message: '无权操作此地址'
      }
    }
    
    // 如果是默认地址，需要将其他地址设为非默认
    if (data.is_default) {
      await addressCollection.where({
        user_id: userId,
        is_default: true,
        _id: _.neq(data.id)
      }).update({
        is_default: false
      })
    }
    
    // 更新地址
    await addressCollection.doc(data.id).update({
      name: data.name,
      phone: data.phone,
      province: data.province,
      city: data.city,
      district: data.district,
      detail: data.detail,
      postal_code: data.postal_code || '',
      is_default: data.is_default || false,
      update_date: new Date()
    })
    
    return {
      code: 0,
      message: '更新成功'
    }
  } catch (e) {
    console.error('更新地址失败', e)
    return {
      code: 500,
      message: '更新地址失败'
    }
  }
}

// 删除地址
async function removeAddress(data, userId) {
  try {
    // 检查必填字段
    if (!data.id) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 检查地址是否存在
    const addressInfo = await addressCollection.doc(data.id).get()
    if (!addressInfo.data || addressInfo.data.length === 0) {
      return {
        code: 404,
        message: '地址不存在'
      }
    }
    
    // 检查是否是当前用户的地址
    if (addressInfo.data[0].user_id !== userId) {
      return {
        code: 403,
        message: '无权操作此地址'
      }
    }
    
    // 删除地址
    await addressCollection.doc(data.id).remove()
    
    // 如果删除的是默认地址，则将第一个地址设为默认地址
    if (addressInfo.data[0].is_default) {
      const addressList = await addressCollection.where({
        user_id: userId
      }).limit(1).get()
      
      if (addressList.data && addressList.data.length > 0) {
        await addressCollection.doc(addressList.data[0]._id).update({
          is_default: true
        })
      }
    }
    
    return {
      code: 0,
      message: '删除成功'
    }
  } catch (e) {
    console.error('删除地址失败', e)
    return {
      code: 500,
      message: '删除地址失败'
    }
  }
}

// 获取地址列表
async function getAddressList(userId) {
  try {
    // 查询用户的所有地址
    const result = await addressCollection
      .where({
        user_id: userId
      })
      .orderBy('is_default', 'desc') // 默认地址排在前面
      .orderBy('update_date', 'desc') // 按更新时间倒序
      .get()
    
    return {
      code: 0,
      message: '获取成功',
      data: result.data
    }
  } catch (e) {
    console.error('获取地址列表失败', e)
    return {
      code: 500,
      message: '获取地址列表失败'
    }
  }
}

// 获取地址详情
async function getAddressDetail(data, userId) {
  try {
    // 检查必填字段
    if (!data.id) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 查询地址详情
    const result = await addressCollection.doc(data.id).get()
    
    if (!result.data || result.data.length === 0) {
      return {
        code: 404,
        message: '地址不存在'
      }
    }
    
    // 检查是否是当前用户的地址
    if (result.data[0].user_id !== userId) {
      return {
        code: 403,
        message: '无权查看此地址'
      }
    }
    
    return {
      code: 0,
      message: '获取成功',
      data: result.data[0]
    }
  } catch (e) {
    console.error('获取地址详情失败', e)
    return {
      code: 500,
      message: '获取地址详情失败'
    }
  }
}

// 设置默认地址
async function setDefaultAddress(data, userId) {
  try {
    // 检查必填字段
    if (!data.id) {
      return {
        code: 401,
        message: '缺少必要参数'
      }
    }
    
    // 检查地址是否存在
    const addressInfo = await addressCollection.doc(data.id).get()
    if (!addressInfo.data || addressInfo.data.length === 0) {
      return {
        code: 404,
        message: '地址不存在'
      }
    }
    
    // 检查是否是当前用户的地址
    if (addressInfo.data[0].user_id !== userId) {
      return {
        code: 403,
        message: '无权操作此地址'
      }
    }
    
    // 将其他地址设为非默认
    await addressCollection.where({
      user_id: userId,
      is_default: true
    }).update({
      is_default: false
    })
    
    // 将当前地址设为默认
    await addressCollection.doc(data.id).update({
      is_default: true,
      update_date: new Date()
    })
    
    return {
      code: 0,
      message: '设置成功'
    }
  } catch (e) {
    console.error('设置默认地址失败', e)
    return {
      code: 500,
      message: '设置默认地址失败'
    }
  }
}