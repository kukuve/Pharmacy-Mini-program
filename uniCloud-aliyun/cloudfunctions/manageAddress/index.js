// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command
const addressesCollection = db.collection('addresses')

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  // 获取请求参数
  const {
    action,
    addressId,
    addressData
  } = event
  
  if (!action) {
    return {
      success: false,
      error: '操作类型不能为空'
    }
  }
  
  try {
    // 根据不同操作类型处理
    switch (action) {
      case 'add':
        return await addAddress(openid, addressData)
      case 'update':
        return await updateAddress(openid, addressId, addressData)
      case 'delete':
        return await deleteAddress(openid, addressId)
      case 'setDefault':
        return await setDefaultAddress(openid, addressId)
      case 'get':
        return await getAddress(openid, addressId)
      case 'list':
        return await listAddresses(openid)
      default:
        return {
          success: false,
          error: '不支持的操作类型'
        }
    }
  } catch (error) {
    console.error('管理地址失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 添加地址
async function addAddress(userId, addressData) {
  if (!addressData || !addressData.name || !addressData.phone || !addressData.province || !addressData.city || !addressData.district || !addressData.detail) {
    return {
      success: false,
      error: '地址信息不完整'
    }
  }
  
  // 开始数据库事务
  const transaction = await db.startTransaction()
  
  try {
    // 如果设置为默认地址，先将其他地址设为非默认
    if (addressData.isDefault) {
      await transaction.collection('addresses').where({
        userId,
        isDefault: true
      }).update({
        data: {
          isDefault: false,
          updateTime: db.serverDate()
        }
      })
    }
    
    // 如果是第一个地址，自动设为默认地址
    const countResult = await transaction.collection('addresses').where({
      userId
    }).count()
    
    if (countResult.total === 0) {
      addressData.isDefault = true
    }
    
    // 添加新地址
    const result = await transaction.collection('addresses').add({
      data: {
        ...addressData,
        userId,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
    })
    
    // 提交事务
    await transaction.commit()
    
    return {
      success: true,
      _id: result._id,
      isDefault: addressData.isDefault
    }
  } catch (error) {
    // 回滚事务
    await transaction.rollback()
    throw error
  }
}

// 更新地址
async function updateAddress(userId, addressId, addressData) {
  if (!addressId) {
    return {
      success: false,
      error: '地址ID不能为空'
    }
  }
  
  // 验证地址所属用户
  const addressResult = await addressesCollection.doc(addressId).get()
  
  if (!addressResult.data || addressResult.data.userId !== userId) {
    return {
      success: false,
      error: '无权操作此地址'
    }
  }
  
  // 开始数据库事务
  const transaction = await db.startTransaction()
  
  try {
    // 如果设置为默认地址，先将其他地址设为非默认
    if (addressData.isDefault) {
      await transaction.collection('addresses').where({
        userId,
        _id: _.neq(addressId),
        isDefault: true
      }).update({
        data: {
          isDefault: false,
          updateTime: db.serverDate()
        }
      })
    }
    
    // 更新地址
    await transaction.collection('addresses').doc(addressId).update({
      data: {
        ...addressData,
        updateTime: db.serverDate()
      }
    })
    
    // 提交事务
    await transaction.commit()
    
    return {
      success: true,
      _id: addressId,
      isDefault: addressData.isDefault
    }
  } catch (error) {
    // 回滚事务
    await transaction.rollback()
    throw error
  }
}

// 删除地址
async function deleteAddress(userId, addressId) {
  if (!addressId) {
    return {
      success: false,
      error: '地址ID不能为空'
    }
  }
  
  // 验证地址所属用户
  const addressResult = await addressesCollection.doc(addressId).get()
  
  if (!addressResult.data || addressResult.data.userId !== userId) {
    return {
      success: false,
      error: '无权操作此地址'
    }
  }
  
  // 开始数据库事务
  const transaction = await db.startTransaction()
  
  try {
    const address = addressResult.data
    
    // 删除地址
    await transaction.collection('addresses').doc(addressId).remove()
    
    // 如果删除的是默认地址，将最新的地址设为默认地址
    if (address.isDefault) {
      const latestAddressResult = await transaction.collection('addresses')
        .where({
          userId
        })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get()
      
      if (latestAddressResult.data.length > 0) {
        await transaction.collection('addresses').doc(latestAddressResult.data[0]._id).update({
          data: {
            isDefault: true,
            updateTime: db.serverDate()
          }
        })
      }
    }
    
    // 提交事务
    await transaction.commit()
    
    return {
      success: true,
      _id: addressId
    }
  } catch (error) {
    // 回滚事务
    await transaction.rollback()
    throw error
  }
}

// 设置默认地址
async function setDefaultAddress(userId, addressId) {
  if (!addressId) {
    return {
      success: false,
      error: '地址ID不能为空'
    }
  }
  
  // 验证地址所属用户
  const addressResult = await addressesCollection.doc(addressId).get()
  
  if (!addressResult.data || addressResult.data.userId !== userId) {
    return {
      success: false,
      error: '无权操作此地址'
    }
  }
  
  // 开始数据库事务
  const transaction = await db.startTransaction()
  
  try {
    // 将其他地址设为非默认
    await transaction.collection('addresses').where({
      userId,
      _id: _.neq(addressId),
      isDefault: true
    }).update({
      data: {
        isDefault: false,
        updateTime: db.serverDate()
      }
    })
    
    // 将当前地址设为默认
    await transaction.collection('addresses').doc(addressId).update({
      data: {
        isDefault: true,
        updateTime: db.serverDate()
      }
    })
    
    // 提交事务
    await transaction.commit()
    
    return {
      success: true,
      _id: addressId
    }
  } catch (error) {
    // 回滚事务
    await transaction.rollback()
    throw error
  }
}

// 获取地址详情
async function getAddress(userId, addressId) {
  if (!addressId) {
    return {
      success: false,
      error: '地址ID不能为空'
    }
  }
  
  // 获取地址详情
  const addressResult = await addressesCollection.doc(addressId).get()
  
  if (!addressResult.data) {
    return {
      success: false,
      error: '地址不存在'
    }
  }
  
  // 验证地址所属用户
  if (addressResult.data.userId !== userId) {
    return {
      success: false,
      error: '无权查看此地址'
    }
  }
  
  return {
    success: true,
    data: addressResult.data
  }
}

// 获取地址列表
async function listAddresses(userId) {
  // 获取地址列表
  const addressesResult = await addressesCollection
    .where({
      userId
    })
    .orderBy('isDefault', 'desc')
    .orderBy('updateTime', 'desc')
    .get()
  
  return {
    success: true,
    data: addressesResult.data
  }
}